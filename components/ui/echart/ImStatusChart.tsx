'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { useImStatusSnapshots } from '@/hooks/useImStatusSnapshots'
import type { ImStatusSnapshot } from '@/lib/api/administrators'

// ===== 常量 =====
const SLOT_COUNT = 200          // X 轴最小时间槽数（数据少时不显稀疏，数据多时自动扩展）
const SLOT_INTERVAL_SEC = 60    // 每槽 1 分钟

// ===== 工具 =====
function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface ChartFrame {
  timeLabels: string[]
  totalData: (number | null)[]
  activeData: (number | null)[]
  runningData: (number | null)[]
  taskData: (number | null)[]
}

/**
 * 将原始快照列表映射到固定槽位的图数据。
 *
 * 规则：
 * - 槽位数 = max(SLOT_COUNT, 数据实际跨度) — 200 只是最小宽度
 * - 数据从左对齐，右侧空槽填 null（线自然断开）
 */
function buildChartFrame(snapshots: ImStatusSnapshot[]): ChartFrame | null {
  if (snapshots.length === 0) return null

  // 按时间戳建立索引
  const snapMap = new Map<number, ImStatusSnapshot>()
  for (const s of snapshots) {
    snapMap.set(s.timestamp, s)
  }

  const startTime = snapshots[0].timestamp
  const endTime = snapshots[snapshots.length - 1].timestamp
  // 实际时间跨度（槽数），至少 200
  const actualSlots = Math.floor((endTime - startTime) / SLOT_INTERVAL_SEC) + 1
  const displaySlots = Math.max(SLOT_COUNT, actualSlots)

  const timeLabels: string[] = []
  const totalData: (number | null)[] = []
  const activeData: (number | null)[] = []
  const runningData: (number | null)[] = []
  const taskData: (number | null)[] = []

  for (let i = 0; i < displaySlots; i++) {
    const ts = startTime + i * SLOT_INTERVAL_SEC
    timeLabels.push(formatTime(ts))
    const snap = snapMap.get(ts)
    totalData.push(snap ? snap.total_accounts : null)
    activeData.push(snap ? snap.active_accounts : null)
    runningData.push(snap ? snap.running_accounts : null)
    taskData.push(snap ? snap.running_tasks : null)
  }

  return { timeLabels, totalData, activeData, runningData, taskData }
}

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

  // --- 构建固定槽位数据 ---
  const frame = useMemo<ChartFrame | null>(() => buildChartFrame(snapshots), [snapshots])

  // --- ECharts 配置 ---
  const option = useMemo<echarts.EChartsOption | null>(() => {
    if (!frame) return null
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const items = params as { seriesName: string; value: number; color: string; dataIndex: number }[]
          if (!items.length || items[0].value == null) return ''
          const idx = items[0].dataIndex
          const label = frame.timeLabels[idx]
          let html = `<div style="font-size:13px;line-height:1.6">`
          html += `<div style="font-weight:600;color:#1f2937;margin-bottom:4px">${label}</div>`
          for (const item of items) {
            if (item.value == null) continue
            html += `<div style="color:#6b7280"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px"></span>${item.seriesName}: <b style="color:#1f2937">${item.value}</b></div>`
          }
          html += `</div>`
          return html
        },
      },
      grid: { left: 48, right: 24, top: 16, bottom: 32 },
      xAxis: {
        type: 'category',
        data: frame.timeLabels,
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
          data: frame.totalData,
          connectNulls: false,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', type: 'dashed', width: 1.5 },
          itemStyle: { color: '#9ca3af' },
        },
        {
          name: '正常状态',
          type: 'line',
          data: frame.activeData,
          connectNulls: false,
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
          data: frame.runningData,
          connectNulls: false,
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
          data: frame.taskData,
          connectNulls: false,
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
  }, [frame])

  const chartRef = useChart<HTMLDivElement>(option, [option])

  if (!frame) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">IM 服务运行状态</h3>
      <div ref={chartRef} className="w-full" style={{ height: 280 }} />
    </div>
  )
}
