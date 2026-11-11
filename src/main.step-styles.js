window.__FANGJI_ENTRY__ = 'styles'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import './styles.css'
import { useVant } from './vant'
import { router } from './router'

const app = createApp({
  setup() {
    return () => h('div', [
      h('div', { style: 'padding:8px' }, 'with styles.css'),
      h('router-view')
    ])
  }
})
app.use(createPinia())
useVant(app)
app.use(router)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
