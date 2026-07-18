'use client'

import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { MaterialRow } from './MaterialRow'
import { MATERIAL_GRID_COLS, MATERIAL_HEADER_LABELS, PAGE_SIZE } from '@/components/batch-publish/shared/constants'
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

export function MaterialWorkspace({
  opportunity, materials, materialLoading, materialError, materialRefetch,
  selectedMaterialIds, onToggleSelect, onClearSelection, onOpenEditor,
  onOpenContextModal, onCreateClick, selectedOid,
  page, total, onPageChange,
  onBackToOverview, materialPage,
}: MaterialWorkspaceProps) {
  const isMobile = useIsMobile()

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
      <div className="flex-1 overflow-y-auto relative">
        {materialLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : materialError ? (
          <ErrorBanner variant="banner" message="加载素材失败" onRetry={materialRefetch} />
        ) : materials.length === 0 ? (
          <EmptyState
            size="md"
            title="暂无素材"
            description="点击「批量创建」为该商机创建素材"
            action={{ label: '批量创建', onClick: onCreateClick }}
          />
        ) : (
          <>
            {/* 表头 */}
            <div
              className="grid gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200 sticky top-0 z-10"
              style={{ gridTemplateColumns: MATERIAL_GRID_COLS }}
            >
              <div>
                {selectedMaterialIds.size > 0 && (
                  <button onClick={onClearSelection} className="text-blue-600 hover:underline text-xs">
                    取消
                  </button>
                )}
              </div>
              <div>{MATERIAL_HEADER_LABELS[1]}</div>
              <div>{MATERIAL_HEADER_LABELS[2]}</div>
              <div>{MATERIAL_HEADER_LABELS[3]}</div>
              <div>{MATERIAL_HEADER_LABELS[4]}</div>
              <div>{MATERIAL_HEADER_LABELS[5]}</div>
              <div>{MATERIAL_HEADER_LABELS[6]}</div>
              <div>{MATERIAL_HEADER_LABELS[7]}</div>
            </div>

            {/* 数据行 */}
            {materials.map((m) => (
              <MaterialRow
                key={m.id}
                materialId={m.id}
                isSelected={selectedMaterialIds.has(m.id)}
                onToggleSelect={onToggleSelect}
                onOpenSheet={onOpenEditor}
                onOpenContextModal={onOpenContextModal}
                selectedOid={selectedOid}
                materialPage={materialPage}
              />
            ))}

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
          </>
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPageChange} />
      </div>
    </div>
  )
}
