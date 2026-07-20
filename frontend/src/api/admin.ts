import { request } from './request'
import type {
  BorrowDetail,
  OperationLog,
  AdminStats,
  PaginatedResponse,
  LogQuery
} from '@/types/models'

/** 获取管理员首页统计 */
export function getStats() {
  return request<AdminStats>({
    method: 'GET',
    url: '/admin/stats'
  })
}

/** 获取待审批借用申请 */
export function getPendingRequests() {
  return request<BorrowDetail[]>({
    method: 'GET',
    url: '/admin/requests/pending'
  })
}

/** 审批通过 */
export function approveRequest(id: number, comment?: string) {
  return request<BorrowDetail>({
    method: 'POST',
    url: `/admin/requests/${id}/approve`,
    data: { comment }
  })
}

/** 审批拒绝 */
export function rejectRequest(id: number, comment: string) {
  return request<BorrowDetail>({
    method: 'POST',
    url: `/admin/requests/${id}/reject`,
    data: { comment }
  })
}

/** 确认领取（出库） */
export function confirmPickup(id: number, card_id?: number) {
  return request<BorrowDetail>({
    method: 'POST',
    url: `/admin/requests/${id}/pickup`,
    data: { card_id }
  })
}

/** 确认归还（入库） */
export function confirmReturn(id: number) {
  return request<BorrowDetail>({
    method: 'POST',
    url: `/admin/requests/${id}/confirm-return`
  })
}

/** 查询操作日志 */
export function getLogs(params?: LogQuery) {
  return request<PaginatedResponse<OperationLog>>({
    method: 'GET',
    url: '/admin/logs/',
    params
  })
}
