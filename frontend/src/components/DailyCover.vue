<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import EditorialIcon from '@/components/common/EditorialIcon.vue'
import { EDITORIAL_POEMS, getEditorialPoem } from '@/utils/editorialPoetry'
import { playPageTurnSound } from '@/utils/editorialSound'

const props = defineProps<{
  show: boolean
  userName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const poem = getEditorialPoem()
const poemNumber = EDITORIAL_POEMS.findIndex((item) => item.id === poem.id) + 1
const now = new Date()
const dayOfYear = Math.floor(
  (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) /
    86400000
)
const dateLine = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(now)
const issueNumber = `${now.getFullYear()}-${String(dayOfYear).padStart(3, '0')}`
const palette = computed(() => `palette-${dayOfYear % 4}`)

function closeCover() {
  playPageTurnSound()
  emit('close')
}

watch(
  () => props.show,
  (show) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = show ? 'hidden' : ''
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cover-reveal">
      <section v-if="show" class="daily-cover" :class="palette" aria-modal="true" role="dialog">
        <div class="cover-grain" aria-hidden="true"></div>
        <header class="cover-masthead">
          <span>NEW MEDIA CENTRE</span>
          <span>DAILY EDITION / {{ issueNumber }}</span>
        </header>

        <div class="cover-body">
          <div class="cover-index">
            <span>VOL. {{ String(now.getMonth() + 1).padStart(2, '0') }}</span>
            <span>POEM {{ String(poemNumber).padStart(2, '0') }}</span>
          </div>

          <div class="cover-art" aria-hidden="true">
            <EditorialIcon name="camera" :size="210" />
          </div>

          <div class="cover-copy">
            <p class="cover-date">{{ dateLine }}</p>
            <p class="cover-greeting">{{ userName ? `${userName}，欢迎回到编辑部` : '欢迎回到编辑部' }}</p>
            <h1>今日<br />封面</h1>
          </div>

          <figure class="cover-poem">
            <blockquote>
              <span v-for="line in poem.lines" :key="line">{{ line }}</span>
            </blockquote>
            <figcaption>— {{ poem.author }} / {{ poem.title }}</figcaption>
          </figure>
        </div>

        <footer class="cover-footer">
          <span>器材 · 诗歌 · 创作档案</span>
          <button type="button" @click="closeCover">进入本期</button>
        </footer>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.daily-cover {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(22px, 3.5vw, 54px);
  overflow-y: auto;
  color: #191917;
  background: #e8c85d;
  isolation: isolate;
}
.daily-cover.palette-1 { background: #b7c5dc; }
.daily-cover.palette-2 { background: #c6745d; }
.daily-cover.palette-3 { background: #c9bd96; }
.cover-grain {
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: .22;
  pointer-events: none;
  background-image: repeating-radial-gradient(circle at 0 0, transparent 0, rgba(25,25,23,.2) .7px, transparent 1.1px, transparent 4px);
  mix-blend-mode: multiply;
}
.cover-masthead,
.cover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 2px solid currentColor;
  border-bottom: 1px solid currentColor;
  padding: 10px 0;
  font: 700 11px/1 var(--font-ui);
  letter-spacing: .18em;
}
.cover-body {
  position: relative;
  min-height: 620px;
  display: grid;
  grid-template-columns: minmax(210px, .8fr) minmax(340px, 1.3fr);
  align-items: center;
  gap: clamp(20px, 5vw, 90px);
}
.cover-index {
  position: absolute;
  top: 24px;
  left: 0;
  display: flex;
  gap: 22px;
  font: 700 10px/1 var(--font-ui);
  letter-spacing: .16em;
}
.cover-art {
  display: grid;
  place-items: center;
  min-height: 390px;
  border: 1px solid currentColor;
  border-radius: 50% 50% 2px 2px;
  background: rgba(242,239,231,.36);
  transform: rotate(-2deg);
}
.cover-copy { align-self: center; }
.cover-date,
.cover-greeting {
  margin: 0 0 8px;
  font: 600 12px/1.4 var(--font-ui);
  letter-spacing: .08em;
}
.cover-greeting { opacity: .68; }
.cover-copy h1 {
  margin: 24px 0 0;
  font: 500 clamp(92px, 15vw, 210px)/.72 var(--font);
  letter-spacing: -.09em;
}
.cover-poem {
  position: absolute;
  right: 0;
  bottom: 22px;
  width: min(440px, 45vw);
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid currentColor;
}
.cover-poem blockquote {
  display: flex;
  flex-direction: column;
  margin: 0;
  font: 500 clamp(17px, 1.7vw, 26px)/1.5 var(--font);
}
.cover-poem figcaption {
  margin-top: 10px;
  font: 700 10px/1.4 var(--font-ui);
  letter-spacing: .12em;
  text-transform: uppercase;
}
.cover-footer { border-bottom: 0; }
.cover-footer button {
  min-width: 140px;
  padding: 12px 20px;
  border: 1px solid currentColor;
  background: #191917;
  color: #f2efe7;
  font: 700 12px/1 var(--font-ui);
  letter-spacing: .12em;
  cursor: pointer;
}
.cover-reveal-enter-active,
.cover-reveal-leave-active { transition: clip-path .7s cubic-bezier(.77,0,.18,1), opacity .35s ease; }
.cover-reveal-enter-from { clip-path: inset(0 100% 0 0); opacity: .4; }
.cover-reveal-leave-to { clip-path: inset(0 0 0 100%); opacity: 0; }
@media (max-width: 720px) {
  .cover-body { min-height: 720px; grid-template-columns: 1fr; padding: 70px 0 190px; }
  .cover-art { position: absolute; right: -45px; top: 60px; width: 230px; min-height: 300px; opacity: .65; }
  .cover-copy { position: relative; z-index: 1; align-self: start; }
  .cover-copy h1 { font-size: clamp(88px, 30vw, 132px); }
  .cover-poem { width: 100%; bottom: 30px; }
  .cover-masthead span:first-child,
  .cover-footer > span { display: none; }
  .cover-masthead,
  .cover-footer { justify-content: flex-end; }
  .cover-footer button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .cover-reveal-enter-active,
  .cover-reveal-leave-active { transition: opacity .15s ease; }
}
</style>
