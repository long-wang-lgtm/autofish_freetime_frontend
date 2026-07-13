'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorTableProps {
  data: MonitoredItem[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  orderBy: string | null
  asc: boolean
  onSortChange: (field: string | null) => void
  selectedGids: Set<string>
  onToggleSelect: (gid: string) => void
  onToggleAll: () => void
  onOpenDetail: (item: MonitoredItem) => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

const GRID_COLS = '32px 0.8fr 2fr 0.7fr 0.9fr 0.8fr 0.7fr 0.7fr 0.7fr 1fr 0.6fr'

export function MonitorTable({
  data,
  isLoading,
  error,
  onRetry,
  orderBy,
  asc,
  onSortChange,
  selectedGids,
  onToggleSelect,
  onToggleAll,
  onOpenDetail,
  page,
  total,
  pageSize,
  onPageChange,
}: MonitorTableProps) {
  const columns = useMemo<DataTableColumn<MonitoredItem>[]>(() => [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={data.length > 0 && selectedGids.size === data.length}
          onChange={onToggleAll}
          className="w-4 h-4 rounded border-gray-300"
        />
      ),
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedGids.has(item.gid)}
          onChange={() => onToggleSelect(item.gid)}
          className="w-4 h-4 rounded border-gray-300"
        />
      ),
    },
    {
      key: 'gid',
      header: '商品 gid',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.gid}</span>
      ),
    },
    {
      key: 'title',
      header: '标题',
      render: (item) => (
        <span className="text-sm text-gray-800 leading-snug line-clamp-2">{item.title || '-'}</span>
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
      key: 'wantSlope',
      header: '想要斜率',
      sortable: true,
      align: 'right',
      render: (item) => {
        const td = item.trendData as Record<string, unknown> | null | undefined
        const fc = td?.fetchCount as number | undefined
        const windows = td?.windows as number | undefined
        const lowConfidence = fc != null && fc < 6
        return (
          <div className="flex flex-col items-end">
            <span className={`text-sm tabular-nums ${(item.wantSlope ?? 0) > 0 ? 'text-green-600' : (item.wantSlope ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {fmtGrowth(item.wantSlope ?? null)}
            </span>
            <span className={`text-xs ${lowConfidence ? 'italic text-amber-600' : 'text-gray-400'}`}>
              {fc != null ? `采集${fc}次` : '无数据'}·窗口{windows ?? '?'}天
            </span>
          </div>
        )
      },
    },
    {
      key: 'wantAvg',
      header: '日均想要',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.wantAvg != null ? fmtNumber(item.wantAvg) : '-'}</span>
      ),
    },
    {
      key: 'convertRate',
      header: '转化率',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{fmtPercent(item.convertRate ?? null)}</span>
      ),
    },
    {
      key: 'itemStatus',
      header: '商品状态',
      render: (item) => {
        const itemStatusConfig: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
          0: { label: '在售', color: 'green' },
          1: { label: '下架', color: 'gray' },
          2: { label: '售出', color: 'amber' },
        }
        return (
          <StatusBadge status={item.itemStatus ?? 0} config={itemStatusConfig} />
        )
      },
    },
    {
      key: 'monitorStatus',
      header: '监控状态',
      render: (item) => (
        <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
      ),
    },
    {
      key: 'opportunity',
      header: '绑定商机',
      render: (item) => (
        <span className={`text-sm ${item.opportunity_id ? 'text-blue-600' : 'text-gray-400'}`}>
          {item.opportunity_id ? `商机 #${item.opportunity_id}` : '未绑定'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => onOpenDetail(item)}
          className="h-10 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          详情
        </button>
      ),
    },
  ], [selectedGids, onToggleSelect, onToggleAll, onOpenDetail, data.length])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.gid}
        gridTemplateColumns={GRID_COLS}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="暂无监控商品"
        emptyDescription="添加关键词后，系统将自动采集监控商品数据"
        orderBy={orderBy}
        asc={asc}
        onSortChange={onSortChange}
        stickyHeader
      />
      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </div>
  )
}
