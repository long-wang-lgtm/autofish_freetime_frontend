'use client'

import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtRelative } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface PendingOverviewPanelProps {
  materials: PublishMaterial[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  pageSize: number
  onPageChange: (p: number) => void
  onSelectMaterial: (material: PublishMaterial) => void
}

export function PendingOverviewPanel({
  materials, total, isLoading, error, onRetry,
  page, pageSize, onPageChange, onSelectMaterial,
}: PendingOverviewPanelProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && !isLoading && materials.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={onRetry}
      />
    )
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        size="md"
        title="暂无待处理素材"
        description="所有素材已完成发布。去监控页面创建新的素材。"
      />
    )
  }

  // Flat list sorted: publish_failed first, then by updated_at desc
  const sorted = [...materials].sort((a, b) => {
    const aFailed = a.status === 'publish_failed' ? 1 : 0
    const bFailed = b.status === 'publish_failed' ? 1 : 0
    if (aFailed !== bFailed) return bFailed - aFailed
    return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
  })

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100 flex-shrink-0">
        待发布素材（共 {total} 份素材未完成）
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelectMaterial(m)}
            className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            style={{ gridTemplateColumns: '1.5fr 0.8fr 0.7fr 0.5fr 0.3fr' }}
          >
            <span className="text-sm text-gray-800 line-clamp-1">
              素材 #{m.id} · {m.description?.slice(0, 30) || '(无描述)'}
            </span>
            <span className="text-xs text-gray-400 truncate">
              {m.opportunity?.name ?? `#${m.opportunity?.id ?? '未知'}`}
            </span>
            <StatusBadge status={m.status} config={MATERIAL_STATUS_CONFIG} />
            <span className="text-gray-400 tabular-nums">
              {m.updated_at ? fmtRelative(m.updated_at) : '-'}
            </span>
            <span className="text-gray-400 text-right">→</span>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 border-t border-gray-100">
        <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
      </div>
    </div>
  )
}
