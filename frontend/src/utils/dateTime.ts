const SYSTEM_TIME_ZONE = 'Asia/Shanghai'

/**
 * 后端数据库统一保存 UTC，但无时区的 datetime 在 JSON 中不会携带 Z。
 * 浏览器会把这种字符串误认为本地时间，因此这里统一补上 UTC 标识。
 */
export function parseApiDateTime(
  value: string | Date | null | undefined
): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (!value) return null
  const source = value.trim()
  if (!source) return null

  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(source)
  let normalized = source.replace(' ', 'T')
  if (!hasTimeZone) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      normalized += 'T00:00:00'
    }
    normalized += 'Z'
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * 数据库 CURRENT_TIMESTAMP 按系统时区生成，用于 created_at / 操作日志。
 * 与借用时间（UTC）分开解析，避免把既有的上海本地时间再次加 8 小时。
 */
export function parseSystemDateTime(
  value: string | Date | null | undefined
): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (!value) return null
  const source = value.trim()
  if (!source) return null

  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(source)
  let normalized = source.replace(' ', 'T')
  if (!hasTimeZone) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      normalized += 'T00:00:00'
    }
    normalized += '+08:00'
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: SYSTEM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

/** 将 API 时间按系统时区格式化为 YYYY-MM-DD HH:mm。 */
export function formatApiDateTime(
  value: string | Date | null | undefined,
  fallback = '-'
): string {
  const date = parseApiDateTime(value)
  if (!date) return typeof value === 'string' && value ? value : fallback

  const parts = Object.fromEntries(
    dateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

/** 将数据库生成的系统时间按上海时区格式化。 */
export function formatSystemDateTime(
  value: string | Date | null | undefined,
  fallback = '-'
): string {
  const date = parseSystemDateTime(value)
  return date ? formatApiDateTime(date, fallback) : fallback
}
