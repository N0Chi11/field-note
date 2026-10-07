/** Equipment must be returned on the same calendar day in Shanghai. */
const schoolDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
})

function schoolDateParts(value: number) {
  const parts = schoolDateFormatter.formatToParts(value)
  return {
    year: Number(parts.find(part => part.type === 'year')!.value),
    month: Number(parts.find(part => part.type === 'month')!.value),
    day: Number(parts.find(part => part.type === 'day')!.value)
  }
}

export function isOvernightBorrow(borrowTime: number, returnTime: number): boolean {
  return schoolDateFormatter.format(borrowTime) !== schoolDateFormatter.format(returnTime)
}

export function defaultBorrowTimes(now = Date.now()) {
  const { year, month, day } = schoolDateParts(now)
  // 09:00 and 18:00 Shanghai time (UTC+8), tomorrow. Date.UTC handles month/year rollover.
  return {
    borrowTime: Date.UTC(year, month - 1, day + 1, 1),
    returnTime: Date.UTC(year, month - 1, day + 1, 10)
  }
}

export function borrowTimesForDate(dateValue: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null
  const [year, month, day] = dateValue.split('-').map(Number)
  const borrowTime = Date.UTC(year, month - 1, day, 1)
  const actual = schoolDateParts(borrowTime)
  if (actual.year !== year || actual.month !== month || actual.day !== day) return null
  if (borrowTime <= now) return defaultBorrowTimes(now)
  return { borrowTime, returnTime: Date.UTC(year, month - 1, day, 10) }
}
