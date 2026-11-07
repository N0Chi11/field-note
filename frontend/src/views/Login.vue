<template>
  <div class="login-page">
    <div class="login-art" aria-hidden="true">
      <img src="/assets/winter-editorial-v1.webp" alt="" />
    </div>
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <img src="/logo.png" alt="logo" class="login-logo-img" />
        <img src="/assets/winter-mark.svg" alt="" aria-hidden="true" class="login-stamp" />
        <div class="login-logo-text">
          <span class="login-logo-line1">FIELD NOTE<span class="brand-dot">.</span></span>
        </div>
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
          <label for="user-name">姓名</label>
          <input id="user-name" v-model="userForm.name" type="text" placeholder="请输入真实姓名" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="student-id">学号（账号）</label>
          <input id="student-id" v-model="userForm.studentId" type="text" inputmode="numeric" placeholder="请输入您的学号" required autocomplete="username" pattern="202[0-9]{7}" maxlength="10" />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- 管理员登录表单 -->
      <form v-else @submit.prevent="handleAdminLogin">
        <div class="form-group">
          <label for="admin-name">管理员姓名</label>
          <input id="admin-name" v-model="adminForm.name" type="text" placeholder="请输入管理员姓名" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label for="admin-password">密码</label>
          <input id="admin-password" v-model="adminForm.password" type="password" placeholder="请输入管理员密码" required autocomplete="current-password" />
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
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import EditorialPoem from '@/components/EditorialPoem.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const loginTab = ref<'user' | 'admin'>('user')
const loading = ref(false)

const userForm = reactive({ name: '', studentId: '' })
const adminForm = reactive({ name: '', password: '' })

function destination(fallback: string) {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
    ? redirect : fallback
}

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
  if (loading.value) return
  if (!userForm.name.trim() || !userForm.studentId.trim()) {
    toast.warning('请填写姓名和学号')
    return
  }
  loading.value = true
  try {
    await authStore.loginUser(userForm.name.trim(), userForm.studentId.trim())
    toast.success('登录成功')
    await router.push(destination('/equipment'))
  } catch (e) {
    toast.error(errMsg(e))
  } finally {
    loading.value = false
  }
}

async function handleAdminLogin() {
  if (loading.value) return
  if (!adminForm.name.trim() || !adminForm.password) {
    toast.warning('请填写管理员姓名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.loginAdmin(adminForm.name.trim(), adminForm.password)
    toast.success('管理员登录成功')
    await router.push(destination('/admin/approval'))
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
  align-items: center;
  justify-content: flex-end;
  background: radial-gradient(ellipse at 25% 48%, #3D5C70 0, #233F54 38%, #172B3D 78%);
  padding: 48px 7vw;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

.login-page::before {
  content: 'FIELD\A NOTE.';
  white-space: pre;
  position: absolute;
  left: 6vw;
  top: 16%;
  font-family: var(--font);
  font-size: clamp(72px, 8.5vw, 132px);
  font-weight: 500;
  letter-spacing: -0.075em;
  line-height: 0.86;
  color: #F3F8F8;
  text-shadow: 0 4px 24px rgba(14, 32, 46, .4);
  pointer-events: none;
  z-index: 1;
}
.login-page::after {
  content: 'ISSUE 107';
  position: absolute;
  left: 5.5vw;
  top: 9vh;
  color: var(--accent-on-dark);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-shadow: 0 1px 8px rgba(10, 30, 45, .85);
  z-index: 1;
}

.login-art {
  position: absolute;
  left: 5.5vw;
  top: 32%;
  width: min(47vw, 650px);
  height: min(60vh, 610px);
  overflow: hidden;
  border: 1px solid rgba(201, 225, 233, .6);
  border-radius: 48% 48% 2px 2px / 26% 26% 2px 2px;
  box-shadow: 0 20px 70px rgba(9, 24, 36, .32);
  pointer-events: none;
}

.login-art img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 58%; }
.login-art::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 22%;
  background: linear-gradient(transparent, rgba(18, 38, 52, .48));
}

.login-card {
  background: var(--bg-card);
  border: 1px solid #D7E5E9;
  border-top: 6px solid #729EB3;
  border-radius: 1px;
  padding: clamp(34px, 4vw, 56px);
  width: min(44vw, 520px);
  max-width: none;
  box-shadow: 18px 18px 0 rgba(9, 25, 38, 0.24);
  animation: scaleIn 0.4s ease;
  position: relative;
  z-index: 1;
}

.login-logo {
  position: relative;
  text-align: left;
  margin-bottom: 34px;
}

.login-stamp {
  position: absolute;
  top: -2px;
  right: 0;
  width: 76px;
  height: 76px;
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
  font-size: 38px;
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
.brand-dot { color: var(--accent); }

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
  background: var(--bg-sidebar);
  color: var(--bg-card);
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
  position: absolute;
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
    padding: 218px 20px 54px;
  }
  .login-page::before {
    display: none;
  }
  .login-page::after {
    left: 50%;
    transform: translateX(-50%);
    top: 24px;
    white-space: nowrap;
    font-size: 9px;
    letter-spacing: .12em;
  }
  .login-card {
    width: 100%;
    max-width: 480px;
    padding: 28px 24px;
  }
  .login-art {
    left: 0;
    top: 0;
    width: 100%;
    height: 300px;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    opacity: .94;
    mask-image: linear-gradient(#000 55%, transparent 100%);
  }
  .login-art img { object-position: center 60%; }
  .login-stamp { width: 64px; height: 64px; }
  .login-logo-line1 { font-size: clamp(28px, 8vw, 38px); }
  .login-footer {
    justify-content: center;
    padding-left: 0;
  }
}
</style>
