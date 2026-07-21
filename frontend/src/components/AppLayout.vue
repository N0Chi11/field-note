<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div class="app-layout">
    <!-- 侧边栏（固定定位，宽度 260px） -->
    <AppSidebar />

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
  /* 侧边栏固定宽度 260px，主内容留出对应左边距 */
  margin-left: 260px;
  min-height: 100vh;
  /* 顶部 padding，与原 HTML 一致 */
  padding: 36px 40px 48px;
}

/* 移动端：侧边栏隐藏，主内容占满 */
@media (max-width: 900px) {
  .app-main {
    margin-left: 0;
    padding: 24px 16px 80px;
  }
}
</style>

<style>
/* 全局：页面标题使用衬线体（与原 HTML 一致）
   视图中的 .page-title 未显式设置 font-family，
   在此统一保证其采用 Source Serif 4 衬线体 */
.page-title {
  font-family: var(--font);
  font-weight: 700;
  letter-spacing: 0.3px;
}
</style>
