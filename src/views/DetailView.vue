<template>
  <div class="page no-tab detail">
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
      <div class="crumbs">{{ f.chapterName }} <b>·</b> {{ f.section || '未分类' }} <b>·</b> {{ inDeck ? '已加入背诵' : '未加入背诵' }}</div>

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
        <van-button type="primary" round block size="large" :disabled="inDeck" @click="addDeck">
          {{ inDeck ? '已加入背诵' : '加入背诵' }}
        </van-button>
      </div>
    </div>

    <van-empty v-else description="没有找到这首方剂，返回重试" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useStudyStore } from '../store'

const props = defineProps({ data: { type: Object, required: true } })
const route = useRoute()
const store = useStudyStore()

const f = computed(() => props.data.byId[route.params.id] || null)
const isFav = computed(() => f.value && store.favoriteSet.has(f.value.id))
const inDeck = computed(() => f.value && store.inDeck(f.value.id))

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
function addDeck() {
  if (!f.value) return
  store.addToDeck(f.value.id)
  store.markLearned(f.value.id)
  showToast('已加入今日背诵')
}
</script>

<style scoped>
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

.cta { margin: 22px 0 8px; }
</style>
