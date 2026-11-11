window.__FANGJI_ENTRY__ = 'vant'
import { createApp, h } from 'vue'
import { useVant } from './vant'
const app = createApp({
  setup() {
    return () => h('div', { style: 'padding:24px' }, [
      h('h1', 'Vant step'),
      h('van-button', { type: 'primary' }, () => '按钮')
    ])
  }
})
useVant(app)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
