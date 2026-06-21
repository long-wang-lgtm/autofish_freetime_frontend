'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface CumulativeGrowthChartProps {
  hourlyTrend: HourlyTrendDTO
  d7TotalWant: number
  d7TotalLook: number
  d7TotalCollect: number
}

export function CumulativeGrowthChart({
  hourlyTrend: ht,
  d7TotalWant,
  d7TotalLook,
  d7TotalCollect,
}: CumulativeGrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const baseWant = (ht.cumulative_want[ht.cumulative_want.length - 1] ?? 0) - d7TotalWant
    const baseLook = (ht.cumulative_look[ht.cumulative_look.length - 1] ?? 0) - d7TotalLook
    const baseCollect = (ht.cumulative_collect[ht.cumulative_collect.length - 1] ?? 0) - d7TotalCollect

    const incrementalWant = ht.cumulative_want.map(v => v - baseWant)
    const incrementalLook = ht.cumulative_look.map(v => v - baseLook)
    const incrementalCollect = ht.cumulative_collect.map(v => v - baseCollect)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    chartRef.current.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['累计想要', '累计浏览', '累计收藏'], bottom: 0, textStyle: { fontSize: 10, color: '#6b7280' } },
      grid: { left: 48, right: 16, top: 20, bottom: 32 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: { type: 'value', name: '窗口期内增量', nameTextStyle: { fontSize: 10, color: '#9ca3af' }, axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
      series: [
        { name: '累计想要', type: 'line', data: incrementalWant, smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 } },
        { name: '累计浏览', type: 'line', data: incrementalLook, smooth: true, symbol: 'none', lineStyle: { color: '#059669', width: 1.5 } },
        { name: '累计收藏', type: 'line', data: incrementalCollect, smooth: true, symbol: 'none', lineStyle: { color: '#d97706', width: 1.5 } },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht, d7TotalWant, d7TotalLook, d7TotalCollect])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-48 text-sm text-gray-400">暂无数据</div>
  }
  return <div ref={containerRef} className="w-full h-56" />
}
