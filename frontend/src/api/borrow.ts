import { request } from './request'
import type {
  BorrowRequest,
  BorrowDetail,
  BorrowRequestQuery,
  CreateRequestPayload,
  ConflictResult,
  CheckConflictPayload
} from '@/types/models'

/** 查询借用申请列表 */
export function getRequests(params?: BorrowRequestQuery) {
  return request<BorrowDetail[]>({
    method: 'GET',
    url: '/requests/',
    params
  })
}

/** 查询单个借用申请 */
export function getRequestById(id: number) {
  return request<BorrowDetail>({
    method: 'GET',
    url: `/requests/${id}`
  })
}

/** 创建借用申请 */
export function createRequest(data: CreateRequestPayload) {
  return request<BorrowRequest>({
    method: 'POST',
    url: '/requests/',
    data
  })
}

/** 删除借用申请（用户撤销） */
export function deleteRequest(id: number) {
  return request<void>({
    method: 'DELETE',
    url: `/requests/${id}`
  })
}

/** 提交归还（上传归还照片） */
export function submitReturn(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<BorrowRequest>({
    method: 'POST',
    url: `/requests/${id}/return`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/** 检测时间冲突 */
export function checkConflict(data: CheckConflictPayload) {
  return request<ConflictResult>({
    method: 'POST',
    url: '/requests/check-conflict',
    data
  })
}
