'use client'

import type { WindowMetricsDTO } from '@/lib/api/selection'

interface WindowCompareCardsProps {
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO }
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

function fmtDeltaInt(d: number | null): string {
  if (d == null) return '-'
  const sign = d > 0 ? '+' : ''
  return `${sign}${Math.round(d)}`
}

function deltaArrow(d: number | null): string {
  if (d == null) return '→'
  if (d > 0.0005) return '↗'
  if (d < -0.0005) return '↘'
  return '→'
}

function deltaColor(d: number | null): string {
  if (d == null) return 'text-gray-500'
  if (d > 0.0005) return 'text-green-600'
  if (d < -0.0005) return 'text-red-600'
  return 'text-gray-500'
}

function lowSampleStyle(fetchCount: number): string {
  return fetchCount < 6
    ? 'italic text-gray-500 border-b border-dashed border-gray-300'
    : ''
}

function fetchCountLabel(n: number | null): string {
  if (n == null) return ''
  return `n=${n}`
}

export function WindowCompareCards({
  windowsMetrics: wm,
  d7BrowseGrowth,
  acceleration,
  windowShare,
  priceTrend,
}: WindowCompareCardsProps) {
  const { d1, d3, d7 } = wm

  // D7→D3→D1 delta calculations (reading right-to-left chronologically)
  const d3VsD7InquiryDelta = d3.inquiry_rate != null && d7.inquiry_rate != null ? d3.inquiry_rate - d7.inquiry_rate : null
  const d1VsD3InquiryDelta = d1.inquiry_rate != null && d3.inquiry_rate != null ? d1.inquiry_rate - d3.inquiry_rate : null
  const totalInquiryDelta = d1.inquiry_rate != null && d7.inquiry_rate != null ? d1.inquiry_rate - d7.inquiry_rate : null

  const d3VsD7FavDelta = d3.favorite_rate != null && d7.favorite_rate != null ? d3.favorite_rate - d7.favorite_rate : null
  const d1VsD3FavDelta = d1.favorite_rate != null && d3.favorite_rate != null ? d1.favorite_rate - d3.favorite_rate : null
  const totalFavDelta = d1.favorite_rate != null && d7.favorite_rate != null ? d1.favorite_rate - d7.favorite_rate : null

  const d3VsD7IfDelta = d3.if_ratio != null && d7.if_ratio != null ? d3.if_ratio - d7.if_ratio : null
  const d1VsD3IfDelta = d1.if_ratio != null && d3.if_ratio != null ? d1.if_ratio - d3.if_ratio : null
  const totalIfDelta = d1.if_ratio != null && d7.if_ratio != null ? d1.if_ratio - d7.if_ratio : null

  // Daily averages: total / window_days
  const d1DailyLook = d1.total_dlook != null ? Math.round(d1.total_dlook / 1) : null
  const d3DailyLook = d3.total_dlook != null ? Math.round(d3.total_dlook / 3) : null
  const d7DailyLook = d7.total_dlook != null ? Math.round(d7.total_dlook / 7) : null
  const d3VsD7DailyLookDelta = d3DailyLook != null && d7DailyLook != null ? d3DailyLook - d7DailyLook : null
  const d1VsD3DailyLookDelta = d1DailyLook != null && d3DailyLook != null ? d1DailyLook - d3DailyLook : null
  const totalDailyLookDelta = d1DailyLook != null && d7DailyLook != null ? d1DailyLook - d7DailyLook : null

  const d1DailyWant = d1.total_dwant != null ? Math.round(d1.total_dwant / 1) : null
  const d3DailyWant = d3.total_dwant != null ? Math.round(d3.total_dwant / 3) : null
  const d7DailyWant = d7.total_dwant != null ? Math.round(d7.total_dwant / 7) : null
  const d3VsD7DailyWantDelta = d3DailyWant != null && d7DailyWant != null ? d3DailyWant - d7DailyWant : null
  const d1VsD3DailyWantDelta = d1DailyWant != null && d3DailyWant != null ? d1DailyWant - d3DailyWant : null
  const totalDailyWantDelta = d1DailyWant != null && d7DailyWant != null ? d1DailyWant - d7DailyWant : null

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider px-1">
        📊 核心指标
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-700 border-b border-gray-100">
              <th className="text-left py-1 px-1 font-medium"></th>
              <th className="text-center py-1 px-2 font-medium">
                D7 ({fetchCountLabel(d7.fetch_count)})
              </th>
              <th className="text-center py-1 px-2 font-medium">
                D3 ({fetchCountLabel(d3.fetch_count)})
              </th>
              <th className="text-center py-1 px-1 text-gray-600">vs D7</th>
              <th className="text-center py-1 px-2 font-medium">
                D1 ({fetchCountLabel(d1.fetch_count)})
              </th>
              <th className="text-center py-1 px-1 text-gray-600">vs D3</th>
              <th className="text-center py-1 px-2 font-semibold text-gray-900">D7→D1 总Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* 询单率 row */}
            <tr>
              <td className="py-2 px-1 text-gray-700">询单率</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {pct(d7.inquiry_rate)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {pct(d3.inquiry_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3VsD7InquiryDelta)}`}>
                {fmtDeltaPct(d3VsD7InquiryDelta)} {deltaArrow(d3VsD7InquiryDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d1.fetch_count ?? 99)}`}
                  title={d1.fetch_count != null && d1.fetch_count < 6 ? `仅基于 ${d1.fetch_count} 次采集，置信度较低` : undefined}>
                {pct(d1.inquiry_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d1VsD3InquiryDelta)}`}>
                {fmtDeltaPct(d1VsD3InquiryDelta)} {deltaArrow(d1VsD3InquiryDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalInquiryDelta)}`}>
                {fmtDeltaPct(totalInquiryDelta)} {deltaArrow(totalInquiryDelta)}
              </td>
            </tr>

            {/* 收藏率 row */}
            <tr>
              <td className="py-2 px-1 text-gray-700">收藏率</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {pct(d7.favorite_rate)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {pct(d3.favorite_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3VsD7FavDelta)}`}>
                {fmtDeltaPct(d3VsD7FavDelta)} {deltaArrow(d3VsD7FavDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d1.fetch_count ?? 99)}`}>
                {pct(d1.favorite_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d1VsD3FavDelta)}`}>
                {fmtDeltaPct(d1VsD3FavDelta)} {deltaArrow(d1VsD3FavDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalFavDelta)}`}>
                {fmtDeltaPct(totalFavDelta)} {deltaArrow(totalFavDelta)}
              </td>
            </tr>

            {/* 询藏比 row */}
            <tr>
              <td className="py-2 px-1 text-gray-700">询藏比</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {fmtRatio(d7.if_ratio)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {fmtRatio(d3.if_ratio)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3VsD7IfDelta)}`}>
                {fmtDelta(d3VsD7IfDelta)} {deltaArrow(d3VsD7IfDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-900 ${lowSampleStyle(d1.fetch_count ?? 99)}`}>
                {fmtRatio(d1.if_ratio)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d1VsD3IfDelta)}`}>
                {fmtDelta(d1VsD3IfDelta)} {deltaArrow(d1VsD3IfDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalIfDelta)}`}>
                {fmtDelta(totalIfDelta)} {deltaArrow(totalIfDelta)}
              </td>
            </tr>

            {/* 浏览日均 row */}
            <tr>
              <td className="py-2 px-1 text-gray-700">浏览日均</td>
              <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d7DailyLook ?? '-'}</td>
              <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d3DailyLook ?? '-'}</td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3VsD7DailyLookDelta)}`}>
                {fmtDeltaInt(d3VsD7DailyLookDelta)} {deltaArrow(d3VsD7DailyLookDelta)}
              </td>
              <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d1DailyLook ?? '-'}</td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d1VsD3DailyLookDelta)}`}>
                {fmtDeltaInt(d1VsD3DailyLookDelta)} {deltaArrow(d1VsD3DailyLookDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalDailyLookDelta)}`}>
                {fmtDeltaInt(totalDailyLookDelta)} {deltaArrow(totalDailyLookDelta)}
              </td>
            </tr>

            {/* 想要日均 row */}
            <tr>
              <td className="py-2 px-1 text-gray-700">想要日均</td>
              <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d7DailyWant ?? '-'}</td>
              <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d3DailyWant ?? '-'}</td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3VsD7DailyWantDelta)}`}>
                {fmtDeltaInt(d3VsD7DailyWantDelta)} {deltaArrow(d3VsD7DailyWantDelta)}
              </td>
              <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d1DailyWant ?? '-'}</td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d1VsD3DailyWantDelta)}`}>
                {fmtDeltaInt(d1VsD3DailyWantDelta)} {deltaArrow(d1VsD3DailyWantDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalDailyWantDelta)}`}>
                {fmtDeltaInt(totalDailyWantDelta)} {deltaArrow(totalDailyWantDelta)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Growth signals - single row below table */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700 px-1">
        <span>
          流量增速{' '}
          <span className={`font-semibold ${
            d7BrowseGrowth == null ? 'text-gray-500' :
            d7BrowseGrowth > 0 ? 'text-green-600' : d7BrowseGrowth < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {d7BrowseGrowth != null ? `${(d7BrowseGrowth * 100).toFixed(1)}%` : '-'}
            {d7BrowseGrowth != null && d7BrowseGrowth > 0 ? ' ↗' : d7BrowseGrowth != null && d7BrowseGrowth < 0 ? ' ↘' : ''}
          </span>
        </span>
        <span>
          升温{' '}
          <span className={`font-semibold ${
            acceleration == null ? 'text-gray-500' :
            acceleration > 0.3 ? 'text-red-500' : acceleration < -0.3 ? 'text-blue-500' : 'text-gray-700'
          }`}>
            {acceleration != null ? `${(acceleration * 100).toFixed(1)}%` : '-'}
            {acceleration != null && acceleration > 0.3 ? ' 🔥' : ''}
          </span>
        </span>
        <span>
          窗口占比{' '}
          <span className="font-semibold text-gray-900">
            {windowShare != null ? `${(windowShare * 100).toFixed(1)}%` : '-'}
          </span>
        </span>
        <span>
          价格{' '}
          <span className={`font-semibold ${
            priceTrend === 'down' ? 'text-red-600' :
            priceTrend === 'up' ? 'text-green-600' : 'text-gray-700'
          }`}>
            {priceTrend === 'down' ? '↓降价' :
             priceTrend === 'up' ? '↑提价' : '→平稳'}
          </span>
        </span>
      </div>
    </div>
  )
}
