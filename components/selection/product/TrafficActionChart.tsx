'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface TrafficActionChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function TrafficActionChart({ hourlyTrend: ht }: TrafficActionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
    })

    chartRef.current.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['浏览流量', '想要需求'], bottom: 0, textStyle: { fontSize: 10, color: '#6b7280' } },
      grid: { left: 48, right: 56, top: 20, bottom: 32 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: [
        { type: 'value', name: '浏览/小时', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        { type: 'value', name: '想要/小时', axisLabel: { fontSize: 10, color: '#9ca3af' }, splitLine: { show: false } },
      ],
      series: [
        { name: '浏览流量', type: 'line', yAxisIndex: 0, data: ht.hourly_look_rate, smooth: true, symbol: 'none', lineStyle: { color: '#9ca3af', width: 0 }, areaStyle: { color: 'rgba(156, 163, 175, 0.15)' } },
        { name: '想要需求', type: 'line', yAxisIndex: 1, data: ht.hourly_want_rate, smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 } },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-48 text-sm text-gray-400">暂无数据</div>
  }
  return <div ref={containerRef} className="w-full h-56" />
}
