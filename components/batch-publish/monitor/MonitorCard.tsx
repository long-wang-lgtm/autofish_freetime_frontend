'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorCardProps {
  item: MonitoredItem
  isSelected: boolean
  onToggleSelect: (gid: string) => void
  onOpenDetail: (item: MonitoredItem) => void
  selectionMode: boolean
  onStatusToggle: (gid: string, currentStatus: number) => void
  onCreate: (item: MonitoredItem) => void
}

const ITEM_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0: { label: '在售', color: 'green' },
  1: { label: '下架', color: 'gray' },
  2: { label: '售出', color: 'amber' },
}

export function MonitorCard({ item, isSelected, onToggleSelect, onOpenDetail, selectionMode, onStatusToggle, onCreate }: MonitorCardProps) {
  const td = item.trendData as Record<string, unknown> | null | undefined
  const fc = td?.fetchCount as number | undefined
  const windows = td?.windows as number | undefined
  const lowConfidence = fc != null && fc < 6

  return (
    <div
      className={`bg-white border rounded-xl p-3 space-y-2 min-h-[44px] ${
        isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'
      }`}
      onClick={selectionMode ? () => onToggleSelect(item.gid) : () => onOpenDetail(item)}
    >
      {/* 标题行 */}
      <div className="flex items-start gap-2">
        {selectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.gid)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <span className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 flex-1">
          {item.title || '无标题'}
        </span>
      </div>

      {/* 信息行 */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.price != null && (
          <span className="text-sm font-semibold text-gray-900">{fmtPrice(item.price)}</span>
        )}
        {(() => {
          const ms = item.monitorStatus ?? 0
          const isTogglable = ms === 0 || ms === 1
          return (
            <button
              type="button"
              className={isTogglable ? 'cursor-pointer' : 'cursor-default'}
              disabled={!isTogglable}
              onClick={(e) => {
                if (!isTogglable) return
                e.stopPropagation()
                onStatusToggle(item.gid, ms)
              }}
              title={isTogglable ? '点击切换监控状态' : undefined}
            >
              <StatusBadge status={ms} config={MONITOR_STATUS_CONFIG} />
            </button>
          )
        })()}
        {item.itemStatus != null && (
          <StatusBadge status={item.itemStatus} config={ITEM_STATUS_CONFIG} />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCreate(item)
          }}
          className="h-11 px-3 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0 ml-auto"
        >
          创作
        </button>
      </div>

      {/* 指标行 */}
      <div className="flex items-center gap-3 text-sm">
        <span className={(item.wantSlope ?? 0) > 0 ? 'text-green-600' : (item.wantSlope ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'}>
          {fmtGrowth(item.wantSlope ?? null)}
        </span>
        <span className="text-gray-700">{fmtNumber(item.wantAvg ?? 0)}</span>
        <span className="text-gray-500">{fmtPercent(item.convertRate ?? null)}</span>
      </div>

      {/* 数据窗口 */}
      {fc != null && (
        <p className={`text-xs ${lowConfidence ? 'italic text-amber-600' : 'text-gray-400'}`}>
          采集{fc}次 · 窗口{windows ?? '?'}天
        </p>
      )}
    </div>
  )
}
