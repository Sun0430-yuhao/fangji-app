<template>
  <div v-if="loadError" class="err-page">
    <p>加载失败</p>
    <p>{{ errorDetail }}</p>
    <button type="button" @click="boot">重试</button>
  </div>

  <div v-else-if="!ready" class="loading-page">
    <span>方剂载入中…</span>
    <span>{{ buildStamp }}</span>
  </div>

  <template v-else>
    <router-view v-slot="{ Component }">
      <component :is="Component" :data="data" />
    </router-view>
  </template>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { loadDataSync, getBuildStamp } from './data'
import { useStudyStore } from './store'

const router = useRouter()
const store = useStudyStore()

const ready = ref(false)
const loadError = ref(false)
const errorDetail = ref('')
const data = ref(null)
const buildStamp = ref(getBuildStamp() || '')

function applyLoaded(loaded) {
  data.value = loaded
  buildStamp.value = loaded.build || buildStamp.value
  ready.value = true
}

async function boot() {
  loadError.value = false
  errorDetail.value = ''
  ready.value = false
  buildStamp.value = getBuildStamp() || buildStamp.value
  try {
    const sync = loadDataSync()
    if (sync?.flat?.length) {
      applyLoaded(sync)
      return
    }
    throw new Error('无数据')
  } catch (e) {
    loadError.value = true
    errorDetail.value = (e && e.message) ? String(e.message) : '未知错误'
  }
}

onMounted(() => {
  try { store.load() } catch (_) {}
  boot()
})

provide('appData', data)
</script>
