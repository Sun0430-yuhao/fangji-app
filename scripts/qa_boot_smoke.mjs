/**
 * 交付前启动冒烟：用 Playwright 打开生产 dist，断言首页能出来。
 * 模拟「冷启动看到内容」——空白页/永久载入一律失败。
 */
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { pathToFileURL } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
}

function startStatic() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0])
      if (url === '/') url = '/index.html'
      const file = join(dist, url.replace(/^\//, ''))
      if (!file.startsWith(dist) || !existsSync(file)) {
        res.writeHead(404); res.end('missing'); return
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
      res.end(readFileSync(file))
    })
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, url: `http://127.0.0.1:${port}/` })
    })
  })
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('✗ dist/index.html 不存在，请先 npm run build:cap')
    process.exit(1)
  }
  const index = readFileSync(join(dist, 'index.html'), 'utf8')
  if (!index.includes('serviceWorker') && !index.includes('boot-fallback')) {
    console.warn('! index 未含 boot-fallback（仍继续跑浏览器冒烟）')
  }
  if (index.includes('registerSW.js')) {
    console.error('✗ capacitor 产物仍含 registerSW.js')
    process.exit(1)
  }

  let playwright
  try {
    playwright = await import('playwright')
  } catch {
    console.log('… 未安装 playwright，尝试临时安装')
    const { spawnSync } = await import('child_process')
    const r = spawnSync('npm', ['install', '-D', 'playwright@1.49.1', '--no-save'], {
      cwd: root, shell: true, stdio: 'inherit'
    })
    if (r.status !== 0) {
      console.error('✗ 无法安装 playwright')
      process.exit(1)
    }
    playwright = await import(pathToFileURL(join(root, 'node_modules/playwright/index.mjs')).href)
  }

  const { chromium } = playwright
  // 确保浏览器二进制存在
  try {
    const { spawnSync } = await import('child_process')
    spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: root, shell: true, stdio: 'inherit' })
  } catch (_) {}

  const { server, url } = await startStatic()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  let pass = true
  const fail = (m) => { console.log('  ✗', m); pass = false }
  const ok = (m) => console.log('  ✓', m)

  console.log('\n=== 浏览器冷启动冒烟 ===')
  console.log('URL', url)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

  // 最多等 8 秒出现首页特征
  try {
    await page.waitForFunction(() => {
      const t = document.body?.innerText || ''
      return t.includes('今日任务') || t.includes('章节学习') || t.includes('加载失败')
    }, { timeout: 8000 })
    ok('8 秒内出现首页或错误页（非空白）')
  } catch {
    fail('8 秒内仍无首页/错误页 — 判定为空白或卡死')
  }

  const text = await page.evaluate(() => document.body?.innerText || '')
  if (!text.trim()) fail('body 文本为空（空白页）')
  else ok(`页面有文本（${text.trim().slice(0, 40).replace(/\s+/g, ' ')}…）`)

  if (text.includes('今日任务') || text.includes('章节学习')) ok('首页主内容可见')
  else if (text.includes('加载失败')) fail('进入了加载失败页（需查数据）')
  else if (text.includes('方剂载入中')) fail('仍停在载入中')

  if (errors.length) {
    console.log('  ! 控制台错误:', errors.slice(0, 5).join(' | '))
    // 有 pageerror 则失败
    if (errors.some((e) => !/favicon|Download the Vue Devtools/i.test(e))) fail('存在页面 JS 错误')
  } else ok('无 pageerror')

  await browser.close()
  server.close()

  console.log(pass ? '\n======= 启动冒烟：通过 ======\n' : '\n======= 启动冒烟：失败（禁止交付）======\n')
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
