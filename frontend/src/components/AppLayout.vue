<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

interface NavItem {
  name: string
  label: string
  path: string
  admin?: boolean
}

const userNav: NavItem[] = [
  { name: 'EquipmentList', label: '器材列表', path: '/equipment' },
  { name: 'BorrowForm', label: '申请借用', path: '/borrow' },
  { name: 'BorrowOverview', label: '我的借用', path: '/overview' },
  { name: 'Profile', label: '个人中心', path: '/profile' }
]

const adminNav: NavItem[] = [
  { name: 'AdminEquipment', label: '器材管理', path: '/admin/equipment', admin: true },
  { name: 'AdminApproval', label: '申请审批', path: '/admin/approval', admin: true },
  { name: 'AdminReturn', label: '归还确认', path: '/admin/return', admin: true },
  { name: 'AdminLogs', label: '操作日志', path: '/admin/logs', admin: true }
]

function go(item: NavItem) {
  router.push(item.path)
}

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="logo">器材设备管理系统</div>
      <nav class="nav">
        <div class="nav-section" v-if="authStore.isAdmin">
          <div class="nav-section-title">用户</div>
          <a
            v-for="item in userNav"
            :key="item.name"
            class="nav-item"
            :class="{ active: route.name === item.name }"
            @click="go(item)"
          >
            {{ item.label }}
          </a>
        </div>
        <div class="nav-section" v-if="authStore.isAdmin">
          <div class="nav-section-title">管理</div>
          <a
            v-for="item in adminNav"
            :key="item.name"
            class="nav-item"
            :class="{ active: route.name === item.name }"
            @click="go(item)"
          >
            {{ item.label }}
          </a>
        </div>
        <div class="nav-section" v-if="!authStore.isAdmin">
          <a
            v-for="item in userNav"
            :key="item.name"
            class="nav-item"
            :class="{ active: route.name === item.name }"
            @click="go(item)"
          >
            {{ item.label }}
          </a>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info" v-if="authStore.user">
          <div class="user-name">{{ authStore.user.name }}</div>
          <div class="user-id">{{ authStore.user.student_id }}</div>
        </div>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </aside>
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.sidebar {
  width: 240px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}
.logo {
  padding: 20px 24px;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
  border-bottom: 1px solid var(--border);
}
.nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}
.nav-section {
  margin-bottom: 16px;
}
.nav-section-title {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 8px 12px 6px;
  letter-spacing: 0.5px;
}
.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 2px;
}
.nav-item:hover {
  background: var(--accent-bg);
  color: var(--accent);
}
.nav-item.active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 500;
}
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border);
}
.user-info {
  margin-bottom: 12px;
}
.user-name {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}
.user-id {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.logout-btn {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.logout-btn:hover {
  border-color: var(--danger);
  color: var(--danger);
}
.main-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}
</style>
