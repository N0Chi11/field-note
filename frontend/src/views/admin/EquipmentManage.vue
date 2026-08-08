<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  NButton,
  NTag,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NUpload,
  NPopconfirm,
  NSpin,
  NDivider,
  NSpace,
  type FormInst,
  type FormRules,
  type UploadFileInfo
} from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import EquipmentTimeline from '@/components/EquipmentTimeline.vue'
import {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  updateEquipmentStatus,
  uploadEquipmentImage
} from '@/api/equipment'
import { getCards, createCard, updateCard, deleteCard, uploadCardImage } from '@/api/card'
import { useToastStore } from '@/stores/toast'
import type { Equipment, Card, EquipmentStatus } from '@/types/models'

const toast = useToastStore()

/* ------------------------------------------------------------------ *
 * 时间轴弹窗状态
 * ------------------------------------------------------------------ */
const timelineVisible = ref(false)
const timelineEquipmentId = ref<number | null>(null)

/** 查看设备借用时间轴 */
function viewTimeline(item: Equipment) {
  timelineEquipmentId.value = item.id
  timelineVisible.value = true
}

/* ------------------------------------------------------------------ *
 * 下拉选项
 * ------------------------------------------------------------------ */
const categoryOptions = [
  { label: '相机', value: '相机' },
  { label: '镜头', value: '镜头' },
  { label: '灯光', value: '灯光' },
  { label: '录音设备', value: '录音设备' },
  { label: '三脚架', value: '三脚架' },
  { label: '其他', value: '其他' }
]

/** 设备状态可手动设置项（borrowed 不可手动设置） */
const equipmentStatusOptions: { label: string; value: EquipmentStatus }[] = [
  { label: '可用', value: 'available' },
  { label: '维修中', value: 'repair' }
]

/* ------------------------------------------------------------------ *
 * 设备 / 卡列表
 * ------------------------------------------------------------------ */
const equipmentList = ref<Equipment[]>([])
const cardList = ref<Card[]>([])
const equipmentLoading = ref(false)
const cardLoading = ref(false)

/** 内存卡统计 */
const cardStats = computed(() => {
  const total = cardList.value.length
  const available = cardList.value.filter((c) => c.status === 'available').length
  const borrowed = cardList.value.filter((c) => c.status === 'borrowed').length
  return { total, available, borrowed }
})

/* ------------------------------------------------------------------ *
 * 状态标签映射
 * ------------------------------------------------------------------ */
interface StatusMeta {
  type: 'success' | 'error' | 'default'
  label: string
}

function equipmentStatusMeta(status: EquipmentStatus): StatusMeta {
  switch (status) {
    case 'available':
      return { type: 'success', label: '可用' }
    case 'borrowed':
      return { type: 'error', label: '借用中' }
    case 'repair':
      return { type: 'default', label: '维修中' }
  }
}

function cardStatusMeta(status: Card['status']): StatusMeta {
  return status === 'available'
    ? { type: 'success', label: '可用' }
    : { type: 'error', label: '已配出' }
}

/* ------------------------------------------------------------------ *
 * 设备编辑弹窗
 * ------------------------------------------------------------------ */
interface EquipmentForm {
  code: string
  name: string
  category: string
  icon: string
  status: 'available' | 'repair'
  notes: string
}

const equipModalShow = ref(false)
const equipSaving = ref(false)
const equipEditing = ref<Equipment | null>(null)
const equipFormRef = ref<FormInst | null>(null)
const equipFileList = ref<UploadFileInfo[]>([])
const pendingImage = ref<File | null>(null)

const equipForm = reactive<EquipmentForm>({
  code: '',
  name: '',
  category: '相机',
  icon: '📦',
  status: 'available',
  notes: ''
})

const equipRules: FormRules = {
  code: [
    { required: true, message: '请输入设备编号', trigger: ['blur', 'input'] }
  ],
  name: [
    { required: true, message: '请输入设备名称', trigger: ['blur', 'input'] }
  ],
  category: [
    { required: true, message: '请选择设备类别', trigger: ['change', 'blur'] }
  ],
  icon: [{ required: true, message: '请输入图标', trigger: ['blur', 'input'] }]
}

function resetEquipForm() {
  equipForm.code = ''
  equipForm.name = ''
  equipForm.category = '相机'
  equipForm.icon = '📦'
  equipForm.status = 'available'
  equipForm.notes = ''
  equipEditing.value = null
  equipFileList.value = []
  pendingImage.value = null
}

function openEquipModal(item?: Equipment) {
  resetEquipForm()
  if (item) {
    equipEditing.value = item
    equipForm.code = item.code
    equipForm.name = item.name
    equipForm.category = item.category
    equipForm.icon = item.icon || '📦'
    equipForm.status =
      item.status === 'borrowed' ? 'available' : (item.status as 'available' | 'repair')
    equipForm.notes = item.notes || ''
    // 若已有图片，展示在上传列表中
    if (item.image_url) {
      equipFileList.value = [
        {
          id: 'existing-image',
          name: 'current.jpg',
          status: 'finished',
          url: item.image_url
        }
      ]
    }
  }
  equipModalShow.value = true
}

function handleEquipFileChange(data: { fileList: UploadFileInfo[] }) {
  equipFileList.value = data.fileList
  const last = data.fileList[data.fileList.length - 1]
  if (last && last.file) {
    pendingImage.value = last.file
  } else {
    pendingImage.value = null
  }
}

async function saveEquipment() {
  try {
    await equipFormRef.value?.validate()
  } catch {
    return
  }

  equipSaving.value = true
  try {
    const payload: Partial<Equipment> = {
      code: equipForm.code,
      name: equipForm.name,
      category: equipForm.category,
      icon: equipForm.icon || '📦',
      status: equipForm.status,
      notes: equipForm.notes || undefined
    }

    let saved: Equipment
    if (equipEditing.value) {
      // 编辑：code 只读，不提交（后端应忽略或保持原值）
      saved = await updateEquipment(equipEditing.value.id, payload)
      // 若选择了新图片，上传
      if (pendingImage.value) {
        try {
          const res = await uploadEquipmentImage(saved.id, pendingImage.value)
          saved.image_url = res.image_url
        } catch (e: any) {
          toast.warning('图片上传失败，设备信息已保存')
        }
      }
      toast.success('设备已更新')
    } else {
      saved = await createEquipment(payload)
      if (pendingImage.value) {
        try {
          const res = await uploadEquipmentImage(saved.id, pendingImage.value)
          saved.image_url = res.image_url
        } catch (e: any) {
          toast.warning('图片上传失败，设备已创建')
        }
      }
      toast.success('设备已添加')
    }

    equipModalShow.value = false
    await loadEquipment()
  } catch (e: any) {
    toast.error(errMsg(e, '保存失败'))
  } finally {
    equipSaving.value = false
  }
}

async function toggleEquipmentStatus(item: Equipment) {
  // 仅在 available / repair 之间切换
  const next: EquipmentStatus = item.status === 'available' ? 'repair' : 'available'
  try {
    await updateEquipmentStatus(item.id, next)
    toast.success(next === 'repair' ? '已设为维修中' : '已设为可用')
    await loadEquipment()
  } catch (e: any) {
    toast.error(errMsg(e, '状态更新失败'))
  }
}

async function removeEquipment(item: Equipment) {
  try {
    await deleteEquipment(item.id)
    toast.success('设备已删除')
    await loadEquipment()
  } catch (e: any) {
    toast.error(errMsg(e, '删除失败'))
  }
}

/* ------------------------------------------------------------------ *
 * 内存卡编辑弹窗
 * ------------------------------------------------------------------ */
interface CardForm {
  code: string
  name: string
  notes: string
}

const cardModalShow = ref(false)
const cardSaving = ref(false)
const cardEditing = ref<Card | null>(null)
const cardFormRef = ref<FormInst | null>(null)
const cardFileList = ref<UploadFileInfo[]>([])
const pendingCardImage = ref<File | null>(null)

const cardForm = reactive<CardForm>({
  code: '',
  name: '',
  notes: ''
})

const cardRules: FormRules = {
  code: [
    { required: true, message: '请输入内存卡编号', trigger: ['blur', 'input'] }
  ],
  name: [
    { required: true, message: '请输入内存卡名称', trigger: ['blur', 'input'] }
  ]
}

function resetCardForm() {
  cardForm.code = ''
  cardForm.name = ''
  cardForm.notes = ''
  cardEditing.value = null
  cardFileList.value = []
  pendingCardImage.value = null
}

function openCardModal(item?: Card) {
  resetCardForm()
  if (item) {
    cardEditing.value = item
    cardForm.code = item.code
    cardForm.name = item.name
    cardForm.notes = item.notes || ''
    // 若已有图片，展示在上传列表中
    if (item.image_url) {
      cardFileList.value = [
        {
          id: 'existing-card-image',
          name: 'current.jpg',
          status: 'finished',
          url: item.image_url
        }
      ]
    }
  }
  cardModalShow.value = true
}

function handleCardFileChange(data: { fileList: UploadFileInfo[] }) {
  cardFileList.value = data.fileList
  const last = data.fileList[data.fileList.length - 1]
  if (last && last.file) {
    pendingCardImage.value = last.file
  } else {
    pendingCardImage.value = null
  }
}

async function saveCard() {
  try {
    await cardFormRef.value?.validate()
  } catch {
    return
  }

  cardSaving.value = true
  try {
    const payload: Partial<Card> = {
      code: cardForm.code,
      name: cardForm.name,
      notes: cardForm.notes || undefined
    }

    let saved: Card
    if (cardEditing.value) {
      saved = await updateCard(cardEditing.value.id, payload)
      // 若选择了新图片，上传
      if (pendingCardImage.value) {
        try {
          const res = await uploadCardImage(saved.id, pendingCardImage.value)
          saved.image_url = res.image_url
        } catch (e: any) {
          toast.warning('图片上传失败，内存卡信息已保存')
        }
      }
      toast.success('内存卡已更新')
    } else {
      saved = await createCard(payload)
      if (pendingCardImage.value) {
        try {
          const res = await uploadCardImage(saved.id, pendingCardImage.value)
          saved.image_url = res.image_url
        } catch (e: any) {
          toast.warning('图片上传失败，内存卡已创建')
        }
      }
      toast.success('内存卡已添加')
    }

    cardModalShow.value = false
    await loadCards()
  } catch (e: any) {
    toast.error(errMsg(e, '保存失败'))
  } finally {
    cardSaving.value = false
  }
}

async function removeCard(item: Card) {
  try {
    await deleteCard(item.id)
    toast.success('内存卡已删除')
    await loadCards()
  } catch (e: any) {
    toast.error(errMsg(e, '删除失败'))
  }
}

/* ------------------------------------------------------------------ *
 * 数据加载
 * ------------------------------------------------------------------ */
async function loadEquipment() {
  equipmentLoading.value = true
  try {
    const data = await getEquipment()
    equipmentList.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    toast.error(errMsg(e, '加载设备列表失败'))
    equipmentList.value = []
  } finally {
    equipmentLoading.value = false
  }
}

async function loadCards() {
  cardLoading.value = true
  try {
    const data = await getCards()
    cardList.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    toast.error(errMsg(e, '加载内存卡列表失败'))
    cardList.value = []
  } finally {
    cardLoading.value = false
  }
}

/* ------------------------------------------------------------------ *
 * 工具：错误信息提取
 * ------------------------------------------------------------------ */
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

onMounted(() => {
  loadEquipment()
  loadCards()
})
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- ============ 设备管理区域 ============ -->
      <section class="section">
        <div class="section-header">
          <div class="section-title-wrap">
            <h1 class="page-title">设备维护</h1>
            <p class="page-desc">管理设备信息、状态与图片</p>
          </div>
          <n-button type="primary" @click="openEquipModal()">
            + 添加设备
          </n-button>
        </div>

        <n-spin :show="equipmentLoading">
          <empty-state
            v-if="!equipmentLoading && equipmentList.length === 0"
            icon="📦"
            text="暂无设备"
            sub-text="点击右上角「添加设备」创建第一个设备"
          />
          <div v-else class="card-grid">
            <div
              v-for="item in equipmentList"
              :key="item.id"
              class="equip-card"
            >
              <!-- 图片 / 图标 -->
              <div class="equip-card__media">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name"
                  class="equip-card__img"
                />
                <span v-else class="equip-card__icon">{{ item.icon || '📦' }}</span>
                <n-tag
                  class="equip-card__status"
                  :type="equipmentStatusMeta(item.status).type"
                  size="small"
                  round
                >
                  {{ equipmentStatusMeta(item.status).label }}
                </n-tag>
              </div>

              <!-- 信息 -->
              <div class="equip-card__body">
                <div class="equip-card__title">{{ item.name }}</div>
                <div class="equip-card__code">{{ item.code }}</div>
                <div class="equip-card__tags">
                  <n-tag size="small" :bordered="false" type="warning">
                    {{ item.category }}
                  </n-tag>
                </div>
                <p v-if="item.notes" class="equip-card__notes">
                  {{ item.notes }}
                </p>
              </div>

              <!-- 操作 -->
              <div class="equip-card__actions">
                <n-button size="small" tertiary @click="viewTimeline(item)">
                  时间轴
                </n-button>
                <n-button size="small" tertiary @click="openEquipModal(item)">
                  编辑
                </n-button>
                <n-button
                  v-if="item.status === 'available'"
                  size="small"
                  tertiary
                  type="warning"
                  @click="toggleEquipmentStatus(item)"
                >
                  设为维修
                </n-button>
                <n-button
                  v-else-if="item.status === 'repair'"
                  size="small"
                  tertiary
                  type="success"
                  @click="toggleEquipmentStatus(item)"
                >
                  设为可用
                </n-button>
                <n-popconfirm
                  @positive-click="removeEquipment(item)"
                >
                  <template #trigger>
                    <n-button size="small" tertiary type="error">
                      删除
                    </n-button>
                  </template>
                  确定删除设备「{{ item.name }}」吗？此操作不可撤销。
                </n-popconfirm>
              </div>
            </div>
          </div>
        </n-spin>
      </section>

      <n-divider />

      <!-- ============ 内存卡管理区域 ============ -->
      <section class="section">
        <div class="section-header">
          <div class="section-title-wrap">
            <h2 class="section-title">内存卡管理</h2>
            <p class="page-desc">管理可配发的内存卡</p>
          </div>
          <n-button type="primary" @click="openCardModal()">
            + 添加内存卡
          </n-button>
        </div>

        <!-- 卡数量汇总 -->
        <div class="card-stats">
          <n-tag type="success" round size="medium">
            可用 {{ cardStats.available }} 张
          </n-tag>
          <n-tag type="error" round size="medium">
            已配出 {{ cardStats.borrowed }} 张
          </n-tag>
          <n-tag type="default" round size="medium">
            共 {{ cardStats.total }} 张
          </n-tag>
        </div>

        <n-spin :show="cardLoading">
          <empty-state
            v-if="!cardLoading && cardList.length === 0"
            icon="💾"
            text="暂无内存卡"
            sub-text="点击右上角「添加内存卡」创建第一张卡"
          />
          <div v-else class="card-grid">
            <div v-for="card in cardList" :key="card.id" class="card-item">
              <!-- 图片 / 图标 -->
              <div class="card-item__media">
                <img
                  v-if="card.image_url"
                  :src="card.image_url"
                  :alt="card.name"
                  class="card-item__img"
                />
                <span v-else class="card-item__icon">💾</span>
                <n-tag
                  class="card-item__status"
                  :type="cardStatusMeta(card.status).type"
                  size="small"
                  round
                >
                  {{ cardStatusMeta(card.status).label }}
                </n-tag>
              </div>
              <div class="card-item__body">
                <div class="card-item__name">{{ card.name }}</div>
                <div class="card-item__code">{{ card.code }}</div>
                <p v-if="card.notes" class="card-item__notes">{{ card.notes }}</p>
              </div>
              <div class="card-item__actions">
                <n-button size="small" tertiary @click="openCardModal(card)">
                  编辑
                </n-button>
                <n-popconfirm
                  @positive-click="removeCard(card)"
                >
                  <template #trigger>
                    <n-button size="small" tertiary type="error">
                      删除
                    </n-button>
                  </template>
                  确定删除内存卡「{{ card.name }}」吗？此操作不可撤销。
                </n-popconfirm>
              </div>
            </div>
          </div>
        </n-spin>
      </section>

      <!-- ============ 设备编辑弹窗 ============ -->
      <n-modal
        v-model:show="equipModalShow"
        preset="card"
        :title="equipEditing ? '编辑设备' : '添加设备'"
        style="width: 560px; max-width: 92vw"
        :mask-closable="false"
      >
        <n-form
          ref="equipFormRef"
          :model="equipForm"
          :rules="equipRules"
          label-placement="top"
        >
          <div class="form-row">
            <n-form-item label="编号" path="code">
              <n-input
                v-model:value="equipForm.code"
                placeholder="如 CAM-001"
                :disabled="!!equipEditing"
                clearable
              />
            </n-form-item>
            <n-form-item label="名称" path="name">
              <n-input
                v-model:value="equipForm.name"
                placeholder="如 索尼 A7M4"
                clearable
              />
            </n-form-item>
          </div>

          <div class="form-row">
            <n-form-item label="类别" path="category">
              <n-select
                v-model:value="equipForm.category"
                :options="categoryOptions"
                placeholder="选择类别"
              />
            </n-form-item>
            <n-form-item label="图标" path="icon">
              <n-input
                v-model:value="equipForm.icon"
                placeholder="emoji，如 📷"
                maxlength="4"
              />
            </n-form-item>
          </div>

          <n-form-item label="状态" path="status">
            <n-select
              v-model:value="equipForm.status"
              :options="equipmentStatusOptions"
              placeholder="选择状态"
            />
          </n-form-item>

          <n-form-item label="备注" path="notes">
            <n-input
              v-model:value="equipForm.notes"
              type="textarea"
              placeholder="可选，设备相关说明"
              :autosize="{ minRows: 2, maxRows: 4 }"
              maxlength="200"
              show-count
            />
          </n-form-item>

          <n-form-item label="设备图片">
            <n-upload
              v-model:file-list="equipFileList"
              list-type="image-card"
              :max="1"
              :default-upload="false"
              accept="image/*"
              @change="handleEquipFileChange"
            >
              点击上传
            </n-upload>
          </n-form-item>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="equipModalShow = false">取消</n-button>
            <n-button type="primary" :loading="equipSaving" @click="saveEquipment">
              保存
            </n-button>
          </n-space>
        </template>
      </n-modal>

      <!-- ============ 内存卡编辑弹窗 ============ -->
      <n-modal
        v-model:show="cardModalShow"
        preset="card"
        :title="cardEditing ? '编辑内存卡' : '添加内存卡'"
        style="width: 480px; max-width: 92vw"
        :mask-closable="false"
      >
        <n-form
          ref="cardFormRef"
          :model="cardForm"
          :rules="cardRules"
          label-placement="top"
        >
          <n-form-item label="编号" path="code">
            <n-input
              v-model:value="cardForm.code"
              placeholder="如 SD-001"
              :disabled="!!cardEditing"
              clearable
            />
          </n-form-item>
          <n-form-item label="名称" path="name">
            <n-input
              v-model:value="cardForm.name"
              placeholder="如 SanDisk 128GB"
              clearable
            />
          </n-form-item>
          <n-form-item label="备注" path="notes">
            <n-input
              v-model:value="cardForm.notes"
              type="textarea"
              placeholder="可选"
              :autosize="{ minRows: 2, maxRows: 4 }"
              maxlength="200"
              show-count
            />
          </n-form-item>
          <n-form-item label="内存卡图片">
            <n-upload
              v-model:file-list="cardFileList"
              list-type="image-card"
              :max="1"
              :default-upload="false"
              accept="image/*"
              @change="handleCardFileChange"
            >
              点击上传
            </n-upload>
          </n-form-item>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="cardModalShow = false">取消</n-button>
            <n-button type="primary" :loading="cardSaving" @click="saveCard">
              保存
            </n-button>
          </n-space>
        </template>
      </n-modal>

      <!-- ============ 时间轴弹窗 ============ -->
      <EquipmentTimeline
        v-model:visible="timelineVisible"
        :equipment-id="timelineEquipmentId"
      />
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
}

/* ---------- 区块 ---------- */
.section {
  margin-bottom: 8px;
}
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.section-title-wrap {
  min-width: 0;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}
.section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}
.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* ---------- 卡片网格 ---------- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* ---------- 设备卡片 ---------- */
.equip-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.equip-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.equip-card__media {
  position: relative;
  height: 160px;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.equip-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.equip-card__icon {
  font-size: 56px;
  line-height: 1;
}
.equip-card__status {
  position: absolute;
  top: 10px;
  right: 10px;
}
.equip-card__body {
  padding: 14px 16px 8px;
  flex: 1;
  min-width: 0;
}
.equip-card__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.equip-card__code {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}
.equip-card__tags {
  margin-top: 8px;
}
.equip-card__notes {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.equip-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--border);
}

/* ---------- 内存卡卡片 ---------- */
.card-item {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.card-item__media {
  position: relative;
  height: 140px;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-item__icon {
  font-size: 48px;
  line-height: 1;
}
.card-item__status {
  position: absolute;
  top: 10px;
  right: 10px;
}
.card-item__body {
  padding: 14px 16px 8px;
  flex: 1;
  min-width: 0;
}
.card-item__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-item__code {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}
.card-item__notes {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px 14px;
  border-top: 1px solid var(--border);
}

/* ---------- 统计标签 ---------- */
.card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

/* ---------- 弹窗表单 ---------- */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ---------- 覆盖 Naive UI 主色为主题强调色 ---------- */
:deep(.n-button--primary-type) {
  --n-color: var(--accent) !important;
  --n-color-hover: #a67a26 !important;
  --n-color-pressed: #946d22 !important;
  --n-color-focus: #a67a26 !important;
  --n-text-color: #ffffff !important;
  --n-text-color-hover: #ffffff !important;
  --n-text-color-pressed: #ffffff !important;
  --n-text-color-focus: #ffffff !important;
}
:deep(.n-input--focus),
:deep(.n-base-selection--focus),
:deep(.n-base-selection:focus-within) {
  --n-border-color: var(--accent) !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(184, 134, 43, 0.15) !important;
  --n-caret-color: var(--accent) !important;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .section-header {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
