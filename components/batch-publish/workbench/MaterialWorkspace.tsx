'use client'

import { useCallback } from 'react'
import { Pagination } from '@/components/ui/data/Pagination'
import { NativeTable } from '@/components/ui/data/NativeTable'
import type { NativeTableColumn } from '@/components/ui/data/NativeTable'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { MaterialTableRow } from './MaterialTableRow'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
import { fmtPrice } from '@/lib/utils/format'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { OpportunityItem, PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialWorkspaceProps {
  opportunity: OpportunityItem | null
  materials: PublishMaterial[]
  materialLoading: boolean
  materialError: unknown
  materialRefetch: () => void
  selectedMaterialIds: Set<number>
  onToggleSelect: (id: number) => void
  onClearSelection: () => void
  onOpenEditor: (id: number) => void
  onOpenContextModal: (id: number) => void
  onCreateClick: () => void
  selectedOid: number | undefined
  page: number
  total: number
  onPageChange: (p: number) => void
  onBackToOverview: () => void
  materialPage: number
}

/** 素材表格列定义 — 仅用于表头渲染（数据行由 MaterialTableRow 通过 RowComponent 渲染） */
const MATERIAL_COLUMNS: NativeTableColumn<PublishMaterial>[] = [
  { key: 'checkbox',  width: '32px',  align: 'center', header: ' ' },
  { key: 'cover',     width: '56px',  align: 'center', header: '封面' },
  { key: 'desc',      width: '28%',   align: 'left',   header: '描述' },
  { key: 'prompt',    width: '20%',   align: 'left',   header: '封面提示词' },
  { key: 'price',     width: '80px',  align: 'center', header: '价格' },
  { key: 'account',   width: '100px', align: 'center', header: '账号' },
  { key: 'category',  width: '100px', align: 'center', header: '类目' },
  { key: 'aiContext', width: '100px', align: 'center', header: 'AI上下文' },
  { key: 'progress',  width: '96px',  align: 'center', header: '进度/操作' },
  { key: 'delete',    width: '32px',  align: 'center', header: '删除' },
]

export function MaterialWorkspace({
  opportunity, materials, materialLoading, materialError, materialRefetch,
  selectedMaterialIds, onToggleSelect, onClearSelection, onOpenEditor,
  onOpenContextModal, onCreateClick, selectedOid,
  page, total, onPageChange,
  onBackToOverview, materialPage,
}: MaterialWorkspaceProps) {
  const isMobile = useIsMobile()

  // 行组件包装器——闭包捕获 workspace props 注入到 MaterialTableRow
  const RowWrapper = useCallback(
    ({ item }: { item: PublishMaterial; index: number }) => (
      <MaterialTableRow
        item={item}
        index={0}
        isSelected={selectedMaterialIds.has(item.id)}
        onToggleSelect={onToggleSelect}
        onOpenEditor={onOpenEditor}
        onOpenContextModal={onOpenContextModal}
        selectedOid={selectedOid}
        materialPage={materialPage}
      />
    ),
    [selectedMaterialIds, onToggleSelect, onOpenEditor, onOpenContextModal, selectedOid, materialPage]
  )

  if (!opportunity) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        请从左侧选择一个商机
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 商机头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToOverview}
            aria-label="返回概览"
            className={
              isMobile
                ? 'h-9 w-9 inline-flex items-center justify-center text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors flex-shrink-0 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800'
                : 'h-9 px-3.5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors flex-shrink-0 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:border-gray-600'
            }
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {!isMobile && <span>返回</span>}
          </button>
          <button
            onClick={onCreateClick}
            aria-label="创建素材"
            className={
              isMobile
                ? 'h-9 w-9 inline-flex items-center justify-center text-base font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors flex-shrink-0 dark:bg-blue-500 dark:hover:bg-blue-600'
                : 'h-9 px-3.5 inline-flex items-center gap-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors flex-shrink-0 dark:bg-blue-500 dark:hover:bg-blue-600'
            }
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            {!isMobile && <span>创建素材</span>}
          </button>

          <h3 className="text-base font-semibold text-gray-900 truncate">{opportunity.name}</h3>
          {(opportunity.price ?? 0) > 0 && (
            <span className="text-sm text-gray-600 flex-shrink-0">{fmtPrice(opportunity.price!)}</span>
          )}
          <span className="text-xs text-gray-400 flex-shrink-0">
            📦{opportunity.monitoredItemCount ?? 0} · 📝{opportunity.materialCount ?? 0}
          </span>
        </div>
      </div>

      {/* 素材表格 */}
      <div className="flex-1 min-h-0">
        <NativeTable
          columns={MATERIAL_COLUMNS}
          data={materials}
          keyExtractor={(m) => String(m.id)}
          isLoading={materialLoading}
          error={materialError}
          errorMessage="加载素材失败"
          onRetry={materialRefetch}
          emptyTitle="暂无素材"
          emptyDescription="点击「批量创建」为该商机创建素材"
          emptyAction={{ label: '批量创建', onClick: onCreateClick }}
          stickyHeader
          RowComponent={RowWrapper}
          onRowClick={(m) => onOpenEditor(m.id)}
          className="h-full"
        />

        {/* 批量操作栏 */}
        {selectedMaterialIds.size > 0 && (
          <div className="sticky bottom-0 px-3 pb-3 z-10">
            <BatchActionBar
              selectedCount={selectedMaterialIds.size}
              onClear={onClearSelection}
              actions={[]}
            />
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPageChange} />
      </div>
    </div>
  )
}
