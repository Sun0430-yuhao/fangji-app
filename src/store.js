// 学习状态：进度 / 记忆调度（简化 SM-2）/ 错题 / 收藏 / 打卡
// 持久化 localStorage，损坏时自动重置并提示（负面路径不白屏）
// 无每日新卡上限：可无限次学习、无限次重置
import { defineStore } from 'pinia'

const LS_KEY = 'fangji-progress-v1'
const INTERVALS = [1, 2, 4, 7, 15, 30] // 记得档间隔递进（天）

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function plusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function freshState() {
  return {
    learned: {},      // fid -> true（背诵自评或主动加入背诵）
    favorites: [],    // [fid]
    memory: {},       // fid -> { rep, interval, due, strength }
    wrong: [],        // [{ fid, q, options, answer, explain, type, ts }]
    streakDays: 0,
    lastStudyDate: '',
    // 今日完成量（跨日自动清零）
    studiedToday: { date: todayStr(), studyCount: 0, quizCount: 0 },
    dailyStudyGoal: 30, // 今日背诵目标（自评张数）
    dailyQuizGoal: 20,  // 今日刷题目标（作答次数）
    sessionSize: 30,    // 本轮新学张数：与背诵目标默认同步；-1=范围内全部
    resetNotice: false
  }
}

function normalizeToday(st) {
  const d = todayStr()
  if (!st || st.date !== d) return { date: d, studyCount: 0, quizCount: 0 }
  const studyCount = Number(st.studyCount ?? st.count ?? 0) || 0
  const quizCount = Number(st.quizCount ?? 0) || 0
  return { date: d, studyCount, quizCount }
}

export const useStudyStore = defineStore('study', {
  state: () => freshState(),
  getters: {
    dueCount: (s) => {
      const t = todayStr()
      return Object.values(s.memory).filter(m => m.due <= t).length
    },
    favoriteSet: (s) => new Set(s.favorites),
    learnedCount: (s) => Object.keys(s.learned).length
  },
  actions: {
    load() {
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return
        const data = JSON.parse(raw)
        if (!data || typeof data !== 'object') throw new Error('bad')
        // 兼容旧版字段（newPerDay / todayNew），加载后丢弃
        const { newPerDay, todayNew, ...rest } = data
        Object.assign(this, freshState(), rest)
      } catch (e) {
        Object.assign(this, freshState())
        this.resetNotice = true
      }
      this.studiedToday = normalizeToday(this.studiedToday)
      if (!this.dailyStudyGoal || this.dailyStudyGoal < 1) this.dailyStudyGoal = 30
      if (!this.dailyQuizGoal || this.dailyQuizGoal < 1) this.dailyQuizGoal = 20
      if (this.sessionSize === undefined || this.sessionSize === null) this.sessionSize = this.dailyStudyGoal
    },
    ensureToday() {
      const next = normalizeToday(this.studiedToday)
      const cur = this.studiedToday
      // 必须！否则 computed 渲染期每次赋值新对象 → 无限更新卡死主线程
      if (!cur || cur.date !== next.date || cur.studyCount !== next.studyCount || cur.quizCount !== next.quizCount) {
        this.studiedToday = next
      }
    },
    persist() {
      try {
        const { resetNotice, ...rest } = this.$state
        localStorage.setItem(LS_KEY, JSON.stringify(rest))
        return true
      } catch (e) {
        return false
      }
    },
    // 导出备份（JSON 字符串）
    exportBackup() {
      const { resetNotice, ...rest } = this.$state
      return JSON.stringify({
        app: 'fangji-study',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: rest
      }, null, 2)
    },
    // 导入备份；覆盖当前进度
    importBackup(raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      let data = parsed
      if (parsed && parsed.app === 'fangji-study' && parsed.data && typeof parsed.data === 'object') {
        data = parsed.data
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('格式无效')
      const { newPerDay, todayNew, resetNotice, ...rest } = data
      Object.assign(this, freshState(), rest)
      this.studiedToday = normalizeToday(this.studiedToday)
      if (!this.persist()) throw new Error('写入失败')
    },
    markLearned(fid) {
      if (!this.learned[fid]) {
        this.learned[fid] = true
        this.persist()
      }
    },
    toggleFavorite(fid) {
      const i = this.favorites.indexOf(fid)
      if (i >= 0) this.favorites.splice(i, 1)
      else this.favorites.push(fid)
      this.persist()
    },
    inDeck(fid) { return !!this.memory[fid] },
    addToDeck(fid) {
      if (!this.memory[fid]) {
        this.memory[fid] = { rep: 0, interval: 0, due: todayStr(), strength: 0 }
        this.persist()
      }
    },
    // 三档自评：忘记 / 模糊 / 记得
    grade(fid, g) {
      const m = this.memory[fid] || { rep: 0, interval: 0, due: todayStr(), strength: 0 }
      if (g === 'forgot') {
        m.rep = 0; m.interval = 0; m.due = todayStr()
      } else if (g === 'vague') {
        m.rep += 1; m.interval = 1; m.due = plusDays(1)
      } else {
        m.rep += 1
        m.interval = INTERVALS[Math.min(m.rep - 1, INTERVALS.length - 1)]
        m.due = plusDays(m.interval)
        m.strength += 1
      }
      this.memory[fid] = m
      this.markLearned(fid)
      this.ensureToday()
      this.studiedToday.studyCount += 1
      if (this.lastStudyDate !== todayStr()) {
        const yesterday = plusDays(-1)
        this.streakDays = (this.lastStudyDate === yesterday) ? this.streakDays + 1 : 1
        this.lastStudyDate = todayStr()
      }
      this.persist()
    },
    recordQuizAnswer() {
      this.ensureToday()
      this.studiedToday.quizCount += 1
      // 刷题也计入打卡日，避免「只刷题连续天数不涨」
      if (this.lastStudyDate !== todayStr()) {
        const yesterday = plusDays(-1)
        this.streakDays = (this.lastStudyDate === yesterday) ? this.streakDays + 1 : 1
        this.lastStudyDate = todayStr()
      }
      this.persist()
    },
    setSessionSize(n) {
      this.sessionSize = n
      this.persist()
    },
    setDailyStudyGoal(n) {
      const v = Math.max(1, Math.min(500, Number(n) || 30))
      this.dailyStudyGoal = v
      // 本轮新学默认跟今日背诵目标走（仍可用「全部」）
      if (this.sessionSize > 0) this.sessionSize = v
      this.persist()
    },
    setDailyQuizGoal(n) {
      this.dailyQuizGoal = Math.max(1, Math.min(200, Number(n) || 20))
      this.persist()
    },
    studyRemainToday() {
      this.ensureToday()
      return Math.max(0, this.dailyStudyGoal - this.studiedToday.studyCount)
    },
    quizRemainToday() {
      this.ensureToday()
      return Math.max(0, this.dailyQuizGoal - this.studiedToday.quizCount)
    },
    todayGoalsDone() {
      this.ensureToday()
      return this.studiedToday.studyCount >= this.dailyStudyGoal
        && this.studiedToday.quizCount >= this.dailyQuizGoal
    },
    // 牌组：范围内到期复习 + 本轮新方（张数可自选，-1=范围内全部；无每日总上限）
    buildDeck(flat, { sessionSize, chapterId } = {}) {
      const size = sessionSize === undefined ? this.sessionSize : sessionSize
      const pool = chapterId != null ? flat.filter(f => f.chapterId === Number(chapterId)) : flat
      const t = todayStr()
      const due = pool.filter(f => this.memory[f.id] && this.memory[f.id].due <= t)
      const freshPool = pool.filter(f => !this.memory[f.id])
      const fresh = size < 0 ? freshPool : freshPool.slice(0, Math.max(0, size))
      for (const f of fresh) this.addToDeck(f.id)
      this.persist()
      return [...due.map(f => f.id), ...fresh.map(f => f.id)]
    },
    // 尚未进入记忆库的新方数量（首页「还可学」；可按章）
    remainingNew(flat, chapterId = null) {
      const pool = chapterId != null ? flat.filter(f => f.chapterId === Number(chapterId)) : flat
      return pool.filter(f => !this.memory[f.id]).length
    },
    dueInScope(flat, chapterId = null) {
      const t = todayStr()
      const pool = chapterId != null ? flat.filter(f => f.chapterId === Number(chapterId)) : flat
      return pool.filter(f => this.memory[f.id] && this.memory[f.id].due <= t).length
    },
    tomorrowDue() {
      const t = todayStr()
      return Object.values(this.memory).filter(m => m.due > t).length
    },
    addWrong(item) {
      const i = this.wrong.findIndex(w => w.fid === item.fid && w.q === item.q)
      if (i >= 0) this.wrong.splice(i, 1)
      const ts = Date.now()
      const uid = `w-${ts}-${Math.random().toString(36).slice(2, 8)}`
      this.wrong.unshift({ ...item, ts, uid })
      this.persist()
    },
    removeWrong(index) {
      this.wrong.splice(index, 1)
      this.persist()
    },
    // ===== 数据重置（总 + 分项，次数不限） =====
    resetAll() {
      Object.assign(this, freshState())
      this.persist()
    },
    resetLearned() {
      this.learned = {}
      this.persist()
    },
    resetMemory() {
      this.memory = {}
      this.persist()
    },
    resetWrong() {
      this.wrong = []
      this.persist()
    },
    resetFavorites() {
      this.favorites = []
      this.persist()
    },
    resetStreak() {
      this.streakDays = 0
      this.lastStudyDate = ''
      this.studiedToday = { date: todayStr(), studyCount: 0, quizCount: 0 }
      this.persist()
    }
  }
})
