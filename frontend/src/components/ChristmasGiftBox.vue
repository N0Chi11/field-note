<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { NModal } from 'naive-ui'
import ChristmasGiftParcel from '@/components/ChristmasGiftParcel.vue'
import { GIFT_CAMERAS, type GiftCamera } from '@/utils/christmasGiftCameras'
import { downloadGiftCard } from '@/utils/christmasGiftCard'

const show = defineModel<boolean>('show', { required: true })
const selectedId = ref('')
const gift = shallowRef<GiftCamera | null>(null)
const opening = ref(false)
const photoFailed = ref(false)
const saveError = ref(false)
const heading = ref<HTMLHeadingElement | null>(null)
const parcel = ref<HTMLButtonElement | null>(null)
const photo = ref<HTMLImageElement | null>(null)
const selected = computed(() => GIFT_CAMERAS.find(camera => camera.id === selectedId.value))
let lastId = ''
let revealTimer: number | undefined

function cancelOpening() {
  if (revealTimer !== undefined) window.clearTimeout(revealTimer)
  revealTimer = undefined
  opening.value = false
}

function resetGift() {
  cancelOpening()
  gift.value = null
  selectedId.value = ''
  photoFailed.value = false
  saveError.value = false
}

watch(show, open => {
  if (open) {
    resetGift()
    lastId = ''
  } else {
    cancelOpening()
  }
})

onBeforeUnmount(cancelOpening)

async function reveal(camera: GiftCamera) {
  cancelOpening()
  if (!show.value) return
  gift.value = camera
  lastId = camera.id
  await nextTick()
  heading.value?.focus()
}

function openParcel() {
  if (!show.value || opening.value || gift.value) return
  const remaining = GIFT_CAMERAS.filter(camera => camera.id !== lastId)
  const camera = selected.value ?? remaining[Math.floor(Math.random() * remaining.length)] ?? GIFT_CAMERAS[0]
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    void reveal(camera)
    return
  }
  opening.value = true
  revealTimer = window.setTimeout(() => void reveal(camera), 440)
}

async function openAnother() {
  resetGift()
  await nextTick()
  parcel.value?.focus()
}

function afterClose() {
  if (!show.value) resetGift()
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
        <h2 id="camera-gift-title" ref="heading" tabindex="-1">{{ gift ? '收到一台相机' : '圣诞相机礼盒' }}</h2>
        <button type="button" class="gift-close" tabindex="0" aria-label="关闭圣诞相机礼盒" @click="show = false">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>

      <template v-if="!gift">
        <div class="gift-tray">
          <button
            ref="parcel"
            type="button"
            class="gift-wrap"
            tabindex="0"
            :disabled="opening"
            :aria-label="opening ? '正在拆礼物' : '拆开礼物盒'"
            :aria-busy="opening"
            aria-describedby="camera-gift-hint"
            @click="openParcel"
          >
            <ChristmasGiftParcel class="gift-wrap__box" :opening="opening" />
            <span class="gift-wrap__action">{{ opening ? '正在拆礼物…' : '拆开礼物盒' }}</span>
            <span id="camera-gift-hint" class="gift-wrap__hint">
              {{ selected ? `指定礼物：${selected.brand} ${selected.model}` : '没选型号就随机拆一台' }}
            </span>
          </button>

          <fieldset class="gift-picker">
            <legend>也可以指定一台</legend>
            <div class="gift-options">
              <label v-for="camera in GIFT_CAMERAS" :key="camera.id" class="gift-choice">
                <input
                  v-model="selectedId"
                  type="radio"
                  name="camera-gift"
                  :value="camera.id"
                  :aria-label="`${camera.brand} ${camera.model}`"
                  :disabled="opening"
                />
                <span class="gift-option">
                  <img :src="camera.photo" alt="" decoding="async" width="360" height="240" />
                  <span class="gift-option__caption">
                    <span class="gift-option__brand">{{ camera.brand }}</span>
                    <strong>{{ camera.model }}</strong>
                  </span>
                </span>
              </label>
            </div>
            <button v-if="selected" class="gift-clear" type="button" tabindex="0" :disabled="opening" @click="selectedId = ''">改为随机拆</button>
          </fieldset>
        </div>
        <details class="gift-attributions">
          <summary tabindex="0">实机照片来源</summary>
          <ul>
            <li v-for="camera in GIFT_CAMERAS" :key="camera.id">
              <a :href="camera.source" target="_blank" rel="noopener noreferrer">{{ camera.brand }} {{ camera.model }} · {{ camera.author }}</a>
              <span> / </span>
              <a :href="camera.licenseUrl" target="_blank" rel="noopener noreferrer">{{ camera.license }}</a>
            </li>
          </ul>
          <p>照片经裁切、缩放和转码，继续按各自的原许可使用。</p>
        </details>
      </template>

      <div v-else class="gift-result">
        <figure class="gift-card">
          <div class="gift-card__mat">
            <span class="gift-card__seal">虚拟礼物</span>
            <img ref="photo" class="gift-card__photo" :src="gift.photo" :alt="`${gift.brand} ${gift.model} 实机照片`" @error="photoFailed = true" />
            <p v-if="photoFailed" class="gift-photo-error">照片暂未加载，可从下方查看实机图。</p>
          </div>
          <figcaption class="gift-card__caption">
            <p class="gift-card__brand">{{ gift.brand }}</p>
            <p class="gift-card__model">{{ gift.model }}</p>
            <p class="gift-card__kind">{{ gift.kind }}</p>
            <a class="gift-official" :href="gift.official" target="_blank" rel="noopener noreferrer">查看品牌官网 <span aria-hidden="true">↗</span></a>
            <p class="gift-credit">
              <a :href="gift.source" target="_blank" rel="noopener noreferrer">摄影：{{ gift.author }}</a>
              <span> · </span>
              <a :href="gift.licenseUrl" target="_blank" rel="noopener noreferrer">{{ gift.license }}</a>
            </p>
          </figcaption>
        </figure>
        <p v-if="saveError" class="gift-error" role="alert">礼卡暂未保存。等照片加载后再试，或直接截图。</p>
        <div class="gift-actions">
          <button type="button" class="gift-secondary" tabindex="0" @click="openAnother">再拆一个</button>
          <button type="button" class="gift-primary" tabindex="0" :disabled="photoFailed" @click="saveGift">保存礼物卡</button>
        </div>
      </div>

      <p class="gift-disclaimer">这是虚拟礼物，不是实际抽奖，也不会占用器材库存。</p>
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
.gift-tray { display: grid; grid-template-columns: minmax(205px, .88fr) minmax(0, 1.12fr); gap: 16px; align-items: start; }
.gift-wrap {
  position: relative;
  isolation: isolate;
  display: flex;
  width: 100%;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 15px;
  border: 1px solid #a98660;
  background:
    url('/assets/christmas-bells-v1.svg') right -15px top -6px / 132px auto no-repeat,
    radial-gradient(ellipse at 24% 28%, #2d7555, transparent 70%),
    #124736;
  color: #fff3d5;
  transition: background-color var(--transition);
}
.gift-wrap::before { content: ''; position: absolute; inset: 7px; border: 1px solid #ead1a278; pointer-events: none; }
.gift-wrap:focus-visible { outline: 2px solid #f6d79f; outline-offset: -8px; }
.gift-wrap:not(:disabled):hover { background-color: #1b5a42; }
.gift-wrap:disabled { cursor: wait; opacity: 1; }
.gift-wrap__box { width: min(190px, 93%); aspect-ratio: 210 / 166; }
.gift-wrap__action { display: block; border-block: 1px solid #deb77e85; padding: 5px 12px; font: 700 clamp(15px, 3.7vw, 20px)/1.3 var(--font); }
.gift-wrap__hint { color: #f1d5a3; font: 12px/1.45 var(--font-ui); text-wrap: balance; }
.gift-picker { min-width: 0; padding: 0; border: 0; }
.gift-picker legend { margin-bottom: 8px; color: var(--gift-ink); font: 700 13px/1.4 var(--font-ui); }
.gift-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.gift-choice { position: relative; display: block; cursor: pointer; }
.gift-choice input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.gift-option { display: block; border: 1px solid #d5c5b0; background: #fffaf1; }
.gift-option img { display: block; width: 100%; height: 94px; object-fit: contain; background: #eee5d5; }
.gift-option__caption { display: grid; gap: 1px; padding: 5px 8px 7px; color: var(--gift-ink); }
.gift-option__brand { font: 700 10px/1.4 var(--font-data); color: #705b48; text-transform: uppercase; letter-spacing: .08em; }
.gift-option strong { font: 600 15px/1.2 var(--font); }
.gift-choice:hover .gift-option { border-color: #a97c5a; }
.gift-choice input:checked + .gift-option { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); background: #fff0e2; }
.gift-choice input:focus-visible + .gift-option { outline: 2px solid var(--accent); outline-offset: 2px; }
.gift-clear { display: inline-flex; min-height: 30px; align-items: center; margin-top: 4px; border: 0; background: none; color: var(--accent); font: 600 12px var(--font-ui); text-decoration: underline; text-underline-offset: 3px; }
.gift-attributions { margin-top: 10px; color: #625645; font: 11px/1.65 var(--font-ui); }
.gift-attributions summary { cursor: pointer; width: fit-content; padding: 4px 0; }
.gift-attributions ul { padding-left: 17px; }
.gift-attributions p { margin-top: 5px; }
.gift-result { animation: gift-appears .36s cubic-bezier(.2,.7,.25,1) both; }
.gift-card { display: grid; grid-template-columns: minmax(0, 1.24fr) minmax(0, .76fr); min-width: 0; border: 1px solid var(--gift-gold); box-shadow: 3px 4px 0 #ad84502e; }
.gift-card__mat { position: relative; min-width: 0; display: grid; align-items: center; min-height: 236px; padding: 10px; background: #164d39; }
.gift-card__photo { display: block; width: 100%; height: min(280px, 37dvh); object-fit: contain; background: #194d3a; }
.gift-card__seal { position: absolute; top: 16px; left: 16px; z-index: 1; padding: 3px 8px; border: 1px solid #dcb579; color: #fff4df; background: #83253b; font: 700 11px/1.45 var(--font-ui); letter-spacing: .12em; }
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
.gift-credit { color: #605545; font: 11px/1.6 var(--font-ui); }
.gift-credit a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.gift-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
.gift-primary, .gift-secondary { min-height: 44px; padding: 8px 16px; border: 1px solid var(--accent); background: var(--accent); color: var(--text-on-dark); font: 700 13px/1.3 var(--font-ui); }
.gift-primary:not(:disabled):hover { background: var(--accent-hover); }
.gift-secondary { border-color: #d3bda3; color: var(--gift-ink); background: transparent; }
.gift-error { color: var(--danger); margin: 10px 0 0; font: 12px/1.55 var(--font-ui); }
.gift-disclaimer { margin: 11px 0 0; color: #655744; font: 11px/1.65 var(--font-ui); }
@keyframes gift-appears {
  from { opacity: 0; transform: translateY(9px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (max-width: 620px) {
  .gift-tray { grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .gift-wrap { min-height: 142px; padding: 10px 14px; display: grid; grid-template-columns: 106px minmax(0, 1fr); grid-template-rows: 1fr 1fr; gap: 0 7px; text-align: left; background-size: 84px auto, auto, auto; }
  .gift-wrap__box { grid-row: 1 / -1; width: 100%; }
  .gift-wrap__action { justify-self: start; align-self: end; padding: 3px 5px; }
  .gift-wrap__hint { justify-self: start; align-self: start; margin-top: 6px; font-size: 11px; text-wrap: wrap; }
  .gift-option img { height: 76px; }
  .gift-card { grid-template-columns: minmax(0, 1fr); }
  .gift-card__mat { min-height: 0; padding: 7px; }
  .gift-card__photo { height: clamp(133px, 49vw, 216px); }
  .gift-card__caption { padding: 13px 15px; }
  .gift-official { margin-top: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .gift-result { animation: none; }
}
</style>
