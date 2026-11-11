import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import ChapterView from './views/ChapterView.vue'
import DetailView from './views/DetailView.vue'
import StudyView from './views/StudyView.vue'
import QuizView from './views/QuizView.vue'
import ProfileView from './views/ProfileView.vue'
import WrongView from './views/WrongView.vue'
import FavoritesView from './views/FavoritesView.vue'

// Capacitor IIFE 包禁止路由懒加载：动态 import 在 Android WebView 会永久挂起
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { tab: 0, title: '方剂学' } },
  { path: '/chapter/:id', name: 'chapter', component: ChapterView, meta: { title: '章节' } },
  { path: '/formula/:id', name: 'formula', component: DetailView, meta: { title: '方剂详情' } },
  { path: '/study', name: 'study', component: StudyView, meta: { tab: 1, title: '卡片背诵' } },
  { path: '/quiz', name: 'quiz', component: QuizView, meta: { tab: 2, title: '自测刷题' } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { tab: 3, title: '我的' } },
  { path: '/wrong', name: 'wrong', component: WrongView, meta: { title: '错题本' } },
  { path: '/favorites', name: 'favorites', component: FavoritesView, meta: { title: '我的收藏' } }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 方剂学` : '方剂学'
})
