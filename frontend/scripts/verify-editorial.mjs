// Run after `npm run dev -- --host 127.0.0.1 --port 5173`.
// Browser checks use synthetic data only; no request reaches production.
import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const baseURL = process.env.FIELD_NOTE_QA_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.FIELD_NOTE_QA_BROWSER
  ? { executablePath: process.env.FIELD_NOTE_QA_BROWSER }
  : {})
await mkdir('.ui-artifacts', { recursive: true })

const items = [
  { id: 1, code: 'EQ001', name: '索尼 A6400', category: '相机', status: 'available', notes: '含镜头、电池与肩带' },
  { id: 2, code: 'EQ002', name: '佳能 EOS R6', category: '相机', status: 'borrowed', notes: '归还后请检查电池电量' },
  { id: 3, code: 'EQ003', name: '大疆 RS 3', category: '稳定器', status: 'available' },
  { id: 4, code: 'EQ004', name: '罗德 Wireless GO II', category: '麦克风', status: 'repair' },
  { id: 5, code: 'EQ005', name: '爱图仕 MC', category: '灯光', status: 'available' },
]

async function mockAPI(page) {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.includes('/favorites/') && route.request().method() === 'POST') {
      await new Promise(resolve => setTimeout(resolve, path.endsWith('/1') ? 500 : 100))
    }
    let data = []
    if (path.endsWith('/auth/me')) data = { id: 1, name: '范雨欣', student_id: '2026000001', role: 'admin', avatar_url: '/assets/default-avatars/editorial-1.png' }
    else if (path === '/api/v1/equipment/') data = items
    else if (path.endsWith('/admin/stats')) data = { pending: 2, borrowing: 1, return_pending: 1, feedback_open: 3, total: 5 }
    else if (path.endsWith('/requests/check-conflict')) data = { has_conflict: false, conflict_type: null, conflict_orders: [] }
    await route.fulfill({ json: { code: 0, message: 'ok', data } })
  })
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await mockAPI(page)
  await page.addInitScript(() => localStorage.setItem('access_token', 'qa-token'))
  await page.goto(`${baseURL}/equipment`)
  await expect(page.locator('.equipment-card')).toHaveCount(5)
  await expect(page.locator('.edition-name')).toContainText('FIELD NOTE')
  await expect(page.getByRole('heading', { name: '器材设备清单' })).toBeVisible()
  await expect(page.getByText('器材档案 · 创作现场', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: '.ui-artifacts/catalog-desktop.png', fullPage: true })
  await page.getByRole('searchbox', { name: '搜索器材' }).fill('索尼')
  await expect(page.locator('.equipment-card')).toHaveCount(1)
  await page.getByRole('searchbox', { name: '搜索器材' }).fill('')
  await page.getByLabel('筛选器材状态').selectOption('repair')
  await expect(page.locator('.equipment-card')).toHaveCount(1)
  await expect(page.locator('.borrow-link')).toHaveCount(0)
  await page.getByLabel('筛选器材状态').selectOption('all')
  await page.getByRole('button', { name: '收藏索尼 A6400', exact: true }).click()
  await page.getByRole('button', { name: '收藏佳能 EOS R6', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消收藏索尼 A6400', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '取消收藏佳能 EOS R6', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: /我的收藏/ }).click()
  await expect(page.locator('.equipment-card')).toHaveCount(2)
  await page.getByRole('searchbox', { name: '搜索器材' }).fill('没有这个器材')
  await expect(page.getByText('没有找到匹配的器材')).toBeVisible()
  await page.getByRole('button', { name: '查看全部器材' }).click()
  await expect(page.locator('.equipment-card')).toHaveCount(5)

  // Deep link preserves the selected equipment and account-isolated draft.
  await page.locator('.borrow-link').first().click()
  await expect(page).toHaveURL(/equipment_id=1/)
  await expect(page.locator('.n-base-selection-label')).toContainText('索尼 A6400')
  await page.getByPlaceholder('请简要说明借用理由（如：毕业设计视频拍摄）').fill('校园活动拍摄')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('eb_borrow_draft_1')).reason)).toBe('校园活动拍摄')
  await page.screenshot({ path: '.ui-artifacts/borrow-desktop.png', fullPage: true })

  // A delayed result for an old device must not replace the latest result.
  await page.evaluate(() => {
    const borrowTime = Date.now() + 86400000
    sessionStorage.setItem('eb_borrow_draft_1', JSON.stringify({ equipmentId: 1, borrowTime, returnTime: borrowTime + 86400000, reason: 'Test' }))
  })
  let oldConflictStarted
  const oldStarted = new Promise(resolve => { oldConflictStarted = resolve })
  await page.route('**/api/v1/requests/check-conflict', async route => {
    const id = route.request().postDataJSON().equipment_id
    if (id === 1) {
      oldConflictStarted()
      await new Promise(resolve => setTimeout(resolve, 1300))
    }
    await route.fulfill({ json: { code: 0, message: 'ok', data: { has_conflict: id === 1, conflict_type: id === 1 ? 'hard' : null, conflict_orders: id === 1 ? ['OLD'] : [] } } })
  })
  await page.reload()
  await oldStarted
  await page.locator('.n-base-selection').click()
  await page.getByText('EQ003 - 大疆 RS 3', { exact: true }).click()
  await expect(page.getByText('所选时段无时间冲突，可以提交申请。')).toBeVisible()
  await new Promise(resolve => setTimeout(resolve, 1500))
  await expect(page.getByText('所选时段无时间冲突，可以提交申请。')).toBeVisible()
  await page.getByRole('button', { name: '清空草稿' }).click()
  expect(await page.evaluate(() => sessionStorage.getItem('eb_borrow_draft_1'))).toBeNull()

  // Failed refresh must reject all queued requests, rather than hang forever.
  await page.unroute('**/api/v1/**')
  await mockAPI(page)
  await page.route('**/api/v1/qa-protected', route => route.fulfill({ status: 401, json: { detail: 'expired' } }))
  await page.route('**/api/v1/auth/refresh', async route => {
    await new Promise(resolve => setTimeout(resolve, 300))
    await route.fulfill({ status: 401, json: { detail: 'expired refresh' } })
  })
  await page.route('**/login', route => route.abort())
  const settled = await page.evaluate(async () => {
    localStorage.setItem('refresh_token', 'qa-refresh')
    const { request } = await import('/src/api/request.ts')
    return Promise.race([
      Promise.allSettled([request({ url: '/qa-protected' }), request({ url: '/qa-protected' })]).then(results => results.map(result => result.status)),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 2000)),
    ])
  })
  expect(settled).toEqual(['rejected', 'rejected'])
  expect(errors).toEqual([])

  for (const width of [320, 375, 768, 1024]) {
    const mobile = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await mockAPI(mobile)
    await mobile.addInitScript(() => localStorage.setItem('access_token', 'qa-token'))
    await mobile.goto(`${baseURL}/equipment`)
    await expect(mobile.locator('.equipment-card')).toHaveCount(5)
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mobile.screenshot({ path: `.ui-artifacts/catalog-${width}.png`, fullPage: true })
    if (width > 900) { await mobile.close(); continue }
    await mobile.getByRole('button', { name: '打开导航菜单' }).click()
    await expect(mobile.locator('.sidebar')).toHaveClass(/is-open/)
    expect(await mobile.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await mobile.keyboard.press('Escape')
    await expect(mobile.locator('.sidebar')).not.toHaveClass(/is-open/)
    expect(await mobile.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    await mobile.close()
  }

  const login = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await login.goto(`${baseURL}/login`)
  await expect(login.getByLabel('学号（账号）')).toBeVisible()
  await expect(login.getByText('SUFE 校学联新媒体中心', { exact: true })).toHaveCount(0)
  await expect(login.getByText('器材档案 · 创作现场', { exact: true })).toHaveCount(0)
  await login.screenshot({ path: '.ui-artifacts/login-desktop.png', fullPage: true })
  const mobileLogin = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })
  await mobileLogin.goto(`${baseURL}/login`)
  await expect(mobileLogin.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  expect(await mobileLogin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mobileLogin.screenshot({ path: '.ui-artifacts/login-mobile.png', fullPage: true })
  console.log('UI verified: search, status filters, concurrent favorites, booking links, isolated drafts, failed session refresh, mobile navigation, responsive screenshots.')
} finally {
  await browser.close()
}
