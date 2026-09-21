/**
 * ECharts tooltip 的公共片段
 *
 * 遵循 frontend-charts.md：tooltip 中的颜色标记必须与 series 实际色值一致，
 * 调用方传入的就是 series 上用的同一个颜色常量，不依赖 ECharts 自动配色。
 */

/** tooltip 行首的圆点色标 */
export function markerDot(color: string): string {
  return (
    `<span style="display:inline-block;width:8px;height:8px;` +
    `border-radius:50%;background:${color};margin-right:5px"></span>`
  )
}

/** tooltip 顶部的分类名（日期 / 小时） */
export function tipHeader(text: string): string {
  return `<div style="margin-bottom:3px;color:#6b7280">${text}</div>`
}
