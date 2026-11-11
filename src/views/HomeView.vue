<template>
  <div class="page">
    <div class="wrap">
      <!-- 问候 -->
      <div class="header">
        <div>
          <div class="greet">{{ greeting }}，今日宜背方</div>
          <div class="sub">已连续学习 {{ store.streakDays }} 天 · 共 {{ data.total }} 方</div>
        </div>
      </div>

      <!-- 搜索 -->
      <van-search v-model="kw" placeholder="搜方名/药物/拼音，如：麻黄 或 mht" shape="round" />
      <div v-if="kw.trim()" class="search-results pcard">
        <template v-if="results.length">
          <div v-for="f in results" :key="f.id" class="srow" @click="goFormula(f.id)">
            <span class="sname">{{ f.name }}</span>
            <span class="smeta">{{ f.chapterName }} · {{ f.section }}</span>
            <van-icon name="arrow" class="sarrow" />
          </div>
        </template>
        <div v-else class="empty-hint">没有找到相关方剂，换个关键词试试</div>
      </div>

      <template v-else>
        <!-- 今日任务：目标自定，按完成量打勾 -->
        <div class="daily-task">
          <span class="seal task-tag">今日任务</span>

          <!-- 今日目标完成：优先庆祝「今天」而不是「全书」 -->
          <template v-if="goalsDone">
            <div class="task-done">
              <div class="done-mark">✓</div>
              <div class="done-text">今日目标已完成</div>
              <div class="check-list">
                <div class="ck ok">✓ 背诵 {{ store.studiedToday.studyCount }}/{{ store.dailyStudyGoal }}</div>
                <div class="ck ok">✓ 刷题 {{ store.studiedToday.quizCount }}/{{ store.dailyQuizGoal }}</div>
                <div class="ck" :class="dueCount === 0 ? 'ok' : 'warn'">
                  {{ dueCount === 0 ? '✓ 到期复习已清' : `· 仍有 ${dueCount} 张待复习（可加练）` }}
                </div>
              </div>
              <div class="done-sub">明日预计 {{ tomorrowCount }} 张待复习 · 想学还能继续</div>
            </div>
            <van-button type="primary" round block size="large" class="task-btn" @click="goStudy()">再背一轮</van-button>
            <van-button round block size="large" class="task-btn quiz-btn" style="margin-top:10px" @click="goQuiz()">再刷一组</van-button>
          </template>

          <!-- 还有任务未完成 -->
          <template v-else-if="!allEmpty">
            <div class="goal-block">
              <div class="goal-head">
                <span>背诵</span>
                <b>{{ store.studiedToday.studyCount }} / {{ store.dailyStudyGoal }}</b>
              </div>
              <div class="gbar"><i :style="{ width: studyPct + '%' }"></i></div>
              <div class="size-row">
                <button
                  v-for="opt in studyOpts" :key="'s'+opt"
                  class="size-chip" :class="{ on: store.dailyStudyGoal === opt }"
                  @click="store.setDailyStudyGoal(opt)"
                >{{ opt }}</button>
                <button class="size-chip" :class="{ on: !studyOpts.includes(store.dailyStudyGoal) }" @click="editStudyGoal">自定义</button>
              </div>
            </div>

            <div class="goal-block">
              <div class="goal-head">
                <span>刷题</span>
                <b>{{ store.studiedToday.quizCount }} / {{ store.dailyQuizGoal }}</b>
              </div>
              <div class="gbar"><i :style="{ width: quizPct + '%' }"></i></div>
              <div class="size-row">
                <button
                  v-for="opt in quizOpts" :key="'q'+opt"
                  class="size-chip" :class="{ on: store.dailyQuizGoal === opt }"
                  @click="store.setDailyQuizGoal(opt)"
                >{{ opt }}</button>
                <button class="size-chip" :class="{ on: !quizOpts.includes(store.dailyQuizGoal) }" @click="editQuizGoal">自定义</button>
              </div>
            </div>

            <div class="task-nums mini">
              <div class="tnum"><b>{{ dueCount }}</b><span>待复习</span></div>
              <div class="tdiv"></div>
              <div class="tnum"><b>{{ newCount }}</b><span>还可学</span></div>
            </div>

            <van-button type="primary" round block size="large" class="task-btn" @click="goStudy()">
              {{ dueCount > 0 ? `先清复习（${dueCount}）` : (studyRemain > 0 ? `继续背诵（还差 ${studyRemain}）` : '再背一轮') }}
            </van-button>
            <van-button round block size="large" class="task-btn quiz-btn" style="margin-top:10px" @click="goQuiz()">
              {{ quizRemain > 0 ? `去刷题（还差 ${quizRemain}）` : '再刷一组' }}
            </van-button>
            <div class="task-tip">完成今日背诵+刷题即打勾 · 到期复习建议当天清完</div>
          </template>

          <!-- 库空但今日目标未满 -->
          <template v-else>
            <div class="task-done">
              <div class="done-mark soft">○</div>
              <div class="done-text">暂无待学卡片</div>
              <div class="check-list">
                <div class="ck" :class="studyRemain <= 0 ? 'ok' : 'warn'">
                  {{ studyRemain <= 0 ? '✓' : '·' }} 背诵 {{ store.studiedToday.studyCount }}/{{ store.dailyStudyGoal }}
                </div>
                <div class="ck" :class="quizRemain <= 0 ? 'ok' : 'warn'">
                  {{ quizRemain <= 0 ? '✓' : '·' }} 刷题 {{ store.studiedToday.quizCount }}/{{ store.dailyQuizGoal }}
                </div>
              </div>
              <div class="done-sub">明日预计 {{ tomorrowCount }} 张待复习 · 也可先刷题凑今日目标</div>
            </div>
            <van-button type="primary" round block size="large" class="task-btn" @click="goQuiz()">
              {{ quizRemain > 0 ? `去刷题（还差 ${quizRemain}）` : '再刷一组' }}
            </van-button>
            <van-button round block size="large" class="task-btn quiz-btn" style="margin-top:10px" @click="goStudy()">再看复习卡</van-button>
          </template>
        </div>

        <!-- 每日歌诀 -->
        <div v-if="daily" class="daily pcard" @click="goFormula(daily.id)">
          <span class="seal tag">每日歌诀</span>
          <div class="verse">{{ versePreview }}</div>
          <div class="from">
            <span>—— 《{{ daily.name }}》 · {{ daily.chapterName }}</span>
            <span class="go">查看此方 →</span>
          </div>
        </div>

        <!-- 章节进度 -->
        <div class="sec-title"><h2>章节学习</h2><span class="more">{{ store.learnedCount }}/{{ data.total }} 方</span></div>
        <div class="grid">
          <div v-for="ch in data.chapters" :key="ch.id" class="chap pcard" @click="$router.push(`/chapter/${ch.id}`)">
            <div class="name">{{ ch.name }}<span class="num">{{ ch.formulas.length }} 方</span></div>
            <div class="bar"><i :style="{ width: chapterPct(ch) + '%' }"></i></div>
            <div class="pct"><span>已学 {{ chapterLearned(ch) }}/{{ ch.formulas.length }}</span><b>{{ chapterPct(ch) }}%</b></div>
          </div>
        </div>
      </template>
    </div>

    <van-dialog
      v-model:show="goalDialog.show"
      :title="goalDialog.title"
      show-cancel-button
      confirm-button-text="确定"
      confirm-button-color="#b03a2e"
      :before-close="beforeGoalClose"
    >
      <div class="goal-dialog-body">
        <van-field
          v-model="goalDialog.input"
          type="digit"
          :label="goalDialog.label"
          :placeholder="`1–${goalDialog.max}`"
          maxlength="3"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { searchFormulas, dailyFormula } from '../data'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const router = useRouter()
const store = useStudyStore()
store.ensureToday()

const kw = ref('')
const results = computed(() => searchFormulas(props.data.flat, kw.value))
const goalDialog = reactive({
  show: false,
  title: '',
  label: '',
  input: '',
  max: 100,
  apply: null
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早安'
  if (h < 18) return '午安'
  return '晚上好'
})

const dueCount = computed(() => store.dueCount)
const newCount = computed(() => store.remainingNew(props.data.flat))
const tomorrowCount = computed(() => store.tomorrowDue())
const allEmpty = computed(() => dueCount.value === 0 && newCount.value === 0)
const goalsDone = computed(() => store.todayGoalsDone())
const studyRemain = computed(() => store.studyRemainToday())
const quizRemain = computed(() => store.quizRemainToday())
const studyPct = computed(() => Math.min(100, Math.round((store.studiedToday.studyCount / store.dailyStudyGoal) * 100)))
const quizPct = computed(() => Math.min(100, Math.round((store.studiedToday.quizCount / store.dailyQuizGoal) * 100)))

const studyOpts = [10, 20, 30, 50]
const quizOpts = [10, 20, 30, 50]

const daily = computed(() => dailyFormula(props.data.flat))
const versePreview = computed(() => {
  const v = daily.value?.verse
  if (!v) return '（此方暂无歌诀，点击查看详情）'
  const parts = v.split(/[，。]/).filter(Boolean)
  return parts.slice(0, 2).join('，') + (parts.length > 2 ? '……' : '')
})

function chapterLearned(ch) {
  return ch.formulas.filter(f => store.learned[f.id]).length
}
function chapterPct(ch) {
  return ch.formulas.length ? Math.round((chapterLearned(ch) / ch.formulas.length) * 100) : 0
}

function openGoalDialog({ title, label, current, max, apply }) {
  goalDialog.title = title
  goalDialog.label = label
  goalDialog.input = String(current)
  goalDialog.max = max
  goalDialog.apply = apply
  goalDialog.show = true
}
function beforeGoalClose(action) {
  if (action !== 'confirm') return true
  const n = parseInt(String(goalDialog.input).trim(), 10)
  if (!Number.isFinite(n) || n < 1 || n > goalDialog.max) {
    showToast(`请输入 1–${goalDialog.max} 的整数`)
    return false
  }
  goalDialog.apply?.(n)
  return true
}
function editStudyGoal() {
  openGoalDialog({
    title: '自定义背诵目标',
    label: '今日背多少张',
    current: store.dailyStudyGoal,
    max: 500,
    apply: (n) => store.setDailyStudyGoal(n)
  })
}
function editQuizGoal() {
  openGoalDialog({
    title: '自定义刷题目标',
    label: '今日刷多少题',
    current: store.dailyQuizGoal,
    max: 200,
    apply: (n) => store.setDailyQuizGoal(n)
  })
}

function goFormula(id) { router.push(`/formula/${id}`) }
function goStudy(chapterId) {
  const q = { size: store.sessionSize }
  if (chapterId != null) q.chapter = chapterId
  router.push({ path: '/study', query: q })
}
function goQuiz(chapterId) {
  const q = { size: store.dailyQuizGoal }
  if (chapterId != null) q.chapter = chapterId
  router.push({ path: '/quiz', query: q })
}
</script>

<style scoped>
.header { padding: 10px 4px 4px; }
.greet { font-size: 23px; font-weight: 700; letter-spacing: 2px; }
.sub { font-size: 12px; color: var(--ink-light); margin-top: 6px; letter-spacing: 1px; }

.daily-task {
  margin-top: 14px;
  background: linear-gradient(135deg, #fbf7ec 0%, #f3ead4 100%);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px;
  position: relative;
  box-shadow: 0 3px 10px rgba(90, 70, 40, 0.08);
}
.task-tag { position: absolute; top: -9px; left: 16px; }

.goal-block { margin: 10px 0 14px; }
.goal-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; letter-spacing: 1px; }
.goal-head b { color: var(--cinnabar); font-size: 16px; }
.gbar { height: 6px; background: var(--card-dark); border-radius: 3px; overflow: hidden; margin: 8px 0 10px; }
.gbar i { display: block; height: 100%; background: linear-gradient(90deg, var(--cinnabar), #d0584a); border-radius: 3px; }

.task-nums { display: flex; justify-content: center; align-items: center; gap: 28px; margin: 8px 0 16px; }
.task-nums.mini { margin: 4px 0 14px; gap: 22px; }
.tnum { text-align: center; }
.tnum b { font-size: 22px; color: var(--cinnabar); display: block; }
.task-nums.mini .tnum b { font-size: 18px; }
.tnum span { font-size: 12px; color: var(--ink-light); letter-spacing: 2px; }
.tdiv { width: 1px; height: 28px; background: var(--line); }

.size-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
.size-chip {
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
  border-radius: 16px; padding: 4px 12px; font-size: 13px; font-family: inherit; letter-spacing: 1px;
}
.size-chip.on { background: var(--cinnabar); border-color: var(--cinnabar); color: #f8ecd9; }
.task-btn { letter-spacing: 2px; font-size: 15px; height: 44px; }
.task-tip { text-align: center; font-size: 11px; color: var(--ink-light); margin-top: 10px; letter-spacing: 1px; }
.quiz-btn {
  border: 1.5px solid var(--cinnabar) !important;
  color: var(--cinnabar) !important;
  background: transparent !important;
}
.quiz-btn:active { background: rgba(176, 58, 46, 0.08) !important; }
.task-done { text-align: center; padding: 6px 0 16px; }
.done-mark { width: 46px; height: 46px; border-radius: 50%; background: var(--bamboo); color: #f8ecd9;
  font-size: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
.done-mark.soft { background: var(--card-dark); color: var(--ink-light); }
.done-text { font-size: 17px; letter-spacing: 2px; }
.done-sub { font-size: 12px; color: var(--ink-light); margin-top: 6px; line-height: 1.6; }
.check-list { margin: 12px auto 0; max-width: 240px; text-align: left; }
.ck { font-size: 13px; letter-spacing: 1px; line-height: 1.9; color: var(--ink-light); }
.ck.ok { color: var(--bamboo); }
.ck.warn { color: var(--cinnabar); }

.daily { margin-top: 16px; padding: 18px; position: relative; }
.daily .tag { position: absolute; top: -9px; left: 16px; }
.daily .verse { font-size: 16px; line-height: 2.0; letter-spacing: 2px; margin-top: 6px; }
.daily .from { margin-top: 10px; font-size: 12px; color: var(--ink-light); display: flex; justify-content: space-between; }
.daily .from .go { color: var(--cinnabar); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-bottom: 12px; }
.chap { padding: 14px; }
.chap .name { font-size: 15px; font-weight: 600; letter-spacing: 2px; display: flex; justify-content: space-between; align-items: center; }
.chap .name .num { font-size: 11px; color: var(--ink-light); font-weight: 400; letter-spacing: 0; }
.chap .bar { margin-top: 10px; }
.chap .pct { margin-top: 7px; font-size: 11px; color: var(--ink-light); display: flex; justify-content: space-between; }
.chap .pct b { color: var(--cinnabar); font-weight: 600; }

.search-results { margin: 0 10px; overflow: hidden; }
.srow { display: flex; align-items: baseline; gap: 10px; padding: 13px 14px; border-bottom: 1px solid var(--line); }
.srow:last-child { border-bottom: none; }
.sname { font-size: 15px; letter-spacing: 1px; }
.smeta { font-size: 11px; color: var(--ink-light); }
.sarrow { margin-left: auto; color: var(--ink-light); }
.empty-hint { padding: 20px; text-align: center; color: var(--ink-light); font-size: 13px; }
.goal-dialog-body { padding: 12px 16px 4px; }
</style>
