'use client'

import type { WindowMetricsDTO } from '@/lib/api/selection'
import { judgeThreeWindowTrend } from '@/components/selection/product/hourlyTrendUtils'
import { Info } from 'lucide-react'

interface WindowCompareCardsProps {
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO }
  d7DailyLook: number | null
  d7DailyWant: number | null
  d7BrowseGrowth: number | null
  acceleration: number | null
  windowShare: number | null
  priceTrend: string | null
}

function pct(v: number | null): string {
  if (v == null) return '-'
  return `${(v * 100).toFixed(1)}%`
}

function fmtNum(v: number | null): string {
  if (v == null) return '-'
  return v.toFixed(2)
}

export function WindowCompareCards({
  windowsMetrics: wm,
  d7DailyLook,
  d7DailyWant,
  d7BrowseGrowth,
  acceleration,
  windowShare,
  priceTrend,
}: WindowCompareCardsProps) {
  const { d1, d3, d7 } = wm

  const inquiryTrend = judgeThreeWindowTrend(d1.inquiry_rate, d3.inquiry_rate, d7.inquiry_rate)
  const favoriteTrend = judgeThreeWindowTrend(d1.favorite_rate, d3.favorite_rate, d7.favorite_rate)
  const ifTrend = judgeThreeWindowTrend(d1.if_ratio, d3.if_ratio, d7.if_ratio)

  const trendColor = (d: string) =>
    d === 'up' ? 'text-green-600' :
    d === 'down' ? 'text-red-600' :
    d === 'peak' ? 'text-orange-600' :
    d === 'v' ? 'text-blue-600' : 'text-gray-400'

  return (
    <div className="space-y-3">
      {/* 第一行：三窗口比率对比卡片 */}
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
        核心指标
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['d1', 'd3', 'd7'] as const).map(win => {
          const w = wm[win]
          return (
            <div key={win} className="bg-gray-50 rounded-lg p-2.5 text-center space-y-1">
              <div className="text-[10px] font-semibold text-gray-500 uppercase">
                {win === 'd1' ? 'D1 窗口' : win === 'd3' ? 'D3 窗口' : 'D7 窗口'}
              </div>
              <div className="text-[11px] text-gray-700 space-y-0.5">
                <div>询单 <span className="font-semibold">{pct(w.inquiry_rate)}</span></div>
                <div>收藏 <span className="font-semibold">{pct(w.favorite_rate)}</span></div>
                <div>询藏 <span className="font-semibold">{fmtNum(w.if_ratio)}</span></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 趋势标签行 */}
      <div className="flex gap-2 text-[10px]">
        <span className={trendColor(inquiryTrend.direction)}>
          询单率 · {inquiryTrend.label}
        </span>
        <span className={trendColor(favoriteTrend.direction)}>
          收藏率 · {favoriteTrend.label}
        </span>
        <span className={trendColor(ifTrend.direction)}>
          询藏比 · {ifTrend.label}
        </span>
        <span className="text-gray-300 inline-flex items-center cursor-help" title="基于三窗口单调性，仅供参考">
          <Info className="w-2.5 h-2.5" />
        </span>
      </div>

      {/* 第二行：规模参考 */}
      <div className="text-[10px] text-gray-500 px-1">
        规模参考: 7天日均浏览 <span className="font-semibold text-gray-700">{d7DailyLook?.toFixed(0) ?? '-'}/天</span>
        {' · '}
        日均想要 <span className="font-semibold text-gray-700">{d7DailyWant?.toFixed(0) ?? '-'}/天</span>
      </div>

      {/* 第三行：增长信号 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 px-1">
        <span>
          流量增速{' '}
          <span className={`font-semibold ${
            d7BrowseGrowth == null ? 'text-gray-400' :
            d7BrowseGrowth > 0 ? 'text-green-600' : d7BrowseGrowth < 0 ? 'text-red-600' : 'text-gray-400'
          }`}>
            {d7BrowseGrowth != null ? `${(d7BrowseGrowth * 100).toFixed(1)}%` : '-'}
            {d7BrowseGrowth != null && d7BrowseGrowth > 0 ? ' ↗' : d7BrowseGrowth != null && d7BrowseGrowth < 0 ? ' ↘' : ''}
          </span>
        </span>
        <span>
          升温{' '}
          <span className={`font-semibold ${
            acceleration == null ? 'text-gray-400' :
            acceleration > 0.3 ? 'text-red-500' : acceleration < -0.3 ? 'text-blue-500' : 'text-gray-500'
          }`}>
            {acceleration != null ? `${(acceleration * 100).toFixed(0)}%` : '-'}
            {acceleration != null && acceleration > 0.3 ? ' 🔥' : ''}
          </span>
        </span>
        <span>
          窗口占比{' '}
          <span className="font-semibold text-gray-700">
            {windowShare != null ? `${(windowShare * 100).toFixed(0)}%` : '-'}
          </span>
        </span>
        <span>
          价格{' '}
          <span className={`font-semibold ${
            priceTrend === 'down' ? 'text-red-600' :
            priceTrend === 'up' ? 'text-green-600' : 'text-gray-400'
          }`}>
            {priceTrend === 'down' ? '↓降价' :
             priceTrend === 'up' ? '↑提价' : '→平稳'}
          </span>
        </span>
      </div>
    </div>
  )
}
