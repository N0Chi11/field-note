import { request } from './request';
/** 查询借用卡列表 */
export function getCards(params) {
    return request({
        method: 'GET',
        url: '/cards/',
        params
    });
}
/** 创建借用卡 */
export function createCard(data) {
    return request({
        method: 'POST',
        url: '/cards/',
        data
    });
}
/** 更新借用卡 */
export function updateCard(id, data) {
    return request({
        method: 'PUT',
        url: `/cards/${id}`,
        data
    });
}
/** 删除借用卡 */
export function deleteCard(id) {
    return request({
        method: 'DELETE',
        url: `/cards/${id}`
    });
}
/** 上传内存卡图片 */
export function uploadCardImage(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return request({
        method: 'POST',
        url: `/cards/${id}/image`,
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}
