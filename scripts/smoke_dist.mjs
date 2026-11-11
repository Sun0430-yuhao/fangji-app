import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { chromium } from 'playwright'

const root = join(process.cwd(), 'dist')
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
}

console.log('smoke: start')
function handler(req, res) {
  let url = decodeURIComponent((req.url || '/').split('?')[0])
  if (url === '/') url = '/index.html'
  const file = join(root, url.replace(/^\//, ''))
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('missing ' + url); return
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
}

const server = createServer(handler)
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const { port } = server.address()
const base = `http://127.0.0.1:${port}/`
console.log('smoke: server', base)

const logs = []
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
})
console.log('smoke: browser up')
const page = await browser.newPage()
page.on('console', (m) => logs.push({ type: m.type(), text: m.text() }))
page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: String(e?.message || e) }))
page.on('requestfailed', (req) => logs.push({ type: 'requestfailed', text: req.url() + ' ' + (req.failure()?.errorText || '') }))

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 20000 })
console.log('smoke: loaded')
await page.waitForFunction(() => window.__FANGJI_MOUNTED__ || window.__FANGJI_ENTRY__ === 'main', null, { timeout: 10000 }).catch(() => {})
await page.waitForTimeout(1500)

const state = await page.evaluate(() => ({
  stamp: window.__FANGJI_BUILD__ || null,
  dataOk: !!(window.__FANGJI_DATA__ && window.__FANGJI_DATA__.chapters),
  entry: window.__FANGJI_ENTRY__ || null,
  mounted: !!window.__FANGJI_MOUNTED__,
  hasBoot: !!document.getElementById('boot-fallback'),
  hasTabbar: !!document.querySelector('.van-tabbar'),
  title: document.title,
  bodyText: (document.body && document.body.innerText || '').slice(0, 240)
}))

console.log(JSON.stringify({ base, state, logs }, null, 2))
await browser.close()
server.close()
process.exit(state.mounted ? 0 : 2)
