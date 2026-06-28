import { chromium } from 'playwright-core'
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|pretendard|net::/.test(m.text())) errors.push(m.text()) })

await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)

// go to savings tab (June) — 저번 달 should be 0
await page.locator('text=저축').last().click(); await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/s2-savings-jun.png' })

// next month via header nav arrow -> July: 저번 달 = June curr
await page.locator('div.press:has(svg path[d="M1 1l7 7-7 7"])').first().click({ force: true }); await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/s2-savings-jul.png' })
const julLabel = await page.locator('text=2026년 7월').count()

// back to June, open a card edit modal -> FAB should be hidden
await page.locator('div.press:has(svg path[d="M8 1L1 8l7 7"])').first().click({ force: true }); await page.waitForTimeout(300)
await page.locator('text=저축').first().click().catch(() => {})
await page.waitForTimeout(400)
await page.screenshot({ path: 'scripts/s2-cardmodal.png' })
const modalInput = await page.locator('text=이번 달 금액').count()

console.log(JSON.stringify({ julLabel, modalInput, errors }, null, 2))
await browser.close()
