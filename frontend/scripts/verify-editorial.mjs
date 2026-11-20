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
  await expect(page.getByText('CHRISTMAS EDITION', { exact: true })).toBeVisible()
  await expect(page.locator('.edition-issue')).toContainText('ISSUE 107')
  await expect(page.locator('.edition-mark')).toHaveAttribute('src', '/assets/christmas-seal-v1.svg')
  await expect(page.locator('.catalog-mark')).toHaveAttribute('src', '/assets/christmas-seal-v1.svg')
  await expect(page.getByText('把圣诞的灯火，留在胶片上。')).toBeVisible()
  await expect(page.locator('.catalog-cover')).toHaveAttribute('src', '/assets/christmas-santa-cover-v1.webp')
  await expect.poll(() => page.locator('.catalog-cover').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
  for (const asset of [
    'christmas-santa-cover-v1.webp', 'christmas-santa-portrait-v1.webp', 'christmas-seal-v1.svg',
    'christmas-garland-v2.svg', 'christmas-cover-trim-v2.svg', 'christmas-bells-v1.svg',
    'christmas-gifts/hasselblad-h6d-100c.webp', 'christmas-gifts/leica-m11.webp',
    'christmas-gifts/fujifilm-gfx100-ii.webp', 'christmas-gifts/canon-eos-r1.webp',
    'christmas-calendar-v1.svg', 'christmas-camera-ornament-v1.svg',
    'editorial-equipment-icons-v1.webp', 'editorial-action-icons-v1.webp', 'sidebar-icon-sprite-v1.webp',
  ]) {
    const response = await page.request.get(`${baseURL}/assets/${asset}`)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain(asset.endsWith('.svg') ? 'image/svg+xml' : 'image/webp')
  }
  expect(await page.locator('.placeholder-icon').first().evaluate(el => getComputedStyle(el).backgroundImage)).toContain('editorial-equipment-icons-v1.webp')
  expect(await page.locator('.nav-item__icon').first().evaluate(el => getComputedStyle(el).backgroundImage)).toContain('sidebar-icon-sprite-v1.webp')
  expect(await page.locator('.nav-item__icon--calendar').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('christmas-calendar-v1.svg')
  expect(await page.locator('.catalog-cover').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none')
  expect(await page.locator('.editorial-page').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  await expect(page.getByText('HALLOWEEN', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '器材设备清单' })).toBeVisible()
  await expect(page.getByText('器材档案 · 创作现场', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: path.join(artifactDir, 'catalog-desktop.png') })

  // The gift activity is opt-in and never modifies the real equipment inventory.
  const writes = []
  const observeGiftRequests = request => {
    if (request.url().includes('/api/v1/') && !['GET', 'HEAD'].includes(request.method())) writes.push(request.url())
  }
  page.on('request', observeGiftRequests)
  const giftTrigger = page.getByRole('button', { name: '拆圣诞礼物', exact: true })
  const giftDialog = page.getByRole('dialog')
  await expect(giftDialog).toHaveCount(0)
  await giftTrigger.click()
  await expect(giftDialog).toHaveAccessibleName('圣诞相机礼盒')
  await expect(giftDialog.getByRole('radio')).toHaveCount(4)
  const parcel = giftDialog.getByRole('button', { name: '拆开礼物盒', exact: true })
  await expect(giftDialog.getByText('没选型号就随机拆一台')).toBeVisible()
  await expect.poll(() => giftDialog.locator('.gift-option img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0))).toBe(true)
  await page.screenshot({ path: path.join(artifactDir, 'gift-desktop.png') })
  await giftDialog.locator('.gift-choice').filter({ hasText: 'GFX100 II' }).click()
  await expect(giftDialog.getByRole('radio', { name: 'Fujifilm GFX100 II' })).toBeChecked()
  await expect(giftDialog.getByText('指定礼物：Fujifilm GFX100 II')).toBeVisible()
  await parcel.click()
  await expect(giftDialog).toHaveAccessibleName('收到一台相机')
  await expect(giftDialog.getByRole('heading', { name: '收到一台相机' })).toBeFocused()
  await expect(giftDialog.getByText('GFX100 II', { exact: true })).toBeVisible()
  await expect(giftDialog.getByText('虚拟礼物', { exact: true })).toBeVisible()
  await expect(giftDialog.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/')
  await expect.poll(() => giftDialog.getByRole('img', { name: 'Fujifilm GFX100 II 实机照片' }).evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
  expect(await giftDialog.locator('.gift-result').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  await page.screenshot({ path: path.join(artifactDir, 'gift-result-desktop.png') })
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    giftDialog.getByRole('button', { name: '保存礼物卡', exact: true }).click()
  ])
  const cardFile = path.join(artifactDir, 'gift-card.png')
  await download.saveAs(cardFile)
  const cardBytes = await readFile(cardFile)
  expect(download.suggestedFilename()).toBe('FIELD-NOTE-圣诞礼物-Fujifilm-GFX100-II.png')
  expect(cardBytes.subarray(1, 4).toString()).toBe('PNG')
  expect(cardBytes.readUInt32BE(16)).toBe(1080)
  await giftDialog.getByRole('button', { name: '再拆一个', exact: true }).click()
  await expect(parcel).toBeFocused()
  await expect(giftDialog.getByRole('radio', { checked: true })).toHaveCount(0)
  await parcel.click()
  await expect(giftDialog.getByText(/^(H6D-100c|M11|EOS R1)$/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(giftDialog).toHaveCount(0)
  await expect(giftTrigger).toBeFocused()
  await giftTrigger.press('Enter')
  await expect(giftDialog.getByRole('radio', { checked: true })).toHaveCount(0)
  await giftDialog.getByRole('button', { name: '关闭圣诞相机礼盒' }).click()
  await expect(giftDialog).toHaveCount(0)
  await expect(page.locator('.equipment-card')).toHaveCount(5)
  expect(writes).toEqual([])
  page.off('request', observeGiftRequests)

  await page.getByRole('searchbox', { name: '搜索器材' }).fill('索尼')
  await expect(page.locator('.equipment-card')).toHaveCount(1)
  await page.getByRole('button', { name: '清除搜索' }).click()
  await expect(page.getByRole('searchbox', { name: '搜索器材' })).toBeFocused()
  await expect(page.locator('.equipment-card')).toHaveCount(5)
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
    const mobile = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: width === 375 ? 'no-preference' : 'reduce' })
    await mockAPI(mobile)
    await mobile.addInitScript(() => localStorage.setItem('access_token', 'qa-token'))
    await mobile.goto(`${baseURL}/equipment`)
    await expect(mobile.locator('.equipment-card')).toHaveCount(5)
    await expect(mobile.locator('.catalog-mark')).toBeVisible()
    await expect.poll(() => mobile.locator('.catalog-cover').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
    const heroHasRoom = await mobile.evaluate(() => {
      const phrase = document.querySelector('.catalog-season-line')?.getBoundingClientRect()
      const heading = document.querySelector('.catalog-heading .page-title')?.getBoundingClientRect()
      const masthead = document.querySelector('.edition-name')?.getBoundingClientRect()
      const editionLabel = document.querySelector('.edition-meta')?.getBoundingClientRect()
      return !!phrase && !!heading && phrase.bottom <= heading.top
        && !!masthead && !!editionLabel && masthead.right < editionLabel.left
    })
    expect(heroHasRoom).toBe(true)
    expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mobile.screenshot({ path: path.join(artifactDir, `catalog-${width}.png`) })
    if (width <= 375) {
      await mobile.getByRole('button', { name: '拆圣诞礼物', exact: true }).click()
      const dialog = mobile.getByRole('dialog')
      await expect(dialog.getByRole('radio')).toHaveCount(4)
      await expect.poll(() => dialog.locator('.gift-option img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0))).toBe(true)
      await mobile.screenshot({ path: path.join(artifactDir, `gift-picker-${width}.png`), animations: 'disabled' })
      await dialog.locator('.gift-choice').filter({ hasText: 'H6D-100c' }).click()
      await dialog.getByRole('button', { name: '拆开礼物盒', exact: true }).click()
      await expect(dialog.getByText('H6D-100c', { exact: true })).toBeVisible()
      if (width === 375) expect(await dialog.locator('.gift-result').evaluate(el => getComputedStyle(el).animationName)).not.toBe('none')
      await expect.poll(() => dialog.locator('.gift-card__photo').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true)
      const frame = await dialog.boundingBox()
      expect(frame.x).toBeGreaterThanOrEqual(0)
      expect(frame.x + frame.width).toBeLessThanOrEqual(width)
      await mobile.screenshot({ path: path.join(artifactDir, `gift-result-${width}.png`), animations: 'disabled' })
      await dialog.getByRole('button', { name: '关闭圣诞相机礼盒' }).click()
      await expect(dialog).toHaveCount(0)
    }
    if (width > 900) { await mobile.close(); continue }
    await mobile.getByRole('button', { name: '打开导航菜单' }).click()
    await expect(mobile.locator('.sidebar')).toHaveClass(/is-open/)
    expect(await mobile.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await mobile.keyboard.press('Escape')
    await expect(mobile.locator('.sidebar')).not.toHaveClass(/is-open/)
    expect(await mobile.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    if (width <= 375) {
      await mobile.goto(`${baseURL}/borrow`)
      await expect(mobile.getByRole('button', { name: '提交申请', exact: true })).toBeVisible()
      await expect(mobile.getByText('愿每一次按下快门，都留下一点温暖。')).toBeVisible()
      await expect(mobile.locator('.borrow-art__ornament')).toHaveAttribute('src', '/assets/christmas-camera-ornament-v1.svg')
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await mobile.screenshot({ path: path.join(artifactDir, `borrow-${width}.png`), fullPage: true })
    }
    await mobile.close()
  }

  const login = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await login.goto(`${baseURL}/login`)
  await expect(login.getByLabel('学号（账号）')).toBeVisible()
  await expect(login.getByRole('button', { name: '拆圣诞礼物' })).toHaveCount(0)
  await expect(login.getByText('愿这个圣诞，有值得留影的灯火。')).toBeVisible()
  await expect(login.getByText('CHRISTMAS EDITION', { exact: true })).toBeVisible()
  await expect(login.locator('.login-stamp')).toHaveAttribute('src', '/assets/christmas-seal-v1.svg')
  await expect.poll(() => login.locator('.login-art img').evaluate(img => img.complete && img.naturalWidth > 0 && img.currentSrc.endsWith('/christmas-santa-portrait-v1.webp'))).toBe(true)
  expect(await login.locator('.login-card').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  await expect(login.getByText('HALLOWEEN', { exact: true })).toHaveCount(0)
  await expect(login.getByText('SUFE 校学联新媒体中心', { exact: true })).toHaveCount(0)
  await expect(login.getByText('器材档案 · 创作现场', { exact: true })).toHaveCount(0)
  await login.screenshot({ path: path.join(artifactDir, 'login-desktop.png'), fullPage: true })
  for (const width of [320, 375]) {
    const mobileLogin = await browser.newPage({ viewport: { width, height: 812 }, reducedMotion: 'reduce' })
    await mobileLogin.goto(`${baseURL}/login`)
    await expect(mobileLogin.getByRole('button', { name: '登录', exact: true })).toBeVisible()
    await expect(mobileLogin.getByText('愿这个圣诞，有值得留影的灯火。')).toBeVisible()
    await expect(mobileLogin.locator('.login-art img')).toBeVisible()
    await expect.poll(() => mobileLogin.locator('.login-art img').evaluate(img => img.complete && img.naturalWidth > 0 && img.currentSrc.endsWith('/christmas-santa-cover-v1.webp'))).toBe(true)
    expect(await mobileLogin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mobileLogin.screenshot({ path: path.join(artifactDir, `login-${width}.png`), fullPage: true })
    await mobileLogin.close()
  }

  const interactiveLogin = await browser.newPage({ viewport: { width: 1024, height: 900 } })
  await interactiveLogin.goto(`${baseURL}/login`)
  await interactiveLogin.getByLabel('姓名', { exact: true }).fill('测试用户')
  await expect(interactiveLogin.getByLabel('姓名', { exact: true })).toHaveValue('测试用户')
  await interactiveLogin.getByRole('button', { name: '管理员登录', exact: true }).click()
  await expect(interactiveLogin.getByLabel('密码', { exact: true })).toBeVisible()
  await interactiveLogin.close()

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
  console.log('UI verified: virtual gift box, exact and random camera picks, PNG export, photo-review layout, search, favorites, booking and mobile navigation.')
} finally {
  await browser.close()
}
