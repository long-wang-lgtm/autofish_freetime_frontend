'use client'

import type { HourlyTrendDTO } from '@/lib/api/selection'
import { computeStabilityFromTrend } from '@/components/selection/product/hourlyTrendUtils'

interface StabilityPanelProps {
  hourlyTrend: HourlyTrendDTO | null
}

function cvLabel(cv: number | null): string {
  if (cv === null) return '-'
  if (cv < 0.5) return '波动较小'
  if (cv < 1.2) return '中等波动'
  return '剧烈波动'
}

function cvColor(cv: number | null): string {
  if (cv === null) return 'text-gray-600'
  if (cv < 0.5) return 'text-green-600'
  if (cv < 1.2) return 'text-amber-600'
  return 'text-red-600'
}

export function StabilityPanel({ hourlyTrend }: StabilityPanelProps) {
  const wantStats = computeStabilityFromTrend(hourlyTrend, 'hourly_want_rate')
  const lookStats = computeStabilityFromTrend(hourlyTrend, 'hourly_look_rate')
  const collectStats = computeStabilityFromTrend(hourlyTrend, 'hourly_collect_rate')

  const items = [
    { label: '想要需求', stats: wantStats },
    { label: '浏览流量', stats: lookStats },
    { label: '收藏意愿', stats: collectStats },
  ]

  const totalN = Math.max(wantStats.n, lookStats.n, collectStats.n)

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider px-1">
        📐 稳定性诊断
      </div>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-[11px]">
        {items.map(({ label, stats }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">{label}</span>
            <span className="font-semibold text-gray-800 tabular-nums">
              {stats.mean?.toFixed(2) ?? '-'} ± {stats.stddev?.toFixed(2) ?? '-'} /h
            </span>
            <span className={`tabular-nums ${cvColor(stats.cv)}`}>
              波动 {stats.cv?.toFixed(2) ?? '-'} · {cvLabel(stats.cv)}
            </span>
          </div>
        ))}
        <div className="text-[11px] text-gray-500 pt-1">
          基于窗口内 {totalN} 个数据点 · 未排除昼夜周期效应
        </div>
      </div>
    </div>
  )
}
