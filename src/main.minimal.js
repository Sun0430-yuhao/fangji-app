window.__FANGJI_ENTRY__ = 'minimal'
import { createApp, h } from 'vue'
const app = createApp({
  setup() {
    return () => h('div', { style: 'padding:24px;font-family:serif' }, [
      h('h1', 'Vue OK'),
      h('p', window.__FANGJI_BUILD__ || 'no-stamp')
    ])
  }
})
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
