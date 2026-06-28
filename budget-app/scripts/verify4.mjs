import { chromium } from 'playwright-core'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|pretendard|net::/.test(m.text())) errors.push(m.text()) })
page.on('dialog', async (d) => { await d.accept() })

await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
const defaultMonth = await page.locator('text=2026년 6월').count()

// Stats: two owner donuts
await page.locator('text=통계').last().click(); await page.waitForTimeout(500)
const fixedDonut = await page.locator('text=구성원별 고정지출 비중').count()
const varDonut = await page.locator('text=구성원별 변동지출 비중').count()
await page.screenshot({ path: 'scripts/s3-stats.png' })

// Month tab -> navigate to August (2 clicks next) -> empty
await page.locator('text=월별').last().click(); await page.waitForTimeout(300)
await page.locator('div.press:has(svg path[d="M1 1l7 7-7 7"])').first().click({ force: true }); await page.waitForTimeout(250) // July
await page.locator('div.press:has(svg path[d="M1 1l7 7-7 7"])').first().click({ force: true }); await page.waitForTimeout(250) // August
const augLabel = await page.locator('text=2026년 8월').count()
// expense tab + load fixed from prev (July)
await page.locator('text=지출').first().click(); await page.waitForTimeout(300)
await page.screenshot({ path: 'scripts/s3-aug-before.png' })
await page.locator('text=전월 고정지출 불러오기').click(); await page.waitForTimeout(800)
await page.screenshot({ path: 'scripts/s3-aug-after.png' })
const augTotal = await page.locator('text=월 총지출').count()

// Settings name inputs
await page.locator('text=8월').first().click().catch(() => {})
console.log(JSON.stringify({ defaultMonth, fixedDonut, varDonut, augLabel, augTotal, errors }, null, 2))
await browser.close()
