window.__FANGJI_ENTRY__ = 'vant-noroute'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
import { router } from './router'

// 有 Vant + 引入了 router 模块，但不渲染 router-view
const app = createApp({
  setup() {
    return () => h('div', { style: 'padding:24px' }, [
      h('h1', 'no router-view'),
      h('van-button', { type: 'primary' }, () => 'btn')
    ])
  }
})
app.use(createPinia())
app.use(router)
useVant(app)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
