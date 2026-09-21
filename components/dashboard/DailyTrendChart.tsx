'use client'

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { LineSeriesOption } from 'echarts/charts'
import { useChart } from '@/components/ui/chart/useChart'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import { markerDot, tipHeader } from '@/lib/utils/chart-tooltip'
import type { TrendData } from '@/hooks/useDashboardMetrics'

const CARD =
  'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4'
const CARD_TITLE =
  'text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3'

/** 上下两个子图的分界 */
const SPLIT_TOP = '54%'
/** 底部留给 x 轴标签 + 缩放滑块 */
const BOTTOM_INSET = 50

interface DailyTrendChartProps {
  trend: TrendData
  height?: number
  loading?: boolean
}

/**
 * 账号每日趋势：销量与销售额共享 x 日期轴，上下两个子图各自独立值轴。
 * 同名 series 分居两个子图，图例切换一次即可同时开关某个账号的两条线。
 */
export function DailyTrendChart({
  trend,
  height = 320,
  loading = false,
}: DailyTrendChartProps) {
  const option = useMemo<EChartsOption | null>(() => {
    if (trend.series.length === 0 || trend.dates.length === 0) return null

    const series: LineSeriesOption[] = []
    for (const s of trend.series) {
      series.push({
        name: s.label,
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: s.count,
        color: s.color,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
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
        color: s.color,
        lineStyle: { color: s.color, width: 2 },
        itemStyle: { color: s.color },
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 5,
      })
    }

    return {
      grid: [
        { left: 12, right: 16, top: 40, height: '32%' },
        { left: 12, right: 16, top: SPLIT_TOP, bottom: BOTTOM_INSET },
      ],
      legend: {
        top: 0,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#6b7280' },
        data: trend.series.map((s) => s.label),
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params: unknown) => {
          const axisValue = (params as { axisValue: string }[])[0]?.axisValue
          if (axisValue === undefined) return ''
          const i = trend.dates.indexOf(axisValue)
          if (i < 0) return ''
          const rows = trend.series
            .map((s) => ({ s, count: s.count[i] ?? 0, payamt: s.payamt[i] ?? 0 }))
            .sort((a, b) => b.count - a.count)
            .map(
              (r) =>
                `${markerDot(r.s.color)}${r.s.label}　${fmtNumber(r.count)} 单　${fmtPrice(r.payamt)}`,
            )
          return tipHeader(`${axisValue}　（上：销量　下：销售额）`) + rows.join('<br/>')
        },
      },
      xAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: trend.dates,
          boundaryGap: false,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: trend.dates,
          boundaryGap: false,
          axisLine: { show: false },
          axisTick: { show: false },
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
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: 8,
          height: 16,
          start: 0,
          end: 100,
          showDetail: false,
          brushSelect: false,
        },
      ],
      series,
    }
  }, [trend])

  const chartRef = useChart<HTMLDivElement>(option, [option])

  if (loading) {
    return (
      <div className={CARD}>
        <h3 className={CARD_TITLE}>账号每日趋势 · 近 30 日</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  if (!option) {
    return (
      <div className={CARD}>
        <h3 className={CARD_TITLE}>账号每日趋势 · 近 30 日</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <EmptyState size="sm" title="暂无订单" description="所选账号近 30 日没有订单" />
        </div>
      </div>
    )
  }

  return (
    <div className={CARD}>
      <h3 className={CARD_TITLE}>账号每日趋势 · 近 30 日</h3>
      <div ref={chartRef} className="w-full" style={{ height }} />
    </div>
  )
}
