<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  file: File | null
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', file: File): void
}>()

const OUTPUT_SIZE = 512

const imageRef = ref<HTMLImageElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const frameSize = ref(320)
const imageUrl = ref('')
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)
const saving = ref(false)
let pointerId: number | null = null
let lastPointerX = 0
let lastPointerY = 0

const baseScale = computed(() => {
  if (!naturalWidth.value || !naturalHeight.value) return 1
  return Math.max(frameSize.value / naturalWidth.value, frameSize.value / naturalHeight.value)
})

const renderedWidth = computed(() => naturalWidth.value * baseScale.value * zoom.value)
const renderedHeight = computed(() => naturalHeight.value * baseScale.value * zoom.value)

const imageStyle = computed(() => ({
  width: `${renderedWidth.value}px`,
  height: `${renderedHeight.value}px`,
  transform: `translate(calc(-50% + ${offsetX.value}px), calc(-50% + ${offsetY.value}px))`
}))

function clampOffsets() {
  const maxX = Math.max(0, (renderedWidth.value - frameSize.value) / 2)
  const maxY = Math.max(0, (renderedHeight.value - frameSize.value) / 2)
  offsetX.value = Math.min(maxX, Math.max(-maxX, offsetX.value))
  offsetY.value = Math.min(maxY, Math.max(-maxY, offsetY.value))
}

function resetCrop() {
  zoom.value = 1
  offsetX.value = 0
  offsetY.value = 0
  naturalWidth.value = 0
  naturalHeight.value = 0
}

function releaseImageUrl() {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
}

watch(
  () => props.file,
  async (file) => {
    releaseImageUrl()
    resetCrop()
    if (!file) return
    imageUrl.value = URL.createObjectURL(file)
    await nextTick()
  },
  { immediate: true }
)

watch(zoom, () => nextTick(clampOffsets))

function handleImageLoad() {
  const image = imageRef.value
  if (!image) return
  frameSize.value = stageRef.value?.clientWidth || 320
  naturalWidth.value = image.naturalWidth
  naturalHeight.value = image.naturalHeight
  clampOffsets()
}

function handlePointerDown(event: PointerEvent) {
  if (!naturalWidth.value) return
  pointerId = event.pointerId
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  dragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging.value || pointerId !== event.pointerId) return
  offsetX.value += event.clientX - lastPointerX
  offsetY.value += event.clientY - lastPointerY
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  clampOffsets()
}

function handlePointerUp(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  dragging.value = false
  pointerId = null
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  zoom.value = Math.min(3, Math.max(1, zoom.value + (event.deltaY > 0 ? -0.08 : 0.08)))
}

async function confirmCrop() {
  const image = imageRef.value
  if (!image || !naturalWidth.value || saving.value) return
  saving.value = true

  try {
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器不支持头像裁切')

    const ratio = OUTPUT_SIZE / frameSize.value
    const drawX = (frameSize.value / 2 + offsetX.value - renderedWidth.value / 2) * ratio
    const drawY = (frameSize.value / 2 + offsetY.value - renderedHeight.value / 2) * ratio
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.fillStyle = '#f2efe7'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    ctx.drawImage(
      image,
      drawX,
      drawY,
      renderedWidth.value * ratio,
      renderedHeight.value * ratio
    )

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    )
    if (!blob) throw new Error('头像裁切失败')
    emit('confirm', new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' }))
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(releaseImageUrl)
</script>

<template>
  <Teleport to="body">
    <div v-if="file" class="cropper-backdrop" @click.self="emit('cancel')">
      <section class="cropper-panel" role="dialog" aria-modal="true" aria-labelledby="cropper-title">
        <header class="cropper-header">
          <div>
            <span class="cropper-kicker">PORTRAIT EDIT / 01</span>
            <h2 id="cropper-title">裁切头像</h2>
          </div>
          <button type="button" class="cropper-close" aria-label="关闭" @click="emit('cancel')">×</button>
        </header>

        <div
          ref="stageRef"
          class="cropper-stage"
          :class="{ 'is-dragging': dragging }"
          @pointerdown="handlePointerDown"
          @pointermove="handlePointerMove"
          @pointerup="handlePointerUp"
          @pointercancel="handlePointerUp"
          @wheel="handleWheel"
        >
          <img
            ref="imageRef"
            :src="imageUrl"
            :style="imageStyle"
            alt="待裁切头像"
            draggable="false"
            @load="handleImageLoad"
          />
          <div class="cropper-grid" aria-hidden="true"></div>
        </div>

        <div class="cropper-controls">
          <span>缩小</span>
          <input v-model.number="zoom" type="range" min="1" max="3" step="0.01" aria-label="头像缩放" />
          <span>放大</span>
        </div>
        <p class="cropper-hint">拖动图片保留需要的部分，也可使用滚轮或滑杆缩放</p>

        <footer class="cropper-actions">
          <button type="button" class="cropper-button secondary" @click="emit('cancel')">取消</button>
          <button type="button" class="cropper-button primary" :disabled="saving" @click="confirmCrop">
            {{ saving ? '处理中…' : '确认并上传' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.cropper-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 20, 18, 0.78);
  backdrop-filter: blur(6px);
}
.cropper-panel {
  width: min(520px, 100%);
  max-height: calc(100vh - 30px);
  overflow-y: auto;
  padding: 24px;
  background: #f2efe7;
  border: 1px solid #191917;
  box-shadow: 12px 14px 0 rgba(0, 0, 0, 0.35);
}
.cropper-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #191917;
}
.cropper-kicker {
  color: #9d604d;
  font: 700 10px/1 var(--font-ui);
  letter-spacing: 0.2em;
}
.cropper-header h2 {
  margin: 8px 0 0;
  font: 500 34px/1 var(--font);
}
.cropper-close {
  border: 0;
  background: transparent;
  color: #191917;
  font: 300 30px/1 var(--font-ui);
  cursor: pointer;
}
.cropper-stage {
  position: relative;
  width: 320px;
  aspect-ratio: 1;
  max-width: 100%;
  margin: 24px auto 18px;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  background: #191917;
  border: 1px solid #191917;
}
.cropper-stage.is-dragging { cursor: grabbing; }
.cropper-stage img {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  user-select: none;
  pointer-events: none;
}
.cropper-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to right, transparent 33.1%, rgba(255,255,255,.45) 33.3%, rgba(255,255,255,.45) 33.6%, transparent 33.8%, transparent 66.2%, rgba(255,255,255,.45) 66.4%, rgba(255,255,255,.45) 66.7%, transparent 66.9%),
    linear-gradient(to bottom, transparent 33.1%, rgba(255,255,255,.45) 33.3%, rgba(255,255,255,.45) 33.6%, transparent 33.8%, transparent 66.2%, rgba(255,255,255,.45) 66.4%, rgba(255,255,255,.45) 66.7%, transparent 66.9%);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.8);
}
.cropper-controls {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  color: #777168;
  font: 12px/1 var(--font-ui);
}
.cropper-controls input { width: 100%; accent-color: #9d604d; }
.cropper-hint {
  margin: 10px 0 20px;
  color: #777168;
  font: 12px/1.6 var(--font-ui);
  text-align: center;
}
.cropper-actions {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #cfc8bb;
}
.cropper-button {
  min-height: 42px;
  border: 1px solid #191917;
  font: 600 13px/1 var(--font-ui);
  cursor: pointer;
}
.cropper-button.secondary { background: transparent; color: #191917; }
.cropper-button.primary { background: #191917; color: #f2efe7; }
.cropper-button:disabled { opacity: .55; cursor: wait; }
@media (max-width: 430px) {
  .cropper-panel { padding: 18px; }
  .cropper-stage { width: min(320px, calc(100vw - 76px)); height: min(320px, calc(100vw - 76px)); }
}
</style>
