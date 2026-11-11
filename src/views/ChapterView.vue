<template>
  <div class="page no-tab">
    <van-nav-bar :title="chapter?.name || '章节'" left-arrow @click-left="$router.back()" />
    <div class="wrap" v-if="chapter">
      <div class="chap-actions pcard">
        <div class="ca-meta">本章 {{ chapter.formulas.length }} 方 · 已学 {{ learned }} · 还可学 {{ remain }}</div>
        <div class="ca-btns">
          <van-button type="primary" round size="small" @click="goStudy">背本章</van-button>
          <van-button round size="small" class="quiz-outline" @click="goStudyAll">背本章全部</van-button>
          <van-button round size="small" class="quiz-outline" @click="goQuiz">测本章</van-button>
        </div>
        <div class="ca-tip">只练这一章 ·「背本章」跟今日目标张数；「全部」含本章到期+未学</div>
      </div>

      <div v-for="(group, sec) in grouped" :key="sec">
        <div class="sec-title"><h2>{{ sec || '未分类' }}</h2><span class="more">{{ group.length }} 方</span></div>
        <div class="flist pcard">
          <div v-for="f in group" :key="f.id" class="frow" @click="$router.push(`/formula/${f.id}`)">
            <div class="fmain">
              <div class="fname">
                {{ f.name }}
                <van-icon v-if="store.favoriteSet.has(f.id)" name="like" color="#b03a2e" size="13" />
                <span v-if="store.learned[f.id]" class="learned-seal">已学</span>
              </div>
              <div class="fmeta">《{{ f.source || '佚名' }}》<template v-if="f.verse"> · {{ f.verse.split(/[，。]/)[0] }}…</template></div>
            </div>
            <van-icon name="arrow" class="farrow" />
          </div>
        </div>
      </div>
      <div class="tip">点击方剂看详情；或直接「背本章 / 测本章」</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const route = useRoute()
const router = useRouter()
const store = useStudyStore()

const chapter = computed(() => props.data.chapters.find(c => c.id === Number(route.params.id)))
const learned = computed(() => chapter.value ? chapter.value.formulas.filter(f => store.learned[f.id]).length : 0)
const remain = computed(() => chapter.value ? store.remainingNew(props.data.flat, chapter.value.id) : 0)

const grouped = computed(() => {
  const g = {}
  for (const f of chapter.value?.formulas || []) {
    const sec = f.section || ''
    if (!g[sec]) g[sec] = []
    g[sec].push(f)
  }
  return g
})

function goStudy() {
  router.push({ path: '/study', query: { chapter: chapter.value.id, size: store.sessionSize } })
}
function goStudyAll() {
  router.push({ path: '/study', query: { chapter: chapter.value.id, size: -1 } })
}
function goQuiz() {
  router.push({ path: '/quiz', query: { chapter: chapter.value.id, size: store.dailyQuizGoal } })
}
</script>

<style scoped>
.chap-actions { padding: 14px 16px; margin-bottom: 8px; }
.ca-meta { font-size: 13px; color: var(--ink-light); margin-bottom: 10px; letter-spacing: 1px; }
.ca-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.ca-btns .van-button { flex: 1; min-width: 30%; letter-spacing: 1px; }
.quiz-outline { border-color: var(--cinnabar); color: var(--cinnabar); }
.ca-tip { font-size: 11px; color: var(--ink-light); margin-top: 10px; text-align: center; }

.flist { overflow: hidden; }
.frow { display: flex; align-items: center; padding: 13px 14px; border-bottom: 1px solid var(--line); }
.frow:last-child { border-bottom: none; }
.fmain { flex: 1; min-width: 0; }
.fname { font-size: 16px; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; }
.learned-seal { font-size: 10px; color: var(--bamboo); border: 1px solid var(--bamboo); border-radius: 3px; padding: 1px 4px; }
.fmeta { font-size: 11px; color: var(--ink-light); margin-top: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.farrow { color: var(--ink-light); flex-shrink: 0; }
.tip { text-align: center; font-size: 12px; color: var(--ink-light); padding: 18px 0; }
</style>
