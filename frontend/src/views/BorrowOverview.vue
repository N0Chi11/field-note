<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">借用一览</h1>
        <p class="page-desc">
          {{ isAdmin ? '管理所有借用申请记录' : '查看你的借用申请记录' }}
        </p>
      </div>

      <!-- 筛选标签栏 + 搜索框 -->
      <div class="toolbar">
        <FilterTabs v-model="activeTab" :tabs="tabItems" class="filter-tabs" />
        <n-input
          v-model:value="keyword"
          placeholder="搜索工单号 / 设备 / 理由"
          clearable
          class="search-input"
        >
          <template #prefix>
            <n-icon :component="SearchOutline" />
          </template>
        </n-input>
      </div>

      <!-- 借用记录列表 -->
      <n-spin :show="loading">
        <div v-if="filtered.length" class="request-list">
          <div v-for="r in filtered" :key="r.id" class="request-card">
            <!-- 卡片头部：工单号 + 状态标签 -->
            <div class="card-head">
              <span class="work-order">{{ r.work_order_no }}</span>
              <n-tag :type="statusColor(r.status)" size="small" round>
                {{ statusText(r.status) }}
              </n-tag>
            </div>

            <!-- 卡片主体 -->
            <div class="card-body">
              <div class="field">
                <span class="label">设备</span>
                <span class="value">{{ r.equipment_name }}</span>
              </div>
              <div class="field">
                <span class="label">借用人</span>
                <span class="value">{{ r.user_name }}</span>
              </div>
              <div class="field">
                <span class="label">借用时间</span>
                <span class="value">{{ fmt(r.borrow_time) }}</span>
              </div>
              <div class="field">
                <span class="label">归还时间</span>
                <span class="value">{{ fmt(r.return_time) }}</span>
              </div>
              <div v-if="r.approver_name" class="field">
                <span class="label">审批人</span>
                <span class="value">{{ r.approver_name }}</span>
              </div>
              <div v-if="r.card_name" class="field">
                <span class="label">配套内存卡</span>
                <span class="value">{{ r.card_name }}</span>
              </div>
              <div class="field full">
                <span class="label">借用理由</span>
                <span class="value">{{ r.reason }}</span>
              </div>
              <div v-if="r.admin_comment" class="field full">
                <span class="label">审批备注</span>
                <span class="value">{{ r.admin_comment }}</span>
              </div>
              <div v-if="r.return_photo_url" class="field full">
                <span class="label">归还照片</span>
                <a :href="r.return_photo_url" target="_blank" class="photo-link">
                  <img
                    :src="r.return_photo_url"
                    class="return-photo"
                    alt="归还照片"
                  />
                </a>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div v-if="hasActions(r)" class="card-actions">
              <!-- 普通用户操作 -->
              <template v-if="!isAdmin">
                <n-button
                  v-if="r.status === 'borrowing'"
                  size="small"
                  type="primary"
                  @click="openUpload(r)"
                >
                  上传归还照片
                </n-button>
                <n-popconfirm
                  v-if="r.status === 'pending'"
                  @positive-click="cancelRequest(r)"
                >
                  <template #trigger>
                    <n-button size="small" type="warning" ghost>
                      取消申请
                    </n-button>
                  </template>
                  确认取消该申请？取消后无法恢复。
                </n-popconfirm>
              </template>

              <!-- 管理员操作 -->
              <template v-else>
                <template v-if="r.status === 'pending'">
                  <n-button
                    size="small"
                    type="success"
                    @click="openAction(r, 'approve')"
                  >
                    审批
                  </n-button>
                  <n-button
                    size="small"
                    type="error"
                    ghost
                    @click="openAction(r, 'reject')"
                  >
                    拒绝
                  </n-button>
                </template>
                <n-popconfirm
                  v-if="r.status === 'approved'"
                  @positive-click="confirmPickupHandler(r)"
                >
                  <template #trigger>
                    <n-button size="small" type="primary">
                      确认领取
                    </n-button>
                  </template>
                  确认该申请已领取设备？状态将变为「借用中」。
                </n-popconfirm>
                <n-popconfirm
                  v-if="r.status === 'return_pending'"
                  @positive-click="confirmReturnHandler(r)"
                >
                  <template #trigger>
                    <n-button size="small" type="success">
                      确认归还
                    </n-button>
                  </template>
                  确认设备已归还？状态将变为「已归还」。
                </n-popconfirm>
              </template>
            </div>
          </div>
        </div>
        <EmptyState v-else icon="📋" text="暂无借用记录" />
      </n-spin>

      <!-- 归还照片上传弹窗 -->
      <n-modal
        v-model:show="showUploadModal"
        preset="card"
        title="上传归还照片"
        style="max-width: 480px"
      >
        <div v-if="currentUpload" class="modal-info">
          <div><strong>工单号：</strong>{{ currentUpload.work_order_no }}</div>
          <div><strong>设备：</strong>{{ currentUpload.equipment_name }}</div>
        </div>
        <n-upload
          :custom-request="customUpload"
          accept="image/*"
          :max="1"
          list-type="image-card"
        >
          点击上传归还照片
        </n-upload>
        <p class="upload-tip">
          上传后状态将变为「待归还确认」，等待管理员确认。
        </p>
      </n-modal>

      <!-- 审批 / 拒绝 弹窗 -->
      <n-modal
        v-model:show="showActionModal"
        preset="card"
        :title="actionType === 'approve' ? '审批通过' : '拒绝申请'"
        style="max-width: 480px"
      >
        <div v-if="currentAction" class="modal-info">
          <div><strong>工单号：</strong>{{ currentAction.work_order_no }}</div>
          <div><strong>设备：</strong>{{ currentAction.equipment_name }}</div>
          <div><strong>借用人：</strong>{{ currentAction.user_name }}</div>
          <div>
            <strong>时间：</strong>{{ fmt(currentAction.borrow_time) }} →
            {{ fmt(currentAction.return_time) }}
          </div>
          <div><strong>理由：</strong>{{ currentAction.reason }}</div>
        </div>
        <n-input
          v-model:value="actionComment"
          type="textarea"
          :placeholder="
            actionType === 'approve'
              ? '审批备注（选填）'
              : '请填写拒绝理由（必填）'
          "
          :autosize="{ minRows: 3, maxRows: 5 }"
          style="margin-top: 12px"
        />
        <template #footer>
          <div class="modal-footer">
            <n-button @click="showActionModal = false">取消</n-button>
            <n-button
              :type="actionType === 'approve' ? 'success' : 'error'"
              :loading="actionLoading"
              :disabled="actionType === 'reject' && !actionComment.trim()"
              @click="submitAction"
            >
              {{ actionType === 'approve' ? '确认通过' : '确认拒绝' }}
            </n-button>
          </div>
        </template>
      </n-modal>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NInput,
  NButton,
  NTag,
  NIcon,
  NSpin,
  NModal,
  NUpload,
  NPopconfirm,
  type UploadCustomRequestOptions
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import AppLayout from '@/components/AppLayout.vue'
import FilterTabs from '@/components/common/FilterTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import {
  getRequests,
  deleteRequest,
  submitReturn
} from '@/api/borrow'
import {
  approveRequest,
  rejectRequest,
  confirmPickup,
  confirmReturn
} from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type {
  BorrowDetail,
  BorrowRequestQuery,
  PaginatedResponse,
  RequestStatus
} from '@/types/models'

const toast = useToastStore()
const authStore = useAuthStore()
const isAdmin = computed(() => !!authStore.isAdmin)

// 状态文本 / 颜色映射
const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  borrowing: '借用中',
  return_pending: '待归还确认',
  returned: '已归还',
  rejected: '已拒绝',
  cancelled: '已取消'
}
const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: 'warning',
  approved: 'info',
  borrowing: 'success',
  return_pending: 'warning',
  returned: 'default',
  rejected: 'error',
  cancelled: 'default'
}

function statusText(status: RequestStatus): string {
  return STATUS_TEXT[status] || status
}
function statusColor(status: RequestStatus): 'warning' | 'error' | 'default' | 'success' | 'primary' | 'info' {
  return (STATUS_COLORS[status] || 'default') as 'warning' | 'error' | 'default' | 'success' | 'primary' | 'info'
}

// 日期格式化
function fmt(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours()
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const loading = ref(false)
const requests = ref<BorrowDetail[]>([])
const keyword = ref('')
const activeTab = ref('all')

// 筛选标签（标签内带计数）
const tabItems = computed(() => [
  { key: 'all', label: `全部 (${requests.value.length})` },
  {
    key: 'pending',
    label: `待审核 (${requests.value.filter((r) => r.status === 'pending').length})`
  },
  {
    key: 'active',
    label: `进行中 (${requests.value.filter((r) =>
      ['approved', 'borrowing', 'return_pending'].includes(r.status)
    ).length})`
  },
  {
    key: 'returned',
    label: `已归还 (${requests.value.filter((r) => r.status === 'returned').length})`
  },
  {
    key: 'rejected',
    label: `已拒绝 (${requests.value.filter((r) => r.status === 'rejected').length})`
  }
])

// 本地过滤：标签 + 关键字
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return requests.value.filter((r) => {
    // 标签过滤
    if (activeTab.value === 'pending' && r.status !== 'pending') return false
    if (
      activeTab.value === 'active' &&
      !['approved', 'borrowing', 'return_pending'].includes(r.status)
    )
      return false
    if (activeTab.value === 'returned' && r.status !== 'returned') return false
    if (activeTab.value === 'rejected' && r.status !== 'rejected') return false
    // 关键字过滤
    if (kw) {
      const hit =
        r.work_order_no.toLowerCase().includes(kw) ||
        r.equipment_name.toLowerCase().includes(kw) ||
        r.reason.toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

// 是否有操作按钮
function hasActions(r: BorrowDetail): boolean {
  if (isAdmin.value) {
    return ['pending', 'approved', 'return_pending'].includes(r.status)
  }
  return r.status === 'borrowing' || r.status === 'pending'
}

// 首次加载：分页拉取全部记录（本地过滤）
// 注：getRequests 的类型声明为 BorrowDetail[]，实际返回分页结构 { items, total, page, size }
async function loadRequests() {
  loading.value = true
  try {
    const all: BorrowDetail[] = []
    let page = 1
    const size = 100
    // 安全上限，避免异常时死循环
    for (let i = 0; i < 50; i++) {
      const params: BorrowRequestQuery & { page?: number; size?: number } = {
        page,
        size
      }
      const res = (await getRequests(params)) as unknown as PaginatedResponse<BorrowDetail>
      all.push(...res.items)
      if (res.items.length === 0 || all.length >= res.total) break
      page++
    }
    requests.value = all
  } catch (e: any) {
    toast.error(errMsg(e, '加载借用记录失败'))
    requests.value = []
  } finally {
    loading.value = false
  }
}

// ===== 普通用户：上传归还照片 =====
const showUploadModal = ref(false)
const currentUpload = ref<BorrowDetail | null>(null)

function openUpload(r: BorrowDetail) {
  currentUpload.value = r
  showUploadModal.value = true
}

function customUpload(options: UploadCustomRequestOptions) {
  const { file, onFinish, onError } = options
  const id = currentUpload.value?.id
  if (!id || !file.file) {
    onError()
    return
  }
  submitReturn(id, file.file as File)
    .then(() => {
      onFinish()
      toast.success('归还已提交，待管理员确认')
      showUploadModal.value = false
      loadRequests()
    })
    .catch((e: any) => {
      toast.error(errMsg(e, '上传失败'))
      onError()
    })
}

// ===== 普通用户：取消申请 =====
async function cancelRequest(r: BorrowDetail) {
  try {
    await deleteRequest(r.id)
    toast.success('已取消申请')
    loadRequests()
  } catch (e: any) {
    toast.error(errMsg(e, '取消失败'))
  }
}

// ===== 管理员：审批 / 拒绝 =====
const showActionModal = ref(false)
const actionType = ref<'approve' | 'reject'>('approve')
const actionComment = ref('')
const actionLoading = ref(false)
const currentAction = ref<BorrowDetail | null>(null)

function openAction(r: BorrowDetail, type: 'approve' | 'reject') {
  currentAction.value = r
  actionType.value = type
  actionComment.value = ''
  showActionModal.value = true
}

async function submitAction() {
  if (!currentAction.value) return
  if (actionType.value === 'reject' && !actionComment.value.trim()) {
    toast.warning('请填写拒绝理由')
    return
  }
  actionLoading.value = true
  try {
    if (actionType.value === 'approve') {
      await approveRequest(
        currentAction.value.id,
        actionComment.value.trim() || undefined
      )
      toast.success('已审批通过')
    } else {
      await rejectRequest(currentAction.value.id, actionComment.value.trim())
      toast.success('已拒绝申请')
    }
    showActionModal.value = false
    loadRequests()
  } catch (e: any) {
    toast.error(errMsg(e, '操作失败'))
  } finally {
    actionLoading.value = false
  }
}

// ===== 管理员：确认领取 =====
async function confirmPickupHandler(r: BorrowDetail) {
  try {
    await confirmPickup(r.id)
    toast.success('已确认领取')
    loadRequests()
  } catch (e: any) {
    toast.error(errMsg(e, '操作失败'))
  }
}

// ===== 管理员：确认归还 =====
async function confirmReturnHandler(r: BorrowDetail) {
  try {
    await confirmReturn(r.id)
    toast.success('归还确认完成')
    loadRequests()
  } catch (e: any) {
    toast.error(errMsg(e, '操作失败'))
  }
}

// 统一错误信息提取
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

onMounted(loadRequests)
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--text);
}
.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
.toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.filter-tabs {
  flex: 1;
  min-width: 260px;
}
.search-input {
  max-width: 280px;
  flex-shrink: 0;
}
.request-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.request-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border);
}
.work-order {
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  letter-spacing: 0.3px;
}
.card-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px 16px;
}
.field {
  display: flex;
  gap: 8px;
  font-size: 13px;
  line-height: 1.7;
}
.field.full {
  grid-column: 1 / -1;
}
.field .label {
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 72px;
}
.field .value {
  color: var(--text);
  word-break: break-word;
}
.photo-link {
  display: inline-block;
}
.return-photo {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: transform 0.2s;
}
.return-photo:hover {
  transform: scale(1.05);
}
.card-actions {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.modal-info {
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.9;
  margin-bottom: 4px;
}
.upload-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 12px 0 0;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
