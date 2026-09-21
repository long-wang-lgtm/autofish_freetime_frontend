'use client'

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { LineSeriesOption } from 'echarts/charts'
import { useChart } from '@/components/ui/chart/useChart'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import {
  METRIC_ORDER_AMOUNT,
  METRIC_ORDER_COUNT,
  RECENT_DAY_LINE_ALPHA,
  withAlpha,
} from '@/lib/constants/chart-theme'
import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import { markerDot, tipHeader } from '@/lib/utils/chart-tooltip'
import type { HourlyData } from '@/hooks/useDashboardMetrics'

const CARD =
  'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4'
const CARD_TITLE =
  'text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3'

/** 上下两个子图的分界 */
const SPLIT_TOP = '54%'
/** 面积填充透明度 */
const AREA_ALPHA = 0.16

interface HourlyAreaChartProps {
  hourly: HourlyData
  height?: number
  loading?: boolean
}

/** 第 d 天（0 最早、末位今日）的透明度：越新越实 */
function dayAlpha(d: number): number {
  return RECENT_DAY_LINE_ALPHA[Math.min(d, RECENT_DAY_LINE_ALPHA.length - 1)]
}

/**
 * 分时段成交分布：近 3 日各一条面积线，销量与销售额共享 0-23 时轴，
 * 上下两个子图各自独立值轴。图例即日期。
 *
 * 配色沿用条形图的「今日为主角」语言：同一指标内按日期由浅到深，今日实色。
 */
export function HourlyAreaChart({
  hourly,
  height = 320,
  loading = false,
}: HourlyAreaChartProps) {
  const option = useMemo<EChartsOption | null>(() => {
    if (hourly.series.length === 0) return null

    const series: LineSeriesOption[] = []
    hourly.series.forEach((s, d) => {
      const alpha = dayAlpha(d)
      const countColor = withAlpha(METRIC_ORDER_COUNT, alpha)
      const amountColor = withAlpha(METRIC_ORDER_AMOUNT, alpha)
      series.push({
        name: s.label,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: s.count,
        color: countColor,
        lineStyle: { color: countColor, width: 2 },
        itemStyle: { color: countColor },
        areaStyle: { color: withAlpha(METRIC_ORDER_COUNT, alpha * AREA_ALPHA) },
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 5,
      })
      series.push({
        name: s.label,
        type: 'line',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: s.payamt,
        color: amountColor,
        lineStyle: { color: amountColor, width: 2 },
        itemStyle: { color: amountColor },
        areaStyle: {
          color: withAlpha(METRIC_ORDER_AMOUNT, alpha * AREA_ALPHA),
        },
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 5,
      })
    })

    const hourLabels = hourly.hours.map((h) => `${h}:00`)

    return {
      grid: [
        { left: 12, right: 16, top: 40, height: '32%' },
        { left: 12, right: 16, top: SPLIT_TOP, bottom: 30 },
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
          const rows = hourly.series
            .map((s, d) => ({
              s,
              dot: withAlpha(METRIC_ORDER_COUNT, dayAlpha(d)),
              count: s.count[i] ?? 0,
              payamt: s.payamt[i] ?? 0,
            }))
            .sort((a, b) => b.count - a.count)
            .map(
              (r) =>
                `${markerDot(r.dot)}${r.s.label}　${fmtNumber(r.count)} 单　${fmtPrice(r.payamt)}`,
            )
          return tipHeader(`${axisValue}　（上：销量　下：销售额）`) + rows.join('<br/>')
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
          // 24 个标签全展示会重叠，按 3 小时一档抽稀
          interval: 2,
          axisLabel: { fontSize: 11, color: '#9ca3af' },
        },
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          minInterval: 1,
          name: '销量',
          nameGap: 8,
          nameTextStyle: { fontSize: 12, color: '#6b7280', align: 'left' },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 11,
            color: '#9ca3af',
            formatter: (v: unknown) => fmtNumber(Number(v)),
          },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          gridIndex: 1,
          name: '销售额',
          nameGap: 8,
          nameTextStyle: { fontSize: 12, color: '#6b7280', align: 'left' },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 11,
            color: '#9ca3af',
            formatter: (v: unknown) => fmtPrice(Number(v)),
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
