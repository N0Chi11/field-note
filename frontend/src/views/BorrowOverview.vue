<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 + 筛选标签栏 -->
      <div class="page-header">
        <h1>借用一览</h1>
        <p>{{ isAdmin ? '查看所有借用申请及审核状态' : '查看您的借用申请及审核状态' }}</p>
        <div class="filter-tabs">
          <button
            type="button"
            class="filter-tab"
            :class="{ active: activeTab === 'all' }"
            @click="activeTab = 'all'"
          >
            全部
          </button>
          <button
            type="button"
            class="filter-tab"
            :class="{ active: activeTab === 'pending' }"
            @click="activeTab = 'pending'"
          >
            待审核
          </button>
          <button
            type="button"
            class="filter-tab"
            :class="{ active: activeTab === 'active' }"
            @click="activeTab = 'active'"
          >
            进行中
          </button>
          <button
            type="button"
            class="filter-tab"
            :class="{ active: activeTab === 'returned' }"
            @click="activeTab = 'returned'"
          >
            已归还
          </button>
          <button
            type="button"
            class="filter-tab"
            :class="{ active: activeTab === 'rejected' }"
            @click="activeTab = 'rejected'"
          >
            已拒绝
          </button>
        </div>
      </div>

      <!-- 搜索框 + 导出CSV（仅管理员） -->
      <div class="overview-toolbar">
        <input
          v-model="keyword"
          type="text"
          class="search-input"
          placeholder="搜索工单号、借用人、设备名..."
        />
        <button
          v-if="isAdmin"
          type="button"
          class="btn btn-secondary btn-sm"
          title="导出全部借用记录"
          @click="exportCSV"
        >
          导出CSV
        </button>
      </div>

      <!-- 借用记录列表 -->
      <n-spin :show="loading">
        <div v-if="filtered.length" class="request-list">
          <div
            v-for="(r, i) in filtered"
            :key="r.id"
            class="request-card"
            :style="{ animationDelay: i * 0.03 + 's' }"
          >
            <!-- 卡片头部：工单号 + 状态徽章 + 归还紧迫度 -->
            <div class="request-header">
              <span class="work-order">{{ r.work_order_no }}</span>
              <span class="status-badge" :class="statusClass(r.status)">
                {{ statusText(r.status) }}
              </span>
              <span
                v-if="urgencyTag(r)"
                class="urgency-tag"
                :class="urgencyTag(r)!.type"
              >
                {{ urgencyTag(r)!.text }}
              </span>
            </div>

            <!-- 卡片正文 -->
            <div class="request-body">
              <div>
                <span class="label">借用设备</span>
                <span class="value">{{ r.equipment_name }}</span>
              </div>
              <div>
                <span class="label">借用人</span>
                <span class="value">{{ r.user_name }}</span>
              </div>
              <div>
                <span class="label">借用时间</span>
                <span class="value">{{ fmt(r.borrow_time) }}</span>
              </div>
              <div>
                <span class="label">归还时间</span>
                <span class="value">{{ fmt(r.return_time) }}</span>
              </div>
              <div v-if="r.approver_name">
                <span class="label">审批人</span>
                <span class="value">{{ r.approver_name }}</span>
              </div>
              <div v-if="r.card_name">
                <span class="label">配套内存卡</span>
                <span class="value">💾 {{ r.card_name }}</span>
              </div>
              <div class="full">
                <span class="label">借用理由</span>
                <span class="value">{{ r.reason }}</span>
              </div>
              <div v-if="r.admin_comment" class="full">
                <span class="label">审批备注</span>
                <span class="value">{{ r.admin_comment }}</span>
              </div>
              <div v-if="r.return_photo_url" class="full">
                <span class="label">归还照片</span>
                <img
                  :src="r.return_photo_url"
                  class="return-photo-display"
                  alt="归还照片"
                  @click="viewPhoto(r.return_photo_url!)"
                />
              </div>
            </div>

            <!-- 操作按钮 -->
            <div v-if="hasActions(r)" class="request-actions">
              <!-- 普通用户操作 -->
              <template v-if="!isAdmin">
                <button
                  v-if="r.status === 'borrowing'"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  @click="openUpload(r)"
                >
                  上传归还照片
                </button>
                <n-popconfirm
                  v-if="r.status === 'pending'"
                  @positive-click="cancelRequest(r)"
                >
                  <template #trigger>
                    <button type="button" class="btn btn-secondary btn-sm">
                      取消申请
                    </button>
                  </template>
                  确认取消该申请？取消后无法恢复。
                </n-popconfirm>
              </template>

              <!-- 管理员操作 -->
              <template v-else>
                <template v-if="r.status === 'pending'">
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    @click="openAction(r, 'approve')"
                  >
                    审批
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    @click="openAction(r, 'reject')"
                  >
                    拒绝
                  </button>
                </template>
                <n-popconfirm
                  v-if="r.status === 'approved'"
                  @positive-click="confirmPickupHandler(r)"
                >
                  <template #trigger>
                    <button type="button" class="btn btn-primary btn-sm">
                      确认已领取
                    </button>
                  </template>
                  确认该申请已领取设备？状态将变为「借用中」。
                </n-popconfirm>
                <n-popconfirm
                  v-if="r.status === 'return_pending'"
                  @positive-click="confirmReturnHandler(r)"
                >
                  <template #trigger>
                    <button type="button" class="btn btn-success btn-sm">
                      确认归还
                    </button>
                  </template>
                  确认设备已归还？状态将变为「已归还」。
                </n-popconfirm>
                <n-popconfirm @positive-click="adminDelete(r)">
                  <template #trigger>
                    <button type="button" class="btn btn-danger btn-sm">
                      删除
                    </button>
                  </template>
                  确认删除该借用记录？此操作不可恢复。
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

      <!-- 归还照片预览弹窗 -->
      <n-modal
        v-model:show="showPhotoModal"
        preset="card"
        title="归还照片"
        style="max-width: 640px"
      >
        <img :src="previewPhoto" class="photo-preview" alt="归还照片" />
      </n-modal>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NInput,
  NButton,
  NSpin,
  NModal,
  NUpload,
  NPopconfirm,
  type UploadCustomRequestOptions
} from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
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

// 状态文本映射
const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  borrowing: '借用中',
  return_pending: '待归还确认',
  returned: '已归还',
  rejected: '已拒绝',
  cancelled: '已取消'
}

function statusText(status: RequestStatus): string {
  return STATUS_TEXT[status] || status
}

// 状态徽章 class（与原 HTML 的 status-* 一致，下划线转连字符）
function statusClass(status: RequestStatus): string {
  return `status-${status.replace(/_/g, '-')}`
}

// 归还紧迫度标签（仅 borrowing 状态显示）
function urgencyTag(r: BorrowDetail): { type: string; text: string } | null {
  if (r.status !== 'borrowing') return null
  const returnTs = new Date(r.return_time).getTime()
  if (isNaN(returnTs)) return null
  const diff = returnTs - Date.now()
  if (diff < 0)
    return { type: 'overdue', text: `已逾期 ${Math.ceil(-diff / 3600000)} 小时` }
  if (diff < 3600000 * 24) return { type: 'urgent', text: '今日到期' }
  if (diff < 3600000 * 48) return { type: 'soon', text: '明日到期' }
  return null
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
        r.user_name.toLowerCase().includes(kw) ||
        r.reason.toLowerCase().includes(kw)
      if (!hit) return false
    }
    return true
  })
})

// 是否有操作按钮（管理员始终可删除）
function hasActions(r: BorrowDetail): boolean {
  if (isAdmin.value) return true
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

// 导出 CSV（仅管理员）
function exportCSV() {
  const rows: string[][] = [
    [
      '工单号',
      '借用人',
      '设备',
      '配套内存卡',
      '借用时间',
      '归还时间',
      '借用理由',
      '状态',
      '审批人',
      '审批备注',
      '创建时间'
    ]
  ]
  requests.value.forEach((r) => {
    rows.push([
      r.work_order_no,
      r.user_name,
      r.equipment_name,
      r.card_name || '',
      r.borrow_time,
      r.return_time,
      r.reason,
      statusText(r.status),
      r.approver_name || '',
      r.admin_comment || '',
      r.created_at
    ])
  })
  const csv =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell || '')
            return s.includes(',') || s.includes('"') || s.includes('\n')
              ? '"' + s.replace(/"/g, '""') + '"'
              : s
          })
          .join(',')
      )
      .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `借用记录_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('CSV已导出')
}

// ===== 归还照片预览 =====
const showPhotoModal = ref(false)
const previewPhoto = ref('')
function viewPhoto(url: string) {
  previewPhoto.value = url
  showPhotoModal.value = true
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

// ===== 管理员：删除记录 =====
async function adminDelete(r: BorrowDetail) {
  try {
    await deleteRequest(r.id)
    toast.success('已删除记录')
    loadRequests()
  } catch (e: any) {
    toast.error(errMsg(e, '删除失败'))
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

/* Page Header */
.page-header {
  margin-bottom: 28px;
  animation: slideUp 0.3s ease;
}
.page-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.4px;
}
.page-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 6px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.filter-tab {
  padding: 7px 16px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  font-weight: 500;
}
.filter-tab:hover {
  background: var(--bg-hover);
  border-color: var(--text-tertiary);
}
.filter-tab.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
  box-shadow: var(--shadow-accent);
}

/* Overview Toolbar */
.overview-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
}
.overview-toolbar .search-input {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: var(--font-ui);
  background: var(--bg-input);
  color: var(--text);
  transition: border-color 0.15s;
}
.overview-toolbar .search-input::placeholder {
  color: var(--text-tertiary);
}
.overview-toolbar .search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

/* Buttons */
.btn {
  padding: 11px 22px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  white-space: nowrap;
}
.btn-primary {
  background: var(--accent-gradient);
  color: white;
  box-shadow: var(--shadow-accent);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(217, 119, 87, 0.3);
}
.btn-secondary {
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: var(--text-tertiary);
}
.btn-success {
  background: linear-gradient(135deg, #4a8b5c, #3a7a4c);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 139, 92, 0.2);
}
.btn-success:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 139, 92, 0.3);
}
.btn-danger {
  background: linear-gradient(135deg, #c25b5b, #a84848);
  color: white;
  box-shadow: 0 2px 8px rgba(194, 91, 91, 0.2);
}
.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(194, 91, 91, 0.3);
}
.btn-sm {
  padding: 7px 14px;
  font-size: 13px;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}
.urgency-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  animation: pulse 2s infinite;
}
.urgency-tag.overdue {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger);
}
.urgency-tag.urgent {
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid var(--warning);
}
.urgency-tag.soon {
  background: var(--info-bg);
  color: var(--info);
  border: 1px solid var(--info);
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
.status-pending {
  background: var(--warning-bg);
  color: var(--warning);
}
.status-pending::before {
  background: var(--warning);
  animation: pulse 2s infinite;
}
.status-approved {
  background: var(--info-bg);
  color: var(--info);
}
.status-approved::before {
  background: var(--info);
}
.status-borrowing {
  background: var(--accent-light);
  color: var(--accent);
}
.status-borrowing::before {
  background: var(--accent);
  animation: pulse 2s infinite;
}
.status-return-pending {
  background: var(--warning-bg);
  color: var(--warning);
}
.status-return-pending::before {
  background: var(--warning);
  animation: pulse 2s infinite;
}
.status-returned {
  background: var(--success-bg);
  color: var(--success);
}
.status-returned::before {
  background: var(--success);
}
.status-rejected {
  background: var(--danger-bg);
  color: var(--danger);
}
.status-rejected::before {
  background: var(--danger);
}
.status-cancelled {
  background: var(--bg-hover);
  color: var(--text-tertiary);
}
.status-cancelled::before {
  background: var(--text-tertiary);
}

/* Request Cards */
.request-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}
.request-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 22px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
  animation: slideUp 0.3s ease backwards;
}
.request-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-light);
}
.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.work-order {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.3px;
}
.request-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 24px;
  font-size: 13px;
}
.request-body .label {
  color: var(--text-tertiary);
  font-size: 12px;
  display: block;
  margin-bottom: 2px;
}
.request-body .value {
  color: var(--text);
  font-weight: 500;
  word-break: break-word;
}
.request-body .full {
  grid-column: 1 / -1;
  margin-top: 6px;
}
.request-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  flex-wrap: wrap;
}
.return-photo-display {
  border-radius: var(--radius-sm);
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border: 1px solid var(--border);
  margin-top: 8px;
  display: block;
  cursor: pointer;
  transition: transform 0.2s;
}
.return-photo-display:hover {
  transform: scale(1.02);
}

/* Modal */
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
.photo-preview {
  width: 100%;
  border-radius: var(--radius-sm);
  display: block;
}

@media (max-width: 640px) {
  .overview-toolbar {
    flex-wrap: wrap;
  }
  .request-body {
    grid-template-columns: 1fr;
  }
}
</style>
