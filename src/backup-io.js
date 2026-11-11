/**
 * 备份导出：优先系统分享（安卓 WebView 上 a.download 经常无效），
 * 其次剪贴板，最后才尝试浏览器下载链接。
 */
export async function exportProgressText(text, filename) {
  const file = new File([text], filename, { type: 'application/json' })

  // 1) Web Share（含文件）— Capacitor/Chrome Android 较可靠
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const payload = navigator.canShare?.({ files: [file] })
        ? { files: [file], title: filename, text: '方剂学学习进度备份' }
        : { title: filename, text: text.slice(0, 2000) }
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload)
        return { ok: true, method: 'share' }
      }
    }
  } catch (e) {
    // 用户取消分享不算失败
    if (e?.name === 'AbortError') return { ok: true, method: 'share-cancel' }
  }

  // 2) 剪贴板
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return { ok: true, method: 'clipboard' }
    }
  } catch (_) { /* fall through */ }

  // 3) 浏览器下载（桌面 / 部分 WebView）
  try {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    return { ok: true, method: 'download' }
  } catch (_) {
    return { ok: false, method: 'none' }
  }
}

export async function readBackupFile(file) {
  return file.text()
}
