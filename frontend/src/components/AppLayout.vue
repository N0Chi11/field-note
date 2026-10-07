<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { ref, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { APP_VERSION } from '@/utils/appInfo'

const sidebarOpen = ref(false)

/** 应用版本号（每次发版更新此处即可） */
const route = useRoute()
let originalOverflow: string | null = null

function unlockScroll() {
  if (originalOverflow !== null) {
    document.body.style.overflow = originalOverflow
    originalOverflow = null
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') closeSidebar()
}

watch(sidebarOpen, (open) => {
  if (open) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
  } else {
    unlockScroll()
    document.removeEventListener('keydown', handleEscape)
  }
})
watch(() => route.fullPath, closeSidebar)
onUnmounted(() => {
  unlockScroll()
  document.removeEventListener('keydown', handleEscape)
})

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
      <button class="mobile-menu-btn" @click="toggleSidebar" aria-label="打开导航菜单" :aria-expanded="sidebarOpen" aria-controls="app-sidebar">
        <span></span><span></span><span></span>
      </button>
      <span class="mobile-title">
        <img src="/logo.png" alt="logo" class="mobile-title-logo" />
        FIELD NOTE
        <span class="mobile-version">{{ APP_VERSION }}</span>
      </span>
      <span class="mobile-placeholder"></span>
    </header>

    <!-- 主内容区域 -->
    <main class="app-main">
      <div class="edition-masthead" aria-label="FIELD NOTE 刊头">
        <router-link to="/equipment" class="edition-name">FIELD NOTE<span class="edition-dot">.</span></router-link>
        <span class="edition-center">SUFE 校学联新媒体中心<br /><span>器材档案 · 创作现场</span></span>
        <span class="edition-issue">ISSUE 107<br /><span>{{ APP_VERSION }}</span></span>
      </div>
      <div class="editorial-page"><slot /></div>
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
  background: transparent;
}

.app-main {
  margin-left: 252px;
  min-height: 100vh;
  padding: 32px 44px 56px;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.edition-masthead { display: flex; justify-content: space-between; align-items: center; gap: 20px; max-width: 1260px; margin: 0 auto 30px; padding-bottom: 20px; border-bottom: 3px solid var(--text); }
.edition-name { color: var(--text); font: 500 clamp(26px, 2.6vw, 38px)/1 var(--font); letter-spacing: -.035em; }
.edition-dot { color: var(--accent); }
.edition-center { text-align: center; color: var(--text); font: 11px/1.8 var(--font-ui); }
.edition-center span { color: var(--text-secondary); }
.edition-issue { text-align: right; font: 10px/1.8 var(--font-data); letter-spacing: .08em; color: var(--accent); }
.edition-issue span { color: var(--text-secondary); }

.editorial-page {
  animation: editorial-page-enter .45s cubic-bezier(.22,.72,.3,1) both;
}

@keyframes editorial-page-enter {
  from { opacity: 0; transform: translateY(12px); clip-path: inset(0 0 9% 0); }
  to { opacity: 1; transform: translateY(0); clip-path: inset(0); }
}

/* 底部水印 */
.app-footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light);
  display: flex;
  justify-content: center;
}

.footer-watermark {
  height: 28px;
  width: auto;
  opacity: 0.58;
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
    padding: calc(80px + env(safe-area-inset-top, 0px)) 20px 48px;
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
    background: #191917;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    z-index: 200;
  }
  .edition-masthead { gap: 10px; margin-bottom: 24px; padding-bottom: 16px; }
  .edition-center { text-align: left; font-size: 10px; }
  .edition-name { display: none; }

  .mobile-title {
    font-family: var(--font-ui);
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
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
    color: rgba(255, 255, 255, 0.46);
    margin-left: 2px;
    letter-spacing: 0.3px;
  }

  .mobile-placeholder {
    width: 28px;
  }

  .mobile-menu-btn {
    width: 44px;
    height: 44px;
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
    background: #ffffff;
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

@media (prefers-reduced-motion: reduce) {
  .editorial-page { animation: none; }
}
</style>

<style>
/* 全局：页面标题使用衬线体 */
.page-title {
  font-family: var(--font);
  font-weight: 500;
  letter-spacing: -0.04em;
}

@media (max-width: 1100px) and (min-width: 901px) {
  .app-main {
    padding: 36px 30px 44px;
  }
}
</style>
