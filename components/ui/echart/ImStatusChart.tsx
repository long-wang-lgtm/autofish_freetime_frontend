'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { useImStatusSnapshots } from '@/hooks/useImStatusSnapshots'

// ===== ECharts 封装 =====
function useChart<T extends HTMLElement>(
  option: echarts.EChartsOption | null,
  deps: unknown[],
) {
  const ref = useRef<T>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current || !option) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current)
    }
    chartRef.current.setOption(option, true)
  }, deps)

  useEffect(() => {
    const chart = chartRef.current
    return () => {
      if (chart) chart.dispose()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return ref
}

// ===== 组件 =====
export default function ImStatusChart() {
  const snapshots = useImStatusSnapshots()

  // --- ECharts 配置 ---
  const option = useMemo<echarts.EChartsOption | null>(() => {
    if (snapshots.length === 0) return null
    const formatTime = (ts: number) => {
      const d = new Date(ts * 1000)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; color: string; dataIndex: number }[]
          if (!items.length) return ''
          const ts = snapshots[items[0].dataIndex]?.timestamp
          const timeStr = ts ? new Date(ts * 1000).toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
          }) : ''
          let html = `<div style="font-size:13px;line-height:1.6">`
          html += `<div style="font-weight:600;color:#1f2937;margin-bottom:4px">${timeStr}</div>`
          for (const item of items) {
            html += `<div style="color:#6b7280"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px"></span>${item.seriesName}: <b style="color:#1f2937">${item.value}</b></div>`
          }
          html += `</div>`
          return html
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 32 },
      xAxis: {
        type: 'category',
        data: snapshots.map((s) => formatTime(s.timestamp)),
        axisLabel: { fontSize: 11, color: '#9ca3af', margin: 8 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11, color: '#9ca3af', margin: 8 },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        {
          name: '总账号',
          type: 'line',
          data: snapshots.map((s) => s.total_accounts),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', type: 'dashed', width: 1.5 },
          itemStyle: { color: '#9ca3af' },
        },
        {
          name: '正常状态',
          type: 'line',
          data: snapshots.map((s) => s.active_accounts),
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#22c55e', width: 2 },
          itemStyle: { color: '#22c55e' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(34,197,94,0.15)' },
            { offset: 1, color: 'rgba(34,197,94,0.02)' },
          ])},
        },
        {
          name: '运行中',
          type: 'line',
          data: snapshots.map((s) => s.running_accounts),
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#5470C6', width: 2 },
          itemStyle: { color: '#5470C6' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(84,112,198,0.15)' },
            { offset: 1, color: 'rgba(84,112,198,0.02)' },
          ])},
        },
        {
          name: '任务正常',
          type: 'line',
          data: snapshots.map((s) => s.running_tasks),
          smooth: true,
          symbol: 'circle',
          symbolSize: 3,
          lineStyle: { color: '#f97316', width: 2 },
          itemStyle: { color: '#f97316' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(249,115,22,0.15)' },
            { offset: 1, color: 'rgba(249,115,22,0.02)' },
          ])},
        },
      ],
    }
  }, [snapshots])

  const chartRef = useChart<HTMLDivElement>(option, [option])

  // 无数据时不渲染
  if (snapshots.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">IM 服务运行状态</h3>
      <div ref={chartRef} className="w-full" style={{ height: 280 }} />
    </div>
  )
}
