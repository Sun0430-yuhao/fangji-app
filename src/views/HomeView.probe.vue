<template>
  <div class="page">
    <div class="wrap">
      <div class="header">
        <div class="greet">{{ greeting }}，今日宜背方</div>
        <div class="sub">共 {{ data.total }} 方</div>
      </div>

      <!-- 逐个加回 Vant：先 search -->
      <van-search v-if="useSearch" v-model="kw" placeholder="搜方名" shape="round" />

      <div class="daily-task">
        <div>背诵 {{ store.studiedToday.studyCount }}/{{ store.dailyStudyGoal }}</div>
        <van-button v-if="useBtn" type="primary" round block @click="goStudy()">去背诵</van-button>
        <button v-else type="button" @click="goStudy()">去背诵</button>
      </div>

      <div class="grid">
        <div v-for="ch in data.chapters" :key="ch.id">{{ ch.name }} · {{ ch.formulas.length }}</div>
      </div>

      <van-dialog v-if="useDialog" v-model:show="showDlg" title="测试">
        <van-field v-if="useField" v-model="fld" label="题数" />
      </van-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const router = useRouter()
const store = useStudyStore()
const kw = ref('')
const showDlg = ref(false)
const fld = ref('')

// 通过 URL hash 开关：#/?probe=search|btn|dialog|field|all
const q = new URLSearchParams((location.hash.split('?')[1] || ''))
const mode = q.get('probe') || 'all'
const useSearch = mode === 'search' || mode === 'all'
const useBtn = mode === 'btn' || mode === 'all'
const useDialog = mode === 'dialog' || mode === 'all'
const useField = mode === 'field' || mode === 'all'

const greeting = computed(() => '你好')
function goStudy() { router.push({ path: '/study' }) }
</script>
