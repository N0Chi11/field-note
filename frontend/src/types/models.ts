/**
 * 全局类型定义
 */

/** 用户角色 */
export type UserRole = 'user' | 'admin'

/** 器材状态 */
export type EquipmentStatus = 'available' | 'borrowed' | 'repair'

/** 借用卡状态 */
export type CardStatus = 'available' | 'borrowed'

/** 借用申请状态 */
export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'borrowing'
  | 'return_pending'
  | 'returned'
  | 'rejected'
  | 'cancelled'

/** 冲突类型 */
export type ConflictType = 'hard' | 'soft'

/** 用户 */
export interface User {
  id: number
  student_id: string
  name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
}

/** 器材 */
export interface Equipment {
  id: number
  code: string
  name: string
  category: string
  icon: string
  image_url?: string
  notes?: string
  status: EquipmentStatus
  created_at: string
  updated_at: string
}

/** 借用卡 */
export interface Card {
  id: number
  code: string
  name: string
  notes?: string
  image_url?: string
  status: CardStatus
  created_at: string
}

/** 借用申请 */
export interface BorrowRequest {
  id: number
  work_order_no: string
  user_id: number
  equipment_id: number
  card_id?: number
  borrow_time: string
  return_time: string
  actual_return?: string
  reason: string
  status: RequestStatus
  approver_id?: number
  admin_comment?: string
  return_photo_url?: string
  created_at: string
}

/** 借用详情（带关联名称） */
export interface BorrowDetail extends BorrowRequest {
  user_name: string
  user_student_id: string
  equipment_name: string
  equipment_category: string
  card_name?: string
  approver_name?: string
}

/** 操作日志 */
export interface OperationLog {
  id: number
  actor_name: string
  action: string
  detail: string
  target_type?: string
  target_id?: number
  created_at: string
}

/** 统一响应体 */
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

/** 冲突检测结果 */
export interface ConflictResult {
  has_conflict: boolean
  conflict_type?: ConflictType
  conflict_orders: string[]
}

/** 管理员统计 */
export interface AdminStats {
  total: number
  pending: number
  borrowing: number
  return_pending: number
  feedback_open: number
}

/** Token 数据 */
export interface TokenData {
  access_token: string
  refresh_token: string
  token_type: string
}

/** 器材查询参数 */
export interface EquipmentQuery {
  status?: EquipmentStatus
  category?: string
  keyword?: string
}

/** 借用卡查询参数 */
export interface CardQuery {
  status?: CardStatus
}

/** 借用申请查询参数 */
export interface BorrowRequestQuery {
  status?: RequestStatus
  keyword?: string
}

/** 日志查询参数 */
export interface LogQuery {
  action?: string
  actor_id?: number
  page?: number
  size?: number
}

/** 创建借用申请 payload */
export interface CreateRequestPayload {
  equipment_id: number
  borrow_time: string
  return_time: string
  reason: string
}

/** 冲突检测 payload */
export interface CheckConflictPayload {
  equipment_id: number
  borrow_time: string
  return_time: string
  exclude_request_id?: number
}

export type FeedbackType = 'bug' | 'suggestion' | 'other'
export type FeedbackStatus = 'open' | 'reviewed' | 'resolved'

export interface FeedbackItem {
  id: number
  feedback_type: FeedbackType
  content: string
  contact?: string
  status: FeedbackStatus
  admin_note?: string
  user_name: string
  user_student_id: string
  handler_name?: string
  handled_at?: string
  created_at: string
}

/** 收藏设备 */
export interface EquipmentFavorite {
  id: number
  equipment_id: number
  equipment_code: string
  equipment_name: string
  equipment_category: string
  image_url?: string
  status: EquipmentStatus
  is_available: boolean
  created_at: string
}

export type AvailabilityNotice = EquipmentFavorite

/** 全局预约日历中的隐私安全记录 */
export interface CalendarEntry {
  id: number
  work_order_no: string
  equipment_id: number
  equipment_code: string
  equipment_name: string
  equipment_category: string
  borrow_time: string
  return_time: string
  status: RequestStatus
  is_mine: boolean
  user_name: string
  reason: string
}

export interface YearbookEquipmentStat {
  equipment_id: number
  name: string
  code: string
  count: number
}

export interface YearbookProject {
  work_order_no: string
  equipment_name: string
  reason: string
  borrow_time: string
  status: RequestStatus
}

export interface YearbookData {
  year: number
  available_years: number[]
  user_name: string
  student_id: string
  total_requests: number
  successful_borrows: number
  returned_count: number
  on_time_rate: number
  total_hours: number
  top_equipment: YearbookEquipmentStat[]
  categories: Array<{ name: string; count: number }>
  recent_projects: YearbookProject[]
}

export interface PassportStamp {
  key: string
  title: string
  description: string
  current: number
  target: number
  earned: boolean
  icon: string
}

export interface CreativePassport {
  user_name: string
  student_id: string
  member_since: string
  total_projects: number
  completed_returns: number
  unique_equipment: number
  total_hours: number
  categories: string[]
  earned_stamps: number
  stamps: PassportStamp[]
}

/** 修改密码 payload */
export interface ChangePasswordPayload {
  old_password: string
  new_password: string
}
