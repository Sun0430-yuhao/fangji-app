window.__FANGJI_ENTRY__ = 'vant-importrouter'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
// 只 import，不 app.use(router)
import { router } from './router'

const app = createApp({
  setup() {
    return () => h('div', { style: 'padding:24px' }, [
      h('h1', 'import router only'),
      h('van-button', { type: 'primary' }, () => 'btn'),
      h('p', String(!!router))
    ])
  }
})
app.use(createPinia())
useVant(app)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
