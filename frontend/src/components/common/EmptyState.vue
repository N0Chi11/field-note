<script setup lang="ts">
import EditorialIcon from './EditorialIcon.vue'
import type { EditorialIconName } from './EditorialIcon.vue'

withDefaults(
  defineProps<{
    icon?: EditorialIconName
    text: string
    subText?: string
  }>(),
  {
    icon: 'clipboard',
  },
)
</script>

<template>
  <div class="empty-state">
    <EditorialIcon class="empty-state__icon" :name="icon" :size="68" />
    <p class="empty-state__text">{{ text }}</p>
    <p v-if="subText" class="empty-state__sub-text">{{ subText }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-state__icon {
  margin-bottom: 16px;
  opacity: 0.76;
}

.empty-state__text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 4px 0;
}

.empty-state__sub-text {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}
</style>
