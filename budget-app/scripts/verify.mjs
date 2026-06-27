import { chromium } from 'playwright-core'

const url = process.argv[2] || 'http://localhost:4173/'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)

// Home should render the remaining-amount card
const hasHome = await page.locator('text=이번 달 남은 금액').count()
await page.screenshot({ path: 'scripts/shot-home.png' })

// Switch to 월별 tab
await page.locator('text=월별').first().click()
await page.waitForTimeout(500)
const hasMonth = await page.locator('text=월별 상세').count()
await page.screenshot({ path: 'scripts/shot-month.png' })

await page.locator('text=저축').last().click(); await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/shot-savings.png' })
await page.locator('text=통계').last().click(); await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/shot-stats.png' })

console.log(JSON.stringify({ hasHome, hasMonth, errors }, null, 2))
await browser.close()
if (errors.length) process.exit(1)
