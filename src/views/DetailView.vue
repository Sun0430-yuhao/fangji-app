<template>
  <div
    class="page no-tab detail"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <van-nav-bar left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon
          :name="isFav ? 'like' : 'like-o'"
          :color="isFav ? '#b03a2e' : '#7d7466'"
          size="20"
          @click="toggleFav"
        />
      </template>
    </van-nav-bar>

    <div class="wrap" v-if="f">
      <div class="title-row">
        <h1>{{ f.name }}</h1>
        <span class="src">《{{ f.source || '佚名' }}》</span>
      </div>
      <div class="crumbs">
        {{ f.chapterName }} <b>·</b> {{ f.section || '未分类' }}
        <b>·</b> {{ inDeck ? '已加入背诵' : '未加入背诵' }}
        <template v-if="chapterList.length">
          <b>·</b> {{ indexLabel }}
        </template>
      </div>

      <div class="block">
        <div class="block-h"><span class="seal">组成</span><span class="en">君臣佐使</span></div>
        <div class="comp pcard" v-if="f.composition && f.composition.length">
          <div class="row" v-for="(c, i) in f.composition" :key="i">
            <span class="role" :class="roleClass(c.role)">{{ c.role }}</span>
            <span class="herbs">{{ c.herbs || '暂无' }}</span>
          </div>
        </div>
        <div v-else class="none">暂无组成拆分（此方为附方，详见歌诀与主治）</div>
      </div>

      <div class="block">
        <div class="block-h"><span class="seal">功用</span></div>
        <p class="para">{{ f.function || '暂无' }}</p>
      </div>

      <div class="block">
        <div class="block-h"><span class="seal">主治</span></div>
        <p class="para">{{ f.indication || '暂无' }}</p>
      </div>

      <div class="block">
        <div class="block-h"><span class="seal">歌诀</span></div>
        <div class="verse-card" v-if="f.verse"><p>{{ f.verse }}</p></div>
        <div v-else class="none">暂无歌诀</div>
      </div>

      <div class="block" v-if="f.note">
        <div class="block-h"><span class="seal">注意</span></div>
        <p class="para note">{{ f.note }}</p>
      </div>
      <div class="block" v-if="f.usage">
        <div class="block-h"><span class="seal">用法</span></div>
        <p class="para note">{{ f.usage }}</p>
      </div>

      <div class="cta">
        <van-button type="primary" round block size="large" @click="toggleDeck">
          {{ inDeck ? '移出背诵' : '加入背诵' }}
        </van-button>
        <van-button
          v-if="chapterList.length"
          round
          block
          size="large"
          class="pick-btn"
          @click="openPicker"
        >
          本章选方背诵
        </van-button>
      </div>
    </div>

    <van-empty v-else description="没有找到这首方剂，返回重试" />

    <!-- 本章顺序翻页 -->
    <div class="pager" v-if="f && chapterList.length > 1">
      <button class="pg-btn" type="button" :disabled="!hasPrev" @click="goPrev">上一首</button>
      <button class="pg-mid" type="button" @click="openPicker">{{ indexLabel }} · 选方</button>
      <button class="pg-btn" type="button" :disabled="!hasNext" @click="goNext">下一首</button>
    </div>

    <!-- 本章多选加入背诵 -->
    <van-popup v-model:show="pickerShow" position="bottom" round :style="{ height: '72%' }">
      <div class="picker">
        <div class="picker-hd">
          <span>本章选方背诵</span>
          <button type="button" class="link" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</button>
        </div>
        <div class="picker-tip">勾选要加入背诵牌组的方剂，可多选</div>
        <van-checkbox-group v-model="picked" class="picker-list">
          <div v-for="item in chapterList" :key="item.id" class="picker-row">
            <van-checkbox :name="item.id" shape="square">
              <span class="pick-name">{{ item.name }}</span>
            </van-checkbox>
            <span class="tag" v-if="store.inDeck(item.id)">已在组</span>
          </div>
        </van-checkbox-group>
        <div class="picker-ft">
          <van-button round block type="primary" @click="confirmPick">
            加入所选（{{ picked.length }}）
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const route = useRoute()
const router = useRouter()
const store = useStudyStore()

const pickerShow = ref(false)
const picked = ref([])
const touchX = ref(0)

const f = computed(() => props.data.byId[route.params.id] || null)
const isFav = computed(() => f.value && store.favoriteSet.has(f.value.id))
const inDeck = computed(() => f.value && store.inDeck(f.value.id))

const chapterList = computed(() => {
  if (!f.value) return []
  const ch = props.data.chapters.find((c) => c.id === f.value.chapterId)
  return ch?.formulas || []
})

const curIndex = computed(() => {
  if (!f.value) return -1
  return chapterList.value.findIndex((x) => x.id === f.value.id)
})

const indexLabel = computed(() => {
  if (curIndex.value < 0 || !chapterList.value.length) return ''
  return `${curIndex.value + 1}/${chapterList.value.length}`
})

const hasPrev = computed(() => curIndex.value > 0)
const hasNext = computed(() => curIndex.value >= 0 && curIndex.value < chapterList.value.length - 1)

const allSelected = computed(() =>
  chapterList.value.length > 0 && picked.value.length === chapterList.value.length
)

watch(
  () => route.params.id,
  () => {
    // 换方后滚回顶部
    try {
      window.scrollTo?.(0, 0)
      document.querySelector('.page.detail')?.scrollTo?.(0, 0)
    } catch (_) {}
  }
)

function roleClass(role) {
  if (role === '君') return 'jun'
  if (role === '臣') return 'chen'
  if (role.startsWith('佐')) return 'zuo'
  return 'shi'
}

function toggleFav() {
  if (!f.value) return
  store.toggleFavorite(f.value.id)
  showToast(isFav.value ? '已收藏' : '已取消收藏')
}

function toggleDeck() {
  if (!f.value) return
  if (inDeck.value) {
    store.removeFromDeck(f.value.id)
    showToast('已移出背诵')
  } else {
    store.addToDeck(f.value.id)
    store.markLearned(f.value.id)
    showToast('已加入背诵')
  }
}

function goToIndex(i) {
  const item = chapterList.value[i]
  if (!item) return
  router.replace(`/formula/${item.id}`)
}

function goPrev() {
  if (!hasPrev.value) return
  goToIndex(curIndex.value - 1)
}

function goNext() {
  if (!hasNext.value) return
  goToIndex(curIndex.value + 1)
}

function onTouchStart(e) {
  touchX.value = e.changedTouches?.[0]?.clientX ?? 0
}

function onTouchEnd(e) {
  const x = e.changedTouches?.[0]?.clientX ?? 0
  const dx = x - touchX.value
  if (Math.abs(dx) < 56) return
  if (dx < 0) goNext()
  else goPrev()
}

function openPicker() {
  picked.value = chapterList.value.filter((x) => store.inDeck(x.id)).map((x) => x.id)
  pickerShow.value = true
}

function toggleSelectAll() {
  if (allSelected.value) picked.value = []
  else picked.value = chapterList.value.map((x) => x.id)
}

function confirmPick() {
  const n = store.addManyToDeck(picked.value)
  pickerShow.value = false
  if (n) showToast(`已加入 ${n} 首方剂`)
  else showToast('所选方剂均已在背诵组中')
}
</script>

<style scoped>
.detail { padding-bottom: 72px; }
.title-row { display: flex; align-items: baseline; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
.title-row h1 { font-size: 28px; letter-spacing: 3px; margin: 0; }
.title-row .src { font-size: 13px; color: var(--ink-light); }
.crumbs { font-size: 11px; color: var(--ink-light); margin-top: 6px; letter-spacing: 1px; }
.crumbs b { color: var(--cinnabar); font-weight: 500; }

.block { margin-top: 14px; }
.block-h { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.block-h .en { font-size: 11px; color: var(--ink-light); letter-spacing: 2px; }

.comp { overflow: hidden; }
.comp .row { display: flex; align-items: center; padding: 9px 14px; border-bottom: 1px dashed var(--line); }
.comp .row:last-child { border-bottom: none; }
.role { width: 26px; height: 26px; border-radius: 5px; background: var(--cinnabar); color: #f8ecd9;
  display: inline-flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
.role.chen { background: #9c4a3c; }
.role.zuo { background: var(--amber); }
.role.shi { background: var(--bamboo); }
.herbs { margin-left: 12px; font-size: 15px; letter-spacing: 1px; line-height: 1.6; }

.para { font-size: 14px; line-height: 1.9; margin: 0; }
.para.note { color: var(--ink-light); font-size: 13px; }
.none { font-size: 13px; color: var(--ink-light); padding: 10px 2px; }

.verse-card {
  background: linear-gradient(135deg, #f1e7cf, #ece0c2);
  border-radius: 12px; padding: 14px 16px; border-left: 4px solid var(--cinnabar);
}
.verse-card p { font-size: 15px; line-height: 2.0; letter-spacing: 2px; margin: 0; }

.cta { margin: 22px 0 8px; display: flex; flex-direction: column; gap: 10px; }
.pick-btn {
  border: 1.5px solid var(--cinnabar) !important;
  color: var(--cinnabar) !important;
  background: transparent !important;
}

.pager {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  display: flex; gap: 8px; align-items: center;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: rgba(244, 238, 225, 0.96);
  border-top: 1px solid var(--line);
  backdrop-filter: blur(8px);
}
.pg-btn, .pg-mid {
  border: none; border-radius: 999px; font-size: 14px; letter-spacing: 1px;
  padding: 10px 12px; cursor: pointer;
}
.pg-btn {
  flex: 0 0 auto; min-width: 76px;
  background: var(--cinnabar); color: #f8ecd9;
}
.pg-btn:disabled { opacity: 0.35; cursor: default; }
.pg-mid {
  flex: 1; background: var(--card-dark, #ece3cd); color: var(--ink);
}

.picker { display: flex; flex-direction: column; height: 100%; padding: 14px 16px 12px; box-sizing: border-box; }
.picker-hd {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 16px; font-weight: 600; letter-spacing: 1px;
}
.picker-hd .link {
  border: none; background: none; color: var(--cinnabar); font-size: 13px; padding: 4px 0; cursor: pointer;
}
.picker-tip { font-size: 12px; color: var(--ink-light); margin: 8px 0 10px; }
.picker-list { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; }
.picker-row {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 4px; border-bottom: 1px solid var(--line);
}
.picker-row :deep(.van-checkbox) { flex: 1; align-items: center; }
.pick-name { font-size: 15px; letter-spacing: 1px; }
.picker-row .tag {
  flex-shrink: 0; font-size: 11px; color: var(--cinnabar);
  background: rgba(176, 58, 46, 0.08); padding: 2px 8px; border-radius: 999px;
}
.picker-ft { padding-top: 12px; }
</style>
