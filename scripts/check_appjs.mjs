import fs from 'fs'
const s = fs.readFileSync('dist/assets/app.js', 'utf8')
console.log('len', s.length)
console.log('import(', (s.match(/import\(/g) || []).length)
console.log('__vite', (s.match(/__vite/g) || []).length)
console.log('new URL', (s.match(/new URL/g) || []).length)
const idx = s.indexOf('createWebHashHistory')
console.log('router area', s.slice(Math.max(0, idx - 100), idx + 800))
