window.__FANGJI_ENTRY__ = 'order'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
import { router } from './router'

const app = createApp({
  setup() {
    return () => h('div', [
      h('div', { style: 'padding:8px' }, 'vant before router'),
      h('router-view')
    ])
  }
})
app.use(createPinia())
useVant(app)          // 先 Vant
app.use(router)       // 后路由
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
