/**
 * 图表配色常量
 *
 * 遵循 frontend-charts.md：图表色与 UI 交互色完全独立。
 * 所有图表的系列颜色、调色板必须从这里导入，禁止在图表组件中硬编码色值。
 */

/** 想要 / 转化率 — 核心转化指标 */
export const TREND_WANT = '#2563eb'

/** 浏览 — 流量指标 */
export const TREND_LOOK = '#d97706'

/** 收藏 / 询藏比 — 兴趣指标 */
export const TREND_COLLECT = '#7c3aed'

/** 订单销量（单）— 订单量指标 */
export const METRIC_ORDER_COUNT = TREND_WANT

/** 订单销售额（元）— 交易额指标 */
export const METRIC_ORDER_AMOUNT = TREND_LOOK

/**
 * 多系列调色板（10 色）
 *
 * 账号折线图、近 N 日面积图、用户分布饼图共用同一套，
 * 禁止在各图表组件中另行定义同名常量。
 */
export const USER_PALETTE = [
  '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
  '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#48C9B0',
] as const

/** 调色板用尽或"其他"分类使用的中性色 */
export const OTHER_COLOR = '#cccccc'

/**
 * 近 3 日条形配色：索引 0 最早（最浅），末位为今日（实色）。
 *
 * 用实色浅色阶而不是透明度：半透明色叠在白底上会发灰发脏，浅色阶更干净，
 * 且深灰的数值标注压在浅色条上仍然可读。末位直接引用指标色，避免两处漂移。
 */
export const ORDER_COUNT_RAMP = [
  '#bfdbfe',
  '#60a5fa',
  METRIC_ORDER_COUNT,
] as const

export const ORDER_AMOUNT_RAMP = [
  '#fde68a',
  '#fbbf24',
  METRIC_ORDER_AMOUNT,
] as const

/**
 * 近 3 日折线 / 面积图的透明度梯度。
 *
 * 线条比条形细，透明度下限不能太低，否则最早一天几乎看不见。
 */
export const RECENT_DAY_LINE_ALPHA = [0.4, 0.65, 1] as const

/** 趋势图通用透明色（面积图 fill） */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
