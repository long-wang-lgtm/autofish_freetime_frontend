'use client'

import { DataTable } from '@/components/ui/data/DataTable'
import type { DataTableColumn } from '@/components/ui/data/DataTable'
import { Pagination } from '@/components/ui/data/Pagination'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtRelative } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

// ---- 常量 ----

const COLUMNS: DataTableColumn<PublishMaterial>[] = [
  {
    key: 'description',
    header: '素材',
    render: (m) => (
      <span className="text-sm text-gray-800 line-clamp-1">
        素材 #{m.id} · {m.description?.slice(0, 30) || '(无描述)'}
      </span>
    ),
  },
  {
    key: 'opportunity',
    header: '商机',
    render: (m) => (
      <span className="text-xs text-gray-400 truncate">
        {m.opportunity?.name ?? `#${m.opportunity?.id ?? '未知'}`}
      </span>
    ),
  },
  {
    key: 'status',
    header: '状态',
    render: (m) => <StatusBadge status={m.status} config={MATERIAL_STATUS_CONFIG} />,
  },
  {
    key: 'updated_at',
    header: '更新时间',
    align: 'right',
    render: (m) => (
      <span className="text-gray-400 tabular-nums">
        {m.updated_at ? fmtRelative(m.updated_at) : '-'}
      </span>
    ),
  },
  {
    key: 'action',
    header: '',
    align: 'right',
    render: () => <span className="text-gray-400">→</span>,
  },
]

// ---- Props ----

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

// ---- 组件 ----

export function PendingOverviewPanel({
  materials, total, isLoading, error, onRetry,
  page, pageSize, onPageChange, onSelectMaterial,
}: PendingOverviewPanelProps) {

  // 排序：发布失败优先，再按更新时间倒序
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
        <DataTable
          columns={COLUMNS}
          data={sorted}
          keyExtractor={(m) => String(m.id)}
          gridTemplateColumns="1.5fr 0.8fr 0.7fr 0.5fr 0.3fr"
          isLoading={isLoading}
          error={error}
          errorMessage={`加载失败：${(error as Error)?.message || '未知错误'}`}
          onRetry={onRetry}
          emptyTitle="暂无待处理素材"
          emptyDescription="所有素材已完成发布。去监控页面创建新的素材。"
          onRowClick={onSelectMaterial}
        />
      </div>

      <div className="flex-shrink-0 border-t border-gray-100">
        <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
      </div>
    </div>
  )
}
