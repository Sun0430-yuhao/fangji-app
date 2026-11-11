window.__FANGJI_ENTRY__ = 'app-nboot'
import { createApp, ref, computed, provide, h } from 'vue'
import { createPinia } from 'pinia'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { useVant } from './vant'
import { router } from './router'
import { loadDataSync, getBuildStamp } from './data'
import { useStudyStore } from './store'

// 复刻 App 壳，但 setup 里同步 ready，避开 onMounted/boot 疑点
const Root = {
  setup() {
    const route = useRoute()
    const routerNav = useRouter()
    const store = useStudyStore()
    try { store.load() } catch (_) {}
    const data = ref(null)
    try {
      data.value = loadDataSync()
    } catch (_) {}
    provide('appData', data)
    const showTab = computed(() => route.meta.tab !== undefined)
    const activeTab = computed(() => route.meta.tab ?? 0)
    const tabPaths = ['/', '/study', '/quiz', '/profile']
    return () => h('div', [
      h(RouterView),
      showTab.value
        ? h('van-tabbar', {
            modelValue: activeTab.value,
            fixed: true,
            placeholder: true,
            onChange: (i) => routerNav.push(tabPaths[i])
          }, () => [
            h('van-tabbar-item', { icon: 'orders-o' }, () => '学习'),
            h('van-tabbar-item', { icon: 'description' }, () => '背诵'),
            h('van-tabbar-item', { icon: 'edit' }, () => '刷题'),
            h('van-tabbar-item', { icon: 'user-o' }, () => '我的')
          ])
        : null,
      h('div', { style: 'position:fixed;bottom:0;right:0;font-size:10px;opacity:.5' }, getBuildStamp() || '')
    ])
  }
}

const app = createApp(Root)
app.use(createPinia())
app.use(router)
useVant(app)
app.mount('#app')
window.__FANGJI_MOUNTED__ = true
