import { chromium } from 'playwright-core'

const url = process.argv[2]
const isLocal = /localhost|127\.0\.0\.1/.test(url)
const proxy = isLocal ? null : (process.env.HTTPS_PROXY || process.env.https_proxy)
const browser = await chromium.launch({
  headless: true,
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: proxy ? { server: proxy } : undefined,
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[PAGEERROR] ${e.message}\n${e.stack || ''}`))
page.on('requestfailed', (r) => logs.push(`[REQFAIL] ${r.url()} :: ${r.failure()?.errorText}`))

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => logs.push('[GOTO] ' + e.message))
await page.waitForTimeout(2500)
const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 300))
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200))
console.log('--- ROOT innerHTML (first 300) ---\n' + rootHtml)
console.log('--- BODY text ---\n' + bodyText)
console.log('--- CONSOLE / ERRORS ---\n' + (logs.join('\n') || '(none)'))
await browser.close()
