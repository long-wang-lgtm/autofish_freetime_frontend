'use client'

import { useState, useCallback } from 'react'
import { useSpreadPage } from '@/hooks/batch-publish/useSpreadPage'
import { useOriginalMutations } from '@/hooks/batch-publish/useOriginalMutations'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { MaterialTable } from './MaterialTable'
import { MaterialCard } from './MaterialCard'
import { MaterialEditSheet } from '../original/MaterialEditSheet'
import { MATERIALS_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RewriteStage } from '@/lib/api/batch-publish'

export function SpreadTab() {
  const {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    isMobile,
  } = useSpreadPage()

  const router = useRouter()
  const searchParams = useSearchParams()

  // 无商机的二创素材处理草稿——复用 workbench 同款 mutation（invalidateAll 已前缀匹配，能刷新 all 列表）
  const { triggerWorkMutation, publishMutation, editMaterialMutation, deleteMaterialMutation } =
    useOriginalMutations(undefined)

  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null)

  const isAnyLoading =
    triggerWorkMutation.isPending ||
    publishMutation.isPending ||
    editMaterialMutation.isPending ||
    deleteMaterialMutation.isPending

  // ProgressActionCell 不捕获 reject，这里吞掉（错误 toast 已由 mutation 的 onError 处理）
  const handleTriggerWork = useCallback(async (materialId: number, stage: RewriteStage) => {
    try {
      await triggerWorkMutation.mutateAsync({ materialId, stage })
    } catch {
      /* 静默——mutation onError 已提示 */
    }
  }, [triggerWorkMutation])

  const handlePublish = useCallback(async (materialId: number) => {
    try {
      await publishMutation.mutateAsync(materialId)
    } catch {
      /* 静默——mutation onError 已提示 */
    }
  }, [publishMutation])

  const handleOpportunityClick = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'original')
    params.set('oid', String(id))
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  const errorGuard = renderErrorGuard({
    error,
    isLoading,
    hasData: data.length > 0,
    onRetry: () => refetch(),
  })
  if (errorGuard) return errorGuard

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <SearchToolbar>
        <input
          type="text"
          placeholder="搜索描述..."
          value={search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {MATERIALS_STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SearchToolbar>

      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              size="sm"
              title="暂无发布记录"
              description="在创作台完成素材发布后，记录将出现在这里"
            />
          ) : (
            data.map((item) => (
              <MaterialCard
                key={item.id}
                item={item}
                onOpportunityClick={handleOpportunityClick}
                onOpenEditor={setEditingMaterialId}
                onTriggerWork={handleTriggerWork}
                onPublish={handlePublish}
                isAnyLoading={isAnyLoading}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MaterialTable
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onOpportunityClick={handleOpportunityClick}
            onOpenEditor={setEditingMaterialId}
            onTriggerWork={handleTriggerWork}
            onPublish={handlePublish}
            isAnyLoading={isAnyLoading}
          />
        </div>
      )}

      {/* 编辑素材 Sheet——行内直接处理二创素材的完整创作流程 */}
      <MaterialEditSheet
        materialId={editingMaterialId}
        selectedOid={undefined}
        open={editingMaterialId !== null}
        onClose={() => setEditingMaterialId(null)}
        materials={data}
      />
    </div>
  )
}
