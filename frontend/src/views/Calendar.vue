<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NModal, NSpin } from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getReservationCalendar } from '@/api/experience'
import { useToastStore } from '@/stores/toast'
import { formatApiDateTime, parseApiDateTime } from '@/utils/dateTime'
import type { CalendarEntry, RequestStatus } from '@/types/models'

const toast = useToastStore()
const router = useRouter()
const loading = ref(false)
const entries = ref<CalendarEntry[]>([])
const monthCursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedEntry = ref<CalendarEntry | null>(null)
const selectedCategory = ref('all')

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
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(
    monthCursor.value
  )
)

const categories = computed(() =>
  Array.from(new Set(entries.value.map((entry) => entry.equipment_category).filter(Boolean)))
)
const hasVisibleEntries = computed(() =>
  selectedCategory.value === 'all'
    ? entries.value.length > 0
    : entries.value.some((entry) => entry.equipment_category === selectedCategory.value)
)

const gridStart = computed(() => {
  const first = new Date(monthCursor.value)
  first.setDate(1 - first.getDay())
  first.setHours(0, 0, 0, 0)
  return first
})

const days = computed(() =>
  Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.value)
    date.setDate(date.getDate() + index)
    const today = new Date()
    return {
      date,
      label: date.getDate(),
      current: date.getMonth() === monthCursor.value.getMonth(),
      today:
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate(),
      entries: entriesForDay(date)
    }
  })
)

function entriesForDay(date: Date): CalendarEntry[] {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  return entries.value.filter((entry) => {
    if (selectedCategory.value !== 'all' && entry.equipment_category !== selectedCategory.value) {
      return false
    }
    const start = parseApiDateTime(entry.borrow_time)?.getTime() ?? Infinity
    const end = parseApiDateTime(entry.return_time)?.getTime() ?? -Infinity
    return start < dayEnd.getTime() && end > dayStart.getTime()
  })
}

async function loadCalendar() {
  loading.value = true
  try {
    const start = new Date(gridStart.value)
    const end = new Date(start)
    end.setDate(end.getDate() + 42)
    entries.value = await getReservationCalendar(start.toISOString(), end.toISOString())
  } catch (error: any) {
    entries.value = []
    toast.error(error?.message || '预约日历加载失败')
  } finally {
    loading.value = false
  }
}

function moveMonth(delta: number) {
  monthCursor.value = new Date(
    monthCursor.value.getFullYear(),
    monthCursor.value.getMonth() + delta,
    1
  )
}

function goToday() {
  monthCursor.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

function startRequest(date: Date, equipmentId?: number) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const dateValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
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
</script>

<template>
  <AppLayout>
    <main class="calendar-page">
      <header class="calendar-header">
        <div>
          <p class="eyebrow">RESERVATION EDITION / LIVE SCHEDULE</p>
          <h1>预约日历</h1>
        </div>
        <p class="intro">在一张月历里查看全部设备的占用时段。其他用户的姓名与用途会自动隐藏。</p>
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
        <div class="calendar-scroll">
          <section class="calendar-grid">
            <div v-for="weekday in WEEKDAYS" :key="weekday" class="weekday">
              {{ weekday }}
            </div>
            <article
              v-for="day in days"
              :key="day.date.toISOString()"
              class="day-cell"
              :class="{ muted: !day.current, today: day.today }"
              title="点击这一天发起借用申请"
              @click="startRequest(day.date)"
            >
              <div class="day-number">{{ day.label }}</div>
              <button
                v-for="entry in day.entries.slice(0, 4)"
                :key="`${day.date.toISOString()}-${entry.id}`"
                type="button"
                class="booking"
                :class="[entry.status, { mine: entry.is_mine }]"
                :title="entry.equipment_name"
                @click.stop="selectedEntry = entry"
              >
                <span>{{ entry.equipment_code }}</span>
                {{ entry.equipment_name }}
              </button>
              <div v-if="day.entries.length > 4" class="more">
                + {{ day.entries.length - 4 }} 条
              </div>
            </article>
          </section>
        </div>
        <EmptyState
          v-if="!loading && !hasVisibleEntries"
          icon="calendar"
          text="这个月还没有预约"
          sub-text="日历很安静，正适合安排下一次创作"
        />
      </n-spin>

      <n-modal
        :show="!!selectedEntry"
        preset="card"
        title="预约详情"
        style="max-width: 520px"
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
            @click="startRequest(parseApiDateTime(selectedEntry.borrow_time) || new Date(), selectedEntry.equipment_id)"
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
.calendar-header { display: grid; grid-template-columns: 1.3fr .7fr; align-items: end; gap: 30px; border-block: 1px solid var(--text); padding: 24px 0 30px; }
.eyebrow { color: var(--accent); font: 700 10px/1 var(--font-ui); letter-spacing: .22em; margin: 0 0 24px; }
h1 { margin: 0; font: 500 clamp(48px, 7vw, 88px)/.9 var(--font); letter-spacing: -.055em; }
.intro { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.8; }
.calendar-toolbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 20px 0 14px; gap: 12px; }
.calendar-toolbar button,.calendar-toolbar select { border: 1px solid var(--border); background: transparent; padding: 8px 13px; cursor: pointer; font-family: var(--font-ui); }
.calendar-toolbar button:hover { background: var(--text); color: var(--bg); }
.month-title { font: 500 28px/1 var(--font); }
.toolbar-right { justify-self: end; display: flex; gap: 8px; }
.legend { display: flex; flex-wrap: wrap; gap: 18px; padding: 0 0 14px; color: var(--text-secondary); font-size: 11px; }
.legend span { display: flex; align-items: center; gap: 6px; }
.legend i { width: 18px; height: 4px; background: #c6973f; }
.legend i.approved { background: #3657ad; }.legend i.borrowing { background: #36735c; }.legend i.mine { background: #9d604d; }
.calendar-scroll { overflow-x: auto; border: 1px solid var(--text); background: var(--bg-card); }
.calendar-grid { min-width: 940px; display: grid; grid-template-columns: repeat(7, 1fr); }
.weekday { padding: 10px; border-right: 1px solid var(--border); border-bottom: 2px solid var(--text); text-align: right; color: var(--text-secondary); font: 700 10px/1 var(--font-ui); letter-spacing: .15em; }
.day-cell { min-height: 136px; padding: 9px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: rgba(255,255,255,.22); cursor: pointer; }
.day-cell.muted { background: rgba(25,25,23,.035); color: var(--text-tertiary); }.day-cell.today { box-shadow: inset 0 0 0 2px var(--accent); }
.day-number { margin-bottom: 7px; text-align: right; font: 500 16px/1 var(--font); }
.booking { display: block; width: 100%; border: 0; border-left: 3px solid #c6973f; background: rgba(198,151,63,.12); padding: 5px 6px; margin: 0 0 4px; text-align: left; font: 500 10px/1.25 var(--font-ui); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; color: var(--text); }
.booking span { font-weight: 800; margin-right: 3px; }.booking.approved { border-color: #3657ad; background: rgba(54,87,173,.11); }.booking.borrowing,.booking.return_pending { border-color: #36735c; background: rgba(54,115,92,.12); }.booking.mine { border-color: #9d604d; background: rgba(157,96,77,.18); }
.more { color: var(--text-tertiary); font: 600 10px/1 var(--font-ui); padding: 3px 6px; }
.booking-detail .detail-code { color: var(--accent); font: 700 11px/1 var(--font-ui); letter-spacing: .16em; }.booking-detail h2 { margin: 6px 0 22px; font: 500 34px/1 var(--font); }
.booking-detail dl { margin: 0; border-top: 1px solid var(--text); }.booking-detail dl div { display: grid; grid-template-columns: 80px 1fr; padding: 11px 0; border-bottom: 1px solid var(--border); }.booking-detail dt { color: var(--text-tertiary); }.booking-detail dd { margin: 0; }
.apply-same { width: 100%; margin-top: 18px; border: 1px solid var(--text); background: var(--text); color: var(--bg-card); padding: 11px; cursor: pointer; font-family: var(--font-ui); }
@media (max-width: 700px) { .calendar-header { grid-template-columns: 1fr; }.calendar-toolbar { grid-template-columns: 1fr auto; }.month-title { grid-column: 1 / -1; grid-row: 1; }.toolbar-right { grid-column: 2; }.calendar-toolbar > button { grid-column: 1; }.day-cell { min-height: 115px; } }
</style>
