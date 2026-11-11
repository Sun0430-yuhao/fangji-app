<template>
  <div class="page">
    <div class="wrap">
      <div class="title">我的</div>

      <!-- 总进度 -->
      <div class="ring-card pcard">
        <van-circle
          :rate="pct" :speed="60" :size="104" :stroke-width="7"
          color="#b03a2e" layer-color="#ece3cd"
        >
          <div class="c-txt"><b>{{ pct }}%</b><span>总进度</span></div>
        </van-circle>
        <div class="stats">
          <div class="stat"><b>{{ store.learnedCount }}</b><span>已学方剂</span></div>
          <div class="stat"><b>{{ store.favorites.length }}</b><span>收藏</span></div>
          <div class="stat red"><b>{{ store.wrong.length }}</b><span>错题</span></div>
        </div>
      </div>

      <!-- 章节掌握度 -->
      <div class="sec-title"><h2>章节掌握度</h2><span class="more">已学 {{ store.learnedCount }}/{{ data.total }}</span></div>
      <div v-for="row in mastery" :key="row.id" class="mrow">
        <div class="top"><span>{{ row.name }}</span><span>{{ row.pct }}%</span></div>
        <div class="bar"><i :style="{ width: row.pct + '%' }"></i></div>
      </div>

      <!-- 1. 我的学习 -->
      <div class="sec-title"><h2>我的学习</h2></div>
      <div class="list pcard">
        <div class="item" @click="$router.push('/wrong')">
          <span class="ic">✎</span>错题本
          <span class="n">{{ store.wrong.length ? `${store.wrong.length} 题待重做` : '暂无错题' }}</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item" @click="$router.push('/favorites')">
          <span class="ic">♡</span>我的收藏
          <span class="n">{{ store.favorites.length }} 方</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item">
          <span class="ic">☰</span>连续学习
          <span class="n">{{ store.streakDays }} 天</span>
        </div>
      </div>

      <!-- 2. 数据管理 -->
      <div class="sec-title"><h2>数据管理</h2><span class="more">重置前都会再问你一次</span></div>
      <div class="list pcard">
        <div class="item" @click="confirmReset('背诵记忆', '已背卡片的复习排期将清空，明日重新排队', store.resetMemory)">
          <span class="ic">↺</span>重置背诵记忆
          <span class="n">{{ Object.keys(store.memory).length }} 张卡</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item" @click="confirmReset('学习进度', '各章「已学」标记与总进度将归零（背诵记忆保留）', store.resetLearned)">
          <span class="ic">↺</span>重置学习进度
          <span class="n">已学 {{ store.learnedCount }} 方</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item" @click="confirmReset('错题本', '错题记录将清空且不可恢复', store.resetWrong)">
          <span class="ic">↺</span>清空错题本
          <span class="n">{{ store.wrong.length }} 题</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item" @click="confirmReset('我的收藏', '收藏列表将清空', store.resetFavorites)">
          <span class="ic">↺</span>清空收藏
          <span class="n">{{ store.favorites.length }} 方</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item" @click="confirmReset('连续打卡', '连续学习天数将归零', store.resetStreak)">
          <span class="ic">↺</span>重置连续打卡
          <span class="n">{{ store.streakDays }} 天</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item danger" @click="confirmReset('全部学习数据', '进度、记忆、错题、收藏、打卡全部归零，不可恢复', store.resetAll)">
          <span class="ic">✕</span>清空全部数据
          <van-icon name="arrow" class="arrow" />
        </div>
      </div>

      <!-- 3. 同步（登录后自动上传云端） -->
      <div class="sec-title"><h2>同步</h2><span class="more">{{ syncHint }}</span></div>
      <div class="list pcard auth-card">
        <template v-if="!syncOn">
          <div class="auth-off">未配置云同步。本地进度仍可用；配置见 docs/15。</div>
        </template>
        <template v-else-if="!userAccount">
          <van-field v-model="account" label="账号" placeholder="字母数字下划线" type="text" autocomplete="username" />
          <van-field v-model="password" label="密码" placeholder="至少 6 位" type="password" autocomplete="current-password" />
          <div class="auth-actions">
            <van-button size="small" round plain type="primary" :loading="authBusy" @click="doLogin">登录</van-button>
            <van-button size="small" round type="primary" :loading="authBusy" @click="doRegister">注册</van-button>
          </div>
        </template>
        <template v-else>
          <div class="item">
            <span class="ic">◎</span>已登录
            <span class="n email-n">{{ userAccount }}</span>
          </div>
          <div class="item" @click="doLogout">
            <span class="ic">⇥</span>退出登录
            <span class="n">本机进度保留</span>
            <van-icon name="arrow" class="arrow" />
          </div>
        </template>
      </div>

      <!-- 4. 数据备份 -->
      <div class="sec-title"><h2>数据备份</h2><span class="more">覆盖安装一般不丢；卸载会清空</span></div>
      <div class="list pcard">
        <div class="item" @click="exportData">
          <span class="ic">↓</span>导出学习进度
          <span class="n">分享或复制 JSON</span>
          <van-icon name="arrow" class="arrow" />
        </div>
        <div class="item" @click="triggerImport">
          <span class="ic">↑</span>导入学习进度
          <span class="n">将覆盖当前数据</span>
          <van-icon name="arrow" class="arrow" />
        </div>
      </div>
      <input ref="fileInput" type="file" accept="application/json,.json,text/plain" class="hidden-file" @change="onImportFile" />

      <p class="disclaimer">本应用为方剂学学习工具，内容供记忆练习，不构成诊疗建议。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { showConfirmDialog, showDialog, showToast } from 'vant'
import { useStudyStore } from '../store'
import { exportProgressText } from '../backup-io'
import {
  getCurrentAccount,
  signInWithPassword,
  signOut,
  signUp,
  syncAfterAuth,
  syncAvailable
} from '../sync'
import { promptProgressConflict } from '../sync-ui'

const props = defineProps({ data: { type: Object, required: true } })
const store = useStudyStore()
const fileInput = ref(null)

const syncOn = syncAvailable()
const account = ref('')
const password = ref('')
const userAccount = ref('')
const authBusy = ref(false)

const syncHint = computed(() => {
  if (!syncOn) return '可选；未配置不影响本地学习'
  return userAccount.value ? '登录后自动上传云端' : '账号 + 密码登录'
})

async function refreshUser() {
  if (!syncOn) {
    userAccount.value = ''
    return
  }
  try {
    userAccount.value = await getCurrentAccount()
  } catch (_) {
    userAccount.value = ''
  }
}

async function afterAuthOk(okMsg) {
  await refreshUser()
  showToast(okMsg)
  try {
    const r = await syncAfterAuth(store, { promptConflict: promptProgressConflict })
    if (r.action === 'downloaded' || r.action === 'aligned-cloud') showToast('已从云端恢复进度')
    else if (r.action === 'uploaded') showToast('本机进度已上传')
  } catch (e) {
    showToast(e?.message || '同步失败，学习仍会保存在本机')
  }
}

async function doRegister() {
  if (!account.value.trim() || !password.value) {
    showToast('请填写账号和密码')
    return
  }
  authBusy.value = true
  try {
    await signUp(account.value, password.value)
    password.value = ''
    await afterAuthOk('注册成功')
  } catch (e) {
    showToast(e?.message || '注册失败')
  } finally {
    authBusy.value = false
  }
}

async function doLogin() {
  if (!account.value.trim() || !password.value) {
    showToast('请填写账号和密码')
    return
  }
  authBusy.value = true
  try {
    await signInWithPassword(account.value, password.value)
    password.value = ''
    await afterAuthOk('登录成功')
  } catch (e) {
    showToast(e?.message || '登录失败')
  } finally {
    authBusy.value = false
  }
}

async function doLogout() {
  try {
    await signOut()
    userAccount.value = ''
    showToast('已退出')
  } catch (e) {
    showToast(e?.message || '退出失败')
  }
}

onMounted(() => { refreshUser() })

function confirmReset(name, detail, action) {
  showConfirmDialog({
    title: `重置${name}？`,
    message: detail,
    confirmButtonText: '确认重置',
    confirmButtonColor: '#b03a2e',
    cancelButtonText: '再想想'
  }).then(() => {
    action()
    showToast(`${name}已重置`)
  }).catch(() => { /* 取消则什么都不做 */ })
}

async function exportData() {
  try {
    const text = store.exportBackup()
    const day = new Date().toISOString().slice(0, 10)
    const filename = `方剂学进度备份-${day}.json`
    const res = await exportProgressText(text, filename)
    if (!res.ok) {
      showToast('导出失败，请重试')
      return
    }
    if (res.method === 'share' || res.method === 'share-cancel') {
      if (res.method === 'share') showToast('请选择保存位置或发给自己')
      return
    }
    if (res.method === 'clipboard') {
      await showDialog({
        title: '已复制到剪贴板',
        message: '请立刻粘贴到备忘录、微信文件传输助手或网盘文本中保存。卸载应用前务必保存好这份备份。',
        confirmButtonText: '知道了'
      })
      return
    }
    showToast('已触发下载，请到「下载」目录查看')
  } catch (e) {
    showToast('导出失败，请重试')
  }
}

function triggerImport() {
  fileInput.value?.click()
}

async function onImportFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    await showConfirmDialog({
      title: '导入并覆盖？',
      message: '导入后当前进度、错题、收藏等将被备份文件替换，不可撤销。',
      confirmButtonText: '确认导入',
      confirmButtonColor: '#b03a2e',
      cancelButtonText: '取消'
    })
    const text = await file.text()
    store.importBackup(text)
    showToast('导入成功')
  } catch (err) {
    if (err === 'cancel' || err?.toString?.().includes('cancel')) return
    showToast('导入失败：文件无效或无法写入')
  }
}

const pct = computed(() => props.data.total ? Math.round((store.learnedCount / props.data.total) * 100) : 0)

const mastery = computed(() => {
  return props.data.chapters
    .map(ch => {
      const learned = ch.formulas.filter(f => store.learned[f.id]).length
      return { id: ch.id, name: ch.name, pct: ch.formulas.length ? Math.round((learned / ch.formulas.length) * 100) : 0 }
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
})
</script>

<style scoped>
.title { padding: 12px 0 4px; font-size: 20px; letter-spacing: 3px; font-weight: 700; }

.ring-card { margin-top: 10px; padding: 18px; display: flex; align-items: center; gap: 26px; }
.c-txt { display: flex; flex-direction: column; align-items: center; }
.c-txt b { font-size: 20px; color: var(--cinnabar); }
.c-txt span { font-size: 11px; color: var(--ink-light); margin-top: 2px; }
.stats { display: flex; gap: 24px; }
.stat b { font-size: 20px; display: block; }
.stat span { font-size: 11px; color: var(--ink-light); letter-spacing: 1px; }
.stat.red b { color: var(--cinnabar); }

.mrow { margin-bottom: 12px; }
.mrow .top { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 7px; }
.mrow .top span:last-child { color: var(--cinnabar); font-size: 12px; }

.list { overflow: hidden; margin-bottom: 16px; }
.item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); font-size: 15px; letter-spacing: 1px; }
.item:last-child { border-bottom: none; }
.item .ic { width: 34px; height: 34px; border-radius: 8px; background: var(--card-dark); display: inline-flex; align-items: center; justify-content: center; font-size: 16px; color: var(--cinnabar); }
.item .n { margin-left: auto; color: var(--ink-light); font-size: 12px; }
.item .arrow { color: var(--ink-light); }
.item.danger { color: var(--cinnabar); }
.item.danger .ic { background: #fbf1ea; }
.hidden-file { display: none; }
.auth-card :deep(.van-cell) { background: transparent; padding: 10px 16px; }
.auth-card :deep(.van-field__label) { width: 3.2em; color: var(--ink); }
.auth-actions {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 12px 16px 14px;
}
.auth-off {
  padding: 14px 16px; font-size: 13px; color: var(--ink-light); line-height: 1.7;
}
.email-n {
  max-width: 52%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.disclaimer {
  font-size: 11px; color: var(--ink-light); line-height: 1.7;
  text-align: center; padding: 8px 12px 24px; letter-spacing: 0.5px;
}
</style>
