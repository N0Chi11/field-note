import { request } from './request';
/** 查询借用申请列表 */
export function getRequests(params) {
    return request({
        method: 'GET',
        url: '/requests/',
        params
    });
}
/** 查询单个借用申请 */
export function getRequestById(id) {
    return request({
        method: 'GET',
        url: `/requests/${id}`
    });
}
/** 创建借用申请 */
export function createRequest(data) {
    return request({
        method: 'POST',
        url: '/requests/',
        data
    });
}
/** 删除借用申请（用户撤销） */
export function deleteRequest(id) {
    return request({
        method: 'DELETE',
        url: `/requests/${id}`
    });
}
/** 提交归还（上传归还照片） */
export function submitReturn(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request({
        method: 'POST',
        url: `/requests/${id}/return`,
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}
/** 检测时间冲突 */
export function checkConflict(data) {
    return request({
        method: 'POST',
        url: '/requests/check-conflict',
        data
    });
}
