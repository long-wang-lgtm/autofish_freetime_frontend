'use client'

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { LineSeriesOption } from 'echarts/charts'
import { useChart } from '@/components/ui/chart/useChart'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import {
  HISTORY_DAY_LINE_COLORS,
  HISTORY_LINE_WIDTH,
  LINE_SMOOTH,
  METRIC_ORDER_AMOUNT,
  METRIC_ORDER_COUNT,
  TODAY_AREA_ALPHA,
  TODAY_LINE_WIDTH,
  withAlpha,
} from '@/lib/constants/chart-theme'
import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import {
  AXIS_LABEL_FONT_SIZE,
  axisAmountLabel,
  axisCountLabel,
  niceAxisMax,
  seriesMax,
  sharedAxisGutter,
} from '@/lib/utils/chart-axis'
import { markerDot, tipHeader } from '@/lib/utils/chart-tooltip'
import type { HourlyData } from '@/hooks/useDashboardMetrics'

const CARD =
  'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4'
const CARD_TITLE =
  'text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3'

/** 上下两个子图的分界 */
const SPLIT_TOP = '54%'

interface HourlyAreaChartProps {
  hourly: HourlyData
  height?: number
  loading?: boolean
}

/**
 * 第 d 天（0 最早、末位最新）的线色：今日＝指标实色，历史日＝灰阶（离今日越近越深）。
 * 历史日按「从最新一天往回数第几天」取灰阶，天数多于灰阶档数时统一用最深那档。
 */
function dayLineColor(metric: string, d: number, last: number): string {
  if (d === last) return metric
  const back = Math.min(last - d, HISTORY_DAY_LINE_COLORS.length)
  return HISTORY_DAY_LINE_COLORS[HISTORY_DAY_LINE_COLORS.length - back]
}

/**
 * 一天里最后一个有数据的小时（没数据 → -1，整条不画）。
 * 用它当今日的渲染截止：数据到哪一小时就画到哪一小时。
 */
function lastHourOf(s: { count: number[]; payamt: number[] }): number {
  for (let h = s.count.length - 1; h >= 0; h--) {
    if (s.count[h] > 0 || s.payamt[h] > 0) return h
  }
  return -1
}

/**
 * 今日只画到「数据实际到的那一小时」：之后的点还没发生，补 null 断线
 * （补 0 会画出一条「夜里归零」的假线，看着像今日已经收摊）
 */
function cutAfter(values: number[], endHour: number): (number | null)[] {
  return values.map((v, h) => (h <= endHour ? v : null))
}

/**
 * 分时段成交分布：近 3 日各一条线，销量与销售额共享 0-23 时轴，
 * 上下两个子图各自独立值轴。图例即日期。
 *
 * 配色是「今日为主角」：今日用指标实色 + 加粗 + 面积，历史日退到灰阶细线——
 * 三条线同色浅阶叠在一起是分不开今昔的。
 *
 * 今日（数据里最新的一天）数据不完整：只画到该天最后一个有数据的小时。
 * 截止点取自数据本身（行里带着 date + hour），不看本地时钟——机器时间跟业务数据不是一个口径。
 */
export function HourlyAreaChart({
  hourly,
  height = 320,
  loading = false,
}: HourlyAreaChartProps) {
  const option = useMemo<EChartsOption | null>(() => {
    if (hourly.series.length === 0) return null

    const last = hourly.series.length - 1
    /** 第 d 天渲染到几点：最新一天数据到哪算哪，历史日是完整的一天 */
    const endHourOf = (d: number) => (d === last ? lastHourOf(hourly.series[last]) : 23)

    const series: LineSeriesOption[] = []
    hourly.series.forEach((s, d) => {
      const isToday = d === last
      const countColor = dayLineColor(METRIC_ORDER_COUNT, d, last)
      const amountColor = dayLineColor(METRIC_ORDER_AMOUNT, d, last)
      const lineWidth = isToday ? TODAY_LINE_WIDTH : HISTORY_LINE_WIDTH
      const end = endHourOf(d)
      series.push({
        name: s.label,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: cutAfter(s.count, end),
        color: countColor,
        lineStyle: { color: countColor, width: lineWidth },
        itemStyle: { color: countColor },
        areaStyle: isToday
          ? { color: withAlpha(METRIC_ORDER_COUNT, TODAY_AREA_ALPHA) }
          : undefined,
        smooth: LINE_SMOOTH,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 5,
      })
      series.push({
        name: s.label,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: cutAfter(s.payamt, end),
        color: amountColor,
        lineStyle: { color: amountColor, width: lineWidth },
        itemStyle: { color: amountColor },
        areaStyle: isToday
          ? { color: withAlpha(METRIC_ORDER_AMOUNT, TODAY_AREA_ALPHA) }
          : undefined,
        smooth: LINE_SMOOTH,
        smoothMonotone: 'x',
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 5,
      })
    })

    // 两张值轴的上限与公共标签列宽：上限定死 → 最宽刻度就是上限那一个 → 量得准
    const countAxisMax = niceAxisMax(
      seriesMax(hourly.series.flatMap((s) => s.count)),
    )
    const amountAxisMax = niceAxisMax(
      seriesMax(hourly.series.flatMap((s) => s.payamt)),
    )
    const gutter = sharedAxisGutter([
      axisCountLabel(countAxisMax),
      axisAmountLabel(amountAxisMax),
    ])

    // 刻度直接用补零的小时数（"00"~"23"）：比 "00:00" 窄一半多，24 个点才铺得下、不用抽稀
    const hourLabels = hourly.hours

    return {
      grid: [
        { left: gutter, right: 16, top: 40, height: '32%' },
        { left: gutter, right: 16, top: SPLIT_TOP, bottom: 30 },
      ],
      legend: {
        top: 0,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#6b7280' },
        data: hourly.series.map((s) => s.label),
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params: unknown) => {
          const axisValue = (params as { axisValue: string }[])[0]?.axisValue
          if (axisValue === undefined) return ''
          const i = hourLabels.indexOf(axisValue)
          if (i < 0) return ''
          // 今日未到的小时没有数据：显示 "—" 而不是 0（0 会被读成"这一小时没成交"）
          const cell = (v: number | null, fmt: (n: number) => string) =>
            v === null ? '—' : fmt(v)
          const rows = hourly.series
            .map((s, d) => {
              const done = i <= endHourOf(d)
              return {
                s,
                dot: dayLineColor(METRIC_ORDER_COUNT, d, last),
                count: done ? s.count[i] : null,
                payamt: done ? s.payamt[i] : null,
              }
            })
            .sort((a, b) => (b.count ?? -1) - (a.count ?? -1))
            .map(
              (r) =>
                `${markerDot(r.dot)}${r.s.label}　${cell(r.count, (n) => `${fmtNumber(n)} 单`)}　${cell(r.payamt, fmtPrice)}`,
            )
          // 刻度是纯小时数（"14"），tooltip 头补回 ":00" 才不至于像日期序号
          return tipHeader(`${axisValue}:00　（上：销量　下：销售额）`) + rows.join('<br/>')
        },
      },
      xAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: hourLabels,
          boundaryGap: false,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: hourLabels,
          boundaryGap: false,
          axisLine: { show: false },
          axisTick: { show: false },
          // 24 个点全给刻度：整数标签够窄，铺得下
          interval: 0,
          axisLabel: { fontSize: 11, color: '#9ca3af' },
        },
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          minInterval: 1,
          max: countAxisMax,
          name: '销量',
          nameGap: 8,
          nameTextStyle: { fontSize: 12, color: '#6b7280', align: 'left' },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: AXIS_LABEL_FONT_SIZE,
            color: '#9ca3af',
            formatter: axisCountLabel,
          },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          gridIndex: 1,
          minInterval: 1,
          max: amountAxisMax,
          name: '销售额',
          nameGap: 8,
          nameTextStyle: { fontSize: 12, color: '#6b7280', align: 'left' },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: AXIS_LABEL_FONT_SIZE,
            color: '#9ca3af',
            formatter: axisAmountLabel,
          },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
      ],
      series,
    }
  }, [hourly])

  const chartRef = useChart<HTMLDivElement>(option, [option])

  if (loading) {
    return (
      <div className={CARD}>
        <h3 className={CARD_TITLE}>分时段成交 · 近 3 日</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  if (!option) {
    return (
      <div className={CARD}>
        <h3 className={CARD_TITLE}>分时段成交 · 近 3 日</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <EmptyState size="sm" title="暂无订单" description="所选账号近 3 日没有订单" />
        </div>
      </div>
    )
  }

  return (
    <div className={CARD}>
      <h3 className={CARD_TITLE}>分时段成交 · 近 3 日</h3>
      <div ref={chartRef} className="w-full" style={{ height }} />
    </div>
  )
}
