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
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => {
          const v = Number(value)
          if (Number.isNaN(v)) return String(value)
          if (typeof v === 'number' && !Number.isInteger(v)) return v.toFixed(1)
          return v.toLocaleString('zh-CN')
        },
      },
      legend: { show: false },
      grid: { left: 48, right: 56, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 10, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: [
        {
          type: 'value',
          name: '浏览/小时',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '想要·收藏/小时',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '浏览流量',
          type: 'line',
          yAxisIndex: 0,
          data: ht.hourly_look_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#6ee7b7', width: 1 },
          areaStyle: { color: 'rgba(5, 150, 105, 0.10)' },
        },
        {
          name: '想要需求',
          type: 'line',
          yAxisIndex: 1,
          data: ht.hourly_want_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
        },
        {
          name: '收藏数',
          type: 'line',
          yAxisIndex: 1,
          data: ht.hourly_collect_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#d97706', width: 1.5, type: 'dashed' },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-48 text-sm text-gray-600">暂无数据</div>
  }

  return (
    <div>
      {/* HTML Legend */}
      <div className="mb-1 ml-1">
        <span className="text-[10px] text-gray-600">流量转化匹配图</span>
        <span className="flex gap-3 text-[10px] text-gray-600 flex-wrap mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-emerald-400 inline-block rounded" />浏览流量
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />想要需求
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-600 inline-block rounded" />收藏数
          </span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-48" />
    </div>
  )
}
