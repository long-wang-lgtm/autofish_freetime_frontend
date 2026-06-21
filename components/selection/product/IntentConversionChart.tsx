'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface IntentConversionChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function IntentConversionChart({ hourlyTrend: ht }: IntentConversionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
    })

    const collectRates = ht.hourly_collect_rate.map((v, i) =>
      ht.hourly_look_rate[i] > 0 ? v / ht.hourly_look_rate[i] : null
    )
    const inquiryRates = ht.hourly_want_rate.map((v, i) =>
      ht.hourly_look_rate[i] > 0 ? v / ht.hourly_look_rate[i] : null
    )
    const ifRatios = ht.hourly_want_rate.map((v, i) =>
      ht.hourly_collect_rate[i] > 0 ? v / ht.hourly_collect_rate[i] : null
    )

    chartRef.current.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['收藏率', '询单率', '询藏比'], bottom: 0, textStyle: { fontSize: 10, color: '#6b7280' } },
      grid: { left: 48, right: 56, top: 20, bottom: 32 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: [
        { type: 'value', name: '%', axisLabel: { fontSize: 10, color: '#6b7280', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
        { type: 'value', name: '比值', axisLabel: { fontSize: 10, color: '#6b7280' }, splitLine: { show: false } },
      ],
      series: [
        { name: '收藏率', type: 'line', yAxisIndex: 0, data: collectRates.map(v => v != null ? v * 100 : null), smooth: true, symbol: 'none', lineStyle: { color: '#a855f7', width: 2 } },
        { name: '询单率', type: 'line', yAxisIndex: 0, data: inquiryRates.map(v => v != null ? v * 100 : null), smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 } },
        { name: '询藏比', type: 'line', yAxisIndex: 1, data: ifRatios, smooth: true, symbol: 'none', lineStyle: { color: '#9ca3af', width: 1.5, type: 'dashed' } },
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
