/**
 * 趋势图配色常量
 *
 * 遵循 frontend-charts.md：图表色与 UI 交互色完全独立。
 * 3 色体系：蓝（核心转化）、琥珀（流量）、紫罗兰（兴趣）。
 */

/** 想要 / 转化率 — 核心转化指标 */
export const TREND_WANT = '#2563eb'

/** 浏览 — 流量指标 */
export const TREND_LOOK = '#d97706'

/** 收藏 / 询藏比 — 兴趣指标 */
export const TREND_COLLECT = '#7c3aed'

/** 趋势图通用透明色（面积图 fill） */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
