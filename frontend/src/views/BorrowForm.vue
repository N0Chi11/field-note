<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">借用申请</h1>
        <p class="page-desc">
          提交申请后可在“借用一览”页面查看审核状态（建议提前一天提交）
        </p>
      </div>

      <div class="form-wrapper">
        <n-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-placement="top"
          require-mark-placement="right-hanging"
        >
          <!-- 工单号 + 借用人（只读） -->
          <div class="form-row">
            <n-form-item label="工单号">
              <n-input
                :value="workOrderPreview"
                placeholder="提交后系统自动生成"
                readonly
              >
                <template #prefix>
                  <span class="field-icon">🔖</span>
                </template>
              </n-input>
            </n-form-item>
            <n-form-item label="借用人">
              <n-input :value="borrowerText" placeholder="—" readonly>
                <template #prefix>
                  <span class="field-icon">👤</span>
                </template>
              </n-input>
            </n-form-item>
          </div>

          <!-- 设备选择（按类别分组，维修中禁用） -->
          <n-form-item label="借用设备" path="equipmentId">
            <n-select
              v-model:value="form.equipmentId"
              :options="equipmentOptions"
              :loading="equipmentLoading"
              placeholder="请选择设备（按类别分组）"
              filterable
              @update:value="onFieldChange"
            />
          </n-form-item>

          <!-- 借用 / 归还时间 -->
          <div class="form-row">
            <n-form-item label="借用时间" path="borrowTime">
              <n-date-picker
                v-model:value="form.borrowTime"
                type="datetime"
                clearable
                placeholder="选择借用时间"
                style="width: 100%"
                @update:value="onFieldChange"
              />
            </n-form-item>
            <n-form-item label="归还时间" path="returnTime">
              <n-date-picker
                v-model:value="form.returnTime"
                type="datetime"
                clearable
                placeholder="选择归还时间"
                style="width: 100%"
                @update:value="onFieldChange"
              />
            </n-form-item>
          </div>

          <!-- 借用理由 -->
          <n-form-item label="借用理由" path="reason">
            <n-input
              v-model:value="form.reason"
              type="textarea"
              placeholder="请简要说明借用理由（如：毕业设计视频拍摄）"
              :autosize="{ minRows: 3, maxRows: 6 }"
              maxlength="200"
              show-count
              @update:value="onFieldChange"
            />
          </n-form-item>

          <!-- 冲突检测结果 -->
          <n-alert
            v-if="conflict && conflict.has_conflict"
            :type="conflict.conflict_type === 'hard' ? 'error' : 'warning'"
            :title="
              conflict.conflict_type === 'hard'
                ? '时间冲突（强冲突）'
                : '时间冲突（轻度冲突）'
            "
            class="conflict-alert"
          >
            该设备在所选时段{{
              conflict.conflict_type === 'hard'
                ? '已被占用'
                : '有待审核 / 待归还的申请'
            }}，冲突工单：{{ conflict.conflict_orders.join('、') || '无' }}。
            <span v-if="conflict.conflict_type === 'hard'"
              >请选择其他时间段。</span
            >
            <span v-else>如对方通过可能冲突，仍可提交。</span>
          </n-alert>

          <n-alert
            v-else-if="
              conflict &&
              !conflict.has_conflict &&
              form.equipmentId &&
              form.borrowTime &&
              form.returnTime
            "
            type="success"
            title="无冲突"
            class="conflict-alert"
          >
            所选时段无时间冲突，可以提交申请。
          </n-alert>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <n-button @click="resetDraft">清空草稿</n-button>
            <n-button
              type="primary"
              :loading="submitting"
              :disabled="conflict?.conflict_type === 'hard'"
              @click="handleSubmit"
            >
              提交申请
            </n-button>
          </div>
        </n-form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NForm,
  NFormItem,
  NSelect,
  NDatePicker,
  NInput,
  NButton,
  NAlert,
  type FormInst,
  type FormRules,
  type SelectGroupOption,
  type SelectOption
} from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import { getEquipment } from '@/api/equipment'
import { createRequest, checkConflict } from '@/api/borrow'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import type { Equipment, ConflictResult } from '@/types/models'

const router = useRouter()
const toast = useToastStore()
const authStore = useAuthStore()

// 草稿持久化 key（与原 HTML 版一致）
const DRAFT_KEY = 'eb_borrow_draft'

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const equipmentLoading = ref(false)

const form = reactive({
  equipmentId: null as number | null,
  borrowTime: null as number | null,
  returnTime: null as number | null,
  reason: ''
})

const conflict = ref<ConflictResult | null>(null)
let conflictTimer: ReturnType<typeof setTimeout> | null = null

/** 工单号预览：提交后由后端生成，此处仅展示占位 */
const workOrderPreview = computed(() => '')

/** 借用人文本：当前用户姓名 + 学号 */
const borrowerText = computed(() => {
  const u = authStore.user
  if (!u) return ''
  return `${u.name}（${u.student_id}）`
})

/** 设备下拉选项（按类别分组，维修中设备 disabled） */
const equipmentOptions = ref<(SelectGroupOption | SelectOption)[]>([])

const rules: FormRules = {
  equipmentId: {
    required: true,
    type: 'number',
    message: '请选择借用设备',
    trigger: ['change', 'blur']
  },
  borrowTime: {
    required: true,
    type: 'number',
    message: '请选择借用时间',
    trigger: ['change', 'blur']
  },
  returnTime: [
    {
      required: true,
      type: 'number',
      message: '请选择归还时间',
      trigger: ['change', 'blur']
    },
    {
      validator: () => {
        if (
          form.returnTime &&
          form.borrowTime &&
          form.returnTime <= form.borrowTime
        ) {
          return new Error('归还时间必须晚于借用时间')
        }
        return true
      },
      trigger: ['change', 'blur']
    }
  ],
  reason: {
    required: true,
    message: '请填写借用理由',
    trigger: ['input', 'blur']
  }
}

// 加载设备列表，按类别分组构造下拉选项（维修中设备禁用）
function loadEquipment() {
  equipmentLoading.value = true
  getEquipment()
    .then((data) => {
      const list: Equipment[] = Array.isArray(data) ? data : []
      // 按 category 分组
      const groupMap = new Map<string, Equipment[]>()
      for (const e of list) {
        const cat = e.category || '其他'
        if (!groupMap.has(cat)) groupMap.set(cat, [])
        groupMap.get(cat)!.push(e)
      }
      equipmentOptions.value = Array.from(groupMap.entries()).map(
        ([category, items]) => ({
          type: 'group' as const,
          label: category,
          key: category,
          children: items.map((e) => ({
            label: `${e.code} - ${e.name}${
              e.status === 'repair' ? '（维修中）' : ''
            }`,
            value: e.id,
            disabled: e.status === 'repair'
          }))
        })
      )
    })
    .catch((e: any) => {
      toast.error(errMsg(e, '加载设备列表失败'))
    })
    .finally(() => {
      equipmentLoading.value = false
    })
}

// 字段变化：保存草稿 + 节流触发冲突检测
function onFieldChange() {
  saveDraft()
  scheduleConflictCheck()
}

function scheduleConflictCheck() {
  if (conflictTimer) clearTimeout(conflictTimer)
  conflictTimer = setTimeout(runConflictCheck, 400)
}

// 冲突检测：设备 + 两个时间齐全且合法时调用
async function runConflictCheck() {
  if (
    !form.equipmentId ||
    !form.borrowTime ||
    !form.returnTime ||
    (form.returnTime as number) <= (form.borrowTime as number)
  ) {
    conflict.value = null
    return
  }
  try {
    const data = await checkConflict({
      equipment_id: form.equipmentId,
      borrow_time: new Date(form.borrowTime).toISOString(),
      return_time: new Date(form.returnTime).toISOString()
    })
    conflict.value = data
  } catch {
    // 冲突检测失败不阻塞填写
    conflict.value = null
  }
}

// 草稿持久化
function saveDraft() {
  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        equipmentId: form.equipmentId,
        borrowTime: form.borrowTime,
        returnTime: form.returnTime,
        reason: form.reason
      })
    )
  } catch {
    /* ignore */
  }
}

function loadDraft() {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY)
    if (!saved) return
    const d = JSON.parse(saved)
    form.equipmentId = d.equipmentId ?? null
    form.borrowTime = d.borrowTime ?? null
    form.returnTime = d.returnTime ?? null
    form.reason = d.reason ?? ''
    if (form.equipmentId && form.borrowTime && form.returnTime) {
      scheduleConflictCheck()
    }
  } catch {
    /* ignore */
  }
}

function resetDraft() {
  form.equipmentId = null
  form.borrowTime = null
  form.returnTime = null
  form.reason = ''
  conflict.value = null
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
  toast.success('已清空草稿')
}

// 提交申请
async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    toast.warning('请完整填写表单')
    return
  }
  if (conflict.value?.conflict_type === 'hard') {
    toast.error('存在强冲突，无法提交')
    return
  }
  submitting.value = true
  try {
    await createRequest({
      equipment_id: form.equipmentId as number,
      borrow_time: new Date(form.borrowTime as number).toISOString(),
      return_time: new Date(form.returnTime as number).toISOString(),
      reason: form.reason
    })
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
    toast.success('申请已提交，请等待管理员审核')
    router.push('/overview')
  } catch (e: any) {
    toast.error(errMsg(e, '提交失败'))
  } finally {
    submitting.value = false
  }
}

// 统一错误信息提取
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

onMounted(() => {
  loadEquipment()
  loadDraft()
})
</script>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--text);
  font-family: var(--font);
  letter-spacing: 0.3px;
}
.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}
.form-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  animation: slideUp 0.4s ease both;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.field-icon {
  font-size: 14px;
  opacity: 0.7;
}
.conflict-alert {
  margin-bottom: 16px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .form-wrapper {
    padding: 18px;
  }
  .page-title {
    font-size: 20px;
  }
}
</style>
