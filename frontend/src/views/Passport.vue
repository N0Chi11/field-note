<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import EditorialIcon from '@/components/common/EditorialIcon.vue'
import type { EditorialIconName } from '@/components/common/EditorialIcon.vue'
import { getCreativePassport } from '@/api/experience'
import { useToastStore } from '@/stores/toast'
import type { CreativePassport, PassportStamp } from '@/types/models'

const toast = useToastStore()
const loading = ref(true)
const passport = ref<CreativePassport | null>(null)

const allowedIcons = new Set<EditorialIconName>([
  'camera', 'equipment', 'return', 'light', 'microphone', 'tripod', 'approved', 'pending'
])

function stampIcon(value: string): EditorialIconName {
  return allowedIcons.has(value as EditorialIconName)
    ? (value as EditorialIconName)
    : 'clipboard'
}

function progress(stamp: PassportStamp): number {
  return Math.min(100, Math.round((stamp.current / Math.max(1, stamp.target)) * 100))
}

function displayValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function memberDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '未知日期' : `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, '0')}`
}

function touchStamp(stamp: PassportStamp) {
  if (!stamp.earned) return
  toast.success(`印章「${stamp.title}」已收入创作护照`)
}

async function loadPassport() {
  loading.value = true
  try {
    passport.value = await getCreativePassport()
  } catch (error: any) {
    const detail = error?.data?.detail
    toast.error(typeof detail === 'string' ? detail : '加载创作护照失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadPassport)
</script>

<template>
  <AppLayout>
    <div class="passport-page">
      <header class="page-header">
        <div>
          <span class="page-kicker">CREATIVE PASSPORT / PERSONAL JOURNEY</span>
          <h1>创作护照</h1>
        </div>
        <p>每一次借用都是一次出发，完成创作旅程后，印章会自动落在这里。</p>
      </header>

      <div v-if="loading" class="loading-lines" aria-label="正在加载">
        <span></span><span></span><span></span>
      </div>

      <template v-else-if="passport">
        <section class="passport-book">
          <div class="passport-identity">
            <span class="identity-label">HOLDER / 持有人</span>
            <h2>{{ passport.user_name }}</h2>
            <p>{{ passport.student_id }}</p>
            <div class="identity-meta">
              <span>ISSUED<br /><strong>{{ memberDate(passport.member_since) }}</strong></span>
              <span>STAMPED<br /><strong>{{ passport.earned_stamps }} / {{ passport.stamps.length }}</strong></span>
            </div>
          </div>
          <div class="passport-stats">
            <div><strong>{{ passport.total_projects }}</strong><span>创作项目</span></div>
            <div><strong>{{ passport.completed_returns }}</strong><span>完成归还</span></div>
            <div><strong>{{ passport.unique_equipment }}</strong><span>使用器材</span></div>
            <div><strong>{{ passport.total_hours }}</strong><span>累计小时</span></div>
          </div>
          <div class="passport-categories">
            <span>TRAVELLED THROUGH</span>
            <p>{{ passport.categories.length ? passport.categories.join(' · ') : '等待第一次创作出发' }}</p>
          </div>
        </section>

        <section class="stamp-section">
          <div class="section-title">
            <div>
              <span>VISA & STAMPS</span>
              <h2>创作印章</h2>
            </div>
            <p>点击已获得的印章，可以再次听见盖章声。</p>
          </div>

          <div class="stamp-grid">
            <button
              v-for="(stamp, index) in passport.stamps"
              :key="stamp.key"
              type="button"
              class="stamp-card"
              :class="{ earned: stamp.earned, locked: !stamp.earned }"
              :style="{ '--stamp-delay': `${index * 70}ms` }"
              @click="touchStamp(stamp)"
            >
              <div class="stamp-mark">
                <EditorialIcon :name="stampIcon(stamp.icon)" :size="82" />
                <span v-if="stamp.earned" class="stamp-seal">ARCHIVED</span>
              </div>
              <span class="stamp-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <h3>{{ stamp.title }}</h3>
              <p>{{ stamp.description }}</p>
              <div class="stamp-progress">
                <span :style="{ width: `${progress(stamp)}%` }"></span>
              </div>
              <small>
                {{ stamp.earned ? '已获得' : `${displayValue(stamp.current)} / ${displayValue(stamp.target)}` }}
              </small>
            </button>
          </div>
        </section>
      </template>

      <EmptyState v-else icon="passport" text="护照暂时无法打开" sub-text="请稍后刷新页面重试" />
    </div>
  </AppLayout>
</template>

<style scoped>
.passport-page { max-width: 1180px; margin: 0 auto; }
.page-header {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  align-items: end;
  gap: 40px;
  padding: 24px 0 28px;
  margin-bottom: 30px;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
}
.page-kicker,
.section-title span,
.identity-label,
.passport-categories > span {
  color: var(--accent);
  font: 700 10px/1 var(--font-ui);
  letter-spacing: .2em;
}
.page-header h1 { margin: 20px 0 0; font: 500 clamp(62px,9vw,116px)/.8 var(--font); letter-spacing: -.07em; }
.page-header p { margin: 0; color: var(--text-secondary); font: 14px/1.8 var(--font-ui); }
.passport-book {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 36px;
  padding: clamp(26px,4vw,54px);
  overflow: hidden;
  color: #f2efe7;
  background: #24332e;
  border: 1px solid #191917;
  box-shadow: 10px 12px 0 #c9b24c;
}
.passport-book::after {
  content: 'PASSPORT';
  position: absolute;
  right: -20px;
  bottom: -22px;
  color: rgba(255,255,255,.045);
  font: 700 clamp(90px,14vw,180px)/1 var(--font-ui);
  letter-spacing: -.06em;
}
.passport-identity { padding-right: 36px; border-right: 1px solid rgba(255,255,255,.24); }
.passport-identity h2 { margin: 24px 0 5px; font: 500 clamp(34px,5vw,64px)/1 var(--font); }
.passport-identity > p { margin: 0; color: rgba(255,255,255,.58); font: 12px/1 var(--font-ui); letter-spacing: .12em; }
.identity-meta { display: flex; gap: 50px; margin-top: 42px; color: rgba(255,255,255,.42); font: 700 9px/1.6 var(--font-ui); letter-spacing: .14em; }
.identity-meta strong { color: #f2efe7; font-size: 13px; }
.passport-stats { display: grid; grid-template-columns: repeat(4,1fr); position: relative; z-index: 1; }
.passport-stats div { padding: 8px 12px 20px; border-left: 1px solid rgba(255,255,255,.22); }
.passport-stats strong { display: block; font: 500 clamp(34px,5vw,62px)/1 var(--font); }
.passport-stats span { color: rgba(255,255,255,.5); font: 10px/1 var(--font-ui); letter-spacing: .1em; }
.passport-categories { grid-column: 2; position: relative; z-index: 1; }
.passport-categories p { margin: 9px 0 0; font: 500 17px/1.6 var(--font); }
.stamp-section { margin-top: 72px; }
.section-title { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid var(--text); }
.section-title h2 { margin: 10px 0 0; font: 500 42px/1 var(--font); }
.section-title p { margin: 0; color: var(--text-tertiary); font: 12px/1.5 var(--font-ui); }
.stamp-grid { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
.stamp-card {
  position: relative;
  min-height: 330px;
  padding: 24px 20px 20px;
  text-align: left;
  color: var(--text);
  background: var(--bg-card);
  border: 0;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  cursor: default;
  animation: stamp-arrive .5s var(--stamp-delay) both;
}
.stamp-card.earned { cursor: pointer; background: #f4ead2; }
.stamp-card.earned:hover .stamp-mark { transform: rotate(-4deg) scale(1.04); }
.stamp-card.locked .stamp-mark { filter: grayscale(1); opacity: .22; }
.stamp-mark { position: relative; width: 108px; height: 108px; display: grid; place-items: center; margin-bottom: 22px; border: 1px solid currentColor; border-radius: 50%; transition: transform .25s ease; }
.stamp-seal { position: absolute; left: 50%; bottom: 3px; transform: translateX(-50%) rotate(-6deg); padding: 3px 8px; color: #9d3f32; border: 2px solid #9d3f32; font: 800 8px/1 var(--font-ui); letter-spacing: .12em; }
.stamp-number { position: absolute; right: 16px; top: 16px; color: var(--text-tertiary); font: 700 10px/1 var(--font-ui); letter-spacing: .12em; }
.stamp-card h3 { margin: 0 0 8px; font: 600 20px/1.2 var(--font); }
.stamp-card p { min-height: 38px; margin: 0; color: var(--text-secondary); font: 12px/1.55 var(--font-ui); }
.stamp-progress { height: 3px; margin-top: 20px; background: var(--border-light); }
.stamp-progress span { display: block; height: 100%; background: #9d604d; }
.stamp-card small { display: block; margin-top: 8px; color: var(--text-tertiary); font: 10px/1 var(--font-ui); letter-spacing: .08em; }
.loading-lines { display: grid; gap: 12px; }
.loading-lines span { display: block; height: 80px; background: linear-gradient(90deg,var(--bg-input),var(--bg-card),var(--bg-input)); background-size: 200% 100%; animation: loading 1.2s infinite; }
@keyframes loading { to { background-position: -200% 0; } }
@keyframes stamp-arrive { from { opacity: 0; transform: scale(1.08) rotate(-2deg); } to { opacity: 1; transform: none; } }
@media (max-width: 920px) {
  .stamp-grid { grid-template-columns: repeat(2,1fr); }
  .passport-stats { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 620px) {
  .page-header { grid-template-columns: 1fr; }
  .passport-book { grid-template-columns: 1fr; }
  .passport-identity { padding: 0 0 28px; border-right: 0; border-bottom: 1px solid rgba(255,255,255,.24); }
  .passport-categories { grid-column: 1; }
  .stamp-grid { grid-template-columns: 1fr; }
  .stamp-card { min-height: 290px; }
  .section-title { align-items: start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) { .stamp-card { animation: none; } }
</style>
