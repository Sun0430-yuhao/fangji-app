window.__FANGJI_ENTRY__ = 'appmid2'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useVant } from './vant'
import App from './App.mid2.vue'
import { router } from './router'

const app = createApp(App)
app.use(createPinia())
useVant(app)
app.use(router)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
