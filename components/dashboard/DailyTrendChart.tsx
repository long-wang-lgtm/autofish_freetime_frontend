'use client'

import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { LineSeriesOption } from 'echarts/charts'
import { useChart } from '@/components/ui/chart/useChart'
import {
  LINE_SMOOTH,
  METRIC_ORDER_AMOUNT,
  METRIC_ORDER_COUNT,
} from '@/lib/constants/chart-theme'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import {
  AXIS_LABEL_FONT_SIZE,
  axisAmountLabel,
  axisCountLabel,
  labelIndices,
  niceAxisMax,
  seriesMax,
  seriesMaxIndex,
  sharedAxisGutter,
} from '@/lib/utils/chart-axis'
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
/** 关键点数据标签：字号与值轴刻度同级、颜色用正文灰，别抢曲线的戏 */
const MARK_LABEL_FONT_SIZE = 11
const MARK_LABEL_COLOR = '#374151'
/** 中间标签的密度上限：30 天里最多再挑 ~6 个等距点，再多就成马赛克了 */
const LABEL_DENSITY = 6

interface DailyTrendChartProps {
  trend: TrendData
  height?: number
  loading?: boolean
}

/**
 * 每日趋势：近 30 日的日聚合曲线（销量 / 销售额），上下两个子图各自独立值轴。
 *
 * 只画合计、不放图例：账号取舍交给上方筛选栏——全选看总量，单选某个账号看它自己。
 * 配色用指标色（销量蓝 / 销售额橙），与分时段成交同一套。
 */
export function DailyTrendChart({
  trend,
  height = 320,
  loading = false,
}: DailyTrendChartProps) {
  const option = useMemo<EChartsOption | null>(() => {
    if (trend.dates.length === 0) return null

    /**
     * 一条指标（销量 / 销售额）：
     *
     * - 实线画到昨天，末段（今日，还没过完）走虚线 + 空心末点；
     * - 数据标签：关键点**必标**（首点、最高点、昨天、今天）+ 等距中间点，密度由此控住；
     *   标签只写数值本身，不带「最高」这类文字提示——最高点靠字重和位置认。
     *
     * 点数不足两天时不拆，就画一条实线。
     */
    const metricSeries = (
      name: string,
      data: number[],
      color: string,
      gridIndex: number,
      fmt: (v: number) => string,
    ): LineSeriesOption[] => {
      const base = {
        type: 'line' as const,
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        color,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        // 拐点带弧但不糊；单调插值（'x'）保证曲线不越出两点之间的取值范围
        smooth: LINE_SMOOTH,
        smoothMonotone: 'x' as const,
        showSymbol: false,
        symbolSize: 5,
      }
      const n = data.length
      if (n < 2) return [{ ...base, name, data }]
      /** 前面补 null，只让指定位置的点/段出现 */
      const blank = (len: number) => Array<null>(Math.max(0, len)).fill(null)

      const maxIndex = seriesMaxIndex(data)
      const markPoints = labelIndices(data, [0, maxIndex, n - 2, n - 1], LABEL_DENSITY).map(
        (i) => {
          const isToday = i === n - 1
          const isYesterday = i === n - 2
          return {
            // 名字＝日期，标签不用它（formatter 给的是定稿文案），但 markPoint 的类型要求有
            name: trend.dates[i],
            coord: [trend.dates[i], data[i]],
            // 末点是空心圈：今日的数还会长，别画成实心像结了账
            symbolSize: isToday ? 8 : 7,
            itemStyle: isToday
              ? { color: '#fff', borderColor: color, borderWidth: 2 }
              : { color, borderColor: '#fff', borderWidth: 1.5 },
            label: {
              show: true,
              // 首点贴左边线，标签放"top"会跟值轴刻度撞车；昨天与今天只隔一个点，一上一下才不叠字
              position: i === 0 ? ('right' as const) : isYesterday ? ('bottom' as const) : ('top' as const),
              distance: 6,
              fontSize: MARK_LABEL_FONT_SIZE,
              fontWeight: i === maxIndex ? 600 : 400,
              color: MARK_LABEL_COLOR,
              formatter: fmt(data[i]),
            },
          }
        },
      )

      return [
        // ① 实线：画到昨天（末点留空，末段交给虚线），关键点标注挂在这条上
        {
          ...base,
          name,
          data: data.map((v, i) => (i === n - 1 ? null : v)),
          markPoint: {
            symbol: 'circle',
            data: markPoints,
            silent: true,
          },
        },
        // ② 虚线：只有末段两个点，自定短划免得一整段看成一截实线
        {
          ...base,
          name,
          data: [...blank(n - 2), data[n - 2], data[n - 1]],
          lineStyle: { color, width: 2, type: [4, 3] },
        },
      ]
    }

    const series: LineSeriesOption[] = [
      ...metricSeries('销量', trend.count, METRIC_ORDER_COUNT, 0, axisCountLabel),
      ...metricSeries('销售额', trend.payamt, METRIC_ORDER_AMOUNT, 1, axisAmountLabel),
    ]

    // 两张值轴的上限与公共标签列宽：上限定死 → 最宽刻度就是上限那一个 → 量得准
    const countAxisMax = niceAxisMax(seriesMax(trend.count))
    const amountAxisMax = niceAxisMax(seriesMax(trend.payamt))
    const gutter = sharedAxisGutter([
      axisCountLabel(countAxisMax),
      axisAmountLabel(amountAxisMax),
    ])

    return {
      grid: [
        { left: gutter, right: 16, top: 30, height: '32%' },
        { left: gutter, right: 16, top: SPLIT_TOP, bottom: BOTTOM_INSET },
      ],
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params: unknown) => {
          const axisValue = (params as { axisValue: string }[])[0]?.axisValue
          if (axisValue === undefined) return ''
          const i = trend.dates.indexOf(axisValue)
          if (i < 0) return ''
          const rows = [
            `${markerDot(METRIC_ORDER_COUNT)}销量　${fmtNumber(trend.count[i] ?? 0)} 单`,
            `${markerDot(METRIC_ORDER_AMOUNT)}销售额　${fmtPrice(trend.payamt[i] ?? 0)}`,
          ]
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
        <h3 className={CARD_TITLE}>每日成交趋势 · 近 30 日</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  if (!option) {
    return (
      <div className={CARD}>
        <h3 className={CARD_TITLE}>每日成交趋势 · 近 30 日</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <EmptyState size="sm" title="暂无订单" description="所选账号近 30 日没有订单" />
        </div>
      </div>
    )
  }

  return (
    <div className={CARD}>
      <h3 className={CARD_TITLE}>每日成交趋势 · 近 30 日</h3>
      <div ref={chartRef} className="w-full" style={{ height }} />
    </div>
  )
}
