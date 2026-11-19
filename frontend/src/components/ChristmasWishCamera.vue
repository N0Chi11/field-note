<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { NModal } from 'naive-ui'
import { CHRISTMAS_COVER, CHRISTMAS_TRIM } from '@/utils/christmasAssets'
import { downloadWishCard } from '@/utils/christmasWishCard'

const MAX_LENGTH = 80
const show = defineModel<boolean>('show', { required: true })
const draft = ref('')
const captured = ref('')
const saveError = ref(false)
const heading = ref<HTMLHeadingElement | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)
const photo = ref<HTMLImageElement | null>(null)
const trim = ref<HTMLImageElement | null>(null)
const wishText = computed(() => draft.value.replace(/\s+/g, ' ').trim())

async function captureWish() {
  if (!wishText.value || captured.value) return
  captured.value = wishText.value
  await nextTick()
  heading.value?.focus()
}

function clearWish() {
  draft.value = ''
  captured.value = ''
  saveError.value = false
}

async function startAnother() {
  clearWish()
  await nextTick()
  textarea.value?.focus()
}

function forgetWish() {
  if (!show.value) clearWish()
}

watch(show, open => {
  if (open) clearWish()
})

function savePhoto() {
  if (!captured.value || !photo.value) return
  saveError.value = false
  try {
    downloadWishCard(captured.value, photo.value, trim.value)
  } catch {
    saveError.value = true
  }
}
</script>

<template>
  <NModal v-model:show="show" :mask-closable="false" transform-origin="center" @after-leave="forgetWish">
    <div class="wish-camera" role="dialog" aria-modal="true" aria-labelledby="wish-camera-title">
      <header class="wish-header">
        <h2 id="wish-camera-title" ref="heading" tabindex="-1">{{ captured ? '愿望入镜了' : '相机许愿' }}</h2>
        <button type="button" class="wish-close" tabindex="0" aria-label="关闭相机许愿" @click="show = false">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>

      <form v-if="!captured" class="wish-form" @submit.prevent="captureWish">
        <div class="wish-finder" aria-hidden="true">
          <span class="wish-finder__outline"></span>
          <img class="wish-finder__camera" src="/assets/christmas-camera-ornament-v1.svg" alt="" width="106" height="106" />
        </div>
        <p class="wish-intro">写一句心愿，按下快门，把它洗成一张圣诞照片。</p>
        <div class="wish-field-heading">
          <label for="christmas-wish">你的圣诞心愿</label>
          <span aria-hidden="true">{{ draft.length }} / {{ MAX_LENGTH }}</span>
        </div>
        <textarea
          id="christmas-wish"
          ref="textarea"
          v-model="draft"
          rows="3"
          :maxlength="MAX_LENGTH"
          placeholder="比如：和喜欢的人再拍一张合照。"
          aria-describedby="wish-private"
          required
        ></textarea>
        <p id="wish-private" class="wish-private">不用摄像头，心愿不上传，关闭后清除。</p>
        <button type="submit" class="wish-primary wish-shutter" tabindex="0" :disabled="!wishText">
          <span class="wish-shutter__dot" aria-hidden="true"></span> 按下快门
        </button>
      </form>

      <div v-else class="wish-result">
        <figure class="wish-print">
          <div class="wish-print__art" aria-hidden="true">
            <img class="wish-print__photo" ref="photo" :src="CHRISTMAS_COVER" alt="" />
            <img class="wish-print__trim" ref="trim" :src="CHRISTMAS_TRIM" alt="" />
          </div>
          <figcaption>
            <span class="wish-print__label">圣诞心愿</span>
            <p class="wish-print__text">{{ captured }}</p>
          </figcaption>
        </figure>
        <p v-if="saveError" class="wish-error" role="alert">没能保存照片，请稍后重试，或截图留存。</p>
        <div class="wish-actions">
          <button type="button" class="wish-retake" tabindex="0" @click="startAnother">再拍一张</button>
          <button type="button" class="wish-primary" tabindex="0" @click="savePhoto">保存照片</button>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped>
.wish-camera {
  width: min(460px, calc(100% - 28px));
  max-height: calc(100vh - 36px);
  max-height: calc(100dvh - 36px);
  overflow: auto;
  margin: auto;
  padding: 18px clamp(16px, 4vw, 25px) 22px;
  border: 1px solid var(--foil);
  border-top: 6px solid transparent;
  background: linear-gradient(var(--bg-card), var(--bg-card)) padding-box, var(--festive-ribbon) border-box;
  box-shadow: var(--shadow-lg);
  color: var(--text);
}
.wish-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.wish-header h2 { font: 500 clamp(27px, 7vw, 34px)/1.13 var(--font); letter-spacing: -.035em; }
.wish-close { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--border); color: var(--text); background: none; }
.wish-close svg { width: 19px; height: 19px; }
.wish-close:hover, .wish-retake:hover { background: var(--bg-hover); }
.wish-finder {
  position: relative;
  min-height: 112px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--foil);
  background:
    url('/assets/christmas-garland-v2.svg') right -12px top -13px / 133px auto no-repeat,
    linear-gradient(122deg, var(--festive-green), var(--bg-sidebar));
}
.wish-finder__outline { position: absolute; inset: 7px; border: 1px solid #efd5a287; pointer-events: none; }
.wish-finder__camera { width: 102px; height: 102px; }
.wish-intro { margin: 13px 0 15px; font: 13px/1.7 var(--font-ui); color: var(--text-secondary); }
.wish-field-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.wish-field-heading label { font: 600 13px var(--font-ui); }
.wish-field-heading span { color: var(--text-tertiary); font: 11px var(--font-data); }
.wish-form textarea {
  display: block;
  width: 100%;
  resize: vertical;
  min-height: 86px;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: 1px;
  background: var(--bg-input);
  color: var(--text);
  font: 16px/1.45 var(--font-ui);
}
.wish-form textarea:focus-visible { outline-offset: 1px; }
.wish-private { margin-top: 8px; color: var(--text-secondary); font: 12px/1.55 var(--font-ui); }
.wish-primary, .wish-retake {
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid var(--accent);
  border-radius: 2px;
  background: var(--accent);
  color: var(--text-on-dark);
  font: 700 14px/1.3 var(--font-ui);
}
.wish-primary:not(:disabled):hover { background: var(--accent-hover); }
.wish-primary:disabled { background: var(--accent-light); color: #6a3f49; opacity: 1; border-color: transparent; }
.wish-shutter { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 15px; }
.wish-shutter__dot { width: 12px; height: 12px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 2px var(--accent), 0 0 0 3px currentColor; }
.wish-shutter:disabled .wish-shutter__dot { box-shadow: 0 0 0 2px var(--accent-light), 0 0 0 3px currentColor; }
.wish-print {
  border: 1px solid var(--border);
  padding: 9px 9px 0;
  background: #fff2da;
  box-shadow: 4px 4px 0 #ba94512b;
  animation: develop-wish .42s ease-out both;
}
.wish-print__art { position: relative; }
.wish-print__photo { width: 100%; aspect-ratio: 1.65; object-fit: cover; object-position: 90% 45%; background: var(--festive-green); }
.wish-print__trim { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.wish-print figcaption { border-top: 4px solid transparent; border-image: var(--festive-ribbon) 1; padding: 13px 10px 17px; }
.wish-print__label { font: 600 11px/1.3 var(--font-ui); letter-spacing: .16em; color: var(--accent); }
.wish-print__text { margin-top: 6px; font: 500 20px/1.45 var(--font); color: var(--bg-sidebar); overflow-wrap: anywhere; text-wrap: balance; }
.wish-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.wish-retake { border-color: var(--border); color: var(--text); background: transparent; }
.wish-error { margin-top: 11px; color: var(--danger); font: 12px/1.7 var(--font-ui); }
@keyframes develop-wish {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .wish-print { animation: none; }
}
</style>
