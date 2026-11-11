<template>
  <div class="page no-tab">
    <van-nav-bar title="我的收藏" left-arrow @click-left="$router.back()" />

    <div v-if="!list.length" class="empty">
      <van-empty description="暂无收藏，在方剂详情页点右上角 ♡ 收藏" />
      <div class="empty-go">
        <van-button type="primary" round @click="$router.push('/')">去学习 →</van-button>
      </div>
    </div>

    <div class="wrap" v-else>
      <div class="flist pcard">
        <div v-for="f in list" :key="f.id" class="frow" @click="$router.push(`/formula/${f.id}`)">
          <div class="fmain">
            <div class="fname">{{ f.name }}</div>
            <div class="fmeta">{{ f.chapterName }} · {{ f.section }} · 《{{ f.source || '佚名' }}》</div>
          </div>
          <van-icon name="arrow" class="farrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const store = useStudyStore()
const list = computed(() => store.favorites.map(id => props.data.byId[id]).filter(Boolean))
</script>

<style scoped>
.empty-go { text-align: center; margin-top: -20px; }
.flist { overflow: hidden; margin-top: 8px; }
.frow { display: flex; align-items: center; padding: 13px 14px; border-bottom: 1px solid var(--line); }
.frow:last-child { border-bottom: none; }
.fmain { flex: 1; min-width: 0; }
.fname { font-size: 16px; letter-spacing: 1px; }
.fmeta { font-size: 11px; color: var(--ink-light); margin-top: 5px; }
.farrow { color: var(--ink-light); }
</style>
