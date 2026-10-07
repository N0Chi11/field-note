<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { createPhotoReviewSession } from '@/api/photoReview'

const ready = ref(false)
const opening = ref(true)
const errorMessage = ref('')
let renewalTimer: number | undefined

async function authorize() {
  opening.value = true
  errorMessage.value = ''
  try {
    await createPhotoReviewSession()
    ready.value = true
  } catch (error: any) {
    errorMessage.value = error?.message || '暂时无法打开照片审核'
  } finally {
    opening.value = false
  }
}

onMounted(() => {
  void authorize()
  renewalTimer = window.setInterval(() => {
    void createPhotoReviewSession().catch(() => {
      errorMessage.value = '管理员会话需要刷新，请重新打开照片审核。'
    })
  }, 8 * 60 * 1000)
})

onUnmounted(() => {
  if (renewalTimer) window.clearInterval(renewalTimer)
})
</script>

<template>
  <AppLayout>
    <section class="photo-review-page">
      <header class="photo-review-heading">
        <h1>你拍的照片怎么样</h1>
      </header>

      <div v-if="opening" class="photo-review-state" role="status">正在打开…</div>
      <div v-else-if="errorMessage" class="photo-review-state photo-review-state--error" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" @click="authorize">重新打开</button>
      </div>
      <iframe
        v-else-if="ready"
        class="photo-review-frame"
        src="/photo-review/?embed=1"
        title="你拍的照片怎么样"
        referrerpolicy="no-referrer"
      />
    </section>
  </AppLayout>
</template>

<style scoped>
.photo-review-page { max-width: 1440px; margin: 0 auto; }
.photo-review-heading { margin-bottom: 18px; padding: 7px 0 17px; border-bottom: 1px solid var(--text); }
.photo-review-heading h1 { margin: 0; font: 500 clamp(30px, 4vw, 46px)/1.08 var(--font); letter-spacing: -.045em; }
.photo-review-frame { display: block; width: 100%; height: calc(100dvh - 250px); min-height: 680px; border: 0; background: var(--bg); }
.photo-review-state { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--text-secondary); font: 13px/1.6 var(--font-ui); }
.photo-review-state--error { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.photo-review-state p { margin: 0; }
.photo-review-state button { padding: 9px 15px; border: 1px solid var(--text); background: transparent; color: var(--text); font: 600 12px/1 var(--font-ui); cursor: pointer; }
.photo-review-state button:hover { background: var(--text); color: var(--bg-card); }
@media (max-width: 900px) { .photo-review-frame { height: calc(100dvh - 180px); min-height: 620px; } }
</style>
