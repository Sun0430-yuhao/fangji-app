import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
import './styles.css' // 必须在 Vant 样式之后，才能盖住默认蓝
import App from './App.vue'
import { router } from './router'
import { guardServiceWorker } from './sw-guard'

window.__FANGJI_ENTRY__ = 'main'
guardServiceWorker()

try {
  const app = createApp(App)
  app.config.errorHandler = (err, _i, info) => console.error('[fangji]', info, err)
  app.use(createPinia())
  useVant(app)
  app.use(router)
  app.mount('#app')
  window.__FANGJI_MOUNTED__ = true
} catch (e) {
  const el = document.getElementById('app')
  if (el) {
    el.innerHTML =
      '<div style="padding:24px;text-align:center;color:#b03a2e;line-height:1.8">' +
      '<p>启动失败</p><p style="font-size:13px">' + String(e && e.message ? e.message : e) +
      '</p><button onclick="location.reload()">重试</button></div>'
  }
}
