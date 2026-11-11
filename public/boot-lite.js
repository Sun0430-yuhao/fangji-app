/*! 无 Vue 时的应急首页：保证 data-ok 后一定能进 */
(function () {
  var booted = false
  function $(id) { return document.getElementById(id) }

  function goLite() {
    if (booted) return
    if (!window.__FANGJI_DATA__ || !window.__FANGJI_DATA__.chapters) return
    // Vue 已挂载则不要抢
    if ($('app') && !$('boot-fallback') && document.querySelector('.van-tabbar, .page, .loading-page, .err-page')) {
      booted = true
      return
    }
    var root = $('app')
    if (!root) return
    booted = true

    var chapters = window.__FANGJI_DATA__.chapters
    var total = 0
    chapters.forEach(function (c) { total += (c.formulas && c.formulas.length) || 0 })

    var html = ''
    html += '<div style="padding:16px 16px 40px;font-family:serif;color:#2b2620;background:#f4eee1;min-height:100vh;box-sizing:border-box">'
    html += '<div style="font-size:22px;letter-spacing:2px;font-weight:700;margin:8px 0 4px">方剂学</div>'
    html += '<div style="font-size:12px;color:#7d7466;margin-bottom:16px">应急模式 · 共 ' + total + ' 方 · ' + (window.__FANGJI_BUILD__ || '') + '</div>'
    html += '<div style="font-size:13px;color:#7d7466;margin-bottom:12px">完整界面未启动，已用轻量模式打开。可先浏览章节。</div>'

    chapters.forEach(function (ch) {
      html += '<div style="background:#faf6ea;border:1px solid #ddd2ba;border-radius:12px;padding:12px 14px;margin-bottom:10px">'
      html += '<div style="font-size:16px;letter-spacing:1px">' + (ch.name || '章节') +
        '<span style="float:right;font-size:12px;color:#7d7466">' + ((ch.formulas && ch.formulas.length) || 0) + ' 方</span></div>'
      html += '<div style="margin-top:8px">'
      ;(ch.formulas || []).slice(0, 8).forEach(function (f) {
        html += '<div style="font-size:14px;padding:6px 0;border-top:1px dashed #eee3c8">' + (f.name || '') + '</div>'
      })
      if ((ch.formulas || []).length > 8) {
        html += '<div style="font-size:12px;color:#7d7466;padding-top:6px">…还有 ' + (ch.formulas.length - 8) + ' 方</div>'
      }
      html += '</div></div>'
    })
    html += '<button type="button" onclick="location.reload()" style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:24px;background:#b03a2e;color:#f8ecd9;font-size:15px;letter-spacing:2px">刷新重试完整版</button>'
    html += '</div>'
    root.innerHTML = html
  }

  // 2 秒后若仍停在载入壳，启用应急首页（不依赖 app.js 是否解析完）
  setTimeout(function () {
    if ($('boot-fallback')) goLite()
  }, 2000)

  window.__FANGJI_LITE__ = goLite
})()
