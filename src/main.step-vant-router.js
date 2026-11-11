window.__FANGJI_ENTRY__ = 'vant-router'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
import { router } from './router'

// 有 Vant 注册 + 真实路由页面（含 HomeView）
const app = createApp({
  setup() {
    return () => h('div', [
      h('div', { style: 'padding:8px' }, 'vant+router'),
      h('router-view')
    ])
  }
})
app.use(createPinia())
app.use(router)
useVant(app)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
