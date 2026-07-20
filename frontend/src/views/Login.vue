<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo -->
      <div class="logo-area">
        <div class="logo-icon">📷</div>
        <h1 class="logo-title">器材设备管理系统</h1>
        <p class="logo-sub">Equipment Borrow System</p>
      </div>

      <!-- 登录标签切换 -->
      <div class="login-tabs">
        <button
          :class="['tab-btn', { active: loginTab === 'user' }]"
          @click="loginTab = 'user'"
        >
          用户登录
        </button>
        <button
          :class="['tab-btn', { active: loginTab === 'admin' }]"
          @click="loginTab = 'admin'"
        >
          管理员登录
        </button>
      </div>

      <!-- 用户登录表单 -->
      <form v-if="loginTab === 'user'" @submit.prevent="handleUserLogin" class="login-form">
        <div class="form-group">
          <label>姓名</label>
          <input
            v-model="userForm.name"
            type="text"
            placeholder="请输入真实姓名"
            required
            autocomplete="off"
          />
        </div>
        <div class="form-group">
          <label>学号（账号）</label>
          <input
            v-model="userForm.studentId"
            type="text"
            placeholder="请输入您的学号"
            required
            autocomplete="off"
            pattern="202[0-9]{7}"
            maxlength="10"
          />
        </div>
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 管理员登录表单 -->
      <form v-else @submit.prevent="handleAdminLogin" class="login-form">
        <div class="form-group">
          <label>管理员姓名</label>
          <input
            v-model="adminForm.name"
            type="text"
            placeholder="请输入管理员姓名"
            required
            autocomplete="off"
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="adminForm.password"
            type="password"
            placeholder="请输入管理员密码"
            required
            autocomplete="off"
          />
        </div>
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '管理员登录' }}
        </button>
      </form>

      <!-- 提示文字 -->
      <div class="login-hint">用户使用学号登录 · 管理员请输入姓名和密码</div>
    </div>

    <!-- 底部签名 -->
    <div class="footer-text">A107 新媒体中心 · 器材设备管理系统</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const loginTab = ref<'user' | 'admin'>('user')
const loading = ref(false)

const userForm = reactive({
  name: '',
  studentId: ''
})

const adminForm = reactive({
  name: '',
  password: ''
})

/** 提取错误信息 */
function errMsg(e: any): string {
  if (e?.response?.data?.detail) {
    const d = e.response.data.detail
    return typeof d === 'string' ? d : JSON.stringify(d)
  }
  return e?.message || '登录失败，请重试'
}

/** 用户登录 */
async function handleUserLogin() {
  if (!userForm.name.trim() || !userForm.studentId.trim()) {
    toast.warning('请填写姓名和学号')
    return
  }
  loading.value = true
  try {
    await authStore.loginUser(userForm.name.trim(), userForm.studentId.trim())
    toast.success('登录成功')
    router.push('/equipment')
  } catch (e) {
    toast.error(errMsg(e))
  } finally {
    loading.value = false
  }
}

/** 管理员登录 */
async function handleAdminLogin() {
  if (!adminForm.name.trim() || !adminForm.password) {
    toast.warning('请填写管理员姓名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.loginAdmin(adminForm.name.trim(), adminForm.password)
    toast.success('管理员登录成功')
    router.push('/admin/approval')
  } catch (e) {
    toast.error(errMsg(e))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg) 0%, #e8e4de 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  padding: 40px 32px;
}

.logo-area {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.logo-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.logo-sub {
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 1px;
}

/* 标签切换 */
.login-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--bg-card);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--bg-input);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: var(--accent);
  background: var(--bg-card);
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

/* 登录按钮 */
.btn-login {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 8px;
}

.btn-login:hover:not(:disabled) {
  background: var(--accent-light);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 提示文字 */
.login-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 20px;
}

/* 底部签名 */
.footer-text {
  margin-top: 24px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
