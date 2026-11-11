/** 生成非 module 的 embed.js，供 WebView 在 Vue 启动前同步拿到数据 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public/data/formulas.json')
const out = path.join(root, 'public/data/embed.js')
const raw = fs.readFileSync(src, 'utf8')
JSON.parse(raw) // 校验
const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const js = `/*! fangji embed ${stamp} */\nwindow.__FANGJI_DATA__=${raw};\nwindow.__FANGJI_BUILD__=${JSON.stringify(stamp)};\n`
fs.writeFileSync(out, js, 'utf8')
console.log('EMBED_OK', out, Buffer.byteLength(js), 'bytes')
