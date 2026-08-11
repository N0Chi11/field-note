<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import EditorialIcon from '@/components/common/EditorialIcon.vue'
import type { EditorialIconName } from '@/components/common/EditorialIcon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

interface MobileTab {
  path: string
  icon: EditorialIconName
  label: string
}

const userTabs: MobileTab[] = [
  { path: '/equipment', icon: 'equipment', label: '设备' },
  { path: '/borrow', icon: 'tag', label: '借用' },
  { path: '/overview', icon: 'clipboard', label: '记录' },
  { path: '/profile', icon: 'profile', label: '我的' },
]

const adminTabs: MobileTab[] = [
  { path: '/equipment', icon: 'equipment', label: '设备' },
  { path: '/borrow', icon: 'tag', label: '借用' },
  { path: '/admin/approval', icon: 'approved', label: '审批' },
  { path: '/profile', icon: 'profile', label: '我的' },
]

const tabs = computed(() => (authStore.isAdmin ? adminTabs : userTabs))

// 待处理审批数量占位，后续从 store 获取
const pendingCount = computed(() => 0)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function navigate(path: string) {
  if (!isActive(path)) {
    router.push(path)
  }
}
</script>

<template>
  <nav class="mobile-nav">
    <router-link
      v-for="item in tabs"
      :key="item.path"
      :to="item.path"
      class="mobile-nav__item"
      :class="{ active: isActive(item.path) }"
      @click.prevent="navigate(item.path)"
    >
      <span class="mobile-nav__icon-wrap">
        <EditorialIcon class="mobile-nav__icon" :name="item.icon" :size="28" />
        <span
          v-if="item.path === '/admin/approval' && pendingCount > 0"
          class="mobile-nav__badge"
        >
          {{ pendingCount }}
        </span>
      </span>
      <span class="mobile-nav__label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.mobile-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 2px;
  text-decoration: none;
  color: var(--text-tertiary);
  font-size: 11px;
  transition: color 0.2s ease;
  position: relative;
}

.mobile-nav__item.active {
  color: var(--accent);
  font-weight: 600;
}

.mobile-nav__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-nav__icon { filter: saturate(.7) contrast(1.04); }
.mobile-nav__item.active .mobile-nav__icon { filter: saturate(1.1) contrast(1.12); }

.mobile-nav__badge {
  position: absolute;
  top: -4px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.mobile-nav__label {
  line-height: 1.2;
}

/* 仅在移动端显示 */
@media (max-width: 900px) {
  .mobile-nav {
    display: flex;
  }
}
</style>
