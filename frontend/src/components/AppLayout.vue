<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { ref } from 'vue'

const sidebarOpen = ref(false)

/** 应用版本号（每次发版更新此处即可） */
const APP_VERSION = 'v2.1.3'

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
      <span class="mobile-title">
        <img src="/logo.png" alt="logo" class="mobile-title-logo" />
        设备借用系统
        <span class="mobile-version">{{ APP_VERSION }}</span>
      </span>
      <span class="mobile-placeholder"></span>
    </header>

    <!-- 主内容区域 -->
    <main class="app-main">
      <slot />
      <!-- 底部水印 -->
      <footer class="app-footer">
        <img src="/watermark.png" alt="Designed by @N0Chi11" class="footer-watermark" />
      </footer>
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
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* 底部水印 */
.app-footer {
  margin-top: 48px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: center;
}

.footer-watermark {
  height: 28px;
  width: auto;
  opacity: 0.85;
  transition: opacity 0.2s;
}

.footer-watermark:hover {
  opacity: 1;
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
    height: calc(56px + env(safe-area-inset-top, 0px));
    padding: 0 16px;
    padding-top: env(safe-area-inset-top, 0px);
    background: var(--bg-sidebar);
    border-bottom: 1px solid var(--border);
    z-index: 200;
  }

  .mobile-title {
    font-family: var(--font);
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mobile-title-logo {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .mobile-version {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary, #999);
    margin-left: 2px;
    letter-spacing: 0.3px;
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
