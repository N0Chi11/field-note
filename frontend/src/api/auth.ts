import { request } from './request'
import type { User, TokenData, ChangePasswordPayload } from '@/types/models'

/** 登录 */
export function login(student_id: string, password: string) {
  return request<TokenData>({
    method: 'POST',
    url: '/auth/login',
    data: { student_id, password }
  })
}

/** 刷新 token */
export function refreshToken(refresh_token: string) {
  return request<TokenData>({
    method: 'POST',
    url: '/auth/refresh',
    data: { refresh_token }
  })
}

/** 登出 */
export function logout() {
  return request<void>({
    method: 'POST',
    url: '/auth/logout'
  })
}

/** 获取当前登录用户 */
export function getMe() {
  return request<User>({
    method: 'GET',
    url: '/auth/me'
  })
}

/** 修改密码 */
export function changePassword(old_password: string, new_password: string) {
  return request<void>({
    method: 'PUT',
    url: '/auth/password',
    data: { old_password, new_password } as ChangePasswordPayload
  })
}
