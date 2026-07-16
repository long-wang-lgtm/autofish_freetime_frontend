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

const GRID_COLS = '1fr 2.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.7fr 0.8fr'

export function MaterialTable({
  data, isLoading, error, onRetry,
  page, total, pageSize, onPageChange,
  onOpportunityClick,
}: MaterialTableProps) {
  const columns = useMemo<DataTableColumn<PublishMaterial>[]>(() => [
    {
      key: 'opportunity',
      header: '所属商机',
      align: 'center',
      render: (item) => {
        if (item.opportunity?.id) {
          return (
            <button
              onClick={() => onOpportunityClick(item.opportunity!.id)}
              className="text-sm text-blue-600 hover:underline transition-colors"
            >
              {item.opportunity.name ?? `商机 #${item.opportunity.id}`}
            </button>
          )
        }
        return <span className="text-sm text-gray-400">—</span>
      },
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
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.price != null ? fmtPrice(item.price) : '-'}
        </span>
      ),
    },
    {
      key: 'category',
      header: '类目',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.category || '-'}</span>
      ),
    },
    {
      key: 'to_uid',
      header: '账号ID',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.to_uid || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: '发布状态',
      align: 'center',
      render: (item) => (
        <StatusBadge status={item.status} config={MATERIAL_STATUS_CONFIG} />
      ),
    },
    {
      key: 'to_gid',
      header: '商品ID',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-600 tabular-nums">{item.to_gid || '-'}</span>
      ),
    },
    {
      key: 'updated_at',
      header: '最后更新时间',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.updated_at ? fmtDateTime(item.updated_at) : '-'}
        </span>
      ),
    },
  ], [onOpportunityClick])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
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
      </div>
      <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
    </div>
  )
}
