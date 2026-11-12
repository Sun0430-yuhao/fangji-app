<template>
  <div
    class="page study"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <van-nav-bar :title="scopeTitle" left-arrow @click-left="$router.push('/')">
      <template #right><span class="nav-r">{{ sizeLabel }}</span></template>
    </van-nav-bar>

    <div class="wrap" v-if="!finished">
      <div class="prog">
        <div class="txt">
          <span>{{ scopeHint }} · {{ modeLabel }}</span>
          <span><b>{{ index + 1 }}</b> / {{ deck.length }}</span>
        </div>
        <div class="bar"><i :style="{ width: ((index) / Math.max(deck.length, 1) * 100) + '%' }"></i></div>
      </div>

      <div class="pager" v-if="deck.length > 1">
        <button type="button" class="pg-btn" :disabled="index <= 0" @click="goPrev">上一张</button>
        <span class="pg-mid">{{ index + 1 }} / {{ deck.length }}</span>
        <button type="button" class="pg-btn" :disabled="index >= deck.length - 1" @click="goNext">下一张</button>
      </div>

      <div class="cardzone" v-if="current">
        <!-- ===== 翻面卡 ===== -->
        <div
          v-if="current.mode === 'flip'"
          class="fcard"
          :class="{ flipped }"
          @click="flipped = !flipped"
        >
          <span class="seal q-tag">{{ flipped ? '答案' : '回忆卡片' }}</span>
          <div v-if="!flipped" class="face">
            <div class="fname">{{ current.name }}</div>
            <div class="fsrc">《{{ current.source || '佚名' }}》 · {{ current.chapterName }}</div>
            <div class="fhint">回忆：组成 · 功用 · 主治</div>
          </div>
          <div v-else class="face back">
            <div class="bcomp" v-if="current.composition && current.composition.length">
              <span v-for="(c, i) in current.composition" :key="i" class="brole" :class="roleClass(c.role)">
                {{ c.role }} {{ c.herbs }}
              </span>
            </div>
            <p class="bline"><b>功用</b>　{{ current.function || '暂无' }}</p>
            <p class="bline"><b>主治</b>　{{ (current.indication || '暂无').slice(0, 60) }}{{ (current.indication || '').length > 60 ? '…' : '' }}</p>
            <p class="bverse" v-if="current.verse">{{ current.verse }}</p>
          </div>
          <div class="tap-hint">点击卡片{{ flipped ? '返回' : '翻面查看答案' }}</div>
        </div>

        <!-- ===== 选方名 ===== -->
        <div v-else-if="current.mode === 'pick'" class="fcard pick-card" @click.stop>
          <span class="seal q-tag">选方名</span>
          <div class="face back pick-face">
            <div class="prompt-label">{{ current.promptLabel }}</div>
            <div class="prompt-body">{{ current.prompt }}</div>
            <div class="pick-opts">
              <button
                v-for="(opt, i) in current.options"
                :key="i"
                class="pick-opt"
                :class="{
                  on: picked === i,
                  right: revealed && i === current.answer,
                  wrong: revealed && picked === i && i !== current.answer
                }"
                :disabled="revealed"
                @click="pickOption(i)"
              >{{ opt }}</button>
            </div>
            <div v-if="revealed" class="pick-fb" :class="{ ok: picked === current.answer }">
              {{ picked === current.answer ? '✓ 选对了' : `✗ 正确答案：${current.options[current.answer]}` }}
            </div>
          </div>
        </div>

        <!-- ===== 歌诀挖空 ===== -->
        <div v-else-if="current.mode === 'cloze'" class="fcard pick-card" @click.stop>
          <span class="seal q-tag bamboo-tag">歌诀挖空</span>
          <div class="face back pick-face">
            <div class="prompt-label">补全歌诀中的空缺</div>
            <div class="cloze-verse">{{ current.clozeText }}</div>
            <div class="pick-opts">
              <button
                v-for="(opt, i) in current.options"
                :key="i"
                class="pick-opt"
                :class="{
                  on: picked === i,
                  right: revealed && i === current.answer,
                  wrong: revealed && picked === i && i !== current.answer
                }"
                :disabled="revealed"
                @click="pickOption(i)"
              >{{ opt }}</button>
            </div>
            <div v-if="revealed" class="pick-fb" :class="{ ok: picked === current.answer }">
              {{ picked === current.answer ? '✓ 填对了' : `✗ 应填：${current.options[current.answer]}` }}
              <div class="full-verse">全文：{{ current.verse }}</div>
            </div>
          </div>
        </div>

        <!-- ===== 字段遮挡 ===== -->
        <div v-else-if="current.mode === 'mask'" class="fcard pick-card mask-card" @click.stop>
          <span class="seal q-tag">字段遮挡</span>
          <div class="face back pick-face">
            <div class="mask-head">
              <div class="fname mask-fname">{{ current.name }}</div>
              <div class="fsrc">《{{ current.source || '佚名' }}》 · {{ current.chapterName }}</div>
            </div>
            <div class="mask-rows">
              <div
                v-for="row in maskRows"
                :key="row.key"
                class="mask-row"
                :class="{ open: revealedFields[row.key] }"
                @click="revealField(row.key)"
              >
                <span class="mask-label seal">{{ row.label }}</span>
                <div class="mask-body" :class="{ masked: !revealedFields[row.key] }">
                  <div v-if="row.key === 'composition'" class="bcomp">
                    <span
                      v-for="(c, i) in current.composition"
                      :key="i"
                      class="brole"
                      :class="roleClass(c.role)"
                    >{{ c.role }} {{ c.herbs }}</span>
                  </div>
                  <p v-else class="mask-text">{{ row.text }}</p>
                  <span v-if="!revealedFields[row.key]" class="mask-tip">点按揭开</span>
                </div>
              </div>
            </div>
            <button
              v-if="!maskAllOpen && maskRows.length"
              type="button"
              class="mask-all"
              @click="revealAllFields"
            >全部揭开</button>
          </div>
        </div>
      </div>

      <div class="judge" v-if="canJudge">
        <div class="j no" @click="grade('forgot')"><div class="c">忘记</div><span class="lbl">稍后重现</span></div>
        <div class="j mid" @click="grade('vague')"><div class="c">模糊</div><span class="lbl">明天复习</span></div>
        <div class="j yes" @click="grade('known')"><div class="c">记得</div><span class="lbl">间隔延长</span></div>
      </div>
      <div class="judge-hint" v-else>
        {{ judgeHint }}
      </div>
    </div>

    <div class="wrap done" v-else>
      <div class="done-card pcard">
        <div class="done-icon">✓</div>
        <div class="done-title">本轮已完成</div>
        <div class="done-sub" v-if="deck.length">本组卡片已过完（含翻面 / 选方名 / 歌诀挖空 / 字段遮挡）<br>明日预计 {{ tomorrow }} 张待复习</div>
        <div class="done-sub" v-else>当前没有待复习 / 待新学的卡片<br>明日预计 {{ tomorrow }} 张待复习</div>
        <van-button v-if="hasMore" type="primary" round block @click="reloadDeck">再学一组</van-button>
        <van-button :type="hasMore ? 'default' : 'primary'" round block :class="{ 'done-back': hasMore }" @click="goQuizSameScope">去刷题巩固 →</van-button>
        <van-button round block class="done-back" @click="$router.push('/')">返回首页</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const store = useStudyStore()
const route = useRoute()
const router = useRouter()

const chapterId = computed(() => route.query.chapter != null ? Number(route.query.chapter) : null)
const sessionSize = computed(() => {
  if (route.query.size != null) return Number(route.query.size)
  return store.sessionSize
})
const chapter = computed(() =>
  chapterId.value != null ? props.data.chapters.find(c => c.id === chapterId.value) : null
)
const scopeTitle = computed(() => chapter.value ? `背${chapter.value.name}` : '卡片背诵')
const scopeHint = computed(() => chapter.value ? `本章 · ${chapter.value.name}` : '本轮背诵')
const sizeLabel = computed(() => sessionSize.value < 0 ? '全部' : `${sessionSize.value}张`)

const MODE_LABEL = { flip: '翻面回忆', pick: '选方名', cloze: '歌诀挖空', mask: '字段遮挡' }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sampleNames(exclude, n = 3) {
  const pool = props.data.flat
  const same = chapterId.value != null
    ? pool.filter(f => f.chapterId === chapterId.value && f.id !== exclude.id)
    : pool.filter(f => f.id !== exclude.id)
  const names = shuffle(same.map(f => f.name))
  if (names.length >= n) return names.slice(0, n)
  const more = shuffle(pool.filter(f => f.id !== exclude.id).map(f => f.name))
    .filter(x => !names.includes(x))
  return [...names, ...more].slice(0, n)
}

function canPick(f) {
  return !!(f.function || (f.composition && f.composition.length))
}

function canMask(f) {
  return !!(
    (f.composition && f.composition.length) ||
    f.function ||
    f.indication ||
    f.verse
  )
}

function clozeBlank(f) {
  if (!f.verse) return null
  const verse = f.verse
  if (verse.includes(f.name)) {
    return { clozeText: verse.split(f.name).join('____'), answer: f.name }
  }
  const short = f.name.replace(/(汤|散|丸|饮|膏|丹)$/, '')
  if (short.length >= 2 && verse.includes(short)) {
    return { clozeText: verse.split(short).join('____'), answer: short }
  }
  return null
}

function enrich(f, i) {
  const prefer = ['flip', 'pick', 'cloze', 'mask'][i % 4]
  const base = { ...f }

  if (prefer === 'mask' && canMask(f)) {
    return { ...base, mode: 'mask' }
  }

  if (prefer === 'pick' && canPick(f)) {
    const useComp = f.composition && f.composition.length && (i % 2 === 0 || !f.function)
    const prompt = useComp
      ? f.composition.map(c => `${c.role}${c.herbs || ''}`).join(' · ')
      : f.function
    const opts = shuffle([f.name, ...sampleNames(f, 3)])
    return {
      ...base,
      mode: 'pick',
      promptLabel: useComp ? '根据组成选方名' : '根据功用选方名',
      prompt,
      options: opts,
      answer: opts.indexOf(f.name)
    }
  }

  if (prefer === 'cloze' || (prefer === 'pick' && !canPick(f))) {
    const cz = clozeBlank(f)
    if (cz) {
      const answerLabel = f.name // 选项仍用完整方名，更易认
      const opts = shuffle([answerLabel, ...sampleNames(f, 3)])
      return {
        ...base,
        mode: 'cloze',
        clozeText: cz.clozeText,
        options: opts,
        answer: opts.indexOf(answerLabel),
        blankAnswer: cz.answer
      }
    }
  }

  return { ...base, mode: 'flip' }
}

function makeDeck() {
  const ids = store.buildDeck(props.data.flat, {
    sessionSize: sessionSize.value,
    chapterId: chapterId.value
  })
  return ids
    .map(id => props.data.byId[id])
    .filter(Boolean)
    .map((f, i) => enrich(f, i))
}

const deck = ref(makeDeck())
const index = ref(0)
const flipped = ref(false)
const picked = ref(-1)
const revealed = ref(false)
const revealedFields = ref({})
const finished = ref(deck.value.length === 0)

const current = computed(() => deck.value[index.value] || null)
const modeLabel = computed(() => MODE_LABEL[current.value?.mode] || '回忆')

const maskRows = computed(() => {
  const c = current.value
  if (!c || c.mode !== 'mask') return []
  const rows = []
  if (c.composition && c.composition.length) {
    rows.push({ key: 'composition', label: '组成', text: '' })
  }
  if (c.function) rows.push({ key: 'function', label: '功用', text: c.function })
  if (c.indication) rows.push({ key: 'indication', label: '主治', text: c.indication })
  if (c.verse) rows.push({ key: 'verse', label: '歌诀', text: c.verse })
  return rows
})

const maskAllOpen = computed(() => {
  const rows = maskRows.value
  if (!rows.length) return true
  return rows.every((r) => !!revealedFields.value[r.key])
})

const canJudge = computed(() => {
  if (!current.value) return false
  if (current.value.mode === 'flip') return flipped.value
  if (current.value.mode === 'mask') return maskAllOpen.value
  return revealed.value
})

const judgeHint = computed(() => {
  const m = current.value?.mode
  if (m === 'flip') return '先点击卡片翻面，再按记忆程度自评'
  if (m === 'mask') return '先点各字段揭开（或全部揭开），再按记忆程度自评'
  return '先选出答案，再按记忆程度自评'
})

const tomorrow = computed(() => store.tomorrowDue())
const hasMore = computed(() =>
  store.dueInScope(props.data.flat, chapterId.value) > 0 ||
  store.remainingNew(props.data.flat, chapterId.value) > 0
)

function goQuizSameScope() {
  const q = { size: store.dailyQuizGoal }
  if (chapterId.value != null) q.chapter = chapterId.value
  router.push({ path: '/quiz', query: q })
}

function roleClass(role) {
  if (role === '君') return 'jun'
  if (role === '臣') return 'chen'
  if (role.startsWith('佐')) return 'zuo'
  return 'shi'
}

function pickOption(i) {
  if (revealed.value) return
  picked.value = i
  revealed.value = true
}

function revealField(key) {
  if (revealedFields.value[key]) return
  revealedFields.value = { ...revealedFields.value, [key]: true }
}

function revealAllFields() {
  const next = { ...revealedFields.value }
  for (const row of maskRows.value) next[row.key] = true
  revealedFields.value = next
}

function resetCardState() {
  flipped.value = false
  picked.value = -1
  revealed.value = false
  revealedFields.value = {}
}

const touchX = ref(0)

function goPrev() {
  if (index.value <= 0) return
  index.value -= 1
  resetCardState()
}

function goNext() {
  if (index.value >= deck.value.length - 1) return
  index.value += 1
  resetCardState()
}

function onTouchStart(e) {
  touchX.value = e.changedTouches?.[0]?.clientX ?? 0
}

function onTouchEnd(e) {
  if (finished.value) return
  const target = e.target
  // 点在选项/自评按钮上时不抢滑动翻页
  if (target?.closest?.('.pick-opt, .judge, .pager, .van-nav-bar, .mask-row, .mask-all')) return
  const x = e.changedTouches?.[0]?.clientX ?? 0
  const dx = x - touchX.value
  if (Math.abs(dx) < 56) return
  if (dx < 0) goNext()
  else goPrev()
}

function grade(g) {
  if (!current.value) return
  const card = current.value
  store.grade(card.id, g)
  resetCardState()

  if (g === 'forgot') {
    const insertAt = Math.min(index.value + 3, deck.value.length)
    deck.value.splice(insertAt, 0, card)
    index.value += 1
    finished.value = index.value >= deck.value.length
    return
  }

  if (index.value + 1 >= deck.value.length) {
    finished.value = true
  } else {
    index.value += 1
  }
}

function reloadDeck() {
  deck.value = makeDeck()
  index.value = 0
  resetCardState()
  finished.value = deck.value.length === 0
}

watch(() => [route.query.chapter, route.query.size, store.sessionSize], () => {
  reloadDeck()
})
</script>

<style scoped>
.nav-r { font-size: 12px; color: var(--ink-light); }
.prog { margin-top: 8px; }
.prog .txt { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-light); margin-bottom: 8px; gap: 8px; }
.prog .txt b { color: var(--cinnabar); }

.pager {
  display: flex; align-items: center; gap: 8px;
  margin: 12px 0 0;
}
.pg-btn {
  flex: 0 0 auto; min-width: 76px; border: none; border-radius: 999px;
  padding: 8px 12px; font-size: 13px; letter-spacing: 1px; cursor: pointer;
  background: var(--cinnabar); color: #f8ecd9; font-family: inherit;
}
.pg-btn:disabled { opacity: 0.35; cursor: default; }
.pg-mid {
  flex: 1; text-align: center; font-size: 13px; color: var(--ink-light); letter-spacing: 1px;
}

.cardzone { display: flex; justify-content: center; margin-top: 14px; }
.fcard {
  width: 100%; min-height: 380px; border-radius: 18px;
  background: linear-gradient(160deg, #fbf7ec 0%, #f2e9d3 100%);
  border: 1.5px solid var(--cinnabar);
  box-shadow: 0 10px 30px rgba(90, 70, 40, 0.15);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative; padding: 46px 22px 40px;
  box-sizing: border-box;
}
.fcard::before {
  content: ""; position: absolute; inset: 9px; border: 1px solid rgba(176, 58, 46, 0.25);
  border-radius: 12px; pointer-events: none;
}
.pick-card { justify-content: flex-start; padding-top: 52px; padding-bottom: 24px; }
.q-tag { position: absolute; top: 16px; }
.bamboo-tag { background: var(--bamboo) !important; }
.face { text-align: center; }
.fname { font-size: 34px; letter-spacing: 5px; font-weight: 700; }
.fsrc { font-size: 12px; color: var(--ink-light); margin-top: 10px; }
.fhint { font-size: 13px; color: var(--ink-light); margin-top: 34px; letter-spacing: 2px; border: 1px dashed var(--line);
  display: inline-block; padding: 8px 16px; border-radius: 20px; }
.face.back { text-align: left; width: 100%; }
.bcomp { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.brole { font-size: 12px; border-radius: 4px; padding: 3px 7px; color: #f8ecd9; background: var(--cinnabar); }
.brole.chen { background: #9c4a3c; } .brole.zuo { background: var(--amber); } .brole.shi { background: var(--bamboo); }
.bline { font-size: 13px; line-height: 1.8; margin: 6px 0; }
.bline b { color: var(--cinnabar); }
.bverse { font-size: 13px; line-height: 2.0; letter-spacing: 1px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--line); }
.tap-hint { position: absolute; bottom: 16px; font-size: 11px; color: var(--ink-light); letter-spacing: 1px; }

.pick-face { width: 100%; }
.prompt-label { font-size: 12px; color: var(--ink-light); letter-spacing: 2px; margin-bottom: 10px; }
.prompt-body { font-size: 16px; line-height: 1.8; letter-spacing: 1px; margin-bottom: 16px; }
.cloze-verse {
  font-size: 16px; line-height: 2.0; letter-spacing: 2px;
  background: #f1e7cf; border-radius: 10px; padding: 14px; margin-bottom: 16px;
  border-left: 4px solid var(--cinnabar);
}
.pick-opts { display: flex; flex-direction: column; gap: 8px; }
.pick-opt {
  text-align: left; font-family: inherit; font-size: 15px; letter-spacing: 1px;
  padding: 12px 14px; border-radius: 10px; border: 1px solid var(--line);
  background: var(--card); color: var(--ink); cursor: pointer;
}
.pick-opt.on { border-color: var(--cinnabar); }
.pick-opt.right { border: 2px solid var(--bamboo); background: #f0f3ea; color: var(--bamboo); }
.pick-opt.wrong { border: 2px solid var(--cinnabar); background: #fbf1ea; opacity: 0.85; }
.pick-opt:disabled { cursor: default; }
.pick-fb { margin-top: 12px; font-size: 13px; color: var(--cinnabar); line-height: 1.7; }
.pick-fb.ok { color: var(--bamboo); }
.full-verse { margin-top: 6px; color: var(--ink-light); font-size: 12px; letter-spacing: 1px; }

.mask-card { min-height: 420px; }
.mask-head { text-align: center; margin-bottom: 14px; }
.mask-fname { font-size: 28px; letter-spacing: 4px; }
.mask-rows { display: flex; flex-direction: column; gap: 10px; }
.mask-row {
  display: flex; gap: 10px; align-items: stretch;
  padding: 0; cursor: pointer;
}
.mask-label {
  flex: 0 0 auto; align-self: flex-start; margin-top: 8px;
}
.mask-body {
  position: relative; flex: 1; min-height: 44px;
  background: rgba(255, 255, 255, 0.45); border-radius: 10px;
  padding: 10px 12px; border: 1px solid var(--line);
  overflow: hidden;
}
.mask-body.masked {
  user-select: none; -webkit-user-select: none;
}
.mask-body.masked .bcomp,
.mask-body.masked .mask-text {
  filter: blur(7px);
}
.mask-tip {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 12px; letter-spacing: 2px; color: var(--cinnabar);
  background: rgba(244, 238, 225, 0.35);
  pointer-events: none;
}
.mask-text { font-size: 14px; line-height: 1.8; margin: 0; }
.mask-row.open { cursor: default; }
.mask-all {
  margin-top: 14px; width: 100%; border: none; background: none;
  color: var(--cinnabar); font-size: 13px; letter-spacing: 1px;
  font-family: inherit; cursor: pointer; padding: 8px 0;
}

.judge { display: flex; justify-content: space-around; margin: 24px 0 10px; }
.judge .j { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.judge .c {
  width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 15px; letter-spacing: 1px; background: var(--card); box-shadow: 0 3px 8px rgba(90, 70, 40, 0.12);
  cursor: pointer;
}
.judge .yes .c { border: 2px solid var(--bamboo); color: var(--bamboo); }
.judge .mid .c { border: 2px solid var(--amber); color: var(--amber); }
.judge .no .c { border: 2px solid var(--cinnabar); color: var(--cinnabar); }
.judge .lbl { font-size: 11px; color: var(--ink-light); }
.judge-hint { text-align: center; font-size: 12px; color: var(--ink-light); margin: 24px 0; }

.done { display: flex; align-items: center; min-height: 60vh; }
.done-card { width: 100%; padding: 30px 24px; text-align: center; }
.done-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--bamboo); color: #f8ecd9;
  font-size: 26px; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
.done-title { font-size: 20px; letter-spacing: 3px; margin-bottom: 10px; }
.done-sub { font-size: 13px; color: var(--ink-light); line-height: 2.0; margin-bottom: 22px; }
.done-back { margin-top: 10px; }
</style>
