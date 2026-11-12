// 按需注册：禁止 import 'vant/lib/index.css' 全量样式（安卓 WebView 会卡死）
import {
  ActionSheet,
  Button,
  Checkbox,
  CheckboxGroup,
  Circle,
  Dialog,
  Empty,
  Field,
  Icon,
  NavBar,
  NoticeBar,
  Popup,
  Search,
  Tabbar,
  TabbarItem
} from 'vant'

import 'vant/es/action-sheet/style'
import 'vant/es/button/style'
import 'vant/es/checkbox/style'
import 'vant/es/checkbox-group/style'
import 'vant/es/circle/style'
import 'vant/es/dialog/style'
import 'vant/es/empty/style'
import 'vant/es/field/style'
import 'vant/es/icon/style'
import 'vant/es/nav-bar/style'
import 'vant/es/notice-bar/style'
import 'vant/es/popup/style'
import 'vant/es/search/style'
import 'vant/es/tabbar/style'
import 'vant/es/tabbar-item/style'
import 'vant/es/toast/style'

const components = [
  ActionSheet,
  Button,
  Checkbox,
  CheckboxGroup,
  Circle,
  Dialog,
  Empty,
  Field,
  Icon,
  NavBar,
  NoticeBar,
  Popup,
  Search,
  Tabbar,
  TabbarItem
]

export function useVant(app) {
  components.forEach((c) => app.use(c))
}
