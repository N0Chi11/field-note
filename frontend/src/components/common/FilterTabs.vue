<script setup lang="ts">
interface Tab {
  key: string
  label: string
  icon?: string
}

defineProps<{
  tabs: Tab[]
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function selectTab(key: string) {
  emit('update:modelValue', key)
}
</script>

<template>
  <div class="filter-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="filter-tabs__item"
      :class="{ active: modelValue === tab.key }"
      @click="selectTab(tab.key)"
    >
      <span v-if="tab.icon" class="filter-tabs__icon">{{ tab.icon }}</span>
      <span class="filter-tabs__label">{{ tab.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.filter-tabs {
  display: flex;
  gap: 0;
  padding: 0;
  background: transparent;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tabs__item {
  flex: 1;
  white-space: nowrap;
  padding: 12px 18px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  border-radius: 0;
  border-right: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.filter-tabs__item:hover {
  color: var(--text);
}

.filter-tabs__item.active {
  background: var(--text);
  color: var(--bg-card);
  font-weight: 600;
  box-shadow: none;
}

.filter-tabs__icon {
  font-size: 15px;
  line-height: 1;
}

.filter-tabs__label {
  line-height: 1;
}
</style>
