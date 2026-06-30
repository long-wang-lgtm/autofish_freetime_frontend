/** 监控商品状态映射
 *
 * monitorStatus 枚举值：
 * - 0: PAUSED    已暂停  — 可点击激活
 * - 1: MONITORING 监控中 — 可点击暂停
 * - 2: ANALYZED   已分析 — 纯展示
 * - 4: STORED     已入库 — 纯展示
 *
 * 注：值 3 (PUBLISHED/已发布) 已移除，统一为 4 (STORED)。
 * 兼容：后端可能存在尚未迁移的 monitorStatus===3 数据，
 * STATUS_MAP[3] 为 undefined，fallback 显示 "-"。
 */
export const STATUS_MAP: Record<number, { label: string; dot: string; bg: string; text: string }> = {
  0: { label: '已暂停', dot: 'bg-gray-400',   bg: 'bg-gray-100',   text: 'text-gray-500' },
  1: { label: '监控中', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  2: { label: '已分析', dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  4: { label: '已入库', dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700' },
}

// ===== 异常标记展示配置（列表行 + 焦点卡片共用）=====

/** 异常展示类别（从 hourlyTrendUtils 的 AnomalyAlert.type 归类而来） */
export type AnomalyDisplayCategory = 'heat' | 'price' | 'inventory'

/** AnomalyAlert.type → AnomalyDisplayCategory 映射 */
export const ANOMALY_CATEGORY_MAP: Record<string, AnomalyDisplayCategory> = {
  inquiry_collapse:   'heat',
  data_volatile:      'heat',
  data_unstable:      'heat',
  browse_decline:     'heat',
  favorite_cliff:     'heat',
  zero_inquiry:       'heat',
  acceleration_heat:  'heat',
  price_drop:         'price',
  price_rise:         'price',
  extreme_if_ratio:   'inventory',
}

/** 类别展示样式 */
export const ANOMALY_DISPLAY: Record<AnomalyDisplayCategory, { label: string; bg: string; text: string }> = {
  heat:      { label: '🔥升温', bg: 'bg-amber-50',  text: 'text-amber-700' },
  price:     { label: '💰价格', bg: 'bg-red-50',     text: 'text-red-600' },
  inventory: { label: '📦库存', bg: 'bg-gray-100',   text: 'text-gray-500' },
}
