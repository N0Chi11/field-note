<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    text: string
    subText?: string
  }>(),
  {
    icon: '📋',
  },
)
</script>

<template>
  <div class="empty-state">
    <div class="empty-state__icon">{{ icon }}</div>
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
  font-size: 48px;
  line-height: 1;
  margin-bottom: 16px;
  opacity: 0.6;
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
