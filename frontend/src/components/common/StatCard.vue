<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    icon: string
    value: number | string
    label: string
    color?: string
    active?: boolean
  }>(),
  {
    color: 'accent',
    active: false,
  },
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

function handleClick() {
  emit('click')
}
</script>

<template>
  <div
    class="stat-card"
    :class="[`stat-card--${props.color}`, { 'stat-card--active': props.active }]"
    @click="handleClick"
  >
    <div class="stat-card__icon">{{ icon }}</div>
    <div class="stat-card__content">
      <div class="stat-card__value">{{ value }}</div>
      <div class="stat-card__label">{{ label }}</div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  /* 默认颜色变量（accent） */
  --card-color: var(--accent);
  --card-bg: rgba(184, 134, 43, 0.1);
}

.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* 颜色主题 */
.stat-card--accent {
  --card-color: var(--accent);
  --card-bg: rgba(184, 134, 43, 0.1);
}

.stat-card--success {
  --card-color: var(--success);
  --card-bg: rgba(74, 124, 89, 0.1);
}

.stat-card--danger {
  --card-color: var(--danger);
  --card-bg: rgba(194, 84, 80, 0.1);
}

/* 激活状态：边框高亮 */
.stat-card--active {
  border-color: var(--card-color);
  box-shadow: 0 0 0 1px var(--card-color);
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-size: 24px;
  background: var(--card-bg);
  flex-shrink: 0;
}

.stat-card__content {
  flex: 1;
  min-width: 0;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-card__label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}
</style>
