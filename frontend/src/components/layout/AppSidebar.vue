<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

const generalNav = [
  { path: '/equipment', icon: '📦', label: '设备清单' },
  { path: '/borrow', icon: '📝', label: '借用申请' },
  { path: '/overview', icon: '📊', label: '借用一览' },
  { path: '/profile', icon: '👤', label: '个人中心' },
]

const adminNav = [
  { path: '/admin/equipment', icon: '🔧', label: '设备维护' },
  { path: '/admin/approval', icon: '✅', label: '借用审批' },
  { path: '/admin/return', icon: '📦', label: '归还确认' },
  { path: '/admin/logs', icon: '📋', label: '操作日志' },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  try {
    await authStore.logout()
  } catch {
    // 即使登出请求失败也跳转到登录页
  } finally {
    router.push('/login')
  }
}

const initials = computed(() => {
  const name = user.value?.name || ''
  return name ? name.charAt(0).toUpperCase() : 'U'
})

const roleLabel = computed(() => (authStore.isAdmin ? '管理员' : '学生'))
</script>

<template>
  <aside class="sidebar">
    <!-- Logo 区域 -->
    <div class="sidebar__logo">
      <span class="sidebar__logo-icon">📷</span>
      <div class="sidebar__logo-text">
        <h1 class="sidebar__logo-title">器材管理系统</h1>
        <p class="sidebar__logo-subtitle">Equipment System</p>
      </div>
    </div>

    <!-- 导航区域 -->
    <nav class="sidebar__nav">
      <div class="sidebar__nav-group">
        <p class="sidebar__nav-label">通用</p>
        <router-link
          v-for="item in generalNav"
          :key="item.path"
          :to="item.path"
          class="sidebar__nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="sidebar__nav-icon">{{ item.icon }}</span>
          <span class="sidebar__nav-text">{{ item.label }}</span>
        </router-link>
      </div>

      <div v-if="authStore.isAdmin" class="sidebar__nav-group">
        <p class="sidebar__nav-label">管理员</p>
        <router-link
          v-for="item in adminNav"
          :key="item.path"
          :to="item.path"
          class="sidebar__nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="sidebar__nav-icon">{{ item.icon }}</span>
          <span class="sidebar__nav-text">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- 底部用户信息 -->
    <div class="sidebar__footer">
      <div class="sidebar__user">
        <div class="sidebar__user-avatar">{{ initials }}</div>
        <div class="sidebar__user-info">
          <div class="sidebar__user-row">
            <span class="sidebar__user-name">{{ user?.name }}</span>
            <span
              class="sidebar__user-role"
              :class="{ 'is-admin': authStore.isAdmin }"
            >
              {{ roleLabel }}
            </span>
          </div>
          <span class="sidebar__user-id">{{ user?.student_id }}</span>
        </div>
      </div>
      <button class="sidebar__logout" @click="handleLogout">
        <span class="sidebar__logout-icon">⏏</span>
        退出登录
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 260px;
  height: 100vh;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

/* Logo 区域 */
.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar__logo-icon {
  font-size: 32px;
  line-height: 1;
}

.sidebar__logo-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  line-height: 1.3;
}

.sidebar__logo-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
  margin: 2px 0 0 0;
  letter-spacing: 0.5px;
}

/* 导航区域 */
.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.sidebar__nav-group {
  margin-bottom: 20px;
}

.sidebar__nav-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 12px;
  margin: 0 0 8px 0;
}

.sidebar__nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 2px;
}

.sidebar__nav-item:hover {
  background: var(--bg);
  color: var(--text);
}

.sidebar__nav-item.active {
  background: rgba(184, 134, 43, 0.08);
  color: var(--accent);
  font-weight: 600;
}

.sidebar__nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}

.sidebar__nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.sidebar__nav-text {
  flex: 1;
}

/* 底部用户信息 */
.sidebar__footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.sidebar__user-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.sidebar__user-info {
  flex: 1;
  min-width: 0;
}

.sidebar__user-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar__user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__user-role {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.sidebar__user-role.is-admin {
  background: rgba(184, 134, 43, 0.12);
  color: var(--accent);
}

.sidebar__user-id {
  font-size: 12px;
  color: var(--text-tertiary);
  display: block;
  margin-top: 2px;
}

.sidebar__logout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar__logout:hover {
  border-color: var(--danger);
  color: var(--danger);
  background: rgba(194, 84, 80, 0.05);
}

.sidebar__logout-icon {
  font-size: 14px;
}

/* 滚动条美化 */
.sidebar__nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar__nav::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.sidebar__nav::-webkit-scrollbar-track {
  background: transparent;
}

/* 移动端隐藏侧边栏 */
@media (max-width: 900px) {
  .sidebar {
    display: none;
  }
}
</style>
