import fs from 'fs'

const html = fs.readFileSync('dist/index.html', 'utf8')
const emb = fs.readFileSync('dist/data/embed.js', 'utf8')
const appPath = 'dist/assets/app.js'
if (!fs.existsSync(appPath)) {
  console.log('FAIL missing app.js')
  process.exit(1)
}
const app = fs.readFileSync(appPath, 'utf8')
const css = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.css'))

const checks = {
  classicDefer: /src="\.\/assets\/app\.js" defer/.test(html),
  noModule: !html.includes('type="module"'),
  noCrossorigin: !/crossorigin/.test(html),
  noPinyin: !/pinyin/i.test(app) || !app.includes('toneType'),
  smallEnough: app.length < 450000,
  hasMount: app.includes('__FANGJI_MOUNTED__'),
  hasEntryFlag: app.includes('__FANGJI_ENTRY__'),
  embedOk: /__FANGJI_DATA__/.test(emb),
  hasCss: css.length >= 1
}

const stamp = (emb.match(/__FANGJI_BUILD__="([^"]+)"/) || [])[1]
let fail = 0
for (const [k, v] of Object.entries(checks)) {
  if (!v) fail++
  console.log(`${v ? 'OK' : 'FAIL'} ${k}`)
}
console.log('stamp', stamp)
console.log('appBytes', app.length)
console.log('css', css)
process.exit(fail ? 1 : 0)
