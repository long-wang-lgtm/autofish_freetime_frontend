'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HistoryPoint } from '@/lib/api/selection'

interface TrendChartProps {
  /** 历史数据点 */
  data: HistoryPoint[]
  /** 数据类型：'inquiry' = 询单趋势, 'conversion' = 转化率趋势 */
  type: 'inquiry' | 'conversion'
  /** 是否显示 7 日移动平均线（仅 inquiry 类型，且数据 ≥ 14 天时显示） */
  showMA?: boolean
}

export function TrendChart({ data, type, showMA = false }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }

    const times = data.map(d => {
      const t = new Date(d.collectedAt)
      return `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
    })

    if (type === 'inquiry') {
      const inquiryData = data.map(d => d.inquiryCount)
      const series: any[] = [
        {
          name: '询单数',
          type: 'line',
          data: inquiryData,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
          itemStyle: { color: '#2563eb' },
        },
      ]

      // 7 日移动平均
      if (showMA && data.length >= 14) {
        const maData: (number | null)[] = []
        for (let i = 0; i < inquiryData.length; i++) {
          if (i < 6) {
            maData.push(null)
          } else {
            const slice = inquiryData.slice(i - 6, i + 1)
            maData.push(slice.reduce((a, b) => a + b, 0) / slice.length)
          }
        }
        series.push({
          name: '7日均值',
          type: 'line',
          data: maData,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#9ca3af' },
        })
      }

      chartRef.current.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const time = params[0].axisValue
            let html = `<div class="text-xs">${time}</div>`
            params.forEach((p: any) => {
              if (p.value != null) {
                html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${p.value}</b></div>`
              }
            })
            return html
          },
        },
        grid: { left: 40, right: 16, top: 12, bottom: 24 },
        xAxis: {
          type: 'category',
          data: times,
          axisLabel: { fontSize: 10, color: '#9ca3af', rotate: 45 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        series,
      })
    } else {
      // conversion type — 双折线图（双 Y 轴）
      const inquiryRates = data.map(d =>
        d.viewCount > 0 ? (d.inquiryCount / d.viewCount) * 100 : null
      )
      const favoriteRates = data.map(d =>
        d.inquiryCount > 0 ? (d.favoriteCount / d.inquiryCount) * 100 : null
      )

      chartRef.current.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const time = params[0].axisValue
            let html = `<div class="text-xs">${time}</div>`
            params.forEach((p: any) => {
              if (p.value != null) {
                html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${Number(p.value).toFixed(1)}%</b></div>`
              }
            })
            return html
          },
        },
        legend: {
          data: ['浏览→询单', '询单→收藏'],
          bottom: 0,
          textStyle: { fontSize: 11, color: '#6b7280' },
        },
        grid: { left: 40, right: 56, top: 12, bottom: 32 },
        xAxis: {
          type: 'category',
          data: times,
          axisLabel: { fontSize: 10, color: '#9ca3af', rotate: 45 },
          axisTick: { show: false },
        },
        yAxis: [
          {
            type: 'value',
            name: '浏览→询单 %',
            axisLabel: { fontSize: 10, color: '#3b82f6', formatter: '{value}%' },
            splitLine: { lineStyle: { color: '#f3f4f6' } },
          },
          {
            type: 'value',
            name: '询单→收藏 %',
            axisLabel: { fontSize: 10, color: '#a855f7', formatter: '{value}%' },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: '浏览→询单',
            type: 'line',
            yAxisIndex: 0,
            data: inquiryRates,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#3b82f6', width: 2 },
            itemStyle: { color: '#3b82f6' },
          },
          {
            name: '询单→收藏',
            type: 'line',
            yAxisIndex: 1,
            data: favoriteRates,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#a855f7', width: 2 },
            itemStyle: { color: '#a855f7' },
          },
        ],
      })
    }

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data, type, showMA])

  // 清理
  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        暂无历史数据
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-56" />
}
