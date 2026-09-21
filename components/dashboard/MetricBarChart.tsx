'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { EChartsOption } from 'echarts'
import type { BarSeriesOption } from 'echarts/charts'
import { useChart } from '@/components/ui/chart/useChart'
import { echarts } from '@/components/ui/chart/echarts'
import { useElementWidth } from '@/hooks/useElementWidth'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import {
  ORDER_AMOUNT_RAMP,
  ORDER_COUNT_RAMP,
} from '@/lib/constants/chart-theme'
import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import { measureTextWidth } from '@/lib/utils/text'
import type { BarGroupData } from '@/hooks/useDashboardMetrics'

/** 子图顶部为"销量 / 销售额"小标题留的高度 */
const GRID_TOP = 26
/** 底部为值轴标签留的高度 */
const GRID_BOTTOM = 26
/** 单根条宽（占类目带宽百分比）；3 日相邻重叠 20% */
const BAR_WIDTH = '36%'
/** 相邻两日条形的重叠率（负值表示重叠） */
const BAR_GAP = '-20%'
/** 轴外类目标签字号 */
const LABEL_FONT_SIZE = 12
/** 轴标签与轴线之间的间距（ECharts axisLabel.margin 默认值，实测 8px） */
const AXIS_LABEL_MARGIN = 8
/** 条尾与数值标签之间的间距（position: 'right' 实测 5px） */
const LABEL_GAP = 5
/** 历史日条上数值的字号：够小，才压得住不当主角 */
const BAR_LABEL_FONT_SIZE = 11
/** 今日数值的字号：标在条尾，要一眼看见，所以放大加粗 */
const TODAY_LABEL_FONT_SIZE = 14
/** 今日数值的字重——量宽和渲染共用这一个值 */
const TODAY_LABEL_WEIGHT = 600
/** 一行类目固定占的高度：行高恒定，条目再多也不压扁条形，
 *  装不下就切片显示，靠右侧滚动条 / 滚轮平移查看（小数行 = 露半截的那行，与页面滚动同观感） */
const ROW_HEIGHT = 36
/** 右侧滚动条（dataZoom slider）占的宽度：从绘图区里让出来，两个子图一起让 */
const SCROLLBAR_WIDTH = 10
/** 左右两块子图之间额外留的呼吸空间（不含左侧条尾数值标签自身的占宽） */
const SUBPLOT_GAP = 24
/** 滚轮 deltaMode 为"行"时的单行像素（Firefox 用行数报 deltaY） */
const LINE_HEIGHT = 16

const CARD =
  'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4'
const CARD_TITLE =
  'text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3'

interface BarSlot {
  value: number
  text: string
  fontSize: number
  weight: number
}

function labelStyle(d: number, last: number): { fontSize: number; weight: number } {
  const isToday = d === last
  return {
    fontSize: isToday ? TODAY_LABEL_FONT_SIZE : BAR_LABEL_FONT_SIZE,
    weight: isToday ? TODAY_LABEL_WEIGHT : 400,
  }
}


function labelBand(plotBare: number, slots: BarSlot[], valueMax: number): number {
  if (valueMax <= 0) return 0
  let band = 0
  for (const s of slots) {
    if (s.value <= 0) continue
    const overflow =
      (s.value / valueMax) * plotBare +
      LABEL_GAP +
      measureTextWidth(s.text, s.fontSize, s.weight) -
      plotBare
    if (overflow > band) band = overflow
  }
  return Math.ceil(band)
}

function rampColor(ramp: readonly string[], d: number): string {
  return ramp[Math.min(d, ramp.length - 1)]
}

/**
 * 行偏移（可小数）→ dataZoom 窗口百分比
 *
 * 窗口高度恒为「可见行数」，偏移小数 = 像素级平移（顶/底部露半截行），
 * 所以滚轮手感与页面原生滚动一致，而不是一格跳一整行。
 */
function panWindow(top: number, total: number, rows: number) {
  if (total <= rows) return { start: 0, end: 100 }
  return { start: (top / total) * 100, end: ((top + rows) / total) * 100 }
}

interface MetricBarChartProps {
  title: string
  groups: BarGroupData[]
  height?: number
  loading?: boolean

  labelMax?: number
}


export function MetricBarChart({
  title,
  groups,
  height = 420,
  loading = false,
  labelMax = 9,
}: MetricBarChartProps) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  /** 视口按行高切出的可见行数（小数部分就是露半截的那行） */
  const visibleRows = (height - GRID_TOP - GRID_BOTTOM) / ROW_HEIGHT
  /** 装不下才出现滚动条与滚轮平移 */
  const scrollable = groups.length > visibleRows
  /** 平移偏移（行，可小数）。滚轮改它并直接发 dataZoom，不走 React 重渲染才跟手 */
  const topRowRef = useRef(0)
  const maxTop = Math.max(0, groups.length - visibleRows)
  // 数据换了（账号/商品筛选）偏移可能越界，先夹住再进 option，窗口才不会超过 100%
  const topRow = Math.min(topRowRef.current, maxTop)

  const option = useMemo<EChartsOption | null>(() => {
    // 宽度没量到之前不建 option：拿 0 去算会把绘图区压成一条线
    if (groups.length === 0 || width === 0) return null

    const days = groups[0].days
    const labels = groups.map((g) => g.label)
    const last = days.length - 1
    const truncate = (text: string) =>
      text.length > labelMax ? `${text.slice(0, labelMax - 1)}…` : text

    // 每个数值标签的实际占宽，决定两块留白各要多少
    const countSlots: BarSlot[] = []
    const amountSlots: BarSlot[] = []
    for (const g of groups) {
      g.days.forEach((day, d) => {
        const style = labelStyle(d, last)
        countSlots.push({ value: day.count, text: fmtNumber(day.count), ...style })
        amountSlots.push({ value: day.payamt, text: fmtPrice(day.payamt), ...style })
      })
    }
    const countMax = Math.max(0, ...countSlots.map((s) => s.value))
    const amountMax = Math.max(0, ...amountSlots.map((s) => s.value))

    const gutter =
      Math.ceil(
        Math.max(0, ...labels.map((l) => measureTextWidth(truncate(l), LABEL_FONT_SIZE))),
      ) + AXIS_LABEL_MARGIN
    const plotBare = Math.max(1, (width - gutter - SCROLLBAR_WIDTH - SUBPLOT_GAP) / 2)
    const countBand = labelBand(plotBare, countSlots, countMax)
    const amountBand = labelBand(plotBare, amountSlots, amountMax)
    const plot = Math.max(
      1,
      (width - gutter - countBand - amountBand - SCROLLBAR_WIDTH - SUBPLOT_GAP) / 2,
    )
    const grid1Left = gutter + plot + countBand + SUBPLOT_GAP

    const series: BarSeriesOption[] = []
    for (let d = last; d >= 0; d--) {
      const day = days[d]
      const { fontSize, weight } = labelStyle(d, last)
      const valueLabel = {
        show: true,
        position: 'right' as const,
        fontSize,
        fontWeight: weight,
        color: weight > 400 ? '#374151' : '#6b7280',
      }

      series.push({
        name: `${day.label} 销量`,
        type: 'bar',
        xAxisIndex: 0,
        yAxisIndex: 0,
        barWidth: BAR_WIDTH,
        barGap: BAR_GAP,
        data: groups.map((g) => g.days[d]?.count ?? 0),
        itemStyle: {
          color: rampColor(ORDER_COUNT_RAMP, d),
          borderRadius: [0, 2, 2, 0],
        },
        label: {
          ...valueLabel,
          formatter: (params: unknown) =>
            fmtNumber((params as { value: number }).value),
        },
        z: 2 + d,
      })

      series.push({
        name: `${day.label} 销售额`,
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        barWidth: BAR_WIDTH,
        barGap: BAR_GAP,
        data: groups.map((g) => g.days[d]?.payamt ?? 0),
        itemStyle: {
          color: rampColor(ORDER_AMOUNT_RAMP, d),
          borderRadius: [0, 2, 2, 0],
        },
        label: {
          ...valueLabel,
          formatter: (params: unknown) =>
            fmtPrice((params as { value: number }).value),
        },
        z: 2 + d,
      })
    }

    return {
      title: [
        {
          text: '销量',
          left: 10,
          top: 2,
          textStyle: { fontSize: 12, fontWeight: 'normal', color: '#6b7280' },
        },
        {
          text: '销售额',
          left: grid1Left,
          top: 2,
          textStyle: { fontSize: 12, fontWeight: 'normal', color: '#6b7280' },
        },
      ],
      grid: [
        { left: gutter, width: plot, top: GRID_TOP, bottom: GRID_BOTTOM },
        { left: grid1Left, width: plot, top: GRID_TOP, bottom: GRID_BOTTOM },
      ],
      // 竖向滚动条：窗口恒高，只有位置在动，形状就是常见的滚动条
      dataZoom: scrollable
        ? [
            {
              type: 'slider',
              yAxisIndex: [0, 1],
              right: 2,
              width: SCROLLBAR_WIDTH - 4,
              top: GRID_TOP,
              bottom: GRID_BOTTOM,
              filterMode: 'filter',
              zoomLock: true,
              showDetail: false,
              showDataShadow: false,
              brushSelect: false,
              borderColor: 'transparent',
              backgroundColor: '#f3f4f6',
              fillerColor: '#d1d5db',
              handleStyle: { color: '#d1d5db', borderColor: 'transparent' },
              moveHandleStyle: { color: '#d1d5db' },
              ...panWindow(topRow, groups.length, visibleRows),
            },
          ]
        : [],
      axisPointer: { link: [{ yAxisIndex: 'all' }] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const first = (params as { dataIndex: number }[])[0]
          const group = first ? groups[first.dataIndex] : undefined
          if (!group) return ''
          const rows = group.days.map(
            (d) =>
              `${d.label}　销量 <b>${fmtNumber(d.count)}</b>　销售额 <b>${fmtPrice(d.payamt)}</b>`,
          )
          return `<div style="margin-bottom:2px">${group.label}</div>${rows.join('<br/>')}`
        },
      },
      xAxis: [
        {
          type: 'value',
          gridIndex: 0,
          minInterval: 1,
          max: countMax > 0 ? countMax : 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 11,
            color: '#9ca3af',
            alignMinLabel: 'left',
            alignMaxLabel: 'right',
            formatter: (v: unknown) => fmtNumber(Number(v)),
          },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          gridIndex: 1,
          max: amountMax > 0 ? amountMax : 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: 11,
            color: '#9ca3af',
            alignMinLabel: 'left',
            alignMaxLabel: 'right',
            formatter: (v: unknown) => fmtPrice(Number(v)),
          },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
      ],
      yAxis: [
        {
          type: 'category',
          gridIndex: 0,
          inverse: true,
          data: labels,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            fontSize: LABEL_FONT_SIZE,
            color: '#374151',
            formatter: (v: unknown) => truncate(String(v)),
          },
        },
        {
          type: 'category',
          gridIndex: 1,
          inverse: true,
          data: labels,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
        },
      ],
      series,
    }
  }, [groups, scrollable, topRow, visibleRows, labelMax, width])

  const chartRef = useChart<HTMLDivElement>(option, [option])

  /** 平移窗口 + 收掉 tooltip：指令式操作，不重建 option，滚轮才跟手 */
  const panTo = useCallback(
    (top: number) => {
      const host = chartRef.current
      const inst = host ? echarts.getInstanceByDom(host) : undefined
      if (!inst) return
      inst.dispatchAction({
        type: 'dataZoom',
        ...panWindow(top, groups.length, visibleRows),
      })
      // tooltip 是按鼠标坐标定位的，内容平移后它就指着错行的条形了
      inst.dispatchAction({ type: 'hideTip' })
    },
    [chartRef, groups.length, visibleRows],
  )

  // 数据换了（账号/商品筛选）把偏移夹回上限并同步到图上
  useEffect(() => {
    const next = Math.min(topRowRef.current, maxTop)
    topRowRef.current = next
    panTo(next)
  }, [maxTop, panTo])

  /**
   * 滚轮平移：自己按像素换算（一格 120px ≈ 3.3 行，与页面滚动同速），
   * 不用内建 dataZoom 的滚轮——它一格跳一整行。
   * 已经到顶/到底就不拦截，让页面接着滚，和原生滚动容器的接管-交接一致。
   */
  useEffect(() => {
    const host = boxRef.current
    if (!host || !scrollable) return

    const onWheel = (e: WheelEvent) => {
      const px =
        e.deltaMode === 1
          ? e.deltaY * LINE_HEIGHT
          : e.deltaMode === 2
            ? e.deltaY * height
            : e.deltaY
      const next = Math.min(Math.max(topRowRef.current + px / ROW_HEIGHT, 0), maxTop)
      if (next === topRowRef.current) return
      e.preventDefault()
      topRowRef.current = next
      panTo(next)
    }

    host.addEventListener('wheel', onWheel, { passive: false })
    return () => host.removeEventListener('wheel', onWheel)
  }, [boxRef, height, maxTop, panTo, scrollable])

  return (
    <div className={CARD}>
      <h3 className={CARD_TITLE}>{title}</h3>
      <div ref={boxRef} className="relative w-full" style={{ height }}>
        <div ref={chartRef} className="h-full w-full" />
        {(loading || groups.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center">
            {loading ? (
              <LoadingSpinner size="md" />
            ) : (
              <EmptyState
                size="sm"
                title="暂无订单"
                description="所选账号近期没有订单"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
