<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getStats } from '@/api/admin'
import type { AdminStats } from '@/types/models'

defineProps<{
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

/** 应用版本号（每次发版更新此处即可） */
const APP_VERSION = 'v2.1.3'

const user = computed(() => authStore.user)

interface NavItem {
  path: string
  icon: string
  label: string
  /** 待办 badge 类型，对应 AdminStats 字段 */
  badge?: 'pending' | 'return_pending'
}

/** 设备管理组 */
const equipmentNav: NavItem[] = [
  { path: '/equipment', icon: '📦', label: '器材设备清单' },
  { path: '/borrow', icon: '📝', label: '借用申请' },
  { path: '/overview', icon: '📊', label: '借用一览' },
  { path: '/precautions', icon: '⚠️', label: '注意事项' }
]

/** 管理员组（仅管理员可见） */
const adminNav: NavItem[] = [
  { path: '/admin/equipment', icon: '⚙️', label: '设备维护' },
  { path: '/admin/approval', icon: '✅', label: '借用审批', badge: 'pending' },
  { path: '/admin/return', icon: '📦', label: '归还确认', badge: 'return_pending' },
  { path: '/admin/logs', icon: '📋', label: '操作日志' }
]

/** 账户组 */
const accountNav: NavItem[] = [
  { path: '/profile', icon: '👤', label: '个人中心' }
]

/* ---------------- 待处理数量 badge ---------------- */
const stats = ref<AdminStats | null>(null)
let timer: number | undefined

/** 拉取管理员统计（待审批 / 待归还确认数量） */
async function loadStats() {
  if (!authStore.isAdmin) return
  try {
    stats.value = await getStats()
  } catch {
    // 静默失败，badge 不影响主流程
  }
}

/** 计算某导航项的待办数量 */
function badgeCount(item: NavItem): number {
  if (!stats.value || !item.badge) return 0
  return item.badge === 'pending' ? stats.value.pending : stats.value.return_pending
}

/** 当前路由是否激活 */
function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

/** 导航点击：移动端自动关闭抽屉 */
function handleNavClick() {
  emit('close')
}

async function handleLogout() {
  try {
    await authStore.logout()
  } catch {
    // 即使登出接口失败也跳转登录页
  } finally {
    router.push('/login')
  }
}

/** 姓名首字（大写）作为头像 */
const initials = computed(() => {
  const name = user.value?.name || ''
  return name ? name.charAt(0).toUpperCase() : 'U'
})

/** 角色中文标签 */
const roleLabel = computed(() => (authStore.isAdmin ? '管理员' : '学生'))

onMounted(() => {
  // 延迟 3 秒加载待办统计，避免登录时并发过多请求
  setTimeout(() => loadStats(), 3000)
  // 每 120s 刷新一次待办数量（降低频率）
  timer = window.setInterval(loadStats, 120000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

// 用户信息加载完成 / 角色变化时拉取统计
watch(() => authStore.isAdmin, (isAdmin) => {
  if (isAdmin) loadStats()
}, { immediate: true })

// 路由切换时刷新待办数量（保持 badge 实时）
watch(() => route.path, () => loadStats())
</script>

<template>
  <aside class="sidebar" :class="{ 'is-open': mobileOpen }">
    <!-- 头部 -->
    <div class="sidebar__header">
      <img src="/logo.png" alt="logo" class="sidebar__header-logo" />
      <div class="sidebar__header-text">
        <h1 class="sidebar__header-title">新媒体中心</h1>
        <p class="sidebar__header-subtitle">器材设备借用系统</p>
      </div>
    </div>

    <!-- 导航 -->
    <nav class="sidebar__nav">
      <!-- 设备管理组 -->
      <div class="sidebar__group">
        <p class="sidebar__group-label">设备管理</p>
        <router-link
          v-for="item in equipmentNav"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="handleNavClick"
        >
          <span class="nav-item__icon">{{ item.icon }}</span>
          <span class="nav-item__text">{{ item.label }}</span>
        </router-link>
      </div>

      <!-- 管理员组（仅管理员可见） -->
      <div v-if="authStore.isAdmin" class="sidebar__group">
        <p class="sidebar__group-label">管理员</p>
        <router-link
          v-for="item in adminNav"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="handleNavClick"
        >
          <span class="nav-item__icon">{{ item.icon }}</span>
          <span class="nav-item__text">{{ item.label }}</span>
          <span v-if="badgeCount(item) > 0" class="nav-item__badge">
            {{ badgeCount(item) }}
          </span>
        </router-link>
      </div>

      <!-- 账户组 -->
      <div class="sidebar__group">
        <p class="sidebar__group-label">账户</p>
        <router-link
          v-for="item in accountNav"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="handleNavClick"
        >
          <span class="nav-item__icon">{{ item.icon }}</span>
          <span class="nav-item__text">{{ item.label }}</span>
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
      <button class="sidebar__logout" @click="handleLogout(); handleNavClick()">
        <span class="sidebar__logout-icon">⏏</span>
        退出登录
      </button>
      <div class="sidebar-version">{{ APP_VERSION }}</div>
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
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 300;
}

/* ---------- 头部 ---------- */
.sidebar__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px;
  border-bottom: 1px solid var(--border-light);
}

.sidebar__header-logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.sidebar__header-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  flex-shrink: 1;
}

.sidebar__header-title {
  font-family: var(--font);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__header-subtitle {
  font-family: var(--font-ui);
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 3px 0 0 0;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- 导航 ---------- */
.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
}

.sidebar__group {
  margin-bottom: 18px;
}

.sidebar__group-label {
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 12px;
  margin: 0 0 8px 0;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition);
  margin-bottom: 2px;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.nav-item.active {
  background: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

/* active 左侧指示条 */
.nav-item.active::before {
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

/* 圆角图标 */
.nav-item__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  box-shadow: var(--shadow-xs);
  transition: all var(--transition);
}

.nav-item__text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 待办 badge */
.nav-item__badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

/* ---------- 底部用户信息 ---------- */
.sidebar__footer {
  padding: 16px;
  border-top: 1px solid var(--border-light);
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.sidebar__user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: var(--shadow-accent);
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
  font-family: var(--font-ui);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__user-role {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.sidebar__user-role.is-admin {
  background: var(--accent-light);
  color: var(--accent);
}

.sidebar__user-id {
  font-family: var(--font-ui);
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
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-family: var(--font-ui);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}

.sidebar__logout:hover {
  border-color: var(--danger);
  color: var(--danger);
  background: var(--danger-bg);
}

.sidebar__logout-icon {
  font-size: 14px;
}

.sidebar-version {
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary, #999);
  padding: 8px 0;
  font-weight: 500;
}

/* ---------- 滚动条美化 ---------- */
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

/* ---------- 移动端：抽屉式侧边栏 ---------- */
@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: none;
  }

  .sidebar.is-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  }

  /* 移动端导航项颜色更清晰 */
  .nav-item {
    color: var(--text);
    padding: 12px 12px;
    font-size: 15px;
  }

  .nav-item__icon {
    width: 34px;
    height: 34px;
    font-size: 18px;
  }
}
</style>
