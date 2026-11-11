<template>
  <div v-if="loadError" class="err-page">
    <div class="err-card pcard">
      <div class="err-seal seal">加载失败</div>
      <p class="err-msg">方剂数据没有加载成功</p>
      <p class="err-sub">{{ errorDetail }}</p>
      <van-button type="primary" round block @click="boot">重试</van-button>
    </div>
  </div>

  <div v-else-if="!ready" class="loading-page">
    <div class="loading-brand">
      <div class="loading-icon" aria-hidden="true"></div>
      <span class="loading-text">方剂载入中…</span>
    </div>
  </div>

  <template v-else>
    <van-notice-bar
      v-if="store.resetNotice"
      left-icon="warning-o"
      text="学习记录已重置（原记录损坏），可正常继续学习。"
      @close="store.resetNotice = false"
    />
    <router-view v-slot="{ Component }">
      <component :is="Component" :data="data" />
    </router-view>
    <van-tabbar v-if="showTab" :model-value="activeTab" @change="onTab" fixed placeholder>
      <van-tabbar-item icon="orders-o">学习</van-tabbar-item>
      <van-tabbar-item icon="description">背诵</van-tabbar-item>
      <van-tabbar-item icon="edit">刷题</van-tabbar-item>
      <van-tabbar-item icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </template>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { loadData, loadDataSync } from './data'
import { useStudyStore } from './store'
import { setupNativeBack } from './native-back'
import { getSession, syncAfterAuth, syncAvailable } from './sync'
import { promptProgressConflict } from './sync-ui'

const route = useRoute()
const router = useRouter()
const store = useStudyStore()

const ready = ref(false)
const loadError = ref(false)
const errorDetail = ref('')
// 方剂大数据必须 shallow：深代理会在首页渲染时卡死主线程（真机表现为一直「载入中」）
const data = shallowRef(null)

const showTab = computed(() => route.meta.tab !== undefined)
const activeTab = computed(() => route.meta.tab ?? 0)
const tabPaths = ['/', '/study', '/quiz', '/profile']
function onTab(i) { router.push(tabPaths[i]) }

function applyLoaded(loaded) {
  data.value = loaded
  ready.value = true
}

async function boot() {
  loadError.value = false
  errorDetail.value = ''
  ready.value = false

  // 1) 同步路径：有 embed 立刻进首页（不再 JSON 深拷贝）
  try {
    const sync = loadDataSync()
    if (sync?.flat?.length) {
      applyLoaded(sync)
      return
    }
  } catch (e) {
    // 继续走异步
  }

  // 2) 异步兜底 + 硬超时
  const watchdog = setTimeout(() => {
    if (!ready.value) {
      loadError.value = true
      errorDetail.value = '加载超时。请卸载旧版后重装本包。'
    }
  }, 4000)

  try {
    const loaded = await loadData()
    if (!loaded?.flat?.length) throw new Error('方剂列表为空')
    applyLoaded(loaded)
  } catch (e) {
    loadError.value = true
    errorDetail.value = (e && e.message) ? String(e.message) : '未知错误'
  } finally {
    clearTimeout(watchdog)
  }
}

async function restoreCloudSession() {
  if (!syncAvailable()) return
  try {
    const session = await getSession()
    if (!session) return
    const r = await syncAfterAuth(store, { promptConflict: promptProgressConflict })
    if (r.action === 'downloaded' || r.action === 'aligned-cloud') {
      showToast('已同步云端进度')
    }
  } catch (e) {
    console.warn('[fangji-sync] boot sync skipped', e)
  }
}

onMounted(() => {
  try { store.load() } catch (_) {}
  boot()
  try { setupNativeBack(router) } catch (_) {}
  restoreCloudSession()
})

provide('appData', data)
</script>

<style scoped>
.err-page, .loading-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}
.loading-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.loading-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(145deg, #e8dcc0, #d4c4a0);
}
.err-card { padding: 28px 24px; text-align: center; max-width: 320px; width: 100%; }
.err-seal { margin-bottom: 14px; }
.err-msg { font-size: 18px; letter-spacing: 2px; margin: 0 0 8px; }
.err-sub { font-size: 13px; color: var(--ink-light); margin: 0 0 8px; line-height: 1.8; }
.loading-text { color: var(--ink-light); letter-spacing: 3px; font-size: 15px; }
</style>
