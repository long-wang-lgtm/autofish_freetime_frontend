'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ProgressActionCell } from '../original/ProgressActionCell'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtDateTime, fmtPrice } from '@/lib/utils/format'
import type { PublishMaterial, RewriteStage } from '@/lib/api/batch-publish'

interface MaterialTableProps {
  data: PublishMaterial[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  /** 已选素材 id（跨组多选） */
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  /** 表头全选——对当前表格数据生效 */
  onToggleAll: () => void
  onOpportunityClick: (id: number) => void
  /** 行点击 → 打开编辑 Sheet */
  onOpenEditor: (id: number) => void
  /** 触发 AI 工作——由父组件包装 mutation，行内闭包传入 materialId */
  onTriggerWork: (materialId: number, stage: RewriteStage) => Promise<void>
  onPublish: (materialId: number) => Promise<void>
  isAnyLoading: boolean
}

const GRID_COLS = '32px 1fr 2.5fr 0.7fr 0.7fr 0.8fr 0.7fr 1.8fr 0.7fr 0.8fr'

export function MaterialTable({
  data, isLoading, error, onRetry,
  selectedIds, onToggleSelect, onToggleAll,
  onOpportunityClick, onOpenEditor,
  onTriggerWork, onPublish, isAnyLoading,
}: MaterialTableProps) {
  const allSelected = data.length > 0 && data.every((m) => selectedIds.has(m.id))

  const columns = useMemo<DataTableColumn<PublishMaterial>[]>(() => [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.has(item.id)}
          onChange={() => onToggleSelect(item.id)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
    },
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
        return <span className="text-sm text-gray-400">{item.souItem?.title || item.souItem?.gid || '—'}</span>
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
      key: 'progress',
      header: '进度/操作',
      align: 'center',
      render: (item) => (
        <ProgressActionCell
          status={item.status}
          onTriggerWork={(stage) => onTriggerWork(item.id, stage)}
          onPublish={() => onPublish(item.id)}
          isAnyLoading={isAnyLoading}
        />
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
  ], [allSelected, selectedIds, onToggleSelect, onToggleAll, onOpportunityClick, onTriggerWork, onPublish, isAnyLoading])

  return (
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
      onRowClick={(item) => onOpenEditor(item.id)}
    />
  )
}
