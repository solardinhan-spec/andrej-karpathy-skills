import { chromium } from 'playwright-core'
const b = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const errs = []; let dialogs = 0
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|pretendard|net::/.test(m.text())) errs.push(m.text()) })
p.on('dialog', async (d) => { dialogs++; await d.accept() })

const drag = async (sel, dx) => {
  const el = p.locator(sel).first()
  const box = await el.boundingBox()
  const y = box.y + box.height / 2
  await p.mouse.move(box.x + box.width - 30, y)
  await p.mouse.down()
  for (let i = 1; i <= 6; i++) await p.mouse.move(box.x + box.width - 30 + (dx * i) / 6, y)
  await p.mouse.up()
  await p.waitForTimeout(500)
}

await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1000)
const defaultMonth = await p.locator('text=2026년 6월').count()

await p.locator('text=월별').last().click(); await p.waitForTimeout(300)
await p.locator('text=지출').first().click(); await p.waitForTimeout(300)

// short swipe -> snap back, no dialog, row remains
await drag('text=자동차 할부', -30)
const afterShort = { dialogs, car: await p.locator('text=자동차 할부').count() }

// full swipe -> confirm(accept) -> deleted
await drag('text=자동차 할부', -280)
const afterFull = { dialogs, car: await p.locator('text=자동차 할부').count(), toast: await p.locator('text=삭제됐어요').count() }

console.log(JSON.stringify({ defaultMonth, afterShort, afterFull, errs }, null, 2))
await b.close()
