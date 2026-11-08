<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NModal, NSpin } from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import { getReservationCalendar } from '@/api/experience'
import { formatApiDateTime, parseApiDateTime } from '@/utils/dateTime'
import type { CalendarEntry, RequestStatus } from '@/types/models'

const router = useRouter()
const loading = ref(false)
const loadError = ref(false)
const entries = ref<CalendarEntry[]>([])
// Dates in the grid are UTC calendar dates representing days in Shanghai.
const shanghaiFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
})
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
function schoolDate(value: Date | number = Date.now()): Date {
  const parts = Object.fromEntries(shanghaiFormatter.formatToParts(value).map(part => [part.type, part.value]))
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
}
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
const today = schoolDate()
const selectedDate = ref(today)
const monthCursor = ref(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)))
const selectedEntry = ref<CalendarEntry | null>(null)
const selectedCategory = ref('all')
const agendaRef = ref<HTMLElement | null>(null)
let loadSequence = 0

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const STATUS_TEXT: Record<RequestStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  borrowing: '借用中',
  return_pending: '待归还',
  returned: '已归还',
  rejected: '已拒绝',
  cancelled: '已取消'
}

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', year: 'numeric', month: 'long' }).format(
    monthCursor.value
  )
)

const categories = computed(() => {
  const values = new Set(entries.value.map(entry => entry.equipment_category).filter(Boolean))
  if (selectedCategory.value !== 'all') values.add(selectedCategory.value)
  return [...values]
})
const selectedTitle = computed(() => new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'short'
}).format(selectedDate.value))
const canRequestSelectedDay = computed(() => selectedDate.value.getTime() >= schoolDate().getTime())

const gridStart = computed(() => {
  const first = new Date(monthCursor.value)
  first.setUTCDate(1 - first.getUTCDay())
  return first
})

const days = computed(() =>
  Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.value)
    date.setUTCDate(date.getUTCDate() + index)
    return {
      date,
      label: date.getUTCDate(),
      current: date.getUTCMonth() === monthCursor.value.getUTCMonth() && date.getUTCFullYear() === monthCursor.value.getUTCFullYear(),
      today: dayKey(date) === dayKey(schoolDate()),
      entries: entriesForDay(date)
    }
  })
)

function entriesForDay(date: Date): CalendarEntry[] {
  const dayStart = date.getTime() - SHANGHAI_OFFSET_MS
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  return entries.value.filter((entry) => {
    if (selectedCategory.value !== 'all' && entry.equipment_category !== selectedCategory.value) {
      return false
    }
    const start = parseApiDateTime(entry.borrow_time)?.getTime() ?? Infinity
    const end = parseApiDateTime(entry.return_time)?.getTime() ?? -Infinity
    return start < dayEnd && end > dayStart
  })
}

const selectedEntries = computed(() => entriesForDay(selectedDate.value))

function entryTime(entry: CalendarEntry): string {
  const start = formatApiDateTime(entry.borrow_time)
  const end = formatApiDateTime(entry.return_time)
  return start.slice(0, 10) === end.slice(0, 10)
    ? `${start.slice(11)} – ${end.slice(11)}`
    : `${start} – ${end}`
}

async function loadCalendar() {
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = false
  entries.value = []
  try {
    const start = new Date(gridStart.value.getTime() - SHANGHAI_OFFSET_MS)
    const end = new Date(start.getTime() + 42 * 24 * 60 * 60 * 1000)
    const result = await getReservationCalendar(start.toISOString(), end.toISOString())
    if (sequence === loadSequence) entries.value = Array.isArray(result) ? result : []
  } catch {
    if (sequence === loadSequence) loadError.value = true
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

function moveMonth(delta: number) {
  const next = new Date(Date.UTC(monthCursor.value.getUTCFullYear(), monthCursor.value.getUTCMonth() + delta, 1))
  const now = schoolDate()
  selectedDate.value = next.getUTCFullYear() === now.getUTCFullYear() && next.getUTCMonth() === now.getUTCMonth() ? now : next
  monthCursor.value = next
}

function goToday() {
  const now = schoolDate()
  selectedDate.value = now
  monthCursor.value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function selectDay(date: Date) {
  selectedDate.value = date
}

async function showDayEntries(date: Date) {
  selectDay(date)
  await nextTick()
  agendaRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openEntry(entry: CalendarEntry, date: Date) {
  selectedDate.value = date
  selectedEntry.value = entry
}

function startRequest(date: Date, equipmentId?: number) {
  if (date.getTime() < schoolDate().getTime()) return
  const dateValue = dayKey(date)
  router.push({
    path: '/borrow',
    query: {
      date: dateValue,
      ...(equipmentId ? { equipment_id: String(equipmentId) } : {})
    }
  })
}

watch(monthCursor, loadCalendar)
onMounted(loadCalendar)
onUnmounted(() => { loadSequence += 1 })
</script>

<template>
  <AppLayout>
    <main class="calendar-page">
      <header class="calendar-header">
        <div>
          <h1>预约日历</h1>
          <p class="intro">选择日期查看器材预约，或发起借用申请。</p>
        </div>
        <img class="calendar-seal" src="/assets/winter-mark.svg" alt="" aria-hidden="true" />
      </header>

      <section class="calendar-toolbar">
        <button type="button" @click="moveMonth(-1)">上一月</button>
        <div class="month-title">{{ monthTitle }}</div>
        <div class="toolbar-right">
          <select v-model="selectedCategory" aria-label="按设备类别筛选">
            <option value="all">全部类别</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
          <button type="button" @click="goToday">今天</button>
          <button type="button" @click="moveMonth(1)">下一月</button>
        </div>
      </section>

      <div class="legend">
        <span><i class="pending"></i>待审核</span>
        <span><i class="approved"></i>已通过</span>
        <span><i class="borrowing"></i>借用中</span>
        <span><i class="mine"></i>我的预约</span>
      </div>

      <n-spin :show="loading">
        <div v-if="loadError" class="calendar-error" role="alert">
          <p>日历暂时无法加载，请检查网络后重试。</p>
          <button type="button" @click="loadCalendar">重新加载</button>
        </div>
        <template v-else>
        <div class="calendar-scroll">
          <section class="calendar-grid">
            <div v-for="weekday in WEEKDAYS" :key="weekday" class="weekday">
              {{ weekday }}
            </div>
            <article
              v-for="day in days"
              :key="dayKey(day.date)"
              class="day-cell"
              :class="{ muted: !day.current, today: day.today, selected: dayKey(day.date) === dayKey(selectedDate) }"
              @click="selectDay(day.date)"
            >
              <button
                type="button"
                class="day-select"
                :aria-label="`${dayKey(day.date)}，${day.entries.length} 条预约`"
                :aria-pressed="dayKey(day.date) === dayKey(selectedDate)"
                :aria-current="day.today ? 'date' : undefined"
                @click.stop="selectDay(day.date)"
              >
                <span class="day-number">{{ day.label }}</span>
                <span v-if="day.entries.length" class="day-count">{{ day.entries.length }}</span>
              </button>
              <div class="day-bookings">
              <button
                v-for="entry in day.entries.slice(0, 4)"
                :key="`${dayKey(day.date)}-${entry.id}`"
                type="button"
                class="booking"
                :class="[entry.status, { mine: entry.is_mine }]"
                :title="entry.equipment_name"
                @click.stop="openEntry(entry, day.date)"
              >
                <span>{{ entry.equipment_code }}</span>
                {{ entry.equipment_name }}
              </button>
              <button v-if="day.entries.length > 4" type="button" class="more" @click.stop="showDayEntries(day.date)">
                查看全部 {{ day.entries.length }} 条
              </button>
              </div>
            </article>
          </section>
        </div>

        <section ref="agendaRef" class="day-agenda" aria-live="polite">
          <div class="agenda-header">
            <div>
              <h2>{{ selectedTitle }}</h2>
              <p v-if="!loading">{{ selectedEntries.length }} 条预约</p>
            </div>
            <button type="button" class="agenda-apply" :disabled="!canRequestSelectedDay" @click="startRequest(selectedDate)">
              发起借用 <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div v-if="!loading && selectedEntries.length" class="agenda-list">
            <button
              v-for="entry in selectedEntries"
              :key="entry.id"
              type="button"
              class="agenda-entry"
              @click="openEntry(entry, selectedDate)"
            >
              <span class="agenda-time">{{ entryTime(entry) }}</span>
              <span class="agenda-equipment"><strong>{{ entry.equipment_name }}</strong><small>{{ entry.equipment_code }}</small></span>
              <span class="agenda-status" :class="[entry.status, { mine: entry.is_mine }]">{{ entry.is_mine ? '我的预约' : STATUS_TEXT[entry.status] }}</span>
              <span class="agenda-arrow" aria-hidden="true">↗</span>
            </button>
          </div>
          <p v-else-if="!loading" class="agenda-empty">当天暂无预约</p>
          <p v-if="!canRequestSelectedDay" class="past-note">过去的日期不能发起申请</p>
        </section>
        </template>
      </n-spin>

      <n-modal
        :show="!!selectedEntry"
        preset="card"
        title="预约详情"
        style="width: calc(100vw - 32px); max-width: 520px"
        @update:show="(show) => { if (!show) selectedEntry = null }"
      >
        <div v-if="selectedEntry" class="booking-detail">
          <p class="detail-code">{{ selectedEntry.equipment_code }}</p>
          <h2>{{ selectedEntry.equipment_name }}</h2>
          <dl>
            <div><dt>状态</dt><dd>{{ STATUS_TEXT[selectedEntry.status] }}</dd></div>
            <div><dt>借用</dt><dd>{{ formatApiDateTime(selectedEntry.borrow_time) }}</dd></div>
            <div><dt>归还</dt><dd>{{ formatApiDateTime(selectedEntry.return_time) }}</dd></div>
            <div><dt>申请人</dt><dd>{{ selectedEntry.user_name }}</dd></div>
            <div><dt>用途</dt><dd>{{ selectedEntry.reason }}</dd></div>
            <div v-if="selectedEntry.work_order_no"><dt>工单</dt><dd>{{ selectedEntry.work_order_no }}</dd></div>
          </dl>
          <button
            type="button"
            class="apply-same"
            :disabled="!canRequestSelectedDay"
            @click="startRequest(selectedDate, selectedEntry.equipment_id)"
          >
            预约同一设备
          </button>
        </div>
      </n-modal>
    </main>
  </AppLayout>
</template>

<style scoped>
.calendar-page { max-width: 1320px; margin: 0 auto; }
.calendar-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; border-block: 1px solid var(--text); padding: 26px 0 27px; }
h1 { margin: 0; font: 500 clamp(42px, 5vw, 68px)/1.08 var(--font); letter-spacing: -.045em; }
.intro { margin: 12px 0 0; color: var(--text-secondary); font: 13px/1.7 var(--font-ui); }
.calendar-seal { width: 72px; height: 72px; flex-shrink: 0; }
.calendar-toolbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 20px 0 14px; gap: 12px; }
.calendar-toolbar button,.calendar-toolbar select { min-height: 40px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text); padding: 8px 13px; cursor: pointer; font-family: var(--font-ui); }
.calendar-toolbar button:hover { background: var(--text); color: var(--bg-card); }
.calendar-toolbar > button { justify-self: start; min-width: 90px; }
.month-title { font: 500 28px/1 var(--font); }
.toolbar-right { justify-self: end; display: flex; gap: 8px; }
.legend { display: flex; flex-wrap: wrap; gap: 18px; padding: 0 0 14px; color: var(--text-secondary); font-size: 11px; }
.legend span { display: flex; align-items: center; gap: 6px; }
.legend i { width: 18px; height: 4px; background: #c6973f; }
.legend i.approved { background: #3657ad; }.legend i.borrowing { background: #36735c; }.legend i.mine { background: #9d604d; }
.calendar-scroll { overflow: hidden; border: 1px solid var(--text); background: var(--bg-card); }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.weekday { padding: 12px 10px; border-right: 1px solid var(--border); border-bottom: 2px solid var(--text); text-align: right; color: var(--text-secondary); font: 700 10px/1 var(--font-ui); letter-spacing: .15em; }
.day-cell { min-width: 0; min-height: 112px; padding: 9px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: rgba(255,255,255,.32); cursor: pointer; }
.day-cell.muted { background: rgba(49,95,128,.035); color: var(--text-tertiary); }
.day-cell.selected { box-shadow: inset 0 0 0 2px var(--accent); background: #edf5f7; }
.day-cell.today .day-number { color: var(--accent); text-decoration: underline; text-underline-offset: 4px; }
.day-select { width: 100%; min-height: 26px; display: flex; justify-content: flex-end; align-items: center; gap: 6px; border: 0; padding: 0; background: transparent; color: inherit; cursor: pointer; }
.day-number { font: 500 17px/1 var(--font); }
.day-count { display: none; }
.booking { display: block; width: 100%; border: 0; border-left: 3px solid #c6973f; background: rgba(198,151,63,.12); padding: 5px 6px; margin: 0 0 4px; text-align: left; font: 500 10px/1.25 var(--font-ui); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; color: var(--text); }
.booking span { font-weight: 800; margin-right: 3px; }.booking.approved { border-color: #3657ad; background: rgba(54,87,173,.11); }.booking.borrowing,.booking.return_pending { border-color: #36735c; background: rgba(54,115,92,.12); }.booking.mine { border-color: #9d604d; background: rgba(157,96,77,.18); }
.more { border: 0; background: transparent; color: var(--accent); font: 600 10px/1.3 var(--font-ui); padding: 4px 2px; text-align: left; }
.day-agenda { margin-top: 24px; scroll-margin-top: 80px; border: 1px solid var(--border); border-top: 3px solid var(--text); background: var(--bg-card); }
.agenda-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; }
.agenda-header h2 { margin: 0; font: 500 24px/1.2 var(--font); }
.agenda-header p { margin: 6px 0 0; color: var(--text-secondary); font: 12px/1.4 var(--font-ui); }
.agenda-apply, .calendar-error button { min-height: 40px; border: 1px solid var(--text); background: var(--text); color: var(--bg-card); padding: 9px 16px; font: 600 12px/1 var(--font-ui); white-space: nowrap; }
.agenda-apply:hover:not(:disabled), .calendar-error button:hover { background: var(--accent); border-color: var(--accent); }
.agenda-apply:disabled { opacity: .45; cursor: not-allowed; }
.agenda-list { border-top: 1px solid var(--border); }
.agenda-entry { width: 100%; display: grid; grid-template-columns: 150px minmax(0, 1fr) auto 16px; align-items: center; gap: 14px; border: 0; border-bottom: 1px solid var(--border-light); padding: 15px 22px; text-align: left; color: var(--text); background: transparent; }
.agenda-entry:last-child { border-bottom: 0; }.agenda-entry:hover { background: var(--bg-hover); }
.agenda-time { color: var(--text-secondary); font: 12px/1.5 var(--font-data); font-variant-numeric: tabular-nums; }
.agenda-equipment { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px 10px; min-width: 0; }
.agenda-equipment strong { font: 600 14px/1.4 var(--font-ui); overflow-wrap: anywhere; }.agenda-equipment small { color: var(--text-tertiary); font: 11px/1.4 var(--font-data); }
.agenda-status { color: var(--info); background: var(--info-bg); padding: 5px 8px; font: 600 11px/1 var(--font-ui); white-space: nowrap; }
.agenda-status.pending,.agenda-status.return_pending { color: var(--warning); background: var(--warning-bg); }
.agenda-status.borrowing { color: var(--success); background: var(--success-bg); }.agenda-status.mine { color: var(--accent); background: var(--accent-light); }
.agenda-arrow { color: var(--accent); font: 15px/1 var(--font-ui); }
.agenda-empty, .past-note { margin: 0; padding: 18px 22px; border-top: 1px solid var(--border-light); color: var(--text-secondary); font: 13px/1.6 var(--font-ui); }
.past-note { color: var(--text-tertiary); font-size: 12px; }
.calendar-error { border: 1px solid var(--border); background: var(--bg-card); padding: 24px; color: var(--text-secondary); font: 13px/1.6 var(--font-ui); }
.calendar-error p { margin: 0 0 14px; }
.booking-detail .detail-code { color: var(--accent); font: 700 11px/1 var(--font-ui); letter-spacing: .16em; }.booking-detail h2 { margin: 6px 0 22px; font: 500 34px/1 var(--font); }
.booking-detail dl { margin: 0; border-top: 1px solid var(--text); }.booking-detail dl div { display: grid; grid-template-columns: 80px 1fr; padding: 11px 0; border-bottom: 1px solid var(--border); }.booking-detail dt { color: var(--text-tertiary); }.booking-detail dd { margin: 0; }
.apply-same { width: 100%; margin-top: 18px; border: 1px solid var(--text); background: var(--text); color: var(--bg-card); padding: 11px; cursor: pointer; font-family: var(--font-ui); }
.apply-same:disabled { opacity: .45; cursor: not-allowed; }
@media (max-width: 700px) {
  .calendar-header { padding: 22px 0; }
  .calendar-seal { width: 54px; height: 54px; }
  .calendar-toolbar { grid-template-columns: minmax(0, 1fr) minmax(0, 2.2fr); gap: 10px 8px; }
  .month-title { grid-column: 1 / -1; grid-row: 1; font-size: 26px; }
  .toolbar-right { grid-column: 2; width: 100%; gap: 5px; }
  .calendar-toolbar > button { grid-column: 1; justify-self: stretch; min-width: 0; }
  .calendar-toolbar button,.calendar-toolbar select { padding: 8px 6px; font-size: 12px; }
  .toolbar-right select { flex: 1; min-width: 0; }
  .legend { gap: 8px 14px; }
  .weekday { text-align: center; padding: 10px 2px; }
  .day-cell { min-height: 66px; padding: 4px 2px; }
  .day-select { height: 55px; flex-direction: column; justify-content: center; gap: 5px; }
  .day-number { font-size: 16px; }
  .day-count { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; padding: 0 3px; background: var(--accent-light); color: var(--accent); border-radius: 50%; font: 700 9px/1 var(--font-ui); }
  .day-bookings { display: none; }
  .agenda-header { gap: 8px; padding: 17px 12px; }.agenda-header h2 { font-size: clamp(18px, 5.2vw, 21px); white-space: nowrap; }
  .agenda-entry { grid-template-columns: minmax(0, 1fr) auto 14px; grid-template-areas: 'time status arrow' 'equipment equipment arrow'; gap: 7px 8px; padding: 14px 16px; }
  .agenda-time { grid-area: time; }.agenda-equipment { grid-area: equipment; }.agenda-status { grid-area: status; }.agenda-arrow { grid-area: arrow; }
  .agenda-empty, .past-note { padding: 16px; }
}
</style>
