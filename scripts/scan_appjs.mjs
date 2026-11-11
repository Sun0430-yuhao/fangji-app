import fs from 'fs'
const s = fs.readFileSync('dist/assets/app.js', 'utf8')
let idx = 0
let n = 0
while ((idx = s.indexOf('assets/app.js', idx)) !== -1 && n < 8) {
  console.log('---', n, 'at', idx)
  console.log(s.slice(Math.max(0, idx - 180), idx + 120))
  idx += 12
  n++
}
const mount = s.lastIndexOf('mount(')
console.log('\nmount area:\n', s.slice(mount - 200, mount + 80))
