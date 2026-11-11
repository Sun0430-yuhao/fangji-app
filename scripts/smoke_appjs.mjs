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
  '.json': 'application/json'
}
const server = createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0])
  if (url === '/') url = '/index.html'
  const file = join(root, url.replace(/^\//, ''))
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('missing ' + url); return
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
console.log('server', base)

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('pageerror', e.message))
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log(m.type(), m.text()) })

// 用 commit：不要等 defer 脚本（它可能卡死主线程）
const t0 = Date.now()
await page.goto(base, { waitUntil: 'commit', timeout: 15000 })
console.log('commit', Date.now() - t0)

for (const wait of [1000, 3000, 8000, 20000, 40000]) {
  const slice = wait === 1000 ? 1000 : wait - (wait === 3000 ? 1000 : wait === 8000 ? 3000 : wait === 20000 ? 8000 : 20000)
  await page.waitForTimeout(slice)
  const snap = await Promise.race([
    page.evaluate(() => ({
      entry: window.__FANGJI_ENTRY__ || null,
      mounted: !!window.__FANGJI_MOUNTED__,
      hasBoot: !!document.getElementById('boot-fallback'),
      hasTabbar: !!document.querySelector('.van-tabbar'),
      text: (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 140)
    })),
    new Promise((r) => setTimeout(() => r({ blocked: true }), 2000))
  ])
  console.log(`after ${wait}ms`, JSON.stringify(snap))
  if (snap.mounted) {
    await browser.close(); server.close(); process.exit(0)
  }
  if (snap.blocked) {
    console.log('main thread still blocked')
    // 继续等，看是永久卡死还是只是很慢
  }
}

await browser.close()
server.close()
process.exit(3)
