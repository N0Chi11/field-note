<script setup lang="ts">
/**
 * 设备借用时间轴弹窗（甘特图）
 * 完全复刻原始 HTML 版本的 timeline / gantt 设计
 */
import { ref, computed, watch } from 'vue'
import { NModal, NSpin } from 'naive-ui'
import { getEquipmentById } from '@/api/equipment'
import { getRequests } from '@/api/borrow'
import { useToastStore } from '@/stores/toast'
import type {
  Equipment,
  BorrowDetail,
  BorrowRequestQuery,
  PaginatedResponse,
  RequestStatus
} from '@/types/models'

const props = defineProps<{
  /** 设备 ID（为 null 时不加载） */
  equipmentId: number | null
  /** 弹窗显隐（v-model:visible） */
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

/** v-model:visible 双向绑定 */
const show = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const toast = useToastStore()

/* ------------------------------------------------------------------ *
 * 数据状态
 * ------------------------------------------------------------------ */
const loading = ref(false)
const equipment = ref<Equipment | null>(null)
const requests = ref<BorrowDetail[]>([])

/** 甘特图时间范围 */
const ganttRange = ref<'month' | 'quarter' | 'year'>('month')

/* ------------------------------------------------------------------ *
 * 状态文本 / 样式映射（与原 HTML 一致）
 * ------------------------------------------------------------------ */
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

/** 状态徽章 class（下划线转连字符，与原 HTML 一致） */
function statusClass(status: RequestStatus): string {
  return `status-${status.replace(/_/g, '-')}`
}

/** 甘特条 class */
function barClass(status: RequestStatus): string {
  return `status-${status.replace(/_/g, '-')}`
}

/* ------------------------------------------------------------------ *
 * 工具函数
 * ------------------------------------------------------------------ */
/** 日期格式化（与原 HTML fmt 一致） */
function fmt(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** 类别图标 */
const CATEGORY_ICONS: Record<string, string> = {
  相机: '📷',
  镜头: '🔭',
  灯光: '💡',
  灯具: '💡',
  录音设备: '🎙️',
  麦克风: '🎙️',
  三脚架: '📐',
  稳定器: '🎯'
}

function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || '📦'
}

/** 统一错误信息提取 */
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

/* ------------------------------------------------------------------ *
 * 当前借用状态
 * ------------------------------------------------------------------ */
/** 当前借用中的记录（用于状态卡片） */
const currentBorrower = computed<BorrowDetail | null>(() => {
  return requests.value.find((r) => r.status === 'borrowing') || null
})

const isBorrowed = computed(() => !!currentBorrower.value)

/* ------------------------------------------------------------------ *
 * 甘特图：时间范围计算（完全复刻原 HTML）
 * ------------------------------------------------------------------ */
interface DateRange {
  startDate: Date
  endDate: Date
}

const dateRange = computed<DateRange>(() => {
  const now = new Date()
  const range = ganttRange.value
  if (range === 'month') {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59)
    return { startDate, endDate }
  } else if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    const startDate = new Date(now.getFullYear(), q * 3, 1)
    const endDate = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59)
    return { startDate, endDate }
  } else {
    const startDate = new Date(now.getFullYear(), 0, 1)
    const endDate = new Date(now.getFullYear(), 11, 31, 23, 59)
    return { startDate, endDate }
  }
})

/**
 * 日期转百分比位置（完全复刻原 HTML dateToPercent）
 * 将日期 clamp 到 [startDate, endDate] 区间后计算占比
 */
function dateToPercent(date: Date | string): number {
  const { startDate, endDate } = dateRange.value
  const d = new Date(date)
  if (isNaN(d.getTime())) return 0
  const clamped = Math.max(
    startDate.getTime(),
    Math.min(endDate.getTime(), d.getTime())
  )
  const totalMs = endDate.getTime() - startDate.getTime()
  if (totalMs <= 0) return 0
  return ((clamped - startDate.getTime()) / totalMs) * 100
}

/* ------------------------------------------------------------------ *
 * 甘特图：刻度
 * ------------------------------------------------------------------ */
interface Tick {
  pct: number
  label: string
}

const ticks = computed<Tick[]>(() => {
  const now = new Date()
  const range = ganttRange.value
  const result: Tick[] = []
  if (range === 'month') {
    const lastDay = dateRange.value.endDate.getDate()
    const tickCount = 5
    const tickStep = Math.ceil(lastDay / tickCount)
    for (let i = 0; i <= tickCount; i++) {
      const day = 1 + i * tickStep
      if (day > lastDay) break
      const tickDate = new Date(now.getFullYear(), now.getMonth(), day)
      result.push({ pct: dateToPercent(tickDate), label: `${day}日` })
    }
  } else if (range === 'quarter') {
    const months = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ]
    const q = Math.floor(now.getMonth() / 3)
    for (let i = 0; i < 3; i++) {
      const m = q * 3 + i
      const tickDate = new Date(now.getFullYear(), m, 1)
      result.push({ pct: dateToPercent(tickDate), label: months[m] })
    }
  } else {
    const months = ['1月', '4月', '7月', '10月']
    for (let i = 0; i < 4; i++) {
      const tickDate = new Date(now.getFullYear(), i * 3, 1)
      result.push({ pct: dateToPercent(tickDate), label: months[i] })
    }
  }
  return result
})

/** 网格线位置（与原 HTML 一致：从 i=1 开始，跳过首刻度） */
const gridLines = computed<number[]>(() => {
  const now = new Date()
  const range = ganttRange.value
  const result: number[] = []
  if (range === 'month') {
    const lastDay = dateRange.value.endDate.getDate()
    const tickCount = 5
    const tickStep = Math.ceil(lastDay / tickCount)
    for (let i = 1; i <= tickCount; i++) {
      const day = 1 + i * tickStep
      if (day > lastDay) break
      const tickDate = new Date(now.getFullYear(), now.getMonth(), day)
      result.push(dateToPercent(tickDate))
    }
  } else if (range === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    for (let i = 1; i < 3; i++) {
      const m = q * 3 + i
      const tickDate = new Date(now.getFullYear(), m, 1)
      result.push(dateToPercent(tickDate))
    }
  } else {
    for (let i = 1; i < 4; i++) {
      const tickDate = new Date(now.getFullYear(), i * 3, 1)
      result.push(dateToPercent(tickDate))
    }
  }
  return result
})

/** 今天线位置 */
const todayPct = computed(() => dateToPercent(new Date()))
const showTodayLine = computed(
  () => todayPct.value >= 0 && todayPct.value <= 100
)

/* ------------------------------------------------------------------ *
 * 甘特图：借用条
 * ------------------------------------------------------------------ */
interface GanttBar {
  left: number
  width: number
  status: RequestStatus
  text: string
  title: string
}

const bars = computed<GanttBar[]>(() => {
  const { startDate, endDate } = dateRange.value
  const startTs = startDate.getTime()
  const endTs = endDate.getTime()
  const range = requests.value.filter((r) => {
    const bStart = new Date(r.borrow_time).getTime()
    // 已归还的记录用实际归还时间作为结束时间
    const endTime = r.actual_return || r.return_time
    const rEnd = new Date(endTime).getTime()
    return bStart <= endTs && rEnd >= startTs
  })
  return range.map((r) => {
    const leftPct = dateToPercent(r.borrow_time)
    // 已归还的记录用实际归还时间作为结束时间
    const endTime = r.actual_return || r.return_time
    const rightPct = dateToPercent(endTime)
    const widthPct = Math.max(rightPct - leftPct, 2)
    const barText =
      r.user_name +
      (r.status === 'borrowing'
        ? ' · 借用中'
        : r.status === 'returned'
        ? ' · 已归还'
        : '')
    const title = `${r.work_order_no} | ${r.user_name} | ${fmt(
      r.borrow_time
    )} → ${fmt(endTime)}${r.actual_return ? ' (提前归还)' : ''}`
    return { left: leftPct, width: widthPct, status: r.status, text: barText, title }
  })
})

/** 设备名截断（与原 HTML 一致：超过 10 字截断） */
const rowLabel = computed(() => {
  const name = equipment.value?.name || ''
  return name.length > 10 ? name.substring(0, 10) + '…' : name
})

/* ------------------------------------------------------------------ *
 * 完整借用记录列表（按创建时间倒序）
 * ------------------------------------------------------------------ */
const historyList = computed<BorrowDetail[]>(() => {
  return [...requests.value].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
})

/* ------------------------------------------------------------------ *
 * 数据加载
 * ------------------------------------------------------------------ */
async function fetchRequestsByEquipment(
  equipmentId: number
): Promise<BorrowDetail[]> {
  const all: BorrowDetail[] = []
  let page = 1
  const size = 100
  for (let i = 0; i < 50; i++) {
    const params: BorrowRequestQuery & {
      page?: number
      size?: number
      equipment_id?: number
    } = {
      equipment_id: equipmentId,
      page,
      size
    }
    const res = (await getRequests(params)) as unknown as PaginatedResponse<BorrowDetail>
    all.push(...res.items)
    if (res.items.length === 0 || all.length >= res.total) break
    page++
  }
  // 过滤掉 rejected / cancelled（与原 HTML 过滤 rejected 的意图一致，避免无样式条）
  return all.filter(
    (r) => r.status !== 'rejected' && r.status !== 'cancelled'
  )
}

async function loadData() {
  if (!props.equipmentId) return
  loading.value = true
  try {
    const [equipmentDetail, reqs] = await Promise.all([
      getEquipmentById(props.equipmentId),
      fetchRequestsByEquipment(props.equipmentId)
    ])
    equipment.value = equipmentDetail.equipment
    requests.value = reqs
  } catch (e: any) {
    toast.error(errMsg(e, '加载时间轴数据失败'))
    equipment.value = null
    requests.value = []
  } finally {
    loading.value = false
  }
}

/** 弹窗打开时加载数据 */
watch(
  () => props.visible,
  (v) => {
    if (v && props.equipmentId) {
      loadData()
    }
  }
)

/** 弹窗打开状态下切换设备时重新加载 */
watch(
  () => props.equipmentId,
  (id) => {
    if (id && props.visible) {
      loadData()
    }
  }
)
</script>

<template>
  <n-modal
    v-model:show="show"
    :auto-focus="false"
    :mask-closable="true"
    class="timeline-modal-wrap"
  >
    <div class="timeline-modal">
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div class="modal-title">设备借用时间轴</div>
        <button class="modal-close" type="button" @click="show = false">
          ×
        </button>
      </div>

      <n-spin :show="loading">
        <div class="modal-body">
          <template v-if="equipment">
            <!-- 设备头部：图标 + 名称 + 编号 + 类别 -->
            <div class="timeline-header">
              <div class="timeline-header-icon">
                <img
                  v-if="equipment.image_url"
                  :src="equipment.image_url"
                  :alt="equipment.name"
                />
                <div v-else class="timeline-header-emoji">
                  {{ equipment.icon || categoryIcon(equipment.category) }}
                </div>
              </div>
              <div class="timeline-header-info">
                <h3>{{ equipment.name }}</h3>
                <p>{{ equipment.code }} · {{ equipment.category }}</p>
              </div>
            </div>

            <!-- 状态卡片 -->
            <div
              v-if="isBorrowed && currentBorrower"
              class="timeline-status-card borrowed"
            >
              <div class="status-card-icon">📦</div>
              <div class="timeline-status-text">
                <strong>当前状态：借用中</strong>
                <span class="sub">
                  借用人：{{ currentBorrower.user_name }}（{{
                    currentBorrower.user_student_id
                  }}）· 预计归还：{{ fmt(currentBorrower.return_time) }}
                </span>
              </div>
            </div>
            <div v-else class="timeline-status-card available">
              <div class="status-card-icon">✅</div>
              <div class="timeline-status-text">
                <strong>当前状态：可借用</strong>
                <span class="sub">设备目前可提交借用申请</span>
              </div>
            </div>

            <!-- 甘特图 -->
            <div class="gantt-wrapper">
              <!-- 工具栏 -->
              <div class="gantt-toolbar">
                <button
                  type="button"
                  class="gantt-range-btn"
                  :class="{ active: ganttRange === 'month' }"
                  @click="ganttRange = 'month'"
                >
                  本月
                </button>
                <button
                  type="button"
                  class="gantt-range-btn"
                  :class="{ active: ganttRange === 'quarter' }"
                  @click="ganttRange = 'quarter'"
                >
                  本季度
                </button>
                <button
                  type="button"
                  class="gantt-range-btn"
                  :class="{ active: ganttRange === 'year' }"
                  @click="ganttRange = 'year'"
                >
                  本年
                </button>
              </div>

              <!-- 图表容器 -->
              <div class="gantt-container">
                <div class="gantt-chart">
                  <!-- 表头 -->
                  <div class="gantt-header">
                    <div class="gantt-header-label">借用人 / 状态</div>
                    <div class="gantt-header-scale">
                      <div
                        v-for="(t, i) in ticks"
                        :key="i"
                        class="gantt-header-tick"
                        :style="{ left: t.pct + '%' }"
                      >
                        {{ t.label }}
                      </div>
                    </div>
                  </div>

                  <!-- 数据行 -->
                  <div class="gantt-row">
                    <div class="gantt-row-label">{{ rowLabel }}</div>
                    <div class="gantt-row-track">
                      <!-- 网格线 -->
                      <div
                        v-for="(pct, i) in gridLines"
                        :key="'grid-' + i"
                        class="gantt-grid-line"
                        :style="{ left: pct + '%' }"
                      />
                      <!-- 今天线 -->
                      <template v-if="showTodayLine">
                        <div
                          class="gantt-grid-line today"
                          :style="{ left: todayPct + '%' }"
                        />
                        <div
                          class="gantt-today-label"
                          :style="{ left: todayPct + '%' }"
                        >
                          今天
                        </div>
                      </template>
                      <!-- 借用条 -->
                      <div
                        v-for="(bar, i) in bars"
                        :key="'bar-' + i"
                        class="gantt-bar"
                        :class="barClass(bar.status)"
                        :style="{ left: bar.left + '%', width: bar.width + '%' }"
                        :title="bar.title"
                      >
                        <span class="gantt-bar-text">{{ bar.text }}</span>
                      </div>
                      <!-- 空状态 -->
                      <div v-if="bars.length === 0" class="gantt-no-bars">
                        该时段暂无借用记录
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 图例 -->
                <div class="gantt-legend">
                  <div class="gantt-legend-item">
                    <div class="gantt-legend-dot" style="background: #d97757"></div>
                    借用中
                  </div>
                  <div class="gantt-legend-item">
                    <div class="gantt-legend-dot" style="background: #4a7cb5"></div>
                    已通过
                  </div>
                  <div class="gantt-legend-item">
                    <div class="gantt-legend-dot" style="background: #b8862b"></div>
                    待审核/待归还
                  </div>
                  <div class="gantt-legend-item">
                    <div class="gantt-legend-dot" style="background: #4a8b5c"></div>
                    已归还
                  </div>
                  <div class="gantt-legend-item">
                    <div
                      class="gantt-legend-dot"
                      style="background: #c25b5b; width: 2px"
                    ></div>
                    今天
                  </div>
                </div>
              </div>
            </div>

            <!-- 完整借用记录列表 -->
            <div v-if="historyList.length > 0" class="gantt-history-list">
              <div class="gantt-history-title">完整借用记录</div>
              <div
                v-for="r in historyList"
                :key="r.id"
                class="gantt-history-item"
              >
                <span class="status-badge" :class="statusClass(r.status)">
                  {{ statusText(r.status) }}
                </span>
                <div class="history-content">
                  <span class="work-order">{{ r.work_order_no }}</span>
                  · {{ r.user_name }}（{{ r.user_student_id }}） ·
                  {{ fmt(r.borrow_time) }} → {{ fmt(r.actual_return || r.return_time) }}<span v-if="r.actual_return" class="early-return-tag"> 提前归还</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </n-spin>
    </div>
  </n-modal>
</template>

<style scoped>
/* ---------- 弹窗容器 ---------- */
.timeline-modal {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 30px;
  width: 100%;
  max-width: 760px;
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  overflow-y: auto;
  animation: scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ---------- 弹窗头部 ---------- */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}
.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  font-family: var(--font);
}
.modal-close {
  width: 34px;
  height: 34px;
  border: none;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 20px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
  line-height: 1;
}
.modal-close:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

.modal-body {
  min-height: 120px;
}

/* ---------- 设备头部 ---------- */
.timeline-header {
  display: flex;
  gap: 16px;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 20px;
}
.timeline-header-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--bg-input), var(--bg-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  overflow: hidden;
  flex-shrink: 0;
}
.timeline-header-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.timeline-header-emoji {
  font-size: 28px;
  line-height: 1;
}
.timeline-header-info h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 2px;
  color: var(--text);
  font-family: var(--font);
}
.timeline-header-info p {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ---------- 状态卡片 ---------- */
.timeline-status-card {
  background: var(--bg-input);
  border-radius: var(--radius);
  padding: 14px 18px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.timeline-status-card.available {
  border-left: 4px solid var(--success);
}
.timeline-status-card.borrowed {
  border-left: 4px solid var(--accent);
}
.status-card-icon {
  font-size: 24px;
  line-height: 1;
}
.timeline-status-text {
  font-size: 14px;
}
.timeline-status-text strong {
  color: var(--text);
}
.timeline-status-text .sub {
  font-size: 12px;
  color: var(--text-tertiary);
  display: block;
  margin-top: 2px;
}

/* ---------- 甘特图 ---------- */
.gantt-wrapper {
  margin-bottom: 20px;
}
.gantt-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.gantt-range-btn {
  padding: 6px 14px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: var(--font-ui);
  font-weight: 500;
  transition: all var(--transition);
}
.gantt-range-btn:hover {
  background: var(--bg-hover);
}
.gantt-range-btn.active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.gantt-container {
  background: var(--bg-input);
  border-radius: var(--radius);
  padding: 20px;
  overflow-x: auto;
  border: 1px solid var(--border);
}
.gantt-chart {
  min-width: 600px;
  position: relative;
}
.gantt-header {
  display: flex;
  border-bottom: 2px solid var(--border);
  padding-bottom: 8px;
  margin-bottom: 10px;
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-input);
}
.gantt-header-label {
  flex-shrink: 0;
  width: 140px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 4px;
}
.gantt-header-scale {
  flex: 1;
  display: flex;
  position: relative;
}
.gantt-header-tick {
  position: absolute;
  top: 0;
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: var(--font-ui);
  white-space: nowrap;
  transform: translateX(-50%);
}
.gantt-row {
  display: flex;
  align-items: center;
  height: 44px;
  margin-bottom: 4px;
  position: relative;
}
.gantt-row-label {
  flex-shrink: 0;
  width: 140px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  padding-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gantt-row-track {
  flex: 1;
  height: 32px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  position: relative;
  border: 1px solid var(--border-light);
  overflow: hidden;
}
.gantt-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border-light);
  z-index: 0;
}
.gantt-grid-line.today {
  width: 2px;
  background: var(--danger);
  z-index: 1;
  opacity: 0.5;
}
.gantt-today-label {
  position: absolute;
  top: -22px;
  font-size: 10px;
  color: var(--danger);
  font-weight: 600;
  font-family: var(--font-ui);
  transform: translateX(-50%);
  white-space: nowrap;
}
.gantt-bar {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 2;
  font-family: var(--font-ui);
}
.gantt-bar:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.gantt-bar-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
.gantt-bar.status-borrowing {
  background: linear-gradient(135deg, #d97757, #c4663d);
}
.gantt-bar.status-approved {
  background: linear-gradient(135deg, #4a7cb5, #3a6ca5);
}
.gantt-bar.status-pending {
  background: linear-gradient(135deg, #b8862b, #a07622);
  opacity: 0.8;
}
.gantt-bar.status-returned {
  background: linear-gradient(135deg, #4a8b5c, #3a7a4c);
  opacity: 0.65;
}
.gantt-bar.status-return-pending {
  background: linear-gradient(135deg, #b8862b, #a07622);
}
.gantt-no-bars {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  color: var(--text-tertiary);
}

/* ---------- 图例 ---------- */
.gantt-legend {
  display: flex;
  gap: 14px;
  margin-top: 14px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.gantt-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: var(--font-ui);
}
.gantt-legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* ---------- 借用记录列表 ---------- */
.gantt-history-list {
  margin-top: 20px;
  border-top: 1px solid var(--border-light);
  padding-top: 16px;
}
.gantt-history-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
}
.gantt-history-item {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.6;
  align-items: center;
}
.history-content {
  flex: 1;
  min-width: 0;
  color: var(--text-secondary);
  word-break: break-word;
}

.early-return-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #4a8b5c;
  background: rgba(74, 139, 92, 0.1);
  border-radius: 4px;
}
.work-order {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.3px;
}

/* ---------- 状态徽章（与原 HTML 一致） ---------- */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}
.status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
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

/* ---------- 响应式：手机端全屏 ---------- */
@media (max-width: 640px) {
  .timeline-modal {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    padding: 20px 16px;
  }
  .gantt-header-label,
  .gantt-row-label {
    width: 90px;
    font-size: 11px;
  }
  .gantt-history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
