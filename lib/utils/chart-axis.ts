/**
 * 值轴排版——上下两个子图的 x 轴要对齐，前提是两个绘图区的左边界分毫不差。
 *
 * ECharts 的规则（2026-09 实测）：绘图区左边界 = max(grid.left, 最宽刻度标签宽 + axisLabel.margin)
 * ——标签在 grid.left 里放不下时，它自己把绘图区往右推。
 * 销量轴标签是短整数、销售额轴带 ¥ 更长，于是上下两个子图各推各的，
 * 两条 x 轴就此错位（实测分时段成交差 16px、每日趋势差 8px）。
 *
 * 解法：刻度上限自己定（整档，顺带控住顶部留白），最宽标签自己量，
 * 两个子图共用「最宽的那个」当标签列宽——放得下就不会再被推。
 */
import { fmtNumber, fmtPriceInt } from './format'
import { measureTextWidth } from './text'

/** 刻度标签字号：必须与 yAxis.axisLabel.fontSize 一致，量宽才对得上 */
export const AXIS_LABEL_FONT_SIZE = 11
/** 刻度标签与轴线的间距（ECharts axisLabel.margin 默认值，实测 8px） */
export const AXIS_LABEL_MARGIN = 8
/** 量宽余量：字形两侧留有边距，measureText 量到的比实排占宽略小 */
const GUTTER_SLACK = 4

/** 销量轴刻度：整数即可 */
export const axisCountLabel = (v: unknown) => fmtNumber(Math.round(Number(v)))

/** 销售额轴刻度：整数即可（金额不分角分） */
export const axisAmountLabel = (v: unknown) => fmtPriceInt(Number(v))

/** 值轴上限阶梯：1/1.25/1.5/2/2.5/3/4/5/6/8/10 × 10^k，最多留 25% 顶部余量 */
const MAX_LADDER = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/**
 * 值轴上限：把数据最大值抬到最近的整档。
 *
 * 定死上限有两个好处：① 顶部留白可预期 —— 曲线平滑后不会顶破边；
 * ② 最宽的刻度标签就是上限那一个，量标签列宽时不必去猜 ECharts 会取到多大的刻度。
 */
export function niceAxisMax(v: number): number {
  if (!(v > 0)) return 1
  const exp = Math.floor(Math.log10(v))
  const base = v / 10 ** exp
  const step = MAX_LADDER.find((s) => s >= base) ?? MAX_LADDER[MAX_LADDER.length - 1]
  return Math.max(1, step * 10 ** exp)
}

/** 定值轴上限用：一组数值的最大值（空数组或全 0 → 0） */
export function seriesMax(values: number[]): number {
  let max = 0
  for (const v of values) if (v > max) max = v
  return max
}

/** 最大值所在下标（定数据标签的关键点用；空数组 → 0） */
export function seriesMaxIndex(values: number[]): number {
  let best = 0
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i
  return best
}

/**
 * 数据标签取点：必标的关键点 + 等距中间点，密度控制就落在这个等距步长上
 * （点数 ÷ maxMiddle 向上取整，步长至少 2）。
 *
 * 与关键点相邻的中间点一律丢掉——上下两个标签贴在一起必然叠字。
 * 返回升序下标。
 */
export function labelIndices(
  values: number[],
  keys: number[],
  maxMiddle: number,
): number[] {
  const n = values.length
  if (n === 0) return []
  const keyList = Array.from(keys.filter((i) => i >= 0 && i < n))
  const nearKey = (i: number) => keyList.some((k) => Math.abs(k - i) <= 1)
  const step = Math.max(2, Math.ceil((n - 1) / Math.max(1, maxMiddle)))
  const picked = new Set(keyList)
  for (let i = n - 1 - step; i > 0; i -= step) if (!nearKey(i)) picked.add(i)
  return Array.from(picked).sort((a, b) => a - b)
}

/**
 * 上下子图共用的标签列宽（px）：取两张值轴里最宽的那个刻度标签。
 * 各算各的就会错位——那正是这张图要修的问题。
 */
export function sharedAxisGutter(labels: string[]): number {
  let widest = 0
  for (const label of labels) {
    const w = measureTextWidth(label, AXIS_LABEL_FONT_SIZE)
    if (w > widest) widest = w
  }
  return Math.ceil(widest) + AXIS_LABEL_MARGIN + GUTTER_SLACK
}
