'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface CumulativeGrowthChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function CumulativeGrowthChart({ hourlyTrend: ht }: CumulativeGrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => {
          const v = Number(value)
          if (Number.isNaN(v)) return String(value)
          return v.toLocaleString('zh-CN')
        },
      },
      legend: { show: false },
      grid: { left: 48, right: 56, top: 20, bottom: 32 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 12, color: '#6b7280', rotate: 45 }, axisTick: { show: false } },
      yAxis: [
        {
          type: 'value',
          name: '累计浏览',
          nameTextStyle: { fontSize: 12, color: '#6b7280' },
          axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '累计想要·收藏',
          nameTextStyle: { fontSize: 12, color: '#6b7280' },
          axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '累计浏览',
          type: 'line',
          yAxisIndex: 0,
          data: ht.cumulative_look,
          smooth: true,
          symbol: 'none',
          color: '#d97706',
          lineStyle: { color: '#d97706', width: 2 },
          areaStyle: { color: 'rgba(217, 119, 6, 0.20)' },
        },
        {
          name: '累计想要',
          type: 'line',
          yAxisIndex: 1,
          data: ht.cumulative_want,
          smooth: true,
          symbol: 'none',
          color: '#2563eb',
          lineStyle: { color: '#2563eb', width: 2 },
        },
        {
          name: '累计收藏',
          type: 'line',
          yAxisIndex: 1,
          data: ht.cumulative_collect,
          smooth: true,
          symbol: 'none',
          color: '#7c3aed',
          lineStyle: { color: '#7c3aed', width: 2 },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-48 text-sm text-gray-700">暂无数据</div>
  }

  return (
    <div>
      {/* HTML Legend */}
      <div className="mb-1 ml-1">
        <span className="text-xs text-gray-700">累计增长图</span>
        <span className="flex gap-3 text-xs text-gray-700 flex-wrap mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-600 inline-block rounded-sm" />累计浏览（左轴）
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-blue-600 inline-block rounded-sm" />累计想要（右轴）
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-violet-600 inline-block rounded-sm" />累计收藏（右轴）
          </span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-48" />
    </div>
  )
}
