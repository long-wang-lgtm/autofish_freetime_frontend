'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtDateTime, fmtPrice } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialTableProps {
  data: PublishMaterial[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  onOpportunityClick: (id: number) => void
}

const GRID_COLS = '0.8fr 2fr 0.6fr 0.8fr 0.6fr 1fr 0.7fr 0.7fr'

export function MaterialTable({
  data, isLoading, error, onRetry,
  page, total, pageSize, onPageChange,
  onOpportunityClick,
}: MaterialTableProps) {
  const columns = useMemo<DataTableColumn<PublishMaterial>[]>(() => [
    {
      key: 'updated_at',
      header: '发布时间',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.updated_at ? fmtDateTime(item.updated_at) : '-'}
        </span>
      ),
    },
    {
      key: 'description',
      header: '描述',
      render: (item) => (
        <span className="text-sm text-gray-800 leading-snug line-clamp-2">{item.description || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: '价格',
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.price != null ? fmtPrice(item.price) : '-'}</span>
      ),
    },
    {
      key: 'category',
      header: '类目',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.category || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (item) => (
        <StatusBadge status={item.status} config={MATERIAL_STATUS_CONFIG} />
      ),
    },
    {
      key: 'opportunity',
      header: '所属商机',
      render: (item) => (
        <button
          onClick={() => { if (item.opportunity?.id) onOpportunityClick(item.opportunity.id) }}
          className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          disabled={!item.opportunity?.id}
        >
          {item.opportunity?.name ?? (item.opportunity?.id ? `商机 #${item.opportunity.id}` : '未知商机')}
        </button>
      ),
    },
    {
      key: 'to_uid',
      header: '发布账号',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.to_uid || '-'}</span>
      ),
    },
    {
      key: 'to_gid',
      header: '发布商品',
      render: (item) => (
        <span className="text-sm text-gray-600 tabular-nums">{item.to_gid || '-'}</span>
      ),
    },
  ], [onOpportunityClick])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns={GRID_COLS}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="暂无发布记录"
        emptyDescription="在创作台完成素材发布后，记录将出现在这里"
        stickyHeader
      />
      <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
    </div>
  )
}
