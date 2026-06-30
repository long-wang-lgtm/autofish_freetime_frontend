'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts'
import { useImStatusSnapshots } from '@/hooks/useImStatusSnapshots'
import { useChart } from './useChart'
import type { ImStatusSnapshot } from '@/lib/api/admin'

// ===== 常量 =====
const SLOT_COUNT = 200          // X 轴最小时间槽数（数据少时不显稀疏，数据多时自动扩展）
const SLOT_INTERVAL_SEC = 60    // 每槽 1 分钟

// ===== 工具 =====
function formatTime(ts: number, showSeconds = false): string {
  const d = new Date(ts * 1000)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (showSeconds) {
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }
  return `${hh}:${mm}`
}

interface ChartFrame {
  timeLabels: string[]       // HH:MM（X 轴）
  slotTimestamps: number[]   // 每槽实际 Unix 时间戳（tooltip 秒级显示用）
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
 * - 快照通过就近匹配（Math.round）归入对应槽位，不要求时间戳精确对齐
 * - 无快照的槽位填 null，线自然断开
 */
function buildChartFrame(snapshots: ImStatusSnapshot[]): ChartFrame | null {
  if (snapshots.length === 0) return null

  const startTime = snapshots[0].timestamp
  const endTime = snapshots[snapshots.length - 1].timestamp
  const actualSlots = Math.floor((endTime - startTime) / SLOT_INTERVAL_SEC) + 1
  const displaySlots = Math.max(SLOT_COUNT, actualSlots)

  // 先用 null 填充所有槽位
  const timeLabels: string[] = []
  const slotTimestamps: number[] = []
  const totalData: (number | null)[] = []
  const activeData: (number | null)[] = []
  const runningData: (number | null)[] = []
  const taskData: (number | null)[] = []

  for (let i = 0; i < displaySlots; i++) {
    const ts = startTime + i * SLOT_INTERVAL_SEC
    timeLabels.push(formatTime(ts, false))
    slotTimestamps.push(ts)
    totalData.push(null)
    activeData.push(null)
    runningData.push(null)
    taskData.push(null)
  }

  // 每个快照通过就近匹配归入对应槽位
  for (const s of snapshots) {
    const offset = s.timestamp - startTime
    const slotIndex = Math.round(offset / SLOT_INTERVAL_SEC)
    if (slotIndex >= 0 && slotIndex < displaySlots) {
      totalData[slotIndex] = s.total_accounts
      activeData[slotIndex] = s.active_accounts
      runningData[slotIndex] = s.running_accounts
      taskData[slotIndex] = s.running_tasks
      // 保留快照自身的时间戳，让 tooltip 显示精确秒
      slotTimestamps[slotIndex] = s.timestamp
    }
  }

  return { timeLabels, slotTimestamps, totalData, activeData, runningData, taskData }
}

// ===== 组件 =====
export default function ImStatusChart({
  className,
}: {
  className?: string
}) {
  const snapshots = useImStatusSnapshots()
  const cardClass = `bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col ${className || ''}`

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
          const label = formatTime(frame.slotTimestamps[idx], true)
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
    <div className={cardClass}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 shrink-0">IM 服务运行状态</h3>
      <div ref={chartRef} className="w-full flex-1 min-h-[220px]" />
    </div>
  )
}
