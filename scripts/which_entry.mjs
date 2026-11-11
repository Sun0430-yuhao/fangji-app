import fs from 'fs'
const a = fs.readFileSync('dist/assets/app.js', 'utf8')
const m = a.match(/__FANGJI_ENTRY__="([^"]+)"/)
console.log('entry', m && m[1])
console.log('bytes', a.length)
