import { request } from './request'
import type {
  AvailabilityNotice,
  CalendarEntry,
  EquipmentFavorite,
  CreativePassport,
  YearbookData
} from '@/types/models'

export function getFavorites() {
  return request<EquipmentFavorite[]>({ method: 'GET', url: '/favorites' })
}

export function addFavorite(equipmentId: number) {
  return request<EquipmentFavorite>({
    method: 'POST',
    url: `/favorites/${equipmentId}`
  })
}

export function removeFavorite(equipmentId: number) {
  return request<void>({
    method: 'DELETE',
    url: `/favorites/${equipmentId}`
  })
}

export function getAvailabilityNotifications() {
  return request<AvailabilityNotice[]>({
    method: 'GET',
    url: '/favorites/availability-notifications'
  })
}

export function getReservationCalendar(start: string, end: string) {
  return request<CalendarEntry[]>({
    method: 'GET',
    url: '/calendar',
    params: { start, end }
  })
}

export function getYearbook(year: number) {
  return request<YearbookData>({
    method: 'GET',
    url: '/yearbook',
    params: { year }
  })
}

export function getCreativePassport() {
  return request<CreativePassport>({
    method: 'GET',
    url: '/passport'
  })
}
