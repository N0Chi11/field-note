import { request } from './request';
/** 查询器材列表 */
export function getEquipment(params) {
    return request({
        method: 'GET',
        url: '/equipment/',
        params
    });
}
/** 查询单个器材 */
export function getEquipmentById(id) {
    return request({
        method: 'GET',
        url: `/equipment/${id}`
    });
}
/** 创建器材 */
export function createEquipment(data) {
    return request({
        method: 'POST',
        url: '/equipment/',
        data
    });
}
/** 更新器材 */
export function updateEquipment(id, data) {
    return request({
        method: 'PUT',
        url: `/equipment/${id}`,
        data
    });
}
/** 删除器材 */
export function deleteEquipment(id) {
    return request({
        method: 'DELETE',
        url: `/equipment/${id}`
    });
}
/** 更新器材状态 */
export function updateEquipmentStatus(id, status) {
    return request({
        method: 'PATCH',
        url: `/equipment/${id}/status`,
        data: { status }
    });
}
/** 上传器材图片 */
export function uploadEquipmentImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request({
        method: 'POST',
        url: `/equipment/${id}/image`,
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}
