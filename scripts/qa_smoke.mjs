/**
 * 方剂学 App — 自动化冒烟（逻辑层）
 * 覆盖：数据完整性、挖空、选方名前置条件、进度目标、忘记重插逻辑模拟
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const data = JSON.parse(fs.readFileSync(path.join(root, 'public/data/formulas.json'), 'utf8'))

let pass = 0
let fail = 0
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗', name, detail) }
}

console.log('\n=== 1. 数据完整性 ===')
const chapters = data.chapters || []
const flat = []
for (const ch of chapters) {
  for (const f of ch.formulas || []) {
    flat.push({ ...f, chapterId: ch.id ?? ch.name, chapterName: ch.name })
  }
}
ok('章节数 > 0', chapters.length > 0, String(chapters.length))
ok('方剂总数 > 100', flat.length > 100, String(flat.length))
ok('每方有 id/name', flat.every(f => f.id && f.name))
const withVerse = flat.filter(f => f.verse)
const withComp = flat.filter(f => f.composition?.length)
const withFunc = flat.filter(f => f.function)
ok('多数有歌诀', withVerse.length / flat.length > 0.7, `${withVerse.length}/${flat.length}`)
ok('多数有组成', withComp.length / flat.length > 0.5, `${withComp.length}/${flat.length}`)
ok('多数有功用', withFunc.length / flat.length > 0.7, `${withFunc.length}/${flat.length}`)

console.log('\n=== 2. 歌诀挖空覆盖率 ===')
function clozeBlank(f) {
  if (!f.verse) return null
  if (f.verse.includes(f.name)) return { answer: f.name }
  const short = f.name.replace(/(汤|散|丸|饮|膏|丹)$/, '')
  if (short.length >= 2 && f.verse.includes(short)) return { answer: short }
  return null
}
const clozeOk = flat.filter(f => clozeBlank(f))
ok('挖空可用占比 > 50%', clozeOk.length / flat.length > 0.5, `${clozeOk.length}/${flat.length}`)
ok('麻黄汤可挖空', !!clozeBlank(flat.find(f => f.name === '麻黄汤')))

console.log('\n=== 3. 选方名前置 ===')
function canPick(f) {
  return !!(f.function || (f.composition && f.composition.length))
}
ok('选方名可用占比 > 70%', flat.filter(canPick).length / flat.length > 0.7)

console.log('\n=== 4. 今日目标逻辑 ===')
function todayGoalsDone(studyCount, quizCount, sg, qg) {
  return studyCount >= sg && quizCount >= qg
}
ok('未完成', !todayGoalsDone(10, 5, 30, 20))
ok('刚好完成', todayGoalsDone(30, 20, 30, 20))
ok('超额完成', todayGoalsDone(40, 25, 30, 20))

console.log('\n=== 5. 忘记重插模拟 ===')
function reinsert(deck, index) {
  const card = deck[index]
  const insertAt = Math.min(index + 3, deck.length)
  const next = [...deck]
  next.splice(insertAt, 0, card)
  return { next, nextIndex: index + 1, insertAt }
}
{
  const deck = ['A', 'B', 'C', 'D', 'E']
  const r = reinsert(deck, 0)
  ok('插在约第 3 位后', r.insertAt === 3 && r.next[3] === 'A', JSON.stringify(r.next))
  ok('前进到下一张', r.nextIndex === 1)
}
{
  const deck = ['Only']
  const r = reinsert(deck, 0)
  ok('末张忘记仍可续', r.next.length === 2 && r.next[1] === 'Only')
}

console.log('\n=== 6. 关键源码存在性 ===')
const must = [
  'src/native-back.js',
  'src/store.js',
  'src/views/StudyView.vue',
  'src/views/HomeView.vue',
  'src/views/QuizView.vue',
  'src/views/WrongView.vue',
  'src/views/ProfileView.vue',
  'public/icons/icon-512.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'
]
for (const f of must) {
  ok(f, fs.existsSync(path.join(root, f)))
}

console.log('\n=== 7. Store 关键字 ===')
const storeSrc = fs.readFileSync(path.join(root, 'src/store.js'), 'utf8')
ok('exportBackup', storeSrc.includes('exportBackup'))
ok('importBackup', storeSrc.includes('importBackup'))
ok('dailyStudyGoal', storeSrc.includes('dailyStudyGoal'))
ok('dailyQuizGoal', storeSrc.includes('dailyQuizGoal'))
ok('recordQuizAnswer', storeSrc.includes('recordQuizAnswer'))

const studySrc = fs.readFileSync(path.join(root, 'src/views/StudyView.vue'), 'utf8')
ok('多卡型 pick', studySrc.includes("mode === 'pick'"))
ok('多卡型 cloze', studySrc.includes("mode === 'cloze'") || studySrc.includes('歌诀挖空'))
ok('忘记重插', studySrc.includes('insertAt'))

const detailSrc = fs.readFileSync(path.join(root, 'src/views/DetailView.vue'), 'utf8')
ok('详情不再自动已学', !detailSrc.includes('浏览详情即计为已学') && !/if \(f\.value\) store\.markLearned/.test(detailSrc))

const wrongSrc = fs.readFileSync(path.join(root, 'src/views/WrongView.vue'), 'utf8')
ok('错题自动移出', wrongSrc.includes('setTimeout') && wrongSrc.includes('removeWrong'))
ok('错题态用稳定键 wrongKey', wrongSrc.includes('function wrongKey') && wrongSrc.includes('redone[wrongKey'))

console.log('\n=== 8. 交付阻断门禁（冷启动/闪屏/导出/出题）===')
const dataSrc = fs.readFileSync(path.join(root, 'src/data.js'), 'utf8')
ok('首屏读 embed 全局数据', dataSrc.includes('__FANGJI_DATA__') && dataSrc.includes('readEmbedded'))
ok('存在 gen_embed 脚本', fs.existsSync(path.join(root, 'scripts/gen_embed.mjs')))
ok('index 同步加载 embed.js', fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('data/embed.js'))
ok('build:cap 先 gen embed', String(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts['build:cap'] || '').includes('embed'))
ok('存在 SW 原生防护', fs.existsSync(path.join(root, 'src/sw-guard.js')))
const mainSrc = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8')
ok('启动时调用 sw-guard', mainSrc.includes('guardServiceWorker'))
const appSrc = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8')
ok('启动不 await SW', !/await\s+guardServiceWorker/.test(fs.readFileSync(path.join(root, 'src/main.js'), 'utf8')))
ok('index 含 boot-fallback', fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('boot-fallback'))
ok('载入页显示 build 戳', appSrc.includes('buildStamp') || appSrc.includes('loading-ver'))
ok('vite capacitor 单包 inlineDynamicImports', fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8').includes('inlineDynamicImports'))
const stylesXml = fs.readFileSync(path.join(root, 'android/app/src/main/res/values/styles.xml'), 'utf8')
ok('闪屏用 AnimatedIcon+纯色底', stylesXml.includes('windowSplashScreenAnimatedIcon') && stylesXml.includes('splash_background'))
ok('闪屏不再整图 android:background=@drawable/splash', !stylesXml.includes('android:background">@drawable/splash'))
ok('splash_icon.png 存在', fs.existsSync(path.join(root, 'android/app/src/main/res/drawable/splash_icon.png')))
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
ok('apk 走 build:cap（capacitor mode）', String(pkg.scripts?.apk || '').includes('build:cap'))
const viteSrc = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8')
ok('capacitor 模式不注入 PWA/SW 插件', viteSrc.includes('capBuild ? []') || viteSrc.includes('...(capBuild ? []'))
ok('存在 backup-io 分享/剪贴板导出', fs.existsSync(path.join(root, 'src/backup-io.js')))
const profileSrc = fs.readFileSync(path.join(root, 'src/views/ProfileView.vue'), 'utf8')
ok('导出走 exportProgressText', profileSrc.includes('exportProgressText'))
const quizSrc = fs.readFileSync(path.join(root, 'src/views/QuizView.vue'), 'utf8')
ok('刷题空态非永久生成中', quizSrc.includes('这一范围暂时出不了题') && !quizSrc.includes('题目生成中'))
ok('小章干扰项跨章补齐 samplePad', quizSrc.includes('samplePad') && quizSrc.includes('buildOptions'))
ok('无 window.prompt', !fs.readFileSync(path.join(root, 'src/views/HomeView.vue'), 'utf8').includes('window.prompt') && !quizSrc.includes('window.prompt'))
ok('错题写入带 uid', storeSrc.includes('uid'))
ok('章节可背全部 size:-1', fs.readFileSync(path.join(root, 'src/views/ChapterView.vue'), 'utf8').includes('size: -1'))

console.log(`\n======= 结果: ${pass} 通过 / ${fail} 失败 =======\n`)
if (fail) {
  console.log('※ 存在失败项时不得标记「可交付」。真机冷启动进首页是阻断项。默认禁止打包。\n')
}
process.exit(fail ? 1 : 0)
