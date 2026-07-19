'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts'
import { useChart } from './useChart'
import { TREND_WANT } from '@/lib/constants/chart-theme'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import type { AccountOrderCountDTO } from '@/lib/api/dashboard'

export function AccountOrdersBarChart({
  data,
  loading = false,
  className,
}: {
  data: AccountOrderCountDTO[]
  loading?: boolean
  className?: string
}) {
  const cardClass = `bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className || ''}`

  const option = useMemo<echarts.EChartsOption | null>(() => {
    if (!data || data.length === 0) return null

    const sorted = [...data].sort((a, b) => b.orderCount - a.orderCount)
    const names = sorted.map((d) => d.account.name || d.account.uid)
    const counts = sorted.map((d) => d.orderCount)

    return {
      grid: {
        left: 4,
        right: 48,
        top: 4,
        bottom: 0,
      },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 11, color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 12, color: '#6b7280' },
      },
      series: [
        {
          type: 'bar',
          data: counts,
          barWidth: 14,
          itemStyle: {
            color: TREND_WANT,
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right',
            fontSize: 12,
            color: '#6b7280',
          },
          emphasis: {
            itemStyle: { color: '#1d4ed8' },
          },
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }
          return `${p.name}<br/>支付订单：<b>${p.value}</b> 单`
        },
      },
    }
  }, [data])

  const chartHeight = Math.max((data || []).length * 40 + 24, 140)
  // 用 key 强制重挂载以适配动态高度
  const chartKey = `bar-${(data || []).length}`
  const chartRef = useChart<HTMLDivElement>(option, [option])

  if (loading) {
    return (
      <div className={cardClass}>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">各账号订单 · 今日</h3>
        <div className="flex items-center justify-center" style={{ height: 140 }}>
          <LoadingSpinner size="md" />
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={cardClass}>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">各账号订单 · 今日</h3>
        <div className="flex flex-col items-center justify-center text-gray-400 text-sm" style={{ height: 140 }}>
          <svg className="w-8 h-8 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          今日暂无订单
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">各账号订单 · 今日</h3>
      <div
        key={chartKey}
        ref={chartRef}
        className="w-full"
        style={{ height: chartHeight }}
      />
    </div>
  )
}
