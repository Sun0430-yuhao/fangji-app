<template>
  <div class="page quiz">
    <van-nav-bar :title="scopeTitle">
      <template #right>
        <span class="nav-r size-tap" @click="editQuizSize">{{ quizSize }}题</span>
        <span class="nav-r scope-tap" @click="showScope = true">{{ scopeLabel }} ▾</span>
      </template>
    </van-nav-bar>

    <van-action-sheet
      v-model:show="showScope"
      :actions="scopeActions"
      cancel-text="取消"
      close-on-click-action
      @select="onSelectScope"
    />

    <!-- 答题中 -->
    <div class="wrap" v-if="current && !finished">
      <div class="prog">
        <div class="txt"><span>第 <b>{{ index + 1 }}</b> 题 / 共 {{ questions.length }} 题</span><span>正确 {{ rightCount }} · 错误 {{ wrongCount }}</span></div>
        <div class="bar"><i :style="{ width: (index / questions.length * 100) + '%' }"></i></div>
      </div>

      <div class="qcard pcard">
        <div class="type"><span class="seal">单选</span><span class="seal bamboo">{{ current.typeLabel }}</span></div>
        <div class="q">{{ current.q }}</div>
      </div>

      <div class="opts">
        <div
          v-for="(opt, i) in current.options" :key="i"
          class="opt pcard"
          :class="{ right: answered && i === current.answer, wrongpick: answered && i === picked && i !== current.answer }"
          @click="pick(i)"
        >
          <span class="ab">{{ 'ABCD'[i] }}</span>
          <span class="opt-text">{{ opt }}</span>
          <span v-if="answered && i === current.answer" class="mark">正确</span>
          <span v-else-if="answered && i === picked" class="mark bad">错误</span>
        </div>
      </div>

      <div v-if="answered" class="feedback" :class="{ ok: picked === current.answer }">
        <div class="fb-result">
          <template v-if="picked === current.answer">✓ 回答正确</template>
          <template v-else>✗ 回答错误 · 正确答案：{{ current.options[current.answer] }}（已收入错题本）</template>
        </div>
        <div class="fb-explain">
          <span class="seal">解析</span>
          <p>{{ current.explain }}</p>
        </div>
      </div>

      <div class="nav-btns" v-if="answered || index > 0">
        <van-button round block class="prev" :disabled="index <= 0" @click="prev">上一题</van-button>
        <van-button v-if="answered" type="primary" round block class="next" @click="next">
          {{ index + 1 >= questions.length ? '查看结果' : '下一题' }}
        </van-button>
        <van-button v-else type="primary" round block class="next" disabled>请先作答</van-button>
      </div>
    </div>

    <!-- 结果页 -->
    <div class="wrap done" v-else-if="finished">
      <div class="done-card pcard">
        <div class="done-title">本组完成</div>
        <div class="done-score"><b>{{ rightCount }}</b> / {{ questions.length }}</div>
        <div class="done-sub">答错 {{ wrongCount }} 题{{ wrongCount ? '，已自动收入错题本' : '，全对，继续保持' }}</div>
        <van-button type="primary" round block @click="restart">再测一组</van-button>
        <van-button v-if="wrongCount" round block class="done-back" @click="$router.push('/wrong')">去错题本重做</van-button>
        <van-button round block class="done-back" @click="$router.push('/')">返回首页</van-button>
      </div>
    </div>

    <!-- 空态：无法出题（空章/数据不足）——禁止永久「生成中」 -->
    <div class="wrap empty-quiz" v-else>
      <van-empty description="这一范围暂时出不了题" />
      <p class="empty-tip">可换「全部章节」再试，或先去学习页背一背</p>
      <van-button type="primary" round block @click="router.replace({ path: '/quiz', query: { size: quizSize } })">改测全部章节</van-button>
      <van-button round block class="done-back" @click="$router.push('/')">返回首页</van-button>
    </div>

    <van-dialog
      v-model:show="sizeDialog"
      title="本组刷多少题"
      show-cancel-button
      confirm-button-text="确定"
      confirm-button-color="#b03a2e"
      :before-close="beforeSizeClose"
    >
      <div class="size-dialog-body">
        <van-field v-model="sizeInput" type="digit" label="题数" placeholder="1–200" maxlength="3" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const store = useStudyStore()
const route = useRoute()
const router = useRouter()

const questions = ref([])
const index = ref(0)
const picked = ref(-1)
const answered = ref(false)
const rightCount = ref(0)
const wrongCount = ref(0)
const finished = ref(false)
const history = ref([])
const showScope = ref(false)
const sizeDialog = ref(false)
const sizeInput = ref('')

const chapterId = computed(() => route.query.chapter != null ? Number(route.query.chapter) : null)
const quizSize = computed(() => {
  if (route.query.size != null) return Math.max(1, Math.min(200, Number(route.query.size) || store.dailyQuizGoal))
  return store.dailyQuizGoal
})
const chapter = computed(() =>
  chapterId.value != null ? props.data.chapters.find(c => c.id === chapterId.value) : null
)
const scopeTitle = computed(() => chapter.value ? `测${chapter.value.name}` : '自测刷题')
const scopeLabel = computed(() => chapter.value ? chapter.value.name : '全部章节')
const scopeActions = computed(() => [
  { name: '全部章节', chapter: null },
  ...props.data.chapters.map(c => ({ name: c.name, chapter: c.id }))
])

const current = computed(() => questions.value[index.value] || null)

function quizQuery(extra = {}) {
  const q = { size: extra.size != null ? extra.size : quizSize.value }
  const ch = extra.chapter !== undefined ? extra.chapter : chapterId.value
  if (ch != null) q.chapter = ch
  return q
}

function onSelectScope(action) {
  router.replace({ path: '/quiz', query: quizQuery({ chapter: action.chapter }) })
}

function editQuizSize() {
  sizeInput.value = String(quizSize.value)
  sizeDialog.value = true
}
function beforeSizeClose(action) {
  if (action !== 'confirm') return true
  const n = parseInt(String(sizeInput.value).trim(), 10)
  if (!Number.isFinite(n) || n < 1 || n > 200) {
    showToast('请输入 1–200 的整数')
    return false
  }
  store.setDailyQuizGoal(n)
  router.replace({ path: '/quiz', query: quizQuery({ size: n }) })
  return true
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function sample(arr, n, exclude) {
  return shuffle(arr.filter(x => !exclude.includes(x))).slice(0, n)
}

/** 凑满 n 个干扰项：本章不够则从全书补，避免小章选项 &lt;4 */
function samplePad(primary, fallback, n, exclude) {
  const out = sample(primary, n, exclude)
  if (out.length >= n) return out.slice(0, n)
  const need = n - out.length
  const more = sample(fallback, need, [...exclude, ...out])
  return [...out, ...more]
}

function buildOptions(correct, distractors) {
  const uniq = [correct, ...distractors.filter((x) => x && x !== correct)]
  // 仍不足 4 个时用占位，保证可作答（极端数据）
  let i = 1
  while (uniq.length < 4) {
    const pad = `（选项${i}）`
    if (!uniq.includes(pad)) uniq.push(pad)
    i += 1
  }
  const opts = shuffle(uniq.slice(0, 4))
  const answer = opts.indexOf(correct)
  return { opts, answer: answer >= 0 ? answer : 0 }
}

function buildQuestions(forcedChapter = undefined) {
  const cid = forcedChapter !== undefined ? forcedChapter : chapterId.value
  const globalFlat = props.data.flat
  const flat = cid != null
    ? globalFlat.filter(f => f.chapterId === Number(cid))
    : globalFlat
  const qs = []
  if (!flat.length) {
    questions.value = []
    history.value = []
    return
  }

  const withJun = flat.filter(f => (f.composition || []).some(c => c.role === '君'))
  const withFunc = flat.filter(f => f.function)
  const withInd = flat.filter(f => f.indication)
  const scopeHerbs = [...new Set(withJun.map(f => f.composition.find(c => c.role === '君').herbs))]
  const globalJun = globalFlat.filter(f => (f.composition || []).some(c => c.role === '君'))
  const globalHerbs = [...new Set(globalJun.map(f => f.composition.find(c => c.role === '君').herbs))]
  const scopeNames = flat.map(f => f.name)
  const globalNames = globalFlat.map(f => f.name)
  const totalQ = Math.min(quizSize.value, Math.max(flat.length, 1))

  const pool = shuffle([...Array(totalQ).keys()]).map(k => k % 3)
  const junPick = shuffle(withJun)
  const funcPick = shuffle(withFunc)
  const indPick = shuffle(withInd)

  for (const t of pool) {
    if (t === 0 && junPick.length) {
      const f = junPick.pop()
      const jun = f.composition.find(c => c.role === '君').herbs
      const distractors = samplePad(scopeHerbs, globalHerbs, 3, [jun])
      const { opts, answer } = buildOptions(jun, distractors)
      qs.push({
        fid: f.id, type: 'jun', typeLabel: '君药',
        q: `「${f.name}」的君药是？`,
        options: opts, answer,
        explain: `「${f.name}」以${jun}为君药。功用：${f.function || '暂无'}。出自《${f.source || '佚名'}》。`
      })
    } else if (t === 1 && funcPick.length) {
      const f = funcPick.pop()
      const distractors = samplePad(scopeNames, globalNames, 3, [f.name])
      const { opts, answer } = buildOptions(f.name, distractors)
      qs.push({
        fid: f.id, type: 'func', typeLabel: '功用',
        q: `功用为「${f.function}」的方剂是？`,
        options: opts, answer,
        explain: `答案是「${f.name}」。功用：${f.function}。主治：${(f.indication || '暂无').slice(0, 48)}${(f.indication || '').length > 48 ? '…' : ''}。出自《${f.source || '佚名'}》。`
      })
    } else if (indPick.length) {
      const f = indPick.pop()
      const ind = f.indication.length > 45 ? f.indication.slice(0, 45) + '…' : f.indication
      const sameCh = flat.filter(x => x.chapterId === f.chapterId).map(x => x.name)
      const distractors = samplePad(sameCh.length >= 2 ? sameCh : scopeNames, globalNames, 3, [f.name])
      const { opts, answer } = buildOptions(f.name, distractors)
      qs.push({
        fid: f.id, type: 'ind', typeLabel: '主治',
        q: `主治「${ind}」的方剂是？`,
        options: opts, answer,
        explain: `答案是「${f.name}」。功用：${f.function || '暂无'}。出自《${f.source || '佚名'}》。`
      })
    }
  }
  questions.value = qs
  history.value = qs.map(() => null)
}

function saveCurrent() {
  history.value[index.value] = { picked: picked.value, answered: answered.value }
}

function restore(i) {
  const h = history.value[i]
  if (h) {
    picked.value = h.picked
    answered.value = h.answered
  } else {
    picked.value = -1
    answered.value = false
  }
}

function pick(i) {
  if (answered.value) return
  picked.value = i
  answered.value = true
  const c = current.value
  const firstTime = !history.value[index.value]
  if (i === c.answer) {
    if (firstTime) rightCount.value += 1
  } else {
    if (firstTime) wrongCount.value += 1
    store.addWrong({ fid: c.fid, q: c.q, options: c.options, answer: c.answer, explain: c.explain, type: c.typeLabel })
  }
  if (firstTime) store.recordQuizAnswer()
  saveCurrent()
}

function next() {
  if (!answered.value) return
  saveCurrent()
  if (index.value + 1 >= questions.value.length) {
    finished.value = true
  } else {
    index.value += 1
    restore(index.value)
  }
}

function prev() {
  if (index.value <= 0) return
  saveCurrent()
  index.value -= 1
  restore(index.value)
}

function restart() {
  index.value = 0
  picked.value = -1
  answered.value = false
  rightCount.value = 0
  wrongCount.value = 0
  finished.value = false
  buildQuestions()
}

buildQuestions()

watch(() => [route.query.chapter, route.query.size], () => {
  rightCount.value = 0
  wrongCount.value = 0
  finished.value = false
  index.value = 0
  picked.value = -1
  answered.value = false
  buildQuestions()
})
</script>

<style scoped>
.nav-r { font-size: 12px; color: var(--ink-light); margin-left: 10px; }
.size-tap, .scope-tap { color: var(--cinnabar); letter-spacing: 1px; }
.prog { margin-top: 8px; }
.prog .txt { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-light); margin-bottom: 8px; }
.prog .txt b { color: var(--cinnabar); }

.qcard { margin-top: 16px; padding: 18px; }
.qcard .type { margin-bottom: 10px; display: flex; gap: 8px; }
.qcard .q { font-size: 17px; letter-spacing: 1px; line-height: 1.8; }

.opts { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.opt { display: flex; align-items: center; gap: 12px; padding: 13px 14px; font-size: 15px; }
.opt .ab {
  width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--ink-light); color: var(--ink-light);
  display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;
}
.opt-text { line-height: 1.5; }
.opt.right { border: 2px solid var(--cinnabar); background: #fbf1ea; }
.opt.right .ab { background: var(--cinnabar); border-color: var(--cinnabar); color: #f8ecd9; }
.opt.wrongpick { border: 2px solid var(--ink-light); opacity: 0.7; }
.opt .mark { margin-left: auto; color: var(--cinnabar); font-size: 12px; border: 1.5px solid var(--cinnabar);
  border-radius: 4px; padding: 2px 6px; transform: rotate(-6deg); flex-shrink: 0; }
.opt .mark.bad { color: var(--ink-light); border-color: var(--ink-light); }

.feedback {
  margin-top: 14px; background: #fbf1ea; border: 1px solid rgba(176, 58, 46, 0.35);
  border-radius: 10px; padding: 12px 14px; color: var(--cinnabar); font-size: 13px; line-height: 1.8;
}
.feedback.ok { color: var(--bamboo); border-color: rgba(95, 112, 80, 0.4); background: #f0f3ea; }
.fb-result { font-weight: 600; margin-bottom: 8px; }
.fb-explain { display: flex; gap: 8px; align-items: flex-start; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.08); }
.fb-explain p { margin: 0; flex: 1; color: var(--ink); font-weight: 400; }

.nav-btns { display: flex; gap: 10px; margin: 18px 0; }
.nav-btns .prev, .nav-btns .next { flex: 1; letter-spacing: 2px; }
.nav-btns .prev { border-color: var(--line); color: var(--ink); }

.done { display: flex; align-items: center; min-height: 60vh; }
.done-card { width: 100%; padding: 30px 24px; text-align: center; }
.done-title { font-size: 18px; letter-spacing: 3px; }
.done-score { margin: 14px 0 6px; font-size: 15px; color: var(--ink-light); }
.done-score b { font-size: 40px; color: var(--cinnabar); }
.done-sub { font-size: 13px; color: var(--ink-light); margin-bottom: 22px; }
.done-back { margin-top: 10px; }
.empty-quiz { padding-top: 40px; text-align: center; }
.empty-tip { font-size: 13px; color: var(--ink-light); margin: 0 0 18px; line-height: 1.7; }
.size-dialog-body { padding: 12px 16px 4px; }
</style>
