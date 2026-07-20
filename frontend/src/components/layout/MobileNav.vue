<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userTabs = [
  { path: '/equipment', icon: '📦', label: '设备' },
  { path: '/borrow', icon: '📝', label: '借用' },
  { path: '/overview', icon: '📊', label: '记录' },
  { path: '/profile', icon: '👤', label: '我的' },
]

const adminTabs = [
  { path: '/equipment', icon: '📦', label: '设备' },
  { path: '/borrow', icon: '📝', label: '借用' },
  { path: '/admin/approval', icon: '✅', label: '审批' },
  { path: '/profile', icon: '👤', label: '我的' },
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
        <span class="mobile-nav__icon">{{ item.icon }}</span>
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

.mobile-nav__icon {
  font-size: 20px;
  line-height: 1;
}

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
