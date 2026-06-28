import { chromium } from 'playwright-core'
const b = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
p.on('dialog', async (d) => { await d.accept() })
const shot = (n) => p.screenshot({ path: `scripts/tour-${n}.png` })
await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1000)

await shot('01-home')
// month - expense
await p.locator('text=월별').last().click(); await p.waitForTimeout(300)
await p.locator('text=지출').first().click(); await p.waitForTimeout(300)
await shot('02-month-expense')
// quick modal (expense)
await p.locator('div.press:has(svg path[d="M12 5v14M5 12h14"])').first().click({ force: true }); await p.waitForTimeout(400)
await shot('03-quick-expense')
// switch to savings inside quick
await p.locator('text=저축').first().click(); await p.waitForTimeout(300)
await shot('04-quick-savings')
await p.keyboard.press('Escape').catch(() => {})
await p.locator('body').click({ position: { x: 195, y: 80 } }).catch(() => {})
await p.waitForTimeout(300)
// settings
await p.locator('div.press:has(svg path[d^="M12 15a3"])').first().click({ force: true }); await p.waitForTimeout(400)
await shot('05-settings')
console.log('done')
await b.close()
