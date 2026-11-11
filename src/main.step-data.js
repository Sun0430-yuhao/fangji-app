window.__FANGJI_ENTRY__ = 'data'
import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
import { router } from './router'
import { loadDataSync, getBuildStamp } from './data'
import { useStudyStore } from './store'

const app = createApp({
  setup() {
    const store = useStudyStore()
    store.load()
    const data = loadDataSync()
    return () => h('div', { style: 'padding:24px;font-family:serif' }, [
      h('h1', 'Data step'),
      h('p', `total=${data?.total || 0}`),
      h('p', getBuildStamp() || ''),
      h('p', `fav=${store.favorites.length}`),
      h('router-view')
    ])
  }
})
app.use(createPinia())
app.use(router)
useVant(app)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
