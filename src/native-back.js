// 系统返回键：不静态依赖 @capacitor/*，避免 IIFE 启动链挂起
const TAB_ROOTS = new Set(['/', '/study', '/quiz', '/profile'])

function tryCloseOverlay() {
  const overlays = [...document.querySelectorAll('.van-overlay')]
  const visible = overlays.find((el) => {
    const s = getComputedStyle(el)
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0
  })
  if (!visible) return false
  visible.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  return true
}

export function setupNativeBack(router) {
  const Cap = typeof window !== 'undefined' ? window.Capacitor : null
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return
  const App = Cap.Plugins && Cap.Plugins.App
  if (!App || typeof App.addListener !== 'function') return

  App.addListener('backButton', () => {
    if (tryCloseOverlay()) return

    const path = router.currentRoute.value.path
    if (!TAB_ROOTS.has(path)) {
      if (window.history.length > 1) router.back()
      else router.replace('/')
      return
    }

    if (window.history.length > 1 && path !== '/') {
      router.back()
      return
    }
    if (typeof App.exitApp === 'function') App.exitApp()
  })
}
