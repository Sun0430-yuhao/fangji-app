// 数据层：读 window.__FANGJI_DATA__，禁止大对象深拷贝（真机 WebView 会卡死在载入页）
import { NAME_FIXES, SOURCE_FIXES } from './corrections'

let cache = null

function applyCorrections(data) {
  const report = []
  for (const ch of data.chapters) {
    for (const f of ch.formulas) {
      for (const fix of NAME_FIXES) {
        if (f.name === fix.from) {
          f.name = fix.to
          report.push(`${fix.from} → ${fix.to}`)
        }
      }
      for (const fix of SOURCE_FIXES) {
        if (f.name === fix.name && fix.source) {
          f.source = fix.source
          report.push(`${f.name} 出处`)
        }
      }
    }
  }
  return report
}

function readEmbedded() {
  try {
    const raw = typeof window !== 'undefined' ? window.__FANGJI_DATA__ : null
    if (raw && Array.isArray(raw.chapters) && raw.chapters.length) return raw
  } catch (_) {}
  return null
}

function buildFlat(data) {
  const fixReport = applyCorrections(data)
  const flat = []
  const byId = {}
  for (const ch of data.chapters) {
    for (const f of ch.formulas || []) {
      // 直接引用方剂对象，不整包 clone
      f.chapterId = ch.id
      f.chapterName = ch.name
      if (f._py == null) f._py = ''
      if (f._pyInitials == null) f._pyInitials = ''
      if (f._pySpaced == null) f._pySpaced = ''
      if (f._herbPy == null) f._herbPy = ''
      flat.push(f)
      byId[f.id] = f
    }
  }
  return {
    chapters: data.chapters,
    flat,
    byId,
    total: flat.length,
    fixReport,
    pinyinReady: false,
    build: (typeof window !== 'undefined' && window.__FANGJI_BUILD__) || ''
  }
}

/** 同步装载（有 embed 时零 await） */
export function loadDataSync() {
  if (cache) return cache
  const data = readEmbedded()
  if (!data) return null
  cache = buildFlat(data)
  // 标记为原始数据：交给 Vue 时用 shallowRef，避免 221 方深代理卡死首屏
  cache.__raw = true
  return cache
}

export async function loadData() {
  if (cache) return cache

  const sync = loadDataSync()
  if (sync?.flat?.length) {
    // 拼音库绝不进入启动包（安卓 WebView 同步解析会卡死）
    return sync
  }

  // embed 缺失时才 fetch
  await new Promise((r) => setTimeout(r, 0))
  try {
    const url = new URL('data/formulas.json', document.baseURI || './').href
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    if (!data?.chapters?.length) throw new Error('数据格式不正确')
    cache = buildFlat(data)
    return cache
  } catch (e) {
    throw new Error('缺少方剂数据。请卸载后重装。' + (e?.message ? ' ' + e.message : ''))
  }
}

export function searchFormulas(flat, q) {
  const kw = (q || '').trim()
  if (!kw) return []
  const lower = kw.toLowerCase().replace(/\s+/g, '')
  const isAscii = /^[a-zA-Z\s]+$/.test(kw)
  return flat.filter((f) => {
    if (f.name.includes(kw)) return true
    if ((f.composition || []).some((c) => (c.herbs || '').includes(kw))) return true
    if ((f.function || '').includes(kw)) return true
    if ((f.indication || '').includes(kw)) return true
    if (isAscii) {
      if ((f._py || '').includes(lower)) return true
      if ((f._pyInitials || '').includes(lower)) return true
    }
    return false
  }).slice(0, 50)
}

export function dailyFormula(flat) {
  const pool = flat.filter((f) => f.verse && String(f.verse).trim().length > 4)
  if (!pool.length) return flat[0] || null
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now - start) / 86400000)
  return pool[day % pool.length]
}

export function getBuildStamp() {
  try { return window.__FANGJI_BUILD__ || '' } catch { return '' }
}
