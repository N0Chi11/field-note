import { request } from './request'
import type { User, TokenData, ChangePasswordPayload } from '@/types/models'

/** 用户登录（姓名 + 学号） */
export function loginUser(name: string, student_id: string) {
  return request<TokenData>({
    method: 'POST',
    url: '/auth/login',
    data: { login_type: 'user', name, student_id }
  })
}

/** 管理员登录（姓名 + 密码） */
export function loginAdmin(name: string, password: string) {
  return request<TokenData>({
    method: 'POST',
    url: '/auth/login',
    data: { login_type: 'admin', name, password }
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
