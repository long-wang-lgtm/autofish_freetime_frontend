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

function fmtRatio(v: number | null): string {
  if (v == null) return '-'
  return v.toFixed(2)
}

function fmtDelta(d: number | null): string {
  if (d == null) return '-'
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(2)} pp`
}

function fmtDeltaPct(d: number | null): string {
  if (d == null) return '-'
  const sign = d > 0 ? '+' : ''
  return `${sign}${(d * 100).toFixed(1)} pp`
}

function deltaArrow(d: number | null): string {
  if (d == null) return '→'
  if (d > 0.0005) return '↗'
  if (d < -0.0005) return '↘'
  return '→'
}

function deltaColor(d: number | null): string {
  if (d == null) return 'text-gray-400'
  if (d > 0.0005) return 'text-green-600'
  if (d < -0.0005) return 'text-red-600'
  return 'text-gray-400'
}

function lowSampleStyle(fetchCount: number): string {
  return fetchCount < 6
    ? 'italic text-gray-400 border-b border-dashed border-gray-300'
    : ''
}

function fetchCountLabel(n: number | null): string {
  if (n == null) return ''
  return `n=${n}`
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

  // D1→D3, D3→D7, D1→D7 delta calculations
  const d3InquiryDelta = d3.inquiry_rate != null && d1.inquiry_rate != null ? d3.inquiry_rate - d1.inquiry_rate : null
  const d7InquiryDelta = d7.inquiry_rate != null && d3.inquiry_rate != null ? d7.inquiry_rate - d3.inquiry_rate : null
  const totalInquiryDelta = d7.inquiry_rate != null && d1.inquiry_rate != null ? d7.inquiry_rate - d1.inquiry_rate : null

  const d3FavDelta = d3.favorite_rate != null && d1.favorite_rate != null ? d3.favorite_rate - d1.favorite_rate : null
  const d7FavDelta = d7.favorite_rate != null && d3.favorite_rate != null ? d7.favorite_rate - d3.favorite_rate : null
  const totalFavDelta = d7.favorite_rate != null && d1.favorite_rate != null ? d7.favorite_rate - d1.favorite_rate : null

  const d3IfDelta = d3.if_ratio != null && d1.if_ratio != null ? d3.if_ratio - d1.if_ratio : null
  const d7IfDelta = d7.if_ratio != null && d3.if_ratio != null ? d7.if_ratio - d3.if_ratio : null
  const totalIfDelta = d7.if_ratio != null && d1.if_ratio != null ? d7.if_ratio - d1.if_ratio : null

  const inquiryTrend = judgeThreeWindowTrend(d1.inquiry_rate, d3.inquiry_rate, d7.inquiry_rate)
  const favoriteTrend = judgeThreeWindowTrend(d1.favorite_rate, d3.favorite_rate, d7.favorite_rate)
  const ifTrend = judgeThreeWindowTrend(d1.if_ratio, d3.if_ratio, d7.if_ratio)

  const allSampleEnough = (d1.fetch_count ?? 0) >= 12 && (d3.fetch_count ?? 0) >= 12 && (d7.fetch_count ?? 0) >= 12

  const trendColor = (d: string) =>
    d === 'up' ? 'text-green-600' :
    d === 'down' ? 'text-red-600' :
    d === 'peak' ? 'text-orange-600' :
    d === 'v' ? 'text-blue-600' : 'text-gray-400'

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider px-1">
        📊 核心指标
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-600 border-b border-gray-100">
              <th className="text-left py-1.5 px-1 font-medium"></th>
              <th className="text-center py-1.5 px-2 font-medium">
                D1 ({fetchCountLabel(d1.fetch_count)})
              </th>
              <th className="text-center py-1.5 px-2 font-medium">
                D3 ({fetchCountLabel(d3.fetch_count)})
              </th>
              <th className="text-center py-1.5 px-1 text-gray-500">vs D1</th>
              <th className="text-center py-1.5 px-2 font-medium">
                D7 ({fetchCountLabel(d7.fetch_count)})
              </th>
              <th className="text-center py-1.5 px-1 text-gray-500">vs D3</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-800">D1→D7 总Δ</th>
              <th className="text-center py-1.5 px-1 text-gray-600">趋势</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* 询单率 row */}
            <tr>
              <td className="py-2 px-1 text-gray-600">询单率</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d1.fetch_count ?? 99)}`}
                  title={d1.fetch_count != null && d1.fetch_count < 6 ? `仅基于 ${d1.fetch_count} 次采集，置信度较低` : undefined}>
                {pct(d1.inquiry_rate)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {pct(d3.inquiry_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3InquiryDelta)}`}>
                {fmtDeltaPct(d3InquiryDelta)} {deltaArrow(d3InquiryDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {pct(d7.inquiry_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7InquiryDelta)}`}>
                {fmtDeltaPct(d7InquiryDelta)} {deltaArrow(d7InquiryDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalInquiryDelta)}`}>
                {fmtDeltaPct(totalInquiryDelta)} {deltaArrow(totalInquiryDelta)}
              </td>
              <td className="py-2 px-1 text-center">
                {allSampleEnough ? (
                  <span className={trendColor(inquiryTrend.direction)}>{inquiryTrend.label}</span>
                ) : (
                  <span className="text-gray-400">数据积累中</span>
                )}
              </td>
            </tr>

            {/* 收藏率 row */}
            <tr>
              <td className="py-2 px-1 text-gray-600">收藏率</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d1.fetch_count ?? 99)}`}>
                {pct(d1.favorite_rate)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {pct(d3.favorite_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3FavDelta)}`}>
                {fmtDeltaPct(d3FavDelta)} {deltaArrow(d3FavDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {pct(d7.favorite_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7FavDelta)}`}>
                {fmtDeltaPct(d7FavDelta)} {deltaArrow(d7FavDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalFavDelta)}`}>
                {fmtDeltaPct(totalFavDelta)} {deltaArrow(totalFavDelta)}
              </td>
              <td className="py-2 px-1 text-center">
                {allSampleEnough ? (
                  <span className={trendColor(favoriteTrend.direction)}>{favoriteTrend.label}</span>
                ) : (
                  <span className="text-gray-400">数据积累中</span>
                )}
              </td>
            </tr>

            {/* 询藏比 row */}
            <tr>
              <td className="py-2 px-1 text-gray-600 flex items-center gap-1">
                询藏比
                {ifTrend.direction === 'peak' && (
                  <span className="inline-flex items-center cursor-help" title="见顶回落：收藏增长放缓，询单仍在增长">
                    <Info className="w-2.5 h-2.5 text-gray-400" />
                  </span>
                )}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d1.fetch_count ?? 99)}`}>
                {fmtRatio(d1.if_ratio)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {fmtRatio(d3.if_ratio)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3IfDelta)}`}>
                {fmtDelta(d3IfDelta)} {deltaArrow(d3IfDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {fmtRatio(d7.if_ratio)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7IfDelta)}`}>
                {fmtDelta(d7IfDelta)} {deltaArrow(d7IfDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalIfDelta)}`}>
                {fmtDelta(totalIfDelta)} {deltaArrow(totalIfDelta)}
              </td>
              <td className="py-2 px-1 text-center">
                {allSampleEnough ? (
                  <span className={trendColor(ifTrend.direction)}>{ifTrend.label}</span>
                ) : (
                  <span className="text-gray-400">数据积累中</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Scale reference + Growth signals - single row below table */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600 px-1">
        <span>
          规模参考: 7天日均浏览 <span className="font-semibold text-gray-800">{d7DailyLook?.toFixed(1) ?? '-'}/天</span>
          {' · '}
          日均想要 <span className="font-semibold text-gray-800">{d7DailyWant?.toFixed(1) ?? '-'}/天</span>
        </span>
        <span className="mx-1 text-gray-300">|</span>
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
            acceleration > 0.3 ? 'text-red-500' : acceleration < -0.3 ? 'text-blue-500' : 'text-gray-600'
          }`}>
            {acceleration != null ? `${(acceleration * 100).toFixed(1)}%` : '-'}
            {acceleration != null && acceleration > 0.3 ? ' 🔥' : ''}
          </span>
        </span>
        <span>
          窗口占比{' '}
          <span className="font-semibold text-gray-800">
            {windowShare != null ? `${(windowShare * 100).toFixed(1)}%` : '-'}
          </span>
        </span>
        <span>
          价格{' '}
          <span className={`font-semibold ${
            priceTrend === 'down' ? 'text-red-600' :
            priceTrend === 'up' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {priceTrend === 'down' ? '↓降价' :
             priceTrend === 'up' ? '↑提价' : '→平稳'}
          </span>
        </span>
      </div>
    </div>
  )
}
