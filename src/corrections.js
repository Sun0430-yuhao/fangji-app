// 源数据校对修正表（解析后、入库前应用）
// 规则：nameExact 精确改名；nameContains 子串替换；fixSource 修出处
export const NAME_FIXES = [
  { from: '香酥散', to: '香苏散', reason: '通用名应为香苏散（《太平惠民和剂局方》）' },
  { from: '当归拈痛汤（拈痛汤', to: '当归拈痛汤（拈痛汤）', reason: '括号未闭合' }
]

export const SOURCE_FIXES = [
  // 示例：{ name: '某某汤', source: '伤寒论' }
]
