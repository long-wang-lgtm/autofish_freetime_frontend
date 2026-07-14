'use client'

import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { ReferencePanel } from './ReferencePanel'
import { MaterialRow } from './MaterialRow'
import { fmtPrice } from '@/lib/utils/format'
import type { OpportunityItem, MonitoredItem, PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialWorkspaceProps {
  opportunity: OpportunityItem | null
  materials: PublishMaterial[]
  materialLoading: boolean
  materialError: unknown
  materialRefetch: () => void
  monitoredItems: MonitoredItem[]
  monitoredLoading: boolean
  selectedMaterialIds: Set<number>
  onToggleSelect: (id: number) => void
  onClearSelection: () => void
  onOpenEditor: (id: number) => void
  onCreateClick: () => void
  selectedOid: number | undefined
  page: number
  total: number
  onPageChange: (p: number) => void
}

const GRID_COLS = '32px 2fr 0.7fr 0.8fr 1.5fr 0.8fr 0.4fr'

export function MaterialWorkspace({
  opportunity, materials, materialLoading, materialError, materialRefetch,
  monitoredItems, monitoredLoading,
  selectedMaterialIds, onToggleSelect, onClearSelection, onOpenEditor,
  onCreateClick, selectedOid,
  page, total, onPageChange,
}: MaterialWorkspaceProps) {
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
          <h3 className="text-base font-semibold text-gray-900 truncate">{opportunity.name}</h3>
          {(opportunity.price ?? 0) > 0 && (
            <span className="text-sm text-gray-600 flex-shrink-0">{fmtPrice(opportunity.price!)}</span>
          )}
          <span className="text-xs text-gray-400 flex-shrink-0">
            📦{opportunity.monitoredItemCount ?? 0} · 📝{opportunity.materialCount ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onCreateClick}
            className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            批量创建
          </button>
        </div>
      </div>

      {/* 参考面板 */}
      <ReferencePanel
        items={monitoredItems}
        isLoading={monitoredLoading}
        opportunityId={opportunity.id}
      />

      {/* 素材表格 */}
      <div className="flex-1 overflow-y-auto">
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
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div>
                {selectedMaterialIds.size > 0 && (
                  <button onClick={onClearSelection} className="text-blue-600 hover:underline text-xs">
                    取消
                  </button>
                )}
              </div>
              <div>描述</div>
              <div>价格</div>
              <div>状态</div>
              <div>AI 操作</div>
              <div>进度</div>
              <div />
            </div>

            {/* 数据行 */}
            {materials.map((m) => (
              <MaterialRow
                key={m.id}
                materialId={m.id}
                isSelected={selectedMaterialIds.has(m.id)}
                onToggleSelect={onToggleSelect}
                onOpenEditor={onOpenEditor}
                selectedOid={selectedOid}
              />
            ))}
          </>
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
      </div>
    </div>
  )
}
