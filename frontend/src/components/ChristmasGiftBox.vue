<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { NModal } from 'naive-ui'
import ChristmasGiftParcel from '@/components/ChristmasGiftParcel.vue'
import { GIFT_CAMERAS, type GiftCamera } from '@/utils/christmasGiftCameras'
import { downloadGiftCard } from '@/utils/christmasGiftCard'

const ROLL_MS = 2520
const OPEN_MS = 640
const REEL_START = 2
const RUNUP_ROUNDS = 1
const REEL_FINAL_ROUND = REEL_START + 1 + RUNUP_ROUNDS * GIFT_CAMERAS.length
const reelFrames = [
  ...GIFT_CAMERAS.slice(-REEL_START),
  null,
  ...Array.from({ length: RUNUP_ROUNDS + 1 }, () => GIFT_CAMERAS).flat(),
  ...GIFT_CAMERAS.slice(0, REEL_START)
]

const show = defineModel<boolean>('show', { required: true })
const gift = shallowRef<GiftCamera | null>(null)
const phase = ref<'ready' | 'rolling' | 'landed'>('ready')
const reelStop = ref(REEL_START)
const photoFailed = ref(false)
const saveError = ref(false)
const heading = ref<HTMLHeadingElement | null>(null)
const drawButton = ref<HTMLButtonElement | null>(null)
const photo = ref<HTMLImageElement | null>(null)
const drawLabel = computed(() => phase.value === 'rolling' ? '正在抽奖…' : phase.value === 'landed' ? '即将揭晓…' : '开始抽奖')
let phaseTimer: number | undefined

function cancelDraw() {
  if (phaseTimer !== undefined) window.clearTimeout(phaseTimer)
  phaseTimer = undefined
}

function resetDraw() {
  cancelDraw()
  gift.value = null
  phase.value = 'ready'
  reelStop.value = REEL_START
  photoFailed.value = false
  saveError.value = false
}

watch(show, open => {
  if (open) resetDraw()
  else cancelDraw()
})

onBeforeUnmount(cancelDraw)

async function reveal(camera: GiftCamera) {
  cancelDraw()
  if (!show.value) return
  gift.value = camera
  await nextTick()
  heading.value?.focus()
}

function startDraw() {
  if (!show.value || phase.value !== 'ready' || gift.value) return
  const winner = Math.floor(Math.random() * GIFT_CAMERAS.length)
  const camera = GIFT_CAMERAS[winner]
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void reveal(camera)
    return
  }
  reelStop.value = REEL_FINAL_ROUND + winner
  phase.value = 'rolling'
  phaseTimer = window.setTimeout(() => {
    if (!show.value) return
    phase.value = 'landed'
    phaseTimer = window.setTimeout(() => void reveal(camera), OPEN_MS)
  }, ROLL_MS)
}

async function drawAgain() {
  resetDraw()
  startDraw()
  await nextTick()
  if (phase.value !== 'ready') drawButton.value?.focus()
}

function afterClose() {
  if (!show.value) resetDraw()
}

function saveGift() {
  if (!gift.value || !photo.value) return
  saveError.value = false
  try {
    downloadGiftCard(gift.value, photo.value)
  } catch {
    saveError.value = true
  }
}
</script>

<template>
  <NModal v-model:show="show" :mask-closable="false" transform-origin="center" @after-leave="afterClose">
    <div class="gift-room" role="dialog" aria-modal="true" aria-labelledby="camera-gift-title">
      <header class="gift-header">
        <h2 id="camera-gift-title" ref="heading" tabindex="-1" :aria-describedby="gift ? 'gift-brand gift-winner' : undefined">{{ gift ? '抽中了！' : '相机抽奖' }}</h2>
        <button type="button" class="gift-close" tabindex="0" aria-label="关闭相机抽奖" @click="show = false">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>

      <template v-if="!gift">
        <div class="gift-stage">
          <div class="gift-drive">
            <ChristmasGiftParcel class="gift-drive__parcel" :opening="phase === 'landed'" />
            <div class="gift-drive__controls">
              <p id="camera-gift-hint" class="gift-drive__hint">{{ GIFT_CAMERAS.length }} 款机型 · 随机抽取</p>
              <button
                ref="drawButton"
                type="button"
                class="gift-draw"
                tabindex="0"
                :aria-disabled="phase !== 'ready'"
                aria-describedby="camera-gift-hint"
                @click="startDraw"
              >
                {{ drawLabel }}
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1c1 5.2 3.8 8 9 9-5.2 1-8 3.8-9 9-1-5.2-3.8-8-9-9 5.2-1 8-3.8 9-9Z"/></svg>
              </button>
              <span class="gift-status" role="status">{{ phase === 'ready' ? '' : drawLabel }}</span>
            </div>
          </div>

          <div
            class="filmstrip"
            :data-phase="phase"
            :style="{ '--film-from': REEL_START, '--film-to': reelStop, '--film-duration': `${ROLL_MS}ms` }"
            aria-hidden="true"
          >
            <div class="filmstrip__window">
              <div class="filmstrip__track">
                <div v-for="(camera, i) in reelFrames" :key="i" class="film-cell" :class="{ 'film-cell--blank': !camera, 'film-cell--winner': phase === 'landed' && i === reelStop }">
                  <template v-if="camera">
                    <img class="film-cell__photo" :src="camera.photo" alt="" decoding="async" width="166" height="104" />
                    <span class="film-cell__caption">
                      <span>{{ camera.brand }}</span>
                      <strong>{{ camera.model }}</strong>
                    </span>
                  </template>
                  <svg v-else class="film-cell__unknown" viewBox="0 0 80 80" fill="none">
                    <path d="M9 29V9h20m22 0h20v20m0 22v20H51m-22 0H9V51" stroke="currentColor" stroke-opacity=".5" />
                    <circle cx="40" cy="40" r="24" stroke="currentColor" stroke-opacity=".45" stroke-dasharray="2 3" />
                    <path d="M40 19c2.25 12.25 8.75 18.75 21 21-12.25 2.25-18.75 8.75-21 21-2.25-12.25-8.75-18.75-21-21 12.25-2.25 18.75-8.75 21-21Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="filmstrip__gate"></div>
          </div>
        </div>
        <details class="gift-pool">
          <summary tabindex="0">查看奖池</summary>
          <ul class="gift-pool__list">
            <li v-for="camera in GIFT_CAMERAS" :key="camera.id" class="gift-pool__item" :data-camera-id="camera.id">
              <img :src="camera.photo" alt="" width="152" height="90" decoding="sync" />
              <span class="film-cell__caption"><span>{{ camera.brand }}</span><strong>{{ camera.model }}</strong></span>
            </li>
          </ul>
        </details>
      </template>

      <div v-else class="gift-result">
        <figure class="gift-card">
          <div class="gift-card__mat">
            <img ref="photo" class="gift-card__photo" :src="gift.photo" :alt="`${gift.brand} ${gift.model} 商品图`" @error="photoFailed = true" />
            <p v-if="photoFailed" class="gift-photo-error">图片暂未加载，可以前往品牌商品页查看。</p>
          </div>
          <figcaption class="gift-card__caption">
            <p id="gift-brand" class="gift-card__brand">{{ gift.brand }}</p>
            <p id="gift-winner" class="gift-card__model">{{ gift.model }}</p>
            <p class="gift-card__kind">{{ gift.kind }}</p>
            <a class="gift-official" :href="gift.official" target="_blank" rel="noopener noreferrer">查看商品页 <span aria-hidden="true">↗</span></a>
          </figcaption>
        </figure>
        <aside class="gift-disclaimer" aria-label="开奖提示">
          <img class="gift-disclaimer__sticker" src="/assets/christmas-frog-sticker-v1.jpg" alt="戴着圣诞帽、抱着手臂的奶蛙" width="932" height="957" />
          <p class="gift-disclaimer__copy">仅供娱乐，抽到了也不会真送你。</p>
        </aside>
        <p v-if="saveError" class="gift-error" role="alert">礼卡暂未保存。等照片加载后再试，或直接截图。</p>
        <div class="gift-actions">
          <button type="button" class="gift-secondary gift-again" tabindex="0" @click="drawAgain">再抽一次</button>
          <button type="button" class="gift-primary" tabindex="0" :disabled="photoFailed" @click="saveGift">保存礼物卡</button>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.gift-room {
  --gift-paper: #fff7e8;
  --gift-gold: #d3a675;
  --gift-ink: #103e31;
  width: min(750px, calc(100% - 26px));
  max-height: calc(100vh - 28px);
  max-height: calc(100dvh - 28px);
  overflow: auto;
  margin: auto;
  padding: clamp(15px, 3.2vw, 29px);
  border: 1px solid var(--gift-gold);
  border-top: 5px solid var(--accent);
  background: var(--gift-paper);
  box-shadow: 9px 10px 0 #18342945, var(--shadow-lg);
}
.gift-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 15px;
  padding-bottom: 13px;
  border-bottom: 1px solid #c8af91;
}
.gift-header h2 { color: var(--gift-ink); font: 500 clamp(27px, 6vw, 37px)/1.1 var(--font); letter-spacing: -.04em; }
.gift-close { display: grid; width: 44px; height: 44px; flex: 0 0 auto; place-items: center; border: 1px solid #d9c7ad; color: var(--gift-ink); background: transparent; }
.gift-close svg { width: 19px; height: 19px; }
.gift-close:hover, .gift-secondary:hover { background: var(--bg-hover); }
.gift-stage {
  position: relative;
  padding: 10px clamp(8px, 2vw, 16px) clamp(10px, 2vw, 16px);
  border: 1px solid #a98660;
  background:
    url('/assets/christmas-bells-v1.svg') right -12px top -9px / clamp(74px, 13vw, 151px) auto no-repeat,
    radial-gradient(ellipse at 34% 14%, #255b43, #123e30 72%);
  color: #fff3d5;
}
.gift-stage::before { content: ''; position: absolute; inset: 5px; border: 1px solid #d3a6755c; pointer-events: none; }
.gift-drive { display: flex; align-items: center; justify-content: center; gap: clamp(4px, 2vw, 18px); padding: 0 4px 14px; }
.gift-drive__parcel { width: clamp(84px, 28vw, 157px); flex: 0 0 auto; aspect-ratio: 210 / 166; }
.gift-drive__controls { position: relative; display: grid; min-width: 0; gap: 8px; }
.gift-drive__hint { color: #f1d5a3; font: 12px/1.4 var(--font-ui); }
.gift-draw {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  gap: 8px;
  min-height: 44px;
  min-width: 136px;
  padding: 6px 10px;
  border: 1px solid #e3b77b;
  background: #a62745;
  color: #fff2d7;
  box-shadow: 0 3px 0 #421b24, inset 0 0 0 2px #a62745, inset 0 0 0 3px #f0cc9357;
  font: 700 16px/1.22 var(--font);
  transition: background-color var(--transition), transform var(--transition);
}
.gift-draw svg { width: 14px; height: 14px; flex: 0 0 auto; color: #f4d499; }
.gift-draw[aria-disabled='false']:hover { background-color: #bc3452; transform: translateY(-1px); }
.gift-draw[aria-disabled='false']:active { transform: translateY(2px); }
.gift-draw:focus-visible { outline: 2px solid #ffdea5; outline-offset: 3px; }
.gift-draw[aria-disabled='true'] { background-color: #742336; cursor: wait; }
.gift-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.filmstrip {
  --film-width: clamp(115px, 36vw, 166px);
  --film-gap: 9px;
  --film-pitch: calc(var(--film-width) + var(--film-gap));
  --film-edge: 15px;
  position: relative;
  padding-block: var(--film-edge);
  border: 1px solid #b69565;
  background: #151e19;
}
.filmstrip::before, .filmstrip::after {
  content: '';
  position: absolute;
  inset-inline: 5px;
  height: 5px;
  background: repeating-linear-gradient(90deg, #bd9c6b 0 9px, transparent 9px 20px);
}
.filmstrip::before { top: 4px; }
.filmstrip::after { bottom: 4px; }
.filmstrip__window { position: relative; overflow: hidden; height: clamp(108px, 33vw, 148px); }
.filmstrip__window::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #151e19c2, transparent 17%, transparent 83%, #151e19c2); pointer-events: none; }
.filmstrip__track {
  position: absolute;
  inset: 0 auto 0 50%;
  display: flex;
  width: max-content;
  gap: var(--film-gap);
  transform: translateX(calc(-0.5 * var(--film-width) - var(--film-to) * var(--film-pitch)));
}
.filmstrip[data-phase='rolling'] .filmstrip__track { animation: gift-roll var(--film-duration) cubic-bezier(.18, .67, .16, 1) both; }
.filmstrip__gate { position: absolute; inset-block: var(--film-edge); left: 50%; width: var(--film-width); z-index: 1; transform: translateX(-50%); border: 1px solid #e3be87; pointer-events: none; }
.filmstrip__gate::before, .filmstrip__gate::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 18px; height: 11px; background: #f7d49a; }
.filmstrip__gate::before { top: -9px; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.filmstrip__gate::after { bottom: -9px; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.filmstrip[data-phase='landed'] .filmstrip__gate { border-color: #ffdf9d; box-shadow: 0 0 18px 2px #f4c47970; }
.film-cell { flex: none; width: var(--film-width); display: grid; grid-template-rows: minmax(0, 1fr) auto; overflow: hidden; background: #fff2da; color: var(--gift-ink); }
.film-cell--winner { background: #ffe3ac; }
.film-cell--blank { grid-template-rows: minmax(0, 1fr); place-items: center; color: #efd3a0; background: repeating-linear-gradient(137deg, #1b442f 0 6px, #1b462f 6px 12px); }
.film-cell__unknown { width: 48%; max-height: 70%; }
.film-cell__photo { display: block; width: 100%; height: 100%; object-fit: contain; background: #fff; }
.film-cell__caption { display: grid; gap: 1px; padding: 4px 8px 6px; }
.film-cell__caption span { color: #755840; font: 700 9px/1.2 var(--font-data); text-transform: uppercase; letter-spacing: .08em; }
.film-cell__caption strong { font: 600 clamp(13px, 3.5vw, 16px)/1.14 var(--font); }
@keyframes gift-roll {
  from { transform: translateX(calc(-0.5 * var(--film-width) - var(--film-from) * var(--film-pitch))); }
}
.gift-pool { margin-top: 10px; color: var(--gift-ink); font: 600 12px/1.65 var(--font-ui); }
.gift-pool summary { cursor: pointer; width: fit-content; min-height: 36px; padding: 7px 7px 7px 0; }
.gift-pool__list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; list-style: none; }
.gift-pool__item { overflow: hidden; border: 1px solid #d7c0a1; background: #fff2da; }
.gift-pool__item img { display: block; width: 100%; height: 76px; object-fit: contain; background: #fff; }
.gift-result { animation: gift-appears .36s cubic-bezier(.2,.7,.25,1) both; }
.gift-card { display: grid; grid-template-columns: minmax(0, 1.24fr) minmax(0, .76fr); min-width: 0; border: 1px solid var(--gift-gold); box-shadow: 3px 4px 0 #ad84502e; }
.gift-card__mat { position: relative; min-width: 0; display: grid; align-items: center; min-height: 236px; padding: 10px; background: #164d39; }
.gift-card__photo { display: block; width: 100%; height: min(280px, 37dvh); object-fit: contain; background: #fff; }
.gift-photo-error { padding: 9px; color: #f8e5c1; font: 12px/1.5 var(--font-ui); }
.gift-card__caption {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(12px, 3.1vw, 27px);
  background: url('/assets/christmas-bells-v1.svg') right -32px top -11px / 126px auto no-repeat, #fff7e6;
  color: var(--gift-ink);
}
.gift-card__brand { padding-right: 35px; font: 700 11px/1.5 var(--font-data); letter-spacing: .12em; text-transform: uppercase; }
.gift-card__model { margin: 5px 0; font: 500 clamp(29px, 5vw, 43px)/1 var(--font); letter-spacing: -.06em; text-wrap: balance; }
.gift-card__kind { margin-top: 3px; color: var(--text-secondary); font: 12px/1.5 var(--font-ui); }
.gift-official { align-self: flex-start; margin: 15px 0 8px; border-bottom: 1px solid #c8ad90; padding-bottom: 3px; font: 600 12px/1.45 var(--font-ui); }
.gift-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
.gift-primary, .gift-secondary { min-height: 44px; padding: 8px 16px; border: 1px solid var(--accent); background: var(--accent); color: var(--text-on-dark); font: 700 13px/1.3 var(--font-ui); }
.gift-primary:not(:disabled):hover { background: var(--accent-hover); }
.gift-secondary { border-color: #d3bda3; color: var(--gift-ink); background: transparent; }
.gift-error { color: var(--danger); margin: 10px 0 0; font: 12px/1.55 var(--font-ui); }
.gift-disclaimer {
  display: grid;
  grid-template-columns: clamp(58px, 15vw, 84px) minmax(0, 1fr);
  align-items: center;
  gap: clamp(10px, 2.6vw, 19px);
  margin-top: 15px;
  padding: 9px clamp(10px, 2.6vw, 16px);
  border: 1px solid #e1c6a5;
  border-left: 4px solid #a62745;
  background: #f5e5d0;
  color: #732238;
}
.gift-disclaimer__sticker { display: block; width: 100%; height: auto; border: 1px solid #c9aa83; background: #fffdf8; }
.gift-disclaimer__copy { font: 800 clamp(17px, 4vw, 23px)/1.42 var(--font-ui); text-wrap: balance; }
@keyframes gift-appears {
  from { opacity: 0; transform: translateY(9px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (max-width: 620px) {
  .gift-drive__hint { font-size: 11px; }
  .gift-draw { min-width: 124px; }
  .filmstrip { --film-gap: 7px; }
  .gift-pool__list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gift-card { grid-template-columns: minmax(0, 1fr); }
  .gift-card__mat { min-height: 0; padding: 7px; }
  .gift-card__photo { height: clamp(133px, 49vw, 216px); }
  .gift-card__caption { padding: 13px 15px; }
  .gift-official { margin-top: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .gift-draw { transition: none; }
  .gift-draw[aria-disabled='false']:hover, .gift-draw[aria-disabled='false']:active { transform: none; }
  .filmstrip[data-phase='rolling'] .filmstrip__track, .gift-result { animation: none; }
}
</style>
