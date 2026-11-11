<template>
  <div v-if="!ready" class="loading-page">
    <span>方剂载入中…</span>
    <span>{{ buildStamp }}</span>
  </div>
  <router-view v-else v-slot="{ Component }">
    <component :is="Component" :data="data" />
  </router-view>
</template>
<script setup>
import { ref, onMounted, provide } from 'vue'
import { loadDataSync, getBuildStamp } from './data'
import { useStudyStore } from './store'

const store = useStudyStore()
const ready = ref(false)
const data = ref(null)
const buildStamp = ref(getBuildStamp() || '')
provide('appData', data)

onMounted(() => {
  try { store.load() } catch (_) {}
  try {
    const sync = loadDataSync()
    if (sync?.flat?.length) {
      data.value = sync
      ready.value = true
    }
  } catch (_) {}
})
</script>
