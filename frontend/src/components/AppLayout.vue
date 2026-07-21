<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { ref } from 'vue'

const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <AppSidebar :mobile-open="sidebarOpen" @close="closeSidebar" />

    <!-- 移动端遮罩 -->
    <div
      v-if="sidebarOpen"
      class="mobile-overlay"
      @click="closeSidebar"
    />

    <!-- 移动端顶部栏 -->
    <header class="mobile-header">
      <button class="mobile-menu-btn" @click="toggleSidebar" aria-label="菜单">
        <span></span><span></span><span></span>
      </button>
      <span class="mobile-title">📋 设备借用系统</span>
      <span class="mobile-placeholder"></span>
    </header>

    <!-- 主内容区域 -->
    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: var(--bg);
}

.app-main {
  margin-left: 260px;
  min-height: 100vh;
  padding: 36px 40px 48px;
}

/* 移动端顶部栏（默认隐藏） */
.mobile-header {
  display: none;
}

.mobile-overlay {
  display: none;
}

/* ---------- 移动端 ---------- */
@media (max-width: 900px) {
  .app-main {
    margin-left: 0;
    padding: 70px 16px 80px;
  }

  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    padding: 0 16px;
    background: var(--bg-sidebar);
    border-bottom: 1px solid var(--border);
    z-index: 200;
  }

  .mobile-title {
    font-family: var(--font);
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }

  .mobile-placeholder {
    width: 28px;
  }

  .mobile-menu-btn {
    width: 28px;
    height: 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .mobile-menu-btn span {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--text);
    border-radius: 1px;
    transition: all 0.25s;
  }

  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 150;
  }
}
</style>

<style>
/* 全局：页面标题使用衬线体 */
.page-title {
  font-family: var(--font);
  font-weight: 700;
  letter-spacing: 0.3px;
}
</style>
