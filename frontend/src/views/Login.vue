<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <div class="login-logo-icon">📋</div>
        <div class="login-logo-text">新媒体中心 器材设备借用系统</div>
        <div class="login-logo-sub">Equipment Borrow System</div>
      </div>

      <!-- 登录标签切换 -->
      <div class="login-tabs">
        <button :class="{ active: loginTab === 'user' }" @click="loginTab = 'user'">用户登录</button>
        <button :class="{ active: loginTab === 'admin' }" @click="loginTab = 'admin'">管理员登录</button>
      </div>

      <!-- 用户登录表单 -->
      <form v-if="loginTab === 'user'" @submit.prevent="handleUserLogin">
        <div class="form-group">
          <label>姓名</label>
          <input v-model="userForm.name" type="text" placeholder="请输入真实姓名" required autocomplete="off" />
        </div>
        <div class="form-group">
          <label>学号（账号）</label>
          <input v-model="userForm.studentId" type="text" placeholder="请输入您的学号" required autocomplete="off" pattern="202[0-9]{7}" maxlength="10" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 管理员登录表单 -->
      <form v-else @submit.prevent="handleAdminLogin">
        <div class="form-group">
          <label>管理员姓名</label>
          <input v-model="adminForm.name" type="text" placeholder="请输入管理员姓名" required autocomplete="off" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="adminForm.password" type="password" placeholder="请输入管理员密码" required autocomplete="off" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '管理员登录' }}
        </button>
      </form>

      <div class="login-hint">用户使用学号登录 · 管理员请输入姓名和密码</div>
    </div>
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

const userForm = reactive({ name: '', studentId: '' })
const adminForm = reactive({ name: '', password: '' })

function errMsg(e: any): string {
  if (e?.response?.data?.detail) {
    const d = e.response.data.detail
    return typeof d === 'string' ? d : JSON.stringify(d)
  }
  return e?.message || '登录失败，请重试'
}

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
/* 完全复刻原 HTML 登录页样式 */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(-45deg, #F5F4EE, #EEEDE5, #FDF4F0, #F0EDE5, #F5F4EE);
  background-size: 400% 400%;
  animation: gradientShift 20s ease infinite;
  padding: 20px;
  position: relative;
}

.login-page::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(217,119,87,0.04) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(74,124,181,0.03) 0%, transparent 50%);
  pointer-events: none;
}

.login-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-lg);
  padding: 44px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
  animation: scaleIn 0.4s ease;
  position: relative;
  z-index: 1;
}

.login-logo {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo-icon {
  width: 56px;
  height: 56px;
  background: var(--accent-gradient);
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-accent);
}

.login-logo-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}

.login-logo-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.login-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-input);
  border-radius: var(--radius);
  padding: 4px;
  margin-bottom: 24px;
}

.login-tabs button {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  font-weight: 500;
}

.login-tabs button.active {
  background: var(--bg-card);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-family: var(--font-ui);
}

.form-group input {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  background: var(--bg-input);
  color: var(--text);
  outline: none;
  transition: all var(--transition);
  font-family: var(--font-ui);
}

.form-group input:focus {
  border-color: var(--accent);
  background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  text-decoration: none;
}

.btn-primary {
  background: var(--accent-gradient);
  color: white;
  box-shadow: var(--shadow-accent);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(217, 119, 87, 0.3);
}

.btn-block {
  width: 100%;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 8px;
}

.login-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 16px;
  line-height: 1.6;
}
</style>
