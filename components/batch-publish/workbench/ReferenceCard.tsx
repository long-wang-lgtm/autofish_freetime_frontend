'use client'

import type { MonitoredItem } from '@/lib/api/batch-publish'
import { fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'

interface ReferenceCardProps {
  item: MonitoredItem
}

export function ReferenceCard({ item }: ReferenceCardProps) {
  const trendData = item.trendData as { fetchCount?: number; windows?: number } | null | undefined
  const fetchCount = trendData?.fetchCount ?? 0
  const isLowConfidence = fetchCount > 0 && fetchCount < 6

  return (
    <div className="flex-shrink-0 w-[180px] p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-2">
        {item.title || item.gid}
      </p>

      <div className="space-y-1 text-xs">
        {item.wantSlope != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">想要斜率</span>
            <span className={`font-medium tabular-nums ${(item.wantSlope ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtGrowth(item.wantSlope)}
            </span>
          </div>
        )}
        {item.wantAvg != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">日均</span>
            <span className="text-gray-700 tabular-nums">{fmtNumber(item.wantAvg)}</span>
          </div>
        )}
        {item.convertRate != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">转化率</span>
            <span className="text-gray-700 tabular-nums">{fmtPercent(item.convertRate)}</span>
          </div>
        )}
        {item.price != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">价格</span>
            <span className="text-gray-700 tabular-nums">¥{item.price}</span>
          </div>
        )}
      </div>

      {isLowConfidence && (
        <p className="mt-2 text-[11px] italic text-amber-600 leading-tight">
          采集 {fetchCount} 次，置信度较低
        </p>
      )}
      {fetchCount === 0 && (
        <p className="mt-2 text-[11px] text-gray-400 leading-tight">无采集数据</p>
      )}
    </div>
  )
}
