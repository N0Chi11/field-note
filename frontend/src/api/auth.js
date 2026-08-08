import { request } from './request';
/** 用户登录（姓名 + 学号） */
export function loginUser(name, student_id) {
    return request({
        method: 'POST',
        url: '/auth/login',
        data: { login_type: 'user', name, student_id }
    });
}
/** 管理员登录（姓名 + 密码） */
export function loginAdmin(name, password) {
    return request({
        method: 'POST',
        url: '/auth/login',
        data: { login_type: 'admin', name, password }
    });
}
/** 刷新 token */
export function refreshToken(refresh_token) {
    return request({
        method: 'POST',
        url: '/auth/refresh',
        data: { refresh_token }
    });
}
/** 登出 */
export function logout() {
    return request({
        method: 'POST',
        url: '/auth/logout'
    });
}
/** 获取当前登录用户 */
export function getMe() {
    return request({
        method: 'GET',
        url: '/auth/me'
    });
}
/** 修改密码 */
export function changePassword(old_password, new_password) {
    return request({
        method: 'PUT',
        url: '/auth/password',
        data: { old_password, new_password }
    });
}
