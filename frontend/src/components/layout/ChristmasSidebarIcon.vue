<script lang="ts">
export type ChristmasSidebarIconName =
  | 'equipment'
  | 'application'
  | 'overview'
  | 'calendar'
  | 'precautions'
  | 'maintenance'
  | 'approval'
  | 'return'
  | 'photo-review'
  | 'logs'
  | 'feedback'
  | 'profile'
  | 'yearbook'
  | 'passport'
  | 'logout'
</script>

<script setup lang="ts">
defineProps<{ name: ChristmasSidebarIconName }>()
</script>

<template>
  <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false">
    <use :href="`/assets/christmas-sidebar-icons-v1.svg#${name}`" />
  </svg>
</template>
