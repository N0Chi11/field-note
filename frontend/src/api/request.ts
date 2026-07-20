import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig
} from 'axios'
import type { ApiResponse } from '@/types/models'

/** localStorage 存储 key */
export const ACCESS_TOKEN_KEY = 'access_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'

/** 刷新 token 用的专用实例，避免循环依赖 */
const refreshInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 15000
})

/** 主请求实例 */
const service: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

/** 是否正在刷新 token */
let isRefreshing = false
/** 等待 token 刷新的请求队列 */
let pendingQueue: Array<(token: string) => void> = []

/** 触发所有挂起请求 */
function flushPendingQueue(token: string) {
  pendingQueue.forEach((cb) => cb(token))
  pendingQueue = []
}

/** 清空挂起队列并拒绝 */
function clearPendingQueue() {
  pendingQueue = []
}

/** 读取 token */
function getAccessToken(): string {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}
function getRefreshToken(): string {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

/** 写入 token */
export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

/** 清除 token */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** 跳转登录页 */
function redirectToLogin() {
  clearTokens()
  // 避免在登录页重复跳转
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/** 自定义配置：标记是否允许自动刷新 */
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

/** 请求拦截器：注入 Authorization */
service.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/** 刷新 token */
async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }
  const res = await refreshInstance.post<{
    code: number
    data: { access_token: string; refresh_token?: string; token_type: string }
    message: string
  }>('/auth/refresh', { refresh_token: refreshToken })

  const data = res.data.data
  const newAccess = data.access_token
  const newRefresh = data.refresh_token || refreshToken
  setTokens(newAccess, newRefresh)
  return newAccess
}

/** 响应拦截器：拆包 + 401 刷新 */
service.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse
    // 业务成功：返回完整 AxiosResponse，由 request 包装层取 data
    if (res.code === 0) {
      return response
    }
    // 业务错误，抛出 message
    const error = new Error(res.message || '请求失败')
    ;(error as any).code = res.code
    ;(error as any).data = res.data
    return Promise.reject(error)
  },
  async (error) => {
    const originalConfig = error.config as RetryConfig | undefined

    // 401：尝试刷新 token
    if (
      error.response &&
      error.response.status === 401 &&
      originalConfig &&
      !originalConfig._retry
    ) {
      // 如果是刷新接口本身 401，直接跳登录
      if (originalConfig.url && originalConfig.url.includes('/auth/refresh')) {
        clearPendingQueue()
        redirectToLogin()
        return Promise.reject(error)
      }

      originalConfig._retry = true

      if (isRefreshing) {
        // 排队等待新 token
        return new Promise((resolve, reject) => {
          pendingQueue.push((token: string) => {
            if (!token) {
              reject(new Error('refresh failed'))
              return
            }
            if (originalConfig.headers) {
              originalConfig.headers.Authorization = `Bearer ${token}`
            }
            resolve(service(originalConfig))
          })
        })
      }

      isRefreshing = true
      try {
        const newToken = await doRefresh()
        flushPendingQueue(newToken)
        if (originalConfig.headers) {
          originalConfig.headers.Authorization = `Bearer ${newToken}`
        }
        return service(originalConfig)
      } catch (refreshError) {
        clearPendingQueue()
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 其它错误
    const message =
      error.response?.data?.message || error.message || '网络异常，请稍后再试'
    const wrapped = new Error(message)
    ;(wrapped as any).status = error.response?.status
    ;(wrapped as any).data = error.response?.data
    return Promise.reject(wrapped)
  }
)

/** 业务层 request：返回 ApiResponse 的 data 部分 */
export function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return service(config).then((res) => (res.data as ApiResponse<T>).data)
}

export default service
