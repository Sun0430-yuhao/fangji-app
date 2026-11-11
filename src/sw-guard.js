/**
 * 仅在 Capacitor 原生壳清理残留 Service Worker。
 * 浏览器 PWA 必须保留 SW，否则离线/「添加到主屏幕」会失效。
 */
export function guardServiceWorker() {
  if (typeof window === 'undefined') return
  const Cap = window.Capacitor
  const native = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform())
  if (!native) return
  if (!('serviceWorker' in navigator)) return
  try {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => { try { r.unregister() } catch (_) {} })
    }).catch(() => {})
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => {
        keys.forEach((k) => { try { caches.delete(k) } catch (_) {} })
      }).catch(() => {})
    }
  } catch (_) {}
}
