import { chromium } from 'playwright-core'
const url = 'http://localhost:4173/'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|pretendard|404|net::/.test(m.text())) errors.push(m.text()) })

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)

// month label should be 6월 now (no May)
const month = await page.locator('text=2026년 6월').count()

// Month detail -> 저축 big tab
await page.locator('text=월별').last().click(); await page.waitForTimeout(400)
await page.locator('text=저축').first().click(); await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/s-month-savings.png' })

// Savings bottom tab
await page.locator('text=저축').last().click(); await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/s-savings-tab.png' })
const cardCount = await page.locator('text=청약통장').count()

// FAB -> savings quick modal
await page.locator('div.press svg[viewBox="0 0 24 24"]').last().click().catch(() => {})
await page.waitForTimeout(300)
await page.locator('text=저축').first().click().catch(() => {})
await page.waitForTimeout(300)
await page.screenshot({ path: 'scripts/s-quick.png' })

console.log(JSON.stringify({ month, cardCount, errors }, null, 2))
await browser.close()
