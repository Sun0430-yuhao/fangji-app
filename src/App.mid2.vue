<template>
  <div v-if="!ready">loading {{ buildStamp }}</div>
  <div v-else>ready</div>
</template>
<script setup>
import { ref } from 'vue'
import { getBuildStamp } from './data'
import { useStudyStore } from './store'
const store = useStudyStore()
const ready = ref(false)
const buildStamp = ref(getBuildStamp() || String(store.streakDays))
</script>
