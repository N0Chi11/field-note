<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="code">404</div>
    <div class="text">页面不存在</div>
    <button class="btn" @click="router.replace('/equipment')">返回首页</button>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
.code {
  font-size: 72px;
  font-weight: 700;
  color: var(--accent);
}
.text {
  color: var(--text-secondary);
  margin-bottom: 24px;
}
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}
.btn:hover {
  opacity: 0.9;
}
</style>
