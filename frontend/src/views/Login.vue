<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <img src="/logo.png" alt="logo" class="login-logo-img" />
        <div class="login-logo-text">
          <span class="login-logo-line1">新媒体中心</span>
          <span class="login-logo-line2">器材设备借用系统</span>
        </div>
        <div class="login-logo-sub">Equipment Borrow System</div>
      </div>

      <EditorialPoem variant="login" />

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
    <!-- 底部水印 -->
    <footer class="login-footer">
      <img src="/watermark.png" alt="Designed by @N0Chi11" class="login-watermark" />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import EditorialPoem from '@/components/EditorialPoem.vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const loginTab = ref<'user' | 'admin'>('user')
const loading = ref(false)

const userForm = reactive({ name: '', studentId: '' })
const adminForm = reactive({ name: '', password: '' })

function errMsg(e: any): string {
  // 过滤掉内部跳转标记
  if (e?.message === 'REDIRECT_TO_LOGIN') return '登录失败，请重试'
  // 后端 HTTPException 格式：{detail: "..."}
  if (e?.response?.data?.detail) return e.response.data.detail
  if (e?.data?.detail) return e.data.detail
  // 包装后的 Error 对象
  if (e?.message && e.message !== 'Request failed with status code 401') return e.message
  return '登录失败，请检查姓名和密码'
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
    await router.push('/equipment')
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
    await router.push('/admin/approval')
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
  justify-content: flex-end;
  background: #191917;
  padding: 48px 7vw;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

.login-page::before {
  content: 'EQUIPMENT\A ARCHIVE';
  white-space: pre;
  position: absolute;
  left: 5vw;
  top: 50%;
  transform: translateY(-54%);
  font-family: var(--font);
  font-size: clamp(72px, 10vw, 156px);
  font-weight: 500;
  letter-spacing: -0.075em;
  line-height: 0.72;
  color: #F2EFE7;
  pointer-events: none;
}
.login-page::after {
  content: 'NEW MEDIA CENTER  ·  ISSUE 107 / 2026';
  position: absolute;
  left: 5.5vw;
  top: 9vh;
  color: #8EA3F2;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
}

.login-card {
  background: #F2EFE7;
  border: 1px solid #F2EFE7;
  border-top: 7px solid #243FA0;
  border-radius: 1px;
  padding: clamp(34px, 4vw, 56px);
  width: min(44vw, 520px);
  max-width: none;
  box-shadow: 18px 18px 0 rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.4s ease;
  position: relative;
  z-index: 1;
}

.login-logo {
  text-align: left;
  margin-bottom: 34px;
}

.login-logo-img {
  width: 56px;
  height: 56px;
  border-radius: 1px;
  object-fit: cover;
  margin: 0 0 18px;
  filter: grayscale(1) contrast(1.08);
  box-shadow: none;
}

.login-logo-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.3;
}

.login-logo-line1 {
  font-family: var(--font);
  font-size: 34px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: -0.3px;
}

.login-logo-line2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.login-logo-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.login-tabs {
  display: flex;
  gap: 0;
  background: transparent;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
  border-radius: 0;
  padding: 0;
  margin-bottom: 24px;
}

.login-tabs button {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 0;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  font-weight: 500;
}

.login-tabs button.active {
  background: var(--text);
  color: var(--bg-card);
  box-shadow: none;
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
  border-radius: 1px;
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
  border-radius: 1px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  text-decoration: none;
}

.btn-primary {
  background: var(--text);
  color: white;
  box-shadow: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent);
  transform: translateY(-1px);
  box-shadow: 4px 4px 0 rgba(26, 26, 24, 0.2);
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

.login-footer {
  position: fixed;
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-start;
  padding-left: 5.5vw;
  pointer-events: none;
  z-index: 10;
}

.login-watermark {
  height: 22px;
  width: auto;
  opacity: 0.55;
  filter: grayscale(1) invert(1);
}

@media (max-width: 860px) {
  .login-page {
    justify-content: center;
    align-items: flex-start;
    padding: 72px 20px 44px;
  }
  .login-page::before {
    left: 50%;
    top: 8%;
    transform: translateX(-50%);
    font-size: 54px;
    opacity: 0.12;
    white-space: nowrap;
  }
  .login-page::after {
    left: 50%;
    transform: translateX(-50%);
    top: 28px;
    white-space: nowrap;
  }
  .login-card {
    width: 100%;
    max-width: 480px;
  }
  .login-footer {
    justify-content: center;
    padding-left: 0;
  }
}
</style>
