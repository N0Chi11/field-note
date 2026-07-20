import { request } from './request'
import type { Card, CardQuery } from '@/types/models'

/** 查询借用卡列表 */
export function getCards(params?: CardQuery) {
  return request<Card[]>({
    method: 'GET',
    url: '/cards/',
    params
  })
}

/** 创建借用卡 */
export function createCard(data: Partial<Card>) {
  return request<Card>({
    method: 'POST',
    url: '/cards/',
    data
  })
}

/** 更新借用卡 */
export function updateCard(id: number, data: Partial<Card>) {
  return request<Card>({
    method: 'PUT',
    url: `/cards/${id}`,
    data
  })
}

/** 删除借用卡 */
export function deleteCard(id: number) {
  return request<void>({
    method: 'DELETE',
    url: `/cards/${id}`
  })
}
