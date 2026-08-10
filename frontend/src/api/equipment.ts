import { request } from './request'
import type {
  Equipment,
  EquipmentStatus,
  EquipmentQuery
} from '@/types/models'

/** 查询器材列表 */
export function getEquipment(params?: EquipmentQuery) {
  return request<Equipment[]>({
    method: 'GET',
    url: '/equipment/',
    params
  })
}

/** 查询单个器材 */
export function getEquipmentById(id: number) {
  return request<{ equipment: Equipment }>({
    method: 'GET',
    url: `/equipment/${id}`
  })
}

/** 创建器材 */
export function createEquipment(data: Partial<Equipment>) {
  return request<Equipment>({
    method: 'POST',
    url: '/equipment/',
    data
  })
}

/** 更新器材 */
export function updateEquipment(id: number, data: Partial<Equipment>) {
  return request<Equipment>({
    method: 'PUT',
    url: `/equipment/${id}`,
    data
  })
}

/** 删除器材 */
export function deleteEquipment(id: number) {
  return request<void>({
    method: 'DELETE',
    url: `/equipment/${id}`
  })
}

/** 更新器材状态 */
export function updateEquipmentStatus(id: number, status: EquipmentStatus) {
  return request<Equipment>({
    method: 'PATCH',
    url: `/equipment/${id}/status`,
    data: { status }
  })
}

/** 上传器材图片 */
export function uploadEquipmentImage(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<{ image_url: string }>({
    method: 'POST',
    url: `/equipment/${id}/image`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
