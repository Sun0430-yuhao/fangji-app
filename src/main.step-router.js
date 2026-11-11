window.__FANGJI_ENTRY__ = 'router'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
const app = createApp({
  setup() {
    return () => h('div', { style: 'padding:24px' }, [
      h('h1', 'Router step'),
      h('router-view')
    ])
  }
})
app.use(createPinia())
app.use(router)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
