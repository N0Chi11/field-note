import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginUser as loginUserApi, loginAdmin as loginAdminApi, getMe, logout as logoutApi } from '@/api/auth'
import { setTokens, clearTokens, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/api/request'
import { clearPhotoReviewSession } from '@/api/photoReview'
import type { User } from '@/types/models'

/**
 * 认证 Store
 */
export const useAuthStore = defineStore('auth', () => {
  // ---- state ----
  /** 当前登录用户 */
  const user = ref<User | null>(null)
  /** access token */
  const token = ref<string>(localStorage.getItem(ACCESS_TOKEN_KEY) || '')
  /** refresh token */
  const refreshToken = ref<string>(localStorage.getItem(REFRESH_TOKEN_KEY) || '')

  // ---- getters ----
  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value)
  /** 是否为管理员 */
  const isAdmin = computed(() => user.value?.role === 'admin')

  // ---- actions ----
  /**
   * 用户登录（姓名 + 学号）
   */
  async function loginUser(name: string, student_id: string) {
    const data = await loginUserApi(name, student_id)
    token.value = data.access_token
    refreshToken.value = data.refresh_token
    setTokens(data.access_token, data.refresh_token)
    // 等待用户信息加载完成，避免路由守卫再次等待
    await fetchUser()
  }

  /**
   * 管理员登录（姓名 + 密码）
   */
  async function loginAdmin(name: string, password: string) {
    const data = await loginAdminApi(name, password)
    token.value = data.access_token
    refreshToken.value = data.refresh_token
    setTokens(data.access_token, data.refresh_token)
    // 等待用户信息加载完成，避免路由守卫再次等待
    await fetchUser()
  }

  /**
   * 拉取当前用户信息
   */
  async function fetchUser() {
    if (!token.value) return null
    try {
      const me = await getMe()
      user.value = me
      return me
    } catch (e) {
      // token 失效等情况
      user.value = null
      throw e
    }
  }

  /**
   * 登出
   */
  async function logout() {
    try {
      if (token.value) {
        if (user.value?.role === 'admin') {
          try { await clearPhotoReviewSession() } catch { /* the short-lived cookie expires on its own */ }
        }
        await logoutApi()
      }
    } catch {
      // 忽略登出接口失败
    } finally {
      user.value = null
      token.value = ''
      refreshToken.value = ''
      clearTokens()
    }
  }

  /**
   * 更新 access token（由 request 拦截器刷新成功后调用）
   */
  function updateToken(access: string) {
    token.value = access
    setTokens(access)
  }

  return {
    // state
    user,
    token,
    refreshToken,
    // getters
    isLoggedIn,
    isAdmin,
    // actions
    loginUser,
    loginAdmin,
    fetchUser,
    logout,
    updateToken
  }
})
