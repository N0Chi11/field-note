import { request } from './request'

export function createPhotoReviewSession() {
  return request<{ expires_in: number }>({
    method: 'POST',
    url: '/admin/photo-review/session'
  })
}

export function clearPhotoReviewSession() {
  return request<void>({
    method: 'DELETE',
    url: '/admin/photo-review/session'
  })
}
