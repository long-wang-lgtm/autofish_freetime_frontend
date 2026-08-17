'use client'

import { useMemo } from 'react'
import { useChart } from '@/components/ui/chart/useChart'
import { TREND_WANT, TREND_LOOK, TREND_COLLECT, withAlpha } from '@/lib/constants/chart-theme'
import { fmtPercent } from '@/lib/utils/format'

// ---- ECharts 按需导入 ----
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  CanvasRenderer,
])

interface TrendTime {
  timestamp: number[]
  lookCount: number[]
  wantCount: number[]
  collectCount: number[]
}

interface TrendDays {
  date: number[]
  lookIncrement: number[]
  wantIncrement: number[]
  collectIncrement: number[]
  convertRate: number[]
  hideAvg: number[]
}

interface MonitorTrendChartsProps {
  trendData: {
    trendTime: TrendTime
    trendDays: TrendDays
    fetchCount: number
    windows: number
  }
}

const BASE_GRID = { left: 48, right: 16, top: 12, bottom: 48 }
const LINE_WIDTH = 1.5
const DATAZOOM = [
  { type: 'slider' as const, bottom: 8, height: 16 },
  { type: 'inside' as const },
]

function fmtTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${M}-${day} ${h}:${m}`
}

function fmtDateLabel(ts: number): string {
  const d = new Date(ts * 1000)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MonitorTrendCharts({ trendData }: MonitorTrendChartsProps) {
  const { trendTime, trendDays } = trendData

  // ---- 图1：累计趋势（折线图 / 单 Y 轴） ----
  const chart1Option = useMemo<EChartsOption | null>(() => {
    if (!trendTime?.timestamp?.length) return null
    return {
      grid: BASE_GRID,
      dataZoom: DATAZOOM,
      legend: { bottom: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: trendTime.timestamp.map(fmtTimestamp),
        axisLabel: { fontSize: 10, color: '#9ca3af' },
      },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' } },
      series: [
        {
          name: '浏览',
          type: 'line',
          data: trendTime.lookCount ?? [],
          color: TREND_LOOK,
          lineStyle: { color: TREND_LOOK, width: LINE_WIDTH },
          itemStyle: { color: TREND_LOOK },
        },
        {
          name: '想要',
          type: 'line',
          data: trendTime.wantCount ?? [],
          color: TREND_WANT,
          lineStyle: { color: TREND_WANT, width: LINE_WIDTH },
          itemStyle: { color: TREND_WANT },
        },
        {
          name: '收藏',
          type: 'line',
          data: trendTime.collectCount ?? [],
          color: TREND_COLLECT,
          lineStyle: { color: TREND_COLLECT, width: LINE_WIDTH },
          itemStyle: { color: TREND_COLLECT },
        },
      ],
    }
  }, [trendTime])

  // ---- 图2：日增量（面积折线图 / 双 Y 轴） ----
  const chart2Option = useMemo<EChartsOption | null>(() => {
    if (!trendDays?.date?.length) return null
    const xData = trendDays.date.map(fmtDateLabel)
    return {
      grid: BASE_GRID,
      dataZoom: DATAZOOM,
      legend: { bottom: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 10, color: '#9ca3af' } },
      yAxis: [
        {
          type: 'value',
          name: '浏览',
          axisLabel: { fontSize: 10, color: TREND_LOOK },
          nameTextStyle: { color: TREND_LOOK, fontSize: 10 },
        },
        {
          type: 'value',
          name: '想要/收藏',
          axisLabel: { fontSize: 10, color: TREND_COLLECT },
          nameTextStyle: { color: TREND_COLLECT, fontSize: 10 },
        },
      ],
      series: [
        {
          name: '日浏览',
          type: 'line',
          yAxisIndex: 0,
          data: trendDays.lookIncrement ?? [],
          color: TREND_LOOK,
          lineStyle: { color: TREND_LOOK, width: LINE_WIDTH },
          itemStyle: { color: TREND_LOOK },
          areaStyle: { color: withAlpha(TREND_LOOK, 0.15) },
          smooth: true,
        },
        {
          name: '日想要',
          type: 'line',
          yAxisIndex: 1,
          data: trendDays.wantIncrement ?? [],
          color: TREND_COLLECT,
          lineStyle: { color: TREND_COLLECT, width: LINE_WIDTH },
          itemStyle: { color: TREND_COLLECT },
          areaStyle: { color: withAlpha(TREND_COLLECT, 0.15) },
          smooth: true,
        },
        {
          name: '日收藏',
          type: 'line',
          yAxisIndex: 1,
          data: trendDays.collectIncrement ?? [],
          color: TREND_WANT,
          lineStyle: { color: TREND_WANT, width: LINE_WIDTH, type: 'dashed' },
          itemStyle: { color: TREND_WANT },
          areaStyle: { color: withAlpha(TREND_WANT, 0.15) },
          smooth: true,
        },
      ],
    }
  }, [trendDays])

  // ---- 图3：转化率 & 询藏比（双 Y 轴折线） ----
  const chart3Option = useMemo<EChartsOption | null>(() => {
    if (!trendDays?.date?.length) return null
    const xData = trendDays.date.map(fmtDateLabel)
    return {
      grid: BASE_GRID,
      dataZoom: DATAZOOM,
      legend: { bottom: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 10, color: '#9ca3af' } },
      yAxis: [
        {
          type: 'value',
          name: '转化率',
          axisLabel: { fontSize: 10, color: TREND_WANT, formatter: (v: number) => fmtPercent(v) },
          nameTextStyle: { color: TREND_WANT, fontSize: 10 },
        },
        {
          type: 'value',
          name: '询藏比',
          axisLabel: { fontSize: 10, color: TREND_COLLECT, formatter: (v: number) => fmtPercent(v) },
          nameTextStyle: { color: TREND_COLLECT, fontSize: 10 },
        },
      ],
      series: [
        {
          name: '转化率',
          type: 'line',
          yAxisIndex: 0,
          data: trendDays.convertRate ?? [],
          color: TREND_WANT,
          lineStyle: { color: TREND_WANT, width: LINE_WIDTH },
          itemStyle: { color: TREND_WANT },
        },
        {
          name: '询藏比',
          type: 'line',
          yAxisIndex: 1,
          data: trendDays.hideAvg ?? [],
          color: TREND_COLLECT,
          lineStyle: { color: TREND_COLLECT, width: LINE_WIDTH },
          itemStyle: { color: TREND_COLLECT },
        },
      ],
    }
  }, [trendDays])

  const chart1Ref = useChart<HTMLDivElement>(chart1Option, [chart1Option])
  const chart2Ref = useChart<HTMLDivElement>(chart2Option, [chart2Option])
  const chart3Ref = useChart<HTMLDivElement>(chart3Option, [chart3Option])

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 min-h-0">
        <p className="text-xs font-medium text-gray-500 mb-1">📈 累计趋势</p>
        <div ref={chart1Ref} className="w-full h-full" />
      </div>
      <div className="flex-1 min-h-0">
        <p className="text-xs font-medium text-gray-500 mb-1">📊 日增量</p>
        <div ref={chart2Ref} className="w-full h-full" />
      </div>
      <div className="flex-1 min-h-0">
        <p className="text-xs font-medium text-gray-500 mb-1">📉 转化率 & 询藏比</p>
        <div ref={chart3Ref} className="w-full h-full" />
      </div>
    </div>
  )
}
