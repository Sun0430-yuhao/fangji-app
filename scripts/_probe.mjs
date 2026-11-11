import fs from 'fs'
const a = fs.readFileSync('dist/assets/app.js', 'utf8')
console.log('len', a.length)
console.log('PinyinPro', a.includes('PinyinPro'))
console.log('pinyin-pro', a.includes('pinyin-pro'))
console.log('ENTRY', a.includes('__FANGJI_ENTRY__'))
console.log('MOUNTED', a.includes('__FANGJI_MOUNTED__'))
console.log('head\n', a.slice(0, 400))
console.log('tail\n', a.slice(-600))
// look for long synchronous loops over large arrays at top-levelish
const hits = []
for (const re of [/for\([^)]*length[^)]*\)/g, /while\(/g, /localStorage/g, /requestAnimationFrame/g]) {
  const m = a.match(re)
  if (m) hits.push([re.source, m.length])
}
console.log('hits', hits)
