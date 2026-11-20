<template>
  <div class="login-page">
    <figure class="login-cover">
      <figcaption class="login-cover-edition">
        <span>{{ APP_ISSUE }}</span>
        <span lang="en">{{ APP_EDITION }}</span>
      </figcaption>
      <div class="login-art" aria-hidden="true">
        <picture>
          <source media="(max-width: 860px)" :srcset="CHRISTMAS_COVER" />
          <img :src="CHRISTMAS_PORTRAIT" alt="" fetchpriority="high" />
        </picture>
      </div>
    </figure>
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <img src="/logo.png" alt="logo" class="login-logo-img" />
        <img src="/assets/christmas-seal-v1.svg" alt="" aria-hidden="true" class="login-stamp" width="72" height="72" />
        <div class="login-logo-text">
          <h1 class="login-logo-line1">{{ APP_NAME }}<span class="brand-dot">.</span></h1>
          <p class="login-season-line">愿这个圣诞，有值得留影的灯火。</p>
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
import { useCameraDrawStore } from '@/stores/cameraDraw'
import { useToastStore } from '@/stores/toast'
import EditorialPoem from '@/components/EditorialPoem.vue'
import { APP_EDITION, APP_ISSUE, APP_NAME } from '@/utils/appInfo'
import { CHRISTMAS_COVER, CHRISTMAS_PORTRAIT } from '@/utils/christmasAssets'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const cameraDraw = useCameraDrawStore()
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

async function enterSignedInPage(fallback: string) {
  const failure = await router.push(destination(fallback))
  if (!failure && router.currentRoute.value.meta.auth && authStore.isLoggedIn) cameraDraw.open()
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
    await enterSignedInPage('/equipment')
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
    await enterSignedInPage('/admin/approval')
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
  min-height: 100svh;
  display: grid;
  grid-template-columns: minmax(0, 580px) minmax(0, 500px);
  column-gap: clamp(32px, 5.2vw, 80px);
  align-content: center;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 16% 12%, #207553, transparent 66%),
    var(--bg-sidebar);
  padding: 44px clamp(30px, 6vw, 90px) 58px;
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.login-page::before {
  content: '';
  position: absolute;
  top: -30px;
  right: -60px;
  width: min(36vw, 460px);
  height: 210px;
  background: url('/assets/christmas-garland-v2.svg') right top / 100% auto no-repeat;
  opacity: .84;
  z-index: -1;
  pointer-events: none;
}

.login-cover { min-width: 0; }
.login-cover-edition {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 13px;
  font: 600 10px/1.5 var(--font-data);
  letter-spacing: .15em;
  color: var(--accent-on-dark);
}
.login-cover-edition span:last-child { order: 1; }
.login-cover-edition::after { content: ''; height: 1px; flex: 1; background: #c6a97b68; }

.login-art {
  position: relative;
  height: clamp(400px, 70svh, 690px);
  padding: 10px 16px;
  overflow: hidden;
  border: 1px solid #a07c51;
  background: var(--festive-red);
  box-shadow: 10px 11px 0 #0d1a146e;
}

.login-art picture { display: block; width: 100%; height: 100%; }
.login-art img { width: 100%; height: 100%; object-fit: cover; object-position: center 46%; border: 1px solid #ad8a5d; }
.login-art::before,
.login-art::after {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  width: 4px;
  background: repeating-linear-gradient(180deg, #f5d8aa 0 5px, transparent 5px 15px);
  pointer-events: none;
}
.login-art::before { left: 6px; }
.login-art::after { right: 6px; }

.login-card {
  border: 1px solid #c6a77e;
  border-top: 7px solid transparent;
  background: linear-gradient(var(--bg-card), var(--bg-card)) padding-box, var(--festive-ribbon) border-box;
  border-radius: 1px;
  padding: clamp(29px, 3.5vw, 49px);
  min-width: 0;
  box-shadow: 10px 11px 0 #0d1a146e;
  animation: scaleIn 0.4s ease;
  position: relative;
  isolation: isolate;
}
.login-card::after {
  content: '';
  position: absolute;
  inset: auto 0 0 auto;
  width: 156px;
  height: 83px;
  background: url('/assets/christmas-garland-v2.svg') right bottom / contain no-repeat;
  opacity: .16;
  pointer-events: none;
  z-index: -1;
}

.login-logo {
  position: relative;
  text-align: left;
  margin-bottom: 26px;
}

.login-stamp {
  position: absolute;
  top: -2px;
  right: 0;
  width: 72px;
  height: 72px;
  transform: rotate(8deg);
  filter: drop-shadow(0 2px 2px #5922343b);
}

.login-logo-img {
  width: 44px;
  height: 44px;
  border-radius: 1px;
  object-fit: cover;
  margin: 0 0 14px;
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
  font-size: clamp(30px, 3vw, 42px);
  font-weight: 500;
  color: var(--text);
  letter-spacing: -0.3px;
}
.login-season-line {
  margin: 8px 0 0;
  color: var(--accent);
  font: 13px/1.7 var(--font);
  letter-spacing: .08em;
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
  background: var(--bg-sidebar);
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
  background: var(--accent);
  color: var(--bg-card);
  box-shadow: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
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
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.login-watermark {
  height: 22px;
  width: auto;
  opacity: 0.55;
  filter: saturate(.68);
}

@media (prefers-reduced-motion: reduce) {
  .login-card { animation: none; }
}

@media (max-width: 860px) {
  .login-page {
    grid-template-columns: minmax(0, 500px);
    align-content: start;
    gap: 16px;
    padding: 22px 18px 50px;
  }
  .login-page::before { display: none; }
  .login-cover-edition { font-size: 9px; gap: 10px; margin-bottom: 9px; }
  .login-card { padding: 21px clamp(16px, 5.6vw, 30px) 23px; box-shadow: 5px 6px 0 #0d1a146e; }
  .login-art {
    height: clamp(142px, 42vw, 232px);
    padding: 6px 12px;
    box-shadow: 5px 6px 0 #0d1a146e;
  }
  .login-art img { object-position: right center; }
  .login-art::before, .login-art::after { top: 6px; bottom: 6px; width: 3px; }
  .login-art::before { left: 4px; }
  .login-art::after { right: 4px; }
  .login-logo { margin-bottom: 19px; }
  .login-logo-img { width: 34px; height: 34px; margin-bottom: 9px; }
  .login-stamp { width: 48px; height: 48px; top: -3px; }
  .login-logo-line1 { font-size: clamp(28px, 8vw, 38px); }
  .login-tabs { margin-bottom: 17px; }
  .form-group { margin-bottom: 12px; }
  .login-hint { margin-top: 12px; }
}
</style>
