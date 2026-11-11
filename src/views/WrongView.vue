<template>
  <div class="page no-tab">
    <van-nav-bar title="错题本" left-arrow @click-left="$router.back()" />

    <div v-if="!store.wrong.length" class="empty">
      <van-empty description="暂无错题，刷题后答错的题会自动收到这里" />
      <div class="empty-go">
        <van-button type="primary" round @click="$router.push('/quiz')">去刷题 →</van-button>
      </div>
    </div>

    <div class="wrap" v-else>
      <div class="tip">共 {{ store.wrong.length }} 题 · 答对后约 0.8 秒自动移出</div>
      <div v-for="w in store.wrong" :key="wrongKey(w)" class="wcard pcard">
        <div class="wq">
          <span class="seal bamboo">{{ w.type }}</span>
          <span class="qtext">{{ w.q }}</span>
        </div>
        <div class="wopts">
          <div
            v-for="(opt, i) in w.options" :key="i"
            class="wopt"
            :class="{
              right: redone[wrongKey(w)] !== undefined && i === w.answer,
              wrongpick: redone[wrongKey(w)] === i && i !== w.answer
            }"
            @click="redo(w, i)"
          >
            <span class="ab">{{ 'ABCD'[i] }}</span>{{ opt }}
          </div>
        </div>
        <div v-if="redone[wrongKey(w)] !== undefined" class="wfb">
          <template v-if="redone[wrongKey(w)] === w.answer">✓ 重做正确，正在移出错题本…</template>
          <template v-else>✗ 仍不对 —— 正确答案：{{ w.options[w.answer] }}</template>
        </div>
        <div class="wact">
          <span class="wsrc" @click="$router.push(`/formula/${w.fid}`)">查看「{{ nameOf(w.fid) }}」详情 →</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { showToast } from 'vant'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const store = useStudyStore()
/** 稳定键 → 所选选项下标；不随列表删除而错位 */
const redone = reactive({})

function wrongKey(w) {
  return w.uid || `${w.fid}|${w.ts}|${w.q}`
}

function nameOf(fid) {
  return props.data.byId[fid]?.name || '该方'
}

function redo(item, i) {
  const key = wrongKey(item)
  if (redone[key] !== undefined) return
  redone[key] = i
  if (i !== item.answer) return
  setTimeout(() => {
    const idx = store.wrong.findIndex((w) => wrongKey(w) === key)
    if (idx >= 0) store.removeWrong(idx)
    delete redone[key]
    showToast('已移出错题本')
  }, 800)
}
</script>

<style scoped>
.tip { text-align: center; font-size: 12px; color: var(--ink-light); padding: 10px 0; }
.empty-go { text-align: center; margin-top: -20px; }
.wcard { padding: 14px; margin-bottom: 12px; }
.wq { display: flex; gap: 8px; align-items: flex-start; }
.qtext { font-size: 14px; line-height: 1.8; flex: 1; }
.wopts { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.wopt { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; font-size: 14px; background: var(--card); }
.wopt .ab { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--ink-light); color: var(--ink-light);
  display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.wopt.right { border: 2px solid var(--cinnabar); background: #fbf1ea; }
.wopt.right .ab { background: var(--cinnabar); border-color: var(--cinnabar); color: #f8ecd9; }
.wopt.wrongpick { border: 2px solid var(--ink-light); opacity: 0.7; }
.wfb { margin-top: 10px; font-size: 13px; color: var(--cinnabar); }
.wact { margin-top: 10px; display: flex; justify-content: space-between; font-size: 12px; }
.wsrc { color: var(--bamboo); }
.wrm { color: var(--cinnabar); }
</style>
