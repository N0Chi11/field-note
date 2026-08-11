<script lang="ts">
export type EditorialIconName =
  | 'catalog'
  | 'calendar'
  | 'favorite'
  | 'camera'
  | 'gimbal'
  | 'microphone'
  | 'tripod'
  | 'light'
  | 'lens'
  | 'equipment'
  | 'pending'
  | 'parcel'
  | 'return'
  | 'clipboard'
  | 'memory-card'
  | 'warning'
  | 'profile'
  | 'tag'
  | 'approved'
  | 'rejected'
  | 'refresh'
  | 'cancelled'
  | 'delete'
  | 'add'
  | 'edit'
  | 'maintenance'
</script>

<script setup lang="ts">
import { computed } from 'vue'

interface IconPosition {
  sheet: 'equipment' | 'action'
  column: number
  row: number
  grid: 3 | 4
}

const props = withDefaults(
  defineProps<{
    name?: EditorialIconName
    size?: number | string
    label?: string
  }>(),
  {
    name: 'clipboard',
    size: 32,
    label: ''
  }
)

const positions: Record<EditorialIconName, IconPosition> = {
  catalog: { sheet: 'equipment', column: 0, row: 0, grid: 3 },
  calendar: { sheet: 'equipment', column: 0, row: 0, grid: 3 },
  favorite: { sheet: 'equipment', column: 1, row: 0, grid: 3 },
  camera: { sheet: 'equipment', column: 2, row: 0, grid: 3 },
  gimbal: { sheet: 'equipment', column: 0, row: 1, grid: 3 },
  microphone: { sheet: 'equipment', column: 1, row: 1, grid: 3 },
  tripod: { sheet: 'equipment', column: 2, row: 1, grid: 3 },
  light: { sheet: 'equipment', column: 0, row: 2, grid: 3 },
  lens: { sheet: 'equipment', column: 1, row: 2, grid: 3 },
  equipment: { sheet: 'equipment', column: 2, row: 2, grid: 3 },
  pending: { sheet: 'action', column: 0, row: 0, grid: 4 },
  parcel: { sheet: 'action', column: 1, row: 0, grid: 4 },
  return: { sheet: 'action', column: 2, row: 0, grid: 4 },
  clipboard: { sheet: 'action', column: 3, row: 0, grid: 4 },
  'memory-card': { sheet: 'action', column: 0, row: 1, grid: 4 },
  warning: { sheet: 'action', column: 1, row: 1, grid: 4 },
  profile: { sheet: 'action', column: 2, row: 1, grid: 4 },
  tag: { sheet: 'action', column: 3, row: 1, grid: 4 },
  approved: { sheet: 'action', column: 0, row: 2, grid: 4 },
  rejected: { sheet: 'action', column: 1, row: 2, grid: 4 },
  refresh: { sheet: 'action', column: 2, row: 2, grid: 4 },
  cancelled: { sheet: 'action', column: 3, row: 2, grid: 4 },
  delete: { sheet: 'action', column: 0, row: 3, grid: 4 },
  add: { sheet: 'action', column: 1, row: 3, grid: 4 },
  edit: { sheet: 'action', column: 2, row: 3, grid: 4 },
  maintenance: { sheet: 'action', column: 3, row: 3, grid: 4 }
}

const iconStyle = computed(() => {
  const position = positions[props.name]
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  const denominator = position.grid - 1
  return {
    width: size,
    height: size,
    backgroundImage: `url('/assets/editorial-${position.sheet}-icons-v1.webp')`,
    backgroundSize: `${position.grid * 100}% ${position.grid * 100}%`,
    backgroundPosition: `${(position.column / denominator) * 100}% ${(position.row / denominator) * 100}%`
  }
})
</script>

<template>
  <span
    class="editorial-icon"
    :style="iconStyle"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  ></span>
</template>

<style scoped>
.editorial-icon {
  display: inline-block;
  flex: 0 0 auto;
  background-repeat: no-repeat;
  line-height: 1;
}
</style>
