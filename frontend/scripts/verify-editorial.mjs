// Run after `npm run dev -- --host 127.0.0.1 --port 5173`.
// Browser checks use synthetic data only; no request reaches production.
import { chromium, expect } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.FIELD_NOTE_QA_URL || 'http://127.0.0.1:5173'
const artifactDir = process.env.FIELD_NOTE_QA_OUTPUT || '.ui-artifacts'
const photoReviewDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend/photo_review/web')
const browser = await chromium.launch(process.env.FIELD_NOTE_QA_BROWSER
  ? { executablePath: process.env.FIELD_NOTE_QA_BROWSER }
  : {})
await mkdir(artifactDir, { recursive: true })

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
  await expect(page.locator('.edition-mark')).toHaveAttribute('src', '/assets/winter-mark.svg')
  await expect(page.locator('.catalog-mark')).toHaveAttribute('src', '/assets/winter-mark.svg')
  await expect(page.getByText('HALLOWEEN', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '器材设备清单' })).toBeVisible()
  await expect(page.getByText('器材档案 · 创作现场', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: path.join(artifactDir, 'catalog-desktop.png'), fullPage: true })
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
  const tomorrow = await page.evaluate(async () => {
    const { defaultBorrowTimes } = await import('/src/utils/borrowTimePolicy.ts')
    return defaultBorrowTimes()
  })
  const displayTime = value => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).format(value)
  await expect(page.getByPlaceholder('选择借用时间')).toHaveValue(displayTime(tomorrow.borrowTime))
  await expect(page.getByPlaceholder('选择归还时间')).toHaveValue(displayTime(tomorrow.returnTime))
  await page.getByPlaceholder('选择归还时间').fill(displayTime(tomorrow.returnTime + 86400000))
  await page.getByPlaceholder('选择归还时间').press('Enter')
  await expect(page.getByText('设备不可过夜', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '提交申请', exact: true })).toBeDisabled()
  await page.getByPlaceholder('选择归还时间').fill(displayTime(tomorrow.returnTime))
  await page.getByPlaceholder('选择归还时间').press('Enter')
  await expect(page.getByText('设备不可过夜', { exact: true })).toHaveCount(0)
  await page.getByPlaceholder('请简要说明借用理由（如：毕业设计视频拍摄）').fill('校园活动拍摄')
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('eb_borrow_draft_1')).reason)).toBe('校园活动拍摄')
  await page.screenshot({ path: path.join(artifactDir, 'borrow-desktop.png'), fullPage: true })

  // A delayed result for an old device must not replace the latest result.
  await page.evaluate(async () => {
    const { defaultBorrowTimes } = await import('/src/utils/borrowTimePolicy.ts')
    sessionStorage.setItem('eb_borrow_draft_1', JSON.stringify({ equipmentId: 1, ...defaultBorrowTimes(), reason: 'Test' }))
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
  await expect(page.getByPlaceholder('选择借用时间')).toHaveValue(displayTime(tomorrow.borrowTime))
  await expect(page.getByPlaceholder('选择归还时间')).toHaveValue(displayTime(tomorrow.returnTime))

  // Calendar presets also use a same-day return, including at month/year boundaries.
  await page.goto(`${baseURL}/borrow?equipment_id=1&date=2028-12-31`)
  await expect(page.getByPlaceholder('选择借用时间')).toHaveValue('2028-12-31 09:00:00')
  await expect(page.getByPlaceholder('选择归还时间')).toHaveValue('2028-12-31 18:00:00')
  const policy = await page.evaluate(async () => {
    const { defaultBorrowTimes, isOvernightBorrow } = await import('/src/utils/borrowTimePolicy.ts')
    const start = Date.parse('2026-12-31T23:59:00+08:00')
    const times = defaultBorrowTimes(start)
    return { ...times, overnight: isOvernightBorrow(times.borrowTime, times.returnTime) }
  })
  expect(displayTime(policy.borrowTime)).toBe('2027-01-01 09:00:00')
  expect(displayTime(policy.returnTime)).toBe('2027-01-01 18:00:00')
  expect(policy.overnight).toBe(false)

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
    await expect(mobile.locator('.catalog-mark')).toBeVisible()
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mobile.screenshot({ path: path.join(artifactDir, `catalog-${width}.png`), fullPage: true })
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
  await expect(login.locator('.login-art img')).toHaveAttribute('src', '/assets/winter-editorial-v1.webp')
  await expect(login.locator('.login-stamp')).toHaveAttribute('src', '/assets/winter-mark.svg')
  expect(await login.locator('.login-art img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
  await expect(login.getByText('HALLOWEEN', { exact: true })).toHaveCount(0)
  await expect(login.getByText('SUFE 校学联新媒体中心', { exact: true })).toHaveCount(0)
  await expect(login.getByText('器材档案 · 创作现场', { exact: true })).toHaveCount(0)
  await login.screenshot({ path: path.join(artifactDir, 'login-desktop.png'), fullPage: true })
  for (const width of [320, 375]) {
    const mobileLogin = await browser.newPage({ viewport: { width, height: 812 }, reducedMotion: 'reduce' })
    await mobileLogin.goto(`${baseURL}/login`)
    await expect(mobileLogin.getByRole('button', { name: '登录', exact: true })).toBeVisible()
    await expect(mobileLogin.locator('.login-art img')).toBeVisible()
    expect(await mobileLogin.locator('.login-art img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    expect(await mobileLogin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mobileLogin.screenshot({ path: path.join(artifactDir, `login-${width}.png`), fullPage: true })
    await mobileLogin.close()
  }

  // Preview the photo-review layout with local assets; this does not submit photos.
  const photoHtml = (await readFile(path.join(photoReviewDir, 'index.html'), 'utf8'))
    .replaceAll('__BASE_PATH__', '/photo-review')
    .replace('__TOKEN__', '')
    .replace('<body ', '<body class="embedded" ')
  const photoStyles = Object.fromEntries(await Promise.all(['style.css', 'editorial.css'].map(async name =>
    [name, await readFile(path.join(photoReviewDir, name), 'utf8')]
  )))
  for (const width of [375, 1160]) {
    const photo = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await mockAPI(photo)
    await photo.addInitScript(() => localStorage.setItem('access_token', 'qa-token'))
    await photo.route(url => url.pathname.startsWith('/photo-review/'), route => {
      const name = new URL(route.request().url()).pathname.split('/').pop()
      if (name === 'app.js') return route.fulfill({ contentType: 'text/javascript', body: '' })
      if (name in photoStyles) return route.fulfill({ contentType: 'text/css', body: photoStyles[name] })
      return route.fulfill({ contentType: 'text/html', body: photoHtml })
    })
    await photo.goto(`${baseURL}/admin/photo-review`)
    const review = photo.frameLocator('.photo-review-frame')
    await expect(review.getByRole('button', { name: '选择照片', exact: true })).toBeVisible()
    expect(await review.locator('body').evaluate(el => getComputedStyle(el).getPropertyValue('--paper').trim())).toBe('#eaf0f2')
    expect(await review.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await photo.screenshot({ path: path.join(artifactDir, `photo-review-${width}.png`), fullPage: true })
    await photo.close()
  }
  console.log('UI verified: winter artwork, responsive photo-review layout, search, status filters, concurrent favorites, booking links, isolated drafts, failed session refresh and mobile navigation.')
} finally {
  await browser.close()
}
