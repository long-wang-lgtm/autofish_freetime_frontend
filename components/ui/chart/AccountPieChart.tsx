'use client'

import { useMemo } from 'react'
import * as echarts from 'echarts'
import { useChart } from './useChart'
import type { AccountByUserItem } from '@/lib/api/admin'

// ===== 常量 =====
const USER_PALETTE = [
  '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
  '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#48C9B0',
]
const OTHER_COLOR = '#cccccc'

// ===== 组件 =====
export function AccountPieChart({
  data,
  loading = false,
  className,
}: {
  data: AccountByUserItem[]
  loading?: boolean
  className?: string
}) {
  const cardClass = `bg-white rounded-xl border border-gray-200 shadow-sm p-4 ${className || ''}`
  // --- 饼图配置 ---
  const option = useMemo<echarts.EChartsOption | null>(() => {
    if (!data || data.length === 0) return null

    const sorted = [...data].sort((a, b) => (b.accountCount ?? 0) - (a.accountCount ?? 0))
    const top10 = sorted.slice(0, 10)
    const otherCount = sorted.slice(10).reduce((s, i) => s + (i.accountCount ?? 0), 0)

    const pieData: { name: string; value: number; itemStyle: { color: string } }[] = top10.map(
      (item, i) => ({
        name: item.username || '',
        value: item.accountCount ?? 0,
        itemStyle: { color: USER_PALETTE[i] },
      }),
    )
    if (otherCount > 0) {
      pieData.push({
        name: '其他用户',
        value: otherCount,
        itemStyle: { color: OTHER_COLOR },
      })
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 个账号 ({d}%)',
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        bottom: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 10, color: '#6b7280' },
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          label: {
            position: 'inside',
            fontSize: 11,
            color: '#fff',
            formatter: '{c}',
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          data: pieData,
        },
      ],
    }
  }, [data])

  const chartRef = useChart<HTMLDivElement>(option, [option])

  // --- 加载态 ---
  if (loading) {
    return (
      <div className={cardClass}>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">店铺归属分布</h3>
        <div className="flex items-center justify-center aspect-square">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  // --- 空数据 ---
  if (!data || data.length === 0) {
    return (
      <div className={cardClass}>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">店铺归属分布</h3>
        <div className="flex items-center justify-center text-gray-400 text-sm aspect-square">
          暂无数据
        </div>
      </div>
    )
  }

  // --- 正常渲染 ---
  return (
    <div className={cardClass}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">店铺归属分布</h3>
      <div ref={chartRef} className="w-full min-h-[200px] aspect-square" />
    </div>
  )
}
