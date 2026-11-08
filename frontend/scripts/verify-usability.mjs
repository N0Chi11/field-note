// Synthetic browser checks; no production requests or user data are used.
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.FIELD_NOTE_QA_URL || 'http://127.0.0.1:5173'
const artifactDir = process.env.FIELD_NOTE_QA_OUTPUT || '.ui-artifacts'
await mkdir(artifactDir, { recursive: true })
const browser = await chromium.launch(process.env.FIELD_NOTE_QA_BROWSER
  ? { executablePath: process.env.FIELD_NOTE_QA_BROWSER }
  : {})

const equipment = [
  { id: 1, code: 'EQ001', name: '索尼 A6400', category: '相机', status: 'available' },
  { id: 2, code: 'EQ002', name: '佳能 EOS R6', category: '相机', status: 'borrowed' },
  { id: 4, code: 'EQ004', name: '罗德 Wireless GO II', category: '麦克风', status: 'repair' }
]
const calendarItems = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  work_order_no: index === 0 ? 'WO-OWN' : '',
  equipment_id: index + 1,
  equipment_code: 'EQ' + String(index + 1).padStart(3, '0'),
  equipment_name: '测试器材 ' + (index + 1),
  equipment_category: index === 5 ? '麦克风' : '相机',
  borrow_time: '2028-11-08T01:00:00',
  return_time: '2028-11-08T03:00:00',
  status: index === 0 ? 'approved' : 'pending',
  is_mine: index === 0,
  user_name: index === 0 ? '测试用户' : '已预约',
  reason: index === 0 ? '测试用途' : '该时段已被预约'
}))
const success = (route, data) => route.fulfill({ json: { code: 0, message: 'ok', data } })

async function setup(page, options = {}) {
  let calendarCount = 0
  let profileCount = 0
  let notifyDecember, notifySlowTimeline
  const decemberStarted = new Promise(resolve => { notifyDecember = resolve })
  const slowTimelineStarted = new Promise(resolve => { notifySlowTimeline = resolve })
  const starts = []
  await page.clock.setFixedTime('2028-11-08T04:00:00Z')
  await page.addInitScript(() => localStorage.setItem('access_token', 'qa-token'))
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    const pathname = url.pathname
    if (pathname.endsWith('/auth/me')) {
      return success(route, { id: 1, name: '测试管理员', student_id: '2028000001', role: 'admin' })
    }
    if (pathname === '/api/v1/equipment/') return success(route, equipment)
    if (/^\/api\/v1\/equipment\/\d+$/.test(pathname)) {
      const id = Number(pathname.split('/').pop())
      if (id === 1 && options.slowTimeline) {
        notifySlowTimeline()
        await new Promise(resolve => setTimeout(resolve, 1300))
      }
      return success(route, { equipment: equipment.find(item => item.id === id) })
    }
    if (pathname === '/api/v1/calendar') {
      calendarCount++
      starts.push(url.searchParams.get('start'))
      if (options.failCalendarOnce && calendarCount === 1) {
        return route.fulfill({ status: 503, json: { detail: '暂时不可用' } })
      }
      const start = Date.parse(url.searchParams.get('start'))
      const midMonth = new Date(start + 15 * 86400000 + 8 * 3600000)
      const year = midMonth.getUTCFullYear()
      const month = midMonth.getUTCMonth() + 1
      if (options.raceCalendar && year === 2028 && month === 12) {
        notifyDecember()
        await new Promise(resolve => setTimeout(resolve, 1300))
        return success(route, [{ ...calendarItems[0], id: 990, equipment_name: '过期响应', borrow_time: '2029-01-01T01:00:00', return_time: '2029-01-01T03:00:00' }])
      }
      if (options.raceCalendar && year === 2029 && month === 1) {
        return success(route, [{ ...calendarItems[0], id: 991, equipment_name: '最新预约', borrow_time: '2029-01-01T01:00:00', return_time: '2029-01-01T03:00:00' }])
      }
      return success(route, year === 2028 && month === 11 ? calendarItems : [])
    }
    if (pathname === '/api/v1/requests/') {
      if (url.searchParams.has('equipment_id')) return success(route, { items: [], total: 0, page: 1, size: 100 })
      profileCount++
      if (options.failProfileOnce && profileCount === 1) {
        return route.fulfill({ status: 503, json: { detail: '暂时不可用' } })
      }
      return success(route, { items: [
        { id: 1, user_id: 1, status: 'pending' },
        { id: 2, user_id: 1, status: 'returned' },
        { id: 3, user_id: 2, status: 'borrowing' }
      ], total: 3, page: 1, size: 100 })
    }
    if (pathname.endsWith('/admin/stats')) return success(route, { pending: 0, borrowing: 0, return_pending: 0, feedback_open: 0, total: 0 })
    return success(route, [])
  })
  return { starts, decemberStarted, slowTimelineStarted }
}

try {
  // Shanghai dates stay correct even when the browser is in another time zone.
  const calendarContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' })
  const calendar = await calendarContext.newPage()
  const calendarMock = await setup(calendar, { raceCalendar: true })
  await calendar.goto(baseURL + '/calendar')
  await expect(calendar.locator('.month-title')).toHaveText('2028年11月')
  await expect(calendar.locator('.agenda-entry')).toHaveCount(6)
  expect(calendarMock.starts[0]).toBe('2028-10-28T16:00:00.000Z')
  await expect(calendar.getByRole('button', { name: '2028-11-08，6 条预约' })).toHaveAttribute('aria-pressed', 'true')
  await calendar.getByRole('button', { name: '查看全部 6 条' }).click()
  await calendar.locator('.agenda-entry').last().click()
  await expect(calendar.locator('.booking-detail h2')).toHaveText('测试器材 6')
  await expect(calendar.locator('.booking-detail')).toContainText('已预约')
  await calendar.keyboard.press('Escape')
  await calendar.getByLabel('按设备类别筛选').selectOption('相机')
  await expect(calendar.locator('.agenda-entry')).toHaveCount(5)
  await calendar.getByLabel('按设备类别筛选').selectOption('all')
  await expect(calendar.locator('.calendar-page .n-spin')).toBeHidden()
  await calendar.evaluate(() => window.scrollTo(0, 0))
  await calendar.screenshot({ path: path.join(artifactDir, 'calendar-desktop.png'), fullPage: true })
  await calendar.getByRole('button', { name: '下一月' }).click()
  await calendarMock.decemberStarted
  await calendar.getByRole('button', { name: '下一月' }).click()
  await expect(calendar.locator('.month-title')).toHaveText('2029年1月')
  await expect(calendar.locator('.agenda-entry')).toContainText(['最新预约'])
  await calendar.waitForTimeout(1500)
  await expect(calendar.locator('.agenda-entry')).toContainText(['最新预约'])
  await expect(calendar.getByText('过期响应')).toHaveCount(0)
  await calendarContext.close()

  const errorContext = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: 'reduce' })
  const errorPage = await errorContext.newPage()
  await setup(errorPage, { failCalendarOnce: true, failProfileOnce: true })
  await errorPage.goto(baseURL + '/calendar')
  await expect(errorPage.locator('.calendar-error')).toBeVisible()
  await expect(errorPage.getByText('当天暂无预约')).toHaveCount(0)
  await errorPage.getByRole('button', { name: '重新加载' }).click()
  await expect(errorPage.locator('.agenda-entry')).toHaveCount(6)
  await errorPage.goto(baseURL + '/profile')
  await expect(errorPage.locator('.profile-data-notice')).toBeVisible()
  await expect(errorPage.locator('.profile-stat-value').first()).toHaveText('—')
  await errorPage.getByRole('button', { name: '重新加载' }).click()
  await expect(errorPage.locator('.profile-stat-value')).toHaveText(['2', '1', '0', '1', '0'])
  await errorContext.close()

  for (const width of [320, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' })
    const page = await context.newPage()
    await setup(page)
    await page.goto(baseURL + '/calendar')
    await expect(page.locator('.agenda-entry')).toHaveCount(6)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.locator('.calendar-scroll').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.getByRole('button', { name: '2028-11-07，0 条预约' }).click()
    await expect(page.locator('.agenda-apply')).toBeDisabled()
    await page.getByRole('button', { name: '2028-11-08，6 条预约' }).click()
    await expect(page.locator('.agenda-apply')).toBeEnabled()
    await expect(page.locator('.calendar-page .n-spin')).toBeHidden()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(artifactDir, 'calendar-' + width + '.png'), fullPage: true })
    await page.locator('.agenda-entry').last().click()
    await expect(page.locator('.booking-detail h2')).toHaveText('测试器材 6')
    await page.keyboard.press('Escape')
    await page.locator('.agenda-apply').click()
    await expect(page).toHaveURL(/\/borrow\?date=2028-11-08/)
    await expect(page.locator('.preset-alert')).toContainText('所选日期的默认时段已过')
    await page.getByRole('button', { name: '清空草稿' }).click()
    await expect(page.locator('.preset-alert')).toHaveCount(0)
    await context.close()
  }

  const timelineContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const timeline = await timelineContext.newPage()
  const timelineMock = await setup(timeline, { slowTimeline: true })
  await timeline.goto(baseURL + '/equipment')
  await timeline.locator('.equipment-card').filter({ hasText: '罗德 Wireless GO II' }).getByRole('button', { name: '查看占用时间' }).click()
  await expect(timeline.getByText('当前状态：维修中')).toBeVisible()
  await expect(timeline.getByText('当前状态：可借用')).toHaveCount(0)
  await timeline.getByRole('button', { name: '关闭时间轴' }).click()
  await timeline.locator('.equipment-card').filter({ hasText: '索尼 A6400' }).getByRole('button', { name: '查看占用时间' }).click()
  await timelineMock.slowTimelineStarted
  await timeline.getByRole('button', { name: '关闭时间轴' }).click()
  await timeline.locator('.equipment-card').filter({ hasText: '佳能 EOS R6' }).getByRole('button', { name: '查看占用时间' }).click()
  await expect(timeline.getByText('当前状态：借用中')).toBeVisible()
  await expect(timeline.getByText('设备目前不在库，请以预约日历为准')).toBeVisible()
  await timeline.waitForTimeout(1500)
  await expect(timeline.locator('.timeline-header-info h3')).toHaveText('佳能 EOS R6')
  await timelineContext.close()
  console.log('Usability verified: Shanghai calendar dates, full daily lists, mobile layout, failed-load retry, stale requests, equipment status and personal stats.')
} finally {
  await browser.close()
}
