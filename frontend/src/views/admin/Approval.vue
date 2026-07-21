<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NTag,
  NButton,
  NInput,
  NSelect,
  NSpin,
  NModal,
  NPopconfirm,
  type SelectOption
} from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import {
  getStats,
  approveRequest,
  rejectRequest,
  confirmPickup,
  confirmReturn
} from '@/api/admin'
import { getRequests, deleteRequest } from '@/api/borrow'
import { getCards } from '@/api/card'
import { useToastStore } from '@/stores/toast'
import type {
  BorrowDetail,
  BorrowRequestQuery,
  Card,
  AdminStats,
  PaginatedResponse,
  RequestStatus
} from '@/types/models'

const toast = useToastStore()

// ===== 状态文本 / 颜色 =====
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
  return_pending: 'primary',
  returned: 'default',
  rejected: 'error',
  cancelled: 'default'
}

function statusText(status: RequestStatus): string {
  return STATUS_TEXT[status] || status
}
function statusTagType(status: RequestStatus) {
  return (STATUS_COLORS[status] || 'default') as
    | 'warning'
    | 'error'
    | 'default'
    | 'success'
    | 'primary'
    | 'info'
}

// ===== 日期格式化 =====
function fmt(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr || '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`
}

// ===== 错误信息提取 =====
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

// ===== 数据 =====
const loading = ref(false)
const stats = ref<AdminStats>({
  total: 0,
  pending: 0,
  borrowing: 0,
  return_pending: 0
})
const records = ref<BorrowDetail[]>([])
const cards = ref<Card[]>([])

type FilterKey = 'pending' | 'borrowing' | 'return_pending' | 'all'
const selectedFilter = ref<FilterKey>('pending')

// ===== 统计卡片配置（黄 / 绿 / 蓝 / 灰）=====
interface StatItem {
  key: FilterKey
  label: string
  value: number
  color: string
  bg: string
  icon: string
}
const statItems = computed<StatItem[]>(() => [
  {
    key: 'pending',
    label: '待审核',
    value: stats.value.pending,
    color: '#d9a421',
    bg: 'rgba(217, 164, 33, 0.12)',
    icon: '⏳'
  },
  {
    key: 'borrowing',
    label: '借用中',
    value: stats.value.borrowing,
    color: 'var(--success)',
    bg: 'var(--success-bg)',
    icon: '📦'
  },
  {
    key: 'return_pending',
    label: '待归还确认',
    value: stats.value.return_pending,
    color: 'var(--info)',
    bg: 'rgba(91, 124, 153, 0.12)',
    icon: '📥'
  },
  {
    key: 'all',
    label: '总申请数',
    value: stats.value.total,
    color: 'var(--text-tertiary)',
    bg: 'rgba(153, 153, 153, 0.12)',
    icon: '📋'
  }
])

function selectFilter(key: FilterKey) {
  selectedFilter.value = key
}

// ===== 本地筛选 =====
const filteredRecords = computed(() => {
  if (selectedFilter.value === 'all') return records.value
  return records.value.filter((r) => r.status === selectedFilter.value)
})

const filterTitle = computed(() => {
  switch (selectedFilter.value) {
    case 'pending':
      return '待审核申请'
    case 'borrowing':
      return '借用中记录'
    case 'return_pending':
      return '待归还确认记录'
    default:
      return '全部申请记录'
  }
})

// ===== 相机判断（通过设备类别）=====
function isCamera(record: BorrowDetail): boolean {
  return (
    record.equipment_category === '相机' ||
    /相机|camera/i.test(record.equipment_category)
  )
}

// ===== 可用内存卡选项（领取弹窗使用）=====
const availableCards = computed(() =>
  cards.value.filter((c) => c.status === 'available')
)
// 卡 ID 从 1 开始，用 0 作为「不配卡」哨兵值
const NO_CARD = 0
const cardOptions = computed<SelectOption[]>(() => [
  { label: '不配卡', value: NO_CARD },
  ...availableCards.value.map((c) => ({
    label: `${c.code} - ${c.name}`,
    value: c.id
  }))
])

// ===== 数据加载 =====
// 注：getRequests 类型声明为 BorrowDetail[]，但后端可能返回分页结构 { items, total, page, size }
function normalize(data: any): BorrowDetail[] {
  if (Array.isArray(data)) return data as BorrowDetail[]
  if (data && Array.isArray((data as PaginatedResponse<BorrowDetail>).items)) {
    return (data as PaginatedResponse<BorrowDetail>).items
  }
  return []
}

async function loadStats() {
  try {
    stats.value = await getStats()
  } catch (e: any) {
    toast.error(errMsg(e, '加载统计失败'))
  }
}

async function loadRecords() {
  loading.value = true
  try {
    const all: BorrowDetail[] = []
    let page = 1
    const size = 100
    // 分页拉取全部记录（管理员视角），安全上限避免异常死循环
    for (let i = 0; i < 50; i++) {
      const params: BorrowRequestQuery & { page?: number; size?: number } = {
        page,
        size
      }
      const res = (await getRequests(params)) as any
      const list = normalize(res)
      all.push(...list)
      const total = typeof res?.total === 'number' ? res.total : list.length
      if (list.length === 0 || all.length >= total) break
      page++
    }
    records.value = all
  } catch (e: any) {
    toast.error(errMsg(e, '加载借用记录失败'))
    records.value = []
  } finally {
    loading.value = false
  }
}

async function loadCards() {
  try {
    const data = await getCards()
    cards.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    toast.error(errMsg(e, '加载内存卡列表失败'))
    cards.value = []
  }
}

async function reload() {
  await Promise.all([loadStats(), loadRecords(), loadCards()])
}

// ===== 审批 / 拒绝弹窗 =====
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const currentRecord = ref<BorrowDetail | null>(null)
const approveComment = ref('')
const rejectComment = ref('')
const actionLoading = ref(false)

function openApprove(r: BorrowDetail) {
  currentRecord.value = r
  approveComment.value = ''
  showApproveModal.value = true
}
function openReject(r: BorrowDetail) {
  currentRecord.value = r
  rejectComment.value = ''
  showRejectModal.value = true
}

async function submitApprove() {
  if (!currentRecord.value) return
  actionLoading.value = true
  try {
    await approveRequest(
      currentRecord.value.id,
      approveComment.value.trim() || undefined
    )
    toast.success('已审批通过')
    showApproveModal.value = false
    await reload()
  } catch (e: any) {
    toast.error(errMsg(e, '审批失败'))
  } finally {
    actionLoading.value = false
  }
}

async function submitReject() {
  if (!currentRecord.value) return
  if (!rejectComment.value.trim()) {
    toast.warning('请填写拒绝理由')
    return
  }
  actionLoading.value = true
  try {
    await rejectRequest(currentRecord.value.id, rejectComment.value.trim())
    toast.success('已拒绝申请')
    showRejectModal.value = false
    await reload()
  } catch (e: any) {
    toast.error(errMsg(e, '拒绝失败'))
  } finally {
    actionLoading.value = false
  }
}

// ===== 确认领取弹窗 =====
const showPickupModal = ref(false)
const pickupRecord = ref<BorrowDetail | null>(null)
const pickupCardId = ref<number>(NO_CARD)

function openPickup(r: BorrowDetail) {
  pickupRecord.value = r
  pickupCardId.value = NO_CARD
  showPickupModal.value = true
}

async function submitPickup() {
  if (!pickupRecord.value) return
  actionLoading.value = true
  try {
    await confirmPickup(
      pickupRecord.value.id,
      pickupCardId.value === NO_CARD ? undefined : pickupCardId.value
    )
    toast.success('已确认领取')
    showPickupModal.value = false
    await reload()
  } catch (e: any) {
    toast.error(errMsg(e, '确认领取失败'))
  } finally {
    actionLoading.value = false
  }
}

// ===== 确认归还（Popconfirm 直接确认）=====
const returnLoadingId = ref<number | null>(null)
async function handleConfirmReturn(r: BorrowDetail) {
  returnLoadingId.value = r.id
  try {
    await confirmReturn(r.id)
    toast.success('归还确认完成')
    await reload()
  } catch (e: any) {
    toast.error(errMsg(e, '确认归还失败'))
  } finally {
    returnLoadingId.value = null
  }
}

// ===== 删除（Popconfirm 确认）=====
const deleteLoadingId = ref<number | null>(null)
async function handleDelete(r: BorrowDetail) {
  deleteLoadingId.value = r.id
  try {
    await deleteRequest(r.id)
    toast.success('已删除该申请')
    await reload()
  } catch (e: any) {
    toast.error(errMsg(e, '删除失败'))
  } finally {
    deleteLoadingId.value = null
  }
}

onMounted(reload)
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">申请审批</h1>
        <p class="page-desc">审批借用申请，管理借用与归还流程</p>
      </div>

      <!-- 统计卡片（可点击筛选） -->
      <div class="stat-grid">
        <div
          v-for="item in statItems"
          :key="item.key"
          class="stat-card"
          :class="{ active: selectedFilter === item.key }"
          :style="{ '--card-color': item.color, '--card-bg': item.bg }"
          @click="selectFilter(item.key)"
        >
          <div class="stat-card__icon">{{ item.icon }}</div>
          <div class="stat-card__content">
            <div class="stat-card__value">{{ item.value }}</div>
            <div class="stat-card__label">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <!-- 当前筛选标题 + 计数 -->
      <div class="toolbar">
        <span class="toolbar-title">{{ filterTitle }}</span>
        <span class="toolbar-count">共 {{ filteredRecords.length }} 条</span>
      </div>

      <!-- 借用记录列表 -->
      <n-spin :show="loading">
        <div class="spin-area">
          <div v-if="filteredRecords.length" class="request-list">
            <div
              v-for="r in filteredRecords"
              :key="r.id"
              class="request-card"
            >
              <!-- 卡片头部：工单号 + 状态标签 -->
              <div class="card-head">
                <span class="work-order">{{ r.work_order_no }}</span>
                <n-tag :type="statusTagType(r.status)" size="small" round>
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
                  <span class="value">
                    {{ r.user_name }}
                    <span class="user-id">(#{{ r.user_id }})</span>
                  </span>
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
                  <span class="value comment">{{ r.admin_comment }}</span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="card-actions">
                <!-- pending：审批 + 拒绝 -->
                <template v-if="r.status === 'pending'">
                  <n-button
                    size="small"
                    type="success"
                    @click="openApprove(r)"
                  >
                    审批
                  </n-button>
                  <n-button
                    size="small"
                    type="error"
                    ghost
                    @click="openReject(r)"
                  >
                    拒绝
                  </n-button>
                </template>

                <!-- approved：确认领取 -->
                <n-button
                  v-if="r.status === 'approved'"
                  size="small"
                  type="primary"
                  @click="openPickup(r)"
                >
                  确认领取
                </n-button>

                <!-- return_pending：确认归还 -->
                <n-popconfirm
                  v-if="r.status === 'return_pending'"
                  @positive-click="handleConfirmReturn(r)"
                >
                  <template #trigger>
                    <n-button
                      size="small"
                      type="success"
                      :loading="returnLoadingId === r.id"
                    >
                      确认归还
                    </n-button>
                  </template>
                  确认设备已归还入库？状态将变为「已归还」。
                </n-popconfirm>

                <!-- 所有状态：删除 -->
                <n-popconfirm @positive-click="handleDelete(r)">
                  <template #trigger>
                    <n-button
                      size="small"
                      quaternary
                      :loading="deleteLoadingId === r.id"
                    >
                      删除
                    </n-button>
                  </template>
                  确认删除该申请？删除后无法恢复。
                </n-popconfirm>
              </div>
            </div>
          </div>
          <EmptyState
            v-else-if="!loading"
            icon="📋"
            text="暂无符合条件的借用记录"
          />
        </div>
      </n-spin>

      <!-- 审批弹窗 -->
      <n-modal
        v-model:show="showApproveModal"
        preset="card"
        title="审批通过"
        style="max-width: 480px"
      >
        <div v-if="currentRecord" class="modal-info">
          <div><strong>工单号：</strong>{{ currentRecord.work_order_no }}</div>
          <div><strong>设备：</strong>{{ currentRecord.equipment_name }}</div>
          <div><strong>借用人：</strong>{{ currentRecord.user_name }}</div>
          <div>
            <strong>时间：</strong>{{ fmt(currentRecord.borrow_time) }} →
            {{ fmt(currentRecord.return_time) }}
          </div>
          <div><strong>理由：</strong>{{ currentRecord.reason }}</div>
        </div>
        <n-input
          v-model:value="approveComment"
          type="textarea"
          placeholder="审批备注（选填）"
          :autosize="{ minRows: 3, maxRows: 5 }"
          style="margin-top: 12px"
        />
        <template #footer>
          <div class="modal-footer">
            <n-button @click="showApproveModal = false">取消</n-button>
            <n-button
              type="success"
              :loading="actionLoading"
              @click="submitApprove"
            >
              确认通过
            </n-button>
          </div>
        </template>
      </n-modal>

      <!-- 拒绝弹窗 -->
      <n-modal
        v-model:show="showRejectModal"
        preset="card"
        title="拒绝申请"
        style="max-width: 480px"
      >
        <div v-if="currentRecord" class="modal-info">
          <div><strong>工单号：</strong>{{ currentRecord.work_order_no }}</div>
          <div><strong>设备：</strong>{{ currentRecord.equipment_name }}</div>
          <div><strong>借用人：</strong>{{ currentRecord.user_name }}</div>
        </div>
        <n-input
          v-model:value="rejectComment"
          type="textarea"
          placeholder="请填写拒绝理由（必填）"
          :autosize="{ minRows: 3, maxRows: 5 }"
          style="margin-top: 12px"
        />
        <template #footer>
          <div class="modal-footer">
            <n-button @click="showRejectModal = false">取消</n-button>
            <n-button
              type="error"
              :loading="actionLoading"
              :disabled="!rejectComment.trim()"
              @click="submitReject"
            >
              确认拒绝
            </n-button>
          </div>
        </template>
      </n-modal>

      <!-- 领取弹窗 -->
      <n-modal
        v-model:show="showPickupModal"
        preset="card"
        title="确认领取"
        style="max-width: 480px"
      >
        <div v-if="pickupRecord" class="modal-info">
          <div><strong>工单号：</strong>{{ pickupRecord.work_order_no }}</div>
          <div><strong>设备：</strong>{{ pickupRecord.equipment_name }}</div>
          <div><strong>借用人：</strong>{{ pickupRecord.user_name }}</div>
          <div>
            <strong>时间：</strong>{{ fmt(pickupRecord.borrow_time) }} →
            {{ fmt(pickupRecord.return_time) }}
          </div>
        </div>

        <!-- 相机类设备：选择内存卡 -->
        <div
          v-if="pickupRecord && isCamera(pickupRecord)"
          class="pickup-card-select"
        >
          <div class="select-label">配套内存卡</div>
          <n-select
            v-model:value="pickupCardId"
            :options="cardOptions"
            placeholder="请选择内存卡"
          />
          <p class="select-tip">
            可选「不配卡」，或从可用内存卡中选择一张一并借出。
          </p>
        </div>

        <template #footer>
          <div class="modal-footer">
            <n-button @click="showPickupModal = false">取消</n-button>
            <n-button
              type="primary"
              :loading="actionLoading"
              @click="submitPickup"
            >
              确认领取
            </n-button>
          </div>
        </template>
      </n-modal>
    </div>
  </AppLayout>
</template>

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

/* ===== 统计卡片 ===== */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
}
.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
/* 当前选中：高亮边框 */
.stat-card.active {
  border-color: var(--card-color);
  box-shadow: 0 0 0 1px var(--card-color);
}
.stat-card__icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  line-height: 1;
  background: var(--card-bg);
}
.stat-card__content {
  flex: 1;
  min-width: 0;
}
.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}
.stat-card__label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ===== 工具栏 ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.toolbar-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.spin-area {
  min-height: 240px;
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
.user-id {
  color: var(--text-tertiary);
  font-size: 12px;
}
.field .value.comment {
  color: var(--text-secondary);
}
.card-actions {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

/* ===== 弹窗 ===== */
.modal-info {
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.9;
  margin-bottom: 4px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.pickup-card-select {
  margin-top: 12px;
}
.select-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.select-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 8px 0 0;
}

/* ===== 响应式 ===== */
@media (max-width: 760px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
