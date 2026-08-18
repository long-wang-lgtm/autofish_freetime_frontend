'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/data/Pagination'
import { NativeTable } from '@/components/ui/data/NativeTable'
import type { NativeTableColumn } from '@/components/ui/data/NativeTable'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { DistributionView } from '@/components/batch-publish/shared/DistributionView'
import { MaterialTableRow } from './MaterialTableRow'
import { OpportunitySummaryCard } from './OpportunitySummaryCard'
import { SummaryReExtractModal, type ReExtractSubmitValues } from './SummaryReExtractModal'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
import { fmtPrice } from '@/lib/utils/format'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useToast } from '@/components/ui/Toaster'
import { opportunitySummaryReview, updateOpportunity } from '@/lib/api/batch-publish'
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
  onCreateClick: () => void
  selectedOid: number | undefined
  page: number
  total: number
  onPageChange: (p: number) => void
  onBackToOverview: () => void
  materialPage: number
}

/** 素材表格列定义——表头与表行的列顺序、宽度、对齐均由此单一来源控制 */
const MATERIAL_COLUMNS: NativeTableColumn<PublishMaterial>[] = [
  { key: 'checkbox',  width: '3%',  align: 'center', header: ' ' },
  { key: 'cover',     width: '10%', align: 'center', header: '封面' },
  { key: 'desc',      align: 'left',   header: '描述' },          // 弹性——与 prompt 平分剩余宽度
  { key: 'prompt',    align: 'left',   header: '封面提示词' },      // 弹性——与 desc 平分剩余宽度
  { key: 'price',     width: '7%',  align: 'center', header: '价格' },
  { key: 'account',   width: '9%',  align: 'center', header: '账号' },
  { key: 'category',  width: '9%',  align: 'center', header: '类目' },
  { key: 'progress',  width: '10%', align: 'center', header: '进度/操作' },
  { key: 'delete',    width: '4%',  align: 'center', header: '删除' },
]

export function MaterialWorkspace({
  opportunity, materials, materialLoading, materialError, materialRefetch,
  selectedMaterialIds, onToggleSelect, onClearSelection, onOpenEditor,
  onCreateClick, selectedOid,
  page, total, onPageChange,
  onBackToOverview, materialPage,
}: MaterialWorkspaceProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const toast = useToast()

  // ---- 商机提炼质量判定（opportunity.summary.review）----
  const reviewMutation = useMutation({
    mutationFn: ({ oid, status }: { oid: number; status: 'operator_verified' | 'rejected' }) =>
      opportunitySummaryReview(oid, status),
    onSuccess: (data) => {
      toast.addToast({
        title: data.summary_status === 'rejected' ? '已标记为不合格' : '已确认提炼准确',
        variant: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `判定失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // ---- 重新提炼弹窗（extract → draft → 确认覆盖 summary）----
  const [reExtractOpen, setReExtractOpen] = useState(false)
  const [reExtractSubmitting, setReExtractSubmitting] = useState(false)

  // 切换商机时关闭重新提炼弹窗
  useEffect(() => {
    setReExtractOpen(false)
  }, [opportunity?.id])

  const handleReExtractSubmit = useCallback(async (values: ReExtractSubmitValues) => {
    if (!opportunity) return
    setReExtractSubmitting(true)
    try {
      await updateOpportunity(
        opportunity.id,
        { name: values.name, summary: values.summary, source_url: values.source_url },
        values.draft_id
      )
      toast.addToast({ title: '提炼结果已更新', variant: 'success' })
      setReExtractOpen(false)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    } catch (err) {
      toast.addToast({ title: `更新失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    } finally {
      setReExtractSubmitting(false)
    }
  }, [opportunity, toast, queryClient])

  // 行组件包装器——闭包捕获 workspace props 注入到 MaterialTableRow
  const RowWrapper = useCallback(
    ({ item, index }: { item: PublishMaterial; index: number }) => (
      <MaterialTableRow
        item={item}
        index={index}
        columns={MATERIAL_COLUMNS}
        isSelected={selectedMaterialIds.has(item.id)}
        onToggleSelect={onToggleSelect}
        onOpenEditor={onOpenEditor}
        selectedOid={selectedOid}
        materialPage={materialPage}
      />
    ),
    [selectedMaterialIds, onToggleSelect, onOpenEditor, selectedOid, materialPage]
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

      {/* 商机资料卡 — summary 非空才渲染 */}
      {opportunity.summary && (
        <OpportunitySummaryCard
          opportunity={opportunity}
          reviewPending={reviewMutation.isPending}
          onReview={(status) => reviewMutation.mutate({ oid: opportunity.id, status })}
          onReExtract={() => setReExtractOpen(true)}
        />
      )}

      {/* 素材表格 + 分发进度 */}
      <div className="flex-1 min-h-0 flex flex-col">
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
            tableLayout="fixed"
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

        {/* 分发进度 — 素材表格下方，独立滚动区域，避免与表格操作冲突 */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-4 max-h-[40%] overflow-y-auto">
          <DistributionView
            sourceType="opp"
            sourceId={selectedOid ?? opportunity.id}
            sourceName={opportunity.name}
          />
        </div>
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPageChange} />
      </div>

      {/* 重新提炼弹窗 — 打开时才挂载 */}
      {reExtractOpen && (
        <SummaryReExtractModal
          open={reExtractOpen}
          onClose={() => setReExtractOpen(false)}
          opportunity={opportunity}
          isPending={reExtractSubmitting}
          onSubmit={handleReExtractSubmit}
        />
      )}
    </div>
  )
}
