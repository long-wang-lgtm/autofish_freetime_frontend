'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { MonitorTrendCharts } from './MonitorTrendCharts'
import { fmtPrice } from '@/lib/utils/format'
import { useState } from 'react'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorDetailPanelProps {
  item: MonitoredItem
  onClose: () => void
  onSingleBind?: (gid: string) => void
  onDeleteItem?: (gid: string) => void
}

const ITEM_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0: { label: '在售', color: 'green' },
  1: { label: '下架', color: 'gray' },
  2: { label: '售出', color: 'amber' },
}

export function MonitorDetailPanel({ item, onClose, onSingleBind, onDeleteItem }: MonitorDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const td = item.trendData as Record<string, unknown> | null | undefined
  const trendTime = td?.trendTime as { timestamp?: unknown } | undefined
  const hasTrendData = Array.isArray(trendTime?.timestamp) && (trendTime!.timestamp as unknown[]).length > 0
  const fetchCount = td?.fetchCount as number | undefined
  const windows = td?.windows as number | undefined
  const lowConfidence = fetchCount != null && fetchCount < 6
  const hasOpportunity = !!item.opportunity?.id

  return (
    <>
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">商品详情</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Bar */}
        {(onSingleBind || onDeleteItem) && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 flex-shrink-0">
            {onSingleBind && !hasOpportunity && (
              <button
                onClick={() => onSingleBind(item.gid)}
                className="h-8 px-3 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                绑定商机
              </button>
            )}
            {onDeleteItem && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                取消监控
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
          <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{item.title || '无标题'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.price != null && (
              <span className="text-sm font-semibold text-gray-900">{fmtPrice(item.price)}</span>
            )}
            <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
            {item.itemStatus != null && (
              <StatusBadge status={item.itemStatus} config={ITEM_STATUS_CONFIG} />
            )}
          </div>
          {td && (
            <p className="text-xs text-gray-400">
              采集{fetchCount ?? '?'}次 · 窗口{windows ?? '?'}天
            </p>
          )}
          {lowConfidence && (
            <p className="text-xs text-amber-600 italic">
              采集次数较少（{fetchCount}次），数据置信度较低
            </p>
          )}
        </div>

        {/* Trend Charts */}
        <div className="flex-1 min-h-0 p-4">
          {hasTrendData ? (
            <MonitorTrendCharts
              trendData={{
                trendTime: td!.trendTime as any,
                trendDays: td!.trendDays as any,
                fetchCount: (fetchCount ?? 0),
                windows: (windows ?? 0),
              }}
            />
          ) : (
            <EmptyState
              size="sm"
              title="暂无趋势数据"
              description="持续监控后将自动生成趋势图表"
            />
          )}
        </div>
      </div>

      {/* Delete ConfirmDialog */}
      {onDeleteItem && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false) }}
          title="确认取消监控"
          description={`确定要取消对 "${item.title || item.gid}" 的监控吗？此操作不可恢复。`}
          confirmLabel="取消监控"
          variant="danger"
          onConfirm={() => {
            onDeleteItem(item.gid)
            setShowDeleteConfirm(false)
          }}
        />
      )}
    </>
  )
}
