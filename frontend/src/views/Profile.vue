<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <AppLayout>
    <div class="page">
      <h1 class="page-title">个人中心</h1>
      <div class="profile-card" v-if="authStore.user">
        <div class="profile-row"><span>姓名</span><strong>{{ authStore.user.name }}</strong></div>
        <div class="profile-row"><span>学号</span><strong>{{ authStore.user.student_id }}</strong></div>
        <div class="profile-row"><span>角色</span><strong>{{ authStore.isAdmin ? '管理员' : '普通用户' }}</strong></div>
        <div class="profile-row"><span>手机</span><strong>{{ authStore.user.phone || '未填写' }}</strong></div>
      </div>
      <p class="page-desc">修改密码等完整功能待实现。</p>
    </div>
  </AppLayout>
</template>

<style scoped>
.page-title {
  font-size: 22px;
  color: var(--text);
  margin-bottom: 16px;
}
.profile-card {
  max-width: 480px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 16px;
}
.profile-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}
.profile-row:last-child {
  border-bottom: none;
}
.profile-row span {
  color: var(--text-secondary);
}
.page-desc {
  color: var(--text-tertiary);
  font-size: 13px;
}
</style>
