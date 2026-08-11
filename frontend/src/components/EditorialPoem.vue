<script setup lang="ts">
import { EDITORIAL_POEMS, getEditorialPoem } from '@/utils/editorialPoetry'

withDefaults(defineProps<{
  variant?: 'login' | 'sidebar'
}>(), {
  variant: 'login'
})

const poem = getEditorialPoem()
const poemNumber = EDITORIAL_POEMS.findIndex(item => item.id === poem.id) + 1
</script>

<template>
  <figure
    class="editorial-poem"
    :class="`editorial-poem--${variant}`"
    title="刷新页面，邂逅另一首诗"
  >
    <div class="editorial-poem__eyebrow">
      <span>POETRY FRAGMENT</span>
      <span class="editorial-poem__issue">NO. {{ poemNumber.toString().padStart(2, '0') }}</span>
    </div>
    <blockquote class="editorial-poem__lines">
      <span v-for="line in poem.lines" :key="line">{{ line }}</span>
    </blockquote>
    <figcaption class="editorial-poem__credit">
      <span class="editorial-poem__dash">—</span>
      <span class="editorial-poem__author">{{ poem.author }}</span>
      <span class="editorial-poem__work">/ {{ poem.title }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.editorial-poem {
  margin: 0;
  font-family: var(--font);
}

.editorial-poem__eyebrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-ui);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.editorial-poem__issue {
  opacity: 0.5;
  letter-spacing: 0.12em;
}

.editorial-poem__lines {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  font-weight: 500;
}

.editorial-poem__credit {
  font-family: var(--font-ui);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.editorial-poem__work {
  opacity: 0.72;
}

.editorial-poem__dash {
  margin-right: 4px;
}

.editorial-poem--login {
  position: relative;
  margin: -4px 0 28px;
  padding: 15px 0 15px 19px;
  border-left: 3px solid #8EA3F2;
  color: #191917;
}

.editorial-poem--login::after {
  content: '“';
  position: absolute;
  right: 4px;
  top: 5px;
  font-size: 72px;
  line-height: 1;
  color: rgba(36, 63, 160, 0.08);
  pointer-events: none;
}

.editorial-poem--login .editorial-poem__eyebrow {
  width: min(260px, 80%);
  margin-bottom: 10px;
  color: #243FA0;
}

.editorial-poem--login .editorial-poem__lines {
  gap: 2px;
  font-size: clamp(18px, 1.6vw, 23px);
  line-height: 1.42;
  letter-spacing: 0.08em;
}

.editorial-poem--login .editorial-poem__credit {
  margin-top: 10px;
  font-size: 10px;
  color: rgba(25, 25, 23, 0.56);
}

.editorial-poem--sidebar {
  margin: 20px 10px 6px;
  padding: 14px 2px 15px;
  border-top: 1px solid rgba(142, 163, 242, 0.48);
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  color: #F2EFE7;
}

.editorial-poem--sidebar .editorial-poem__eyebrow {
  margin-bottom: 9px;
  color: #8EA3F2;
}

.editorial-poem--sidebar .editorial-poem__lines {
  gap: 1px;
  font-size: 13px;
  line-height: 1.62;
  letter-spacing: 0.08em;
}

.editorial-poem--sidebar .editorial-poem__credit {
  margin-top: 9px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.44);
}

@media (max-width: 520px) {
  .editorial-poem--login {
    margin-bottom: 22px;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .editorial-poem--login .editorial-poem__lines {
    font-size: 17px;
  }
}
</style>
