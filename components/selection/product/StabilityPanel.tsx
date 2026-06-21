'use client'

import type { HourlyTrendDTO } from '@/lib/api/selection'
import { computeStabilityFromTrend } from '@/components/selection/product/hourlyTrendUtils'

interface StabilityPanelProps {
  hourlyTrend: HourlyTrendDTO | null
}

function cvColor(cv: number | null): string {
  if (cv === null) return 'text-gray-400'
  if (cv < 0.5) return 'text-green-600'
  if (cv < 0.8) return 'text-yellow-600'
  if (cv < 1.2) return 'text-orange-600'
  return 'text-red-600'
}

export function StabilityPanel({ hourlyTrend }: StabilityPanelProps) {
  const wantStats = computeStabilityFromTrend(hourlyTrend, 'hourly_want_rate')
  const lookStats = computeStabilityFromTrend(hourlyTrend, 'hourly_look_rate')
  const collectStats = computeStabilityFromTrend(hourlyTrend, 'hourly_collect_rate')

  const items = [
    { label: '想要稳定性', stats: wantStats },
    { label: '浏览稳定性', stats: lookStats },
    { label: '收藏稳定性', stats: collectStats },
  ]

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
        稳定性诊断
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ label, stats }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center space-y-1">
            <div className="text-[10px] text-gray-500">{label}</div>
            <div className={`text-lg font-bold tabular-nums ${cvColor(stats.cv)}`}>
              {stats.cv != null ? stats.cv.toFixed(2) : '-'}
            </div>
            <div className="text-[10px] text-gray-400 space-y-0.5">
              <div>μ {stats.mean?.toFixed(2) ?? '-'}/h</div>
              <div>σ {stats.stddev?.toFixed(2) ?? '-'}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-gray-400 text-right">
        基于窗口内 {wantStats.n} 个数据点
      </div>
    </div>
  )
}
