'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtGrowth, fmtNumber, fmtPercent, fmtDateTime } from '@/lib/utils/format'
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
  onBindOpportunity: (gid: string) => void
  onNavigateOpportunity: (oid: number) => void
  onStatusToggle: (gid: string, currentStatus: number) => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

const GRID_COLS = '32px 2fr 0.7fr 0.8fr 0.8fr 0.7fr 0.6fr 0.6fr 0.8fr 0.8fr 0.8fr'

const ITEM_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0: { label: '在售', color: 'green' },
  1: { label: '下架', color: 'gray' },
  2: { label: '售出', color: 'amber' },
}

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
  onBindOpportunity,
  onNavigateOpportunity,
  onStatusToggle,
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
      key: 'productInfo',
      header: '商品信息',
      render: (item) => (
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-500 tabular-nums truncate">{item.gid}</span>
          <span className="text-sm text-gray-800 leading-snug line-clamp-1">{item.title || '-'}</span>
        </div>
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
      key: 'wantSlope',
      header: '想要斜率',
      sortable: true,
      align: 'center',
      render: (item) => {
        const td = item.trendData as Record<string, unknown> | null | undefined
        const fc = td?.fetchCount as number | undefined
        const windows = td?.windows as number | undefined
        const lowConfidence = fc != null && fc < 6
        return (
          <div className="flex flex-col items-center">
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
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.wantAvg != null ? fmtNumber(item.wantAvg) : '-'}
        </span>
      ),
    },
    {
      key: 'convertRate',
      header: '转化率',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {fmtPercent(item.convertRate ?? null)}
        </span>
      ),
    },
    {
      key: 'itemStatus',
      header: '商品状态',
      align: 'center',
      render: (item) => (
        <StatusBadge status={item.itemStatus ?? 0} config={ITEM_STATUS_CONFIG} />
      ),
    },
    {
      key: 'monitorStatus',
      header: '监控状态',
      align: 'center',
      render: (item) => {
        const status = item.monitorStatus ?? 0
        const isTogglable = status === 0 || status === 1
        return (
          <button
            type="button"
            className={isTogglable ? 'cursor-pointer' : 'cursor-default'}
            disabled={!isTogglable}
            onClick={(e) => {
              if (!isTogglable) return
              e.stopPropagation()
              onStatusToggle(item.gid, status)
            }}
            title={isTogglable ? '点击切换监控状态' : undefined}
          >
            <StatusBadge status={status} config={MONITOR_STATUS_CONFIG} />
          </button>
        )
      },
    },
    {
      key: 'opportunity',
      header: '绑定商机',
      align: 'center',
      render: (item) => {
        if (item.opportunity?.id) {
          return (
            <button
              onClick={() => onNavigateOpportunity(item.opportunity!.id)}
              className="text-sm text-blue-600 hover:underline transition-colors"
            >
              {item.opportunity.name ?? `商机 #${item.opportunity.id}`}
            </button>
          )
        }
        return (
          <button
            onClick={() => onBindOpportunity(item.gid)}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            未绑定
          </button>
        )
      },
    },
    {
      key: 'created_at',
      header: '创建时间',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.created_at ? fmtDateTime(item.created_at) : '-'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: '更新时间',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.updated_at ? fmtDateTime(item.updated_at) : '-'}
        </span>
      ),
    },

  ], [selectedGids, data.length, onToggleSelect, onToggleAll, onBindOpportunity, onNavigateOpportunity, onStatusToggle])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
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
          onRowClick={onOpenDetail}
          stickyHeader
        />
      </div>
      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </div>
  )
}
