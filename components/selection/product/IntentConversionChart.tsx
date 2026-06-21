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
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    const collectRates = ht.hourly_collect_rate.map((v, i) => {
      if (ht.hourly_look_rate[i] <= 0) return null
      return +(v / ht.hourly_look_rate[i] * 100).toFixed(1)
    })
    const inquiryRates = ht.hourly_want_rate.map((v, i) => {
      if (ht.hourly_look_rate[i] <= 0) return null
      return +(v / ht.hourly_look_rate[i] * 100).toFixed(1)
    })
    const ifRatios = ht.hourly_want_rate.map((v, i) => {
      if (ht.hourly_collect_rate[i] <= 0) return null
      return +(v / ht.hourly_collect_rate[i]).toFixed(2)
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
          name: '%',
          axisLabel: { fontSize: 12, color: '#6b7280', formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '比值',
          axisLabel: { fontSize: 12, color: '#6b7280' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '询单率',
          type: 'line',
          yAxisIndex: 0,
          data: inquiryRates,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#2563eb', width: 2 },
          itemStyle: { color: '#2563eb' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#2563eb', type: 'dashed', width: 1 },
            data: [{ yAxis: 10, label: { formatter: '10%', fontSize: 12, color: '#2563eb' } }],
          },
        },
        {
          name: '收藏率',
          type: 'line',
          yAxisIndex: 0,
          data: collectRates,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#7c3aed', width: 2 },
          itemStyle: { color: '#7c3aed' },
        },
        {
          name: '询藏比',
          type: 'line',
          yAxisIndex: 1,
          data: ifRatios,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#0d9488', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#0d9488' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#0d9488', type: 'dashed', width: 1 },
            data: [
              { yAxis: 0.8, label: { formatter: '0.8', fontSize: 12, color: '#0d9488' } },
              { yAxis: 1.2, label: { formatter: '1.2', fontSize: 12, color: '#0d9488' } },
            ],
          },
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
        <span className="text-xs text-gray-700">买卖意愿图</span>
        <span className="flex gap-3 text-xs text-gray-700 flex-wrap mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />询单率
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-violet-600 inline-block rounded" />收藏率
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-teal-600 inline-block rounded" />询藏比
          </span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-48" />
    </div>
  )
}
