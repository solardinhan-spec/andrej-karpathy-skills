import { chromium } from 'playwright-core'
const b = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|pretendard|net::/.test(m.text())) errs.push(m.text()) })
const shot = (n) => p.screenshot({ path: `scripts/v5-${n}.png` })
await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1000)

// month -> expense: category icons + FAB clearance (scroll to bottom)
await p.locator('text=월별').last().click(); await p.waitForTimeout(300)
await p.locator('text=지출').first().click(); await p.waitForTimeout(300)
await p.evaluate(() => document.querySelector('.scroll').scrollTo(0, 99999)); await p.waitForTimeout(300)
await shot('01-expense-bottom')

// month picker via label tap
await p.evaluate(() => document.querySelector('.scroll').scrollTo(0, 0)); await p.waitForTimeout(200)
await p.locator('span.press:has(svg)').first().click({ force: true }); await p.waitForTimeout(400)
await shot('02-monthpicker')
const pickerOpen = await p.locator('text=월 선택').count()
// pick 2027-03
await p.locator('text=2027년 3월').click(); await p.waitForTimeout(400)
const jumped = await p.locator('text=2027년 3월').count()

// edit modal keypad: open an item (go back to a month with data: pick 2026-06)
await p.locator('span.press:has(svg)').first().click({ force: true }); await p.waitForTimeout(300)
await p.locator('text=2026년 6월').click(); await p.waitForTimeout(300)
await p.locator('text=지출').first().click(); await p.waitForTimeout(300)
await p.locator('text=자동차 할부').click(); await p.waitForTimeout(400)
await shot('03-editmodal')
const editKeypad = await p.locator('text=금액').count()

console.log(JSON.stringify({ pickerOpen, jumped, editKeypad, errs }, null, 2))
await b.close()
