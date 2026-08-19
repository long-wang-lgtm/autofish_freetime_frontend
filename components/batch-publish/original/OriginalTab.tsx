'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOriginalPage } from '@/hooks/batch-publish/useOriginalPage'
import { PendingOverviewPanel } from './PendingOverviewPanel'
import { OpportunityListPanel } from './OpportunityListPanel'
import { MaterialWorkspace } from './MaterialWorkspace'
import { MaterialEditSheet } from './MaterialEditSheet'
import { CreateMaterialModal } from './CreateMaterialModal'
import { OpportunitySwitchModal } from './OpportunitySwitchModal'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
import type { PublishMaterial, OpportunityParams } from '@/lib/api/batch-publish'

/**
 * 原创素材 Tab — v6 去左右分栏
 *
 * - 无选中商机：全屏总览（segment：商机列表 | 待办概览）
 * - 有选中商机：全屏详情（MaterialWorkspace，详情头部可切换商机）
 * - 移动端：双视图切换 + Push/Pop 保留
 */

export function OriginalTab() {
  const page = useOriginalPage()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Back to overview → clear oid param
  const handleBackToOverview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'original')
    params.delete('oid')
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Select opportunity → set URL param → full-screen workspace
  const handleSelectOid = useCallback((oid: number) => {
    if (oid === page.selectedOid) {
      handleBackToOverview()
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'original')
    params.set('oid', String(oid))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams, page.selectedOid, handleBackToOverview])

  // From PendingOverviewPanel: click material row → select its opportunity
  const handleSelectFromOverview = useCallback((material: PublishMaterial) => {
    if (material.opportunity?.id) {
      handleSelectOid(material.opportunity.id)
    }
  }, [handleSelectOid])

  // rejected 徽章点击 → 选中商机 + 聚焦判定区（弹窗 pick 场景先关弹窗再滚动）
  const handleFocusReview = useCallback((oid: number) => {
    page.setSwitchOpen(false)
    page.setReviewFocusToken((prev) => prev + 1)
    if (oid === page.selectedOid) return // 已在详情，仅滚动聚焦
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'original')
    params.set('oid', String(oid))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams, page.selectedOid, page.setSwitchOpen, page.setReviewFocusToken])

  // 切换商机弹窗：选中行 → 关弹窗 + 切换 oid
  const handleSwitchPick = useCallback((oid: number) => {
    page.setSwitchOpen(false)
    if (oid === page.selectedOid) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'original')
    params.set('oid', String(oid))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams, page.selectedOid, page.setSwitchOpen])

  const handleCreateMaterials = useCallback((num: number, toUid?: string, brief?: string) => {
    if (!page.selectedOpportunity) return
    page.createMaterialsMutation.mutate(
      { num, opp: page.selectedOpportunity, toUid, brief },
      { onSuccess: () => page.setShowCreateModal(false) }
    )
  }, [page])

  // ---- Opportunity CRUD callbacks ----
  const handleCreateOpportunity = useCallback((values: OpportunityParams & { draft_id?: number }) => {
    page.createOpportunity.mutate({ opp: values, draftId: values.draft_id })
  }, [page.createOpportunity])

  const handleUpdateOpportunity = useCallback(
    (oid: number, values: Partial<OpportunityParams> & { draft_id?: number }) => {
      page.updateOpportunity.mutate({ oid, opp: values, draftId: values.draft_id })
    },
    [page.updateOpportunity]
  )

  const handleDeleteOpportunity = useCallback((oid: number) => {
    page.deleteOpportunity.mutate(oid)
  }, [page.deleteOpportunity])

  const isOppMutating =
    page.createOpportunity.isPending ||
    page.updateOpportunity.isPending ||
    page.deleteOpportunity.isPending

  // ---- 全宽商机管理列表 ----
  const listPanel = (
    <OpportunityListPanel
      opportunities={page.opportunities}
      total={page.oppTotal}
      isLoading={page.oppLoading}
      error={page.oppError}
      onRetry={page.oppRefetch}
      page={page.oppPage}
      onPageChange={page.setOppPage}
      search={page.oppSearch}
      onSearchChange={page.setOppSearch}
      status={page.oppStatus}
      onStatusChange={page.setOppStatus}
      summaryStatus={page.oppSummaryStatus}
      onSummaryStatusChange={page.setOppSummaryStatus}
      selectedOid={page.selectedOid}
      onSelectOid={handleSelectOid}
      onFocusReview={handleFocusReview}
      onCreateOpportunity={handleCreateOpportunity}
      onUpdateOpportunity={handleUpdateOpportunity}
      onDeleteOpportunity={handleDeleteOpportunity}
      isMutating={isOppMutating}
    />
  )

  // ---- 待办概览 ----
  const overviewPanel = (
    <PendingOverviewPanel
      materials={page.overviewMaterials}
      total={page.overviewTotal}
      isLoading={page.overviewLoading}
      error={page.overviewError}
      onRetry={page.overviewRefetch}
      page={page.overviewPage}
      pageSize={PAGE_SIZE}
      onPageChange={page.setOverviewPage}
      onSelectMaterial={handleSelectFromOverview}
      onOpenEditor={page.openEditor}
    />
  )

  // ---- 详情工作区（PC/移动共用内容，容器外层各自包卡片） ----
  const workspaceContent = (
    <MaterialWorkspace
      opportunity={page.selectedOpportunity}
      materials={page.materials}
      materialLoading={page.materialLoading}
      materialError={page.materialError}
      materialRefetch={page.materialRefetch}
      selectedMaterialIds={page.selectedMaterialIds}
      onToggleSelect={page.toggleSelect}
      onClearSelection={page.clearSelection}
      onOpenEditor={page.openEditor}
      onCreateClick={() => page.setShowCreateModal(true)}
      selectedOid={page.selectedOid}
      page={page.materialPage}
      total={page.materialTotal}
      onPageChange={page.setMaterialPage}
      onBackToOverview={handleBackToOverview}
      onSwitchClick={() => page.setSwitchOpen(true)}
      reviewFocusToken={page.reviewFocusToken}
      materialPage={page.materialPage}
    />
  )

  // ---- segment 切换（无选中商机时的全屏总览；PC 与移动端共用样式） ----
  // PC：商机列表在前；移动端沿用旧双视图顺序（待办概览在前，默认激活）
  const segmentOptions: { key: 'list' | 'overview'; label: string }[] = page.isMobile
    ? [
        { key: 'overview', label: '待办概览' },
        { key: 'list', label: '商机列表' },
      ]
    : [
        { key: 'list', label: '商机列表' },
        { key: 'overview', label: '待办概览' },
      ]

  const segmentBar = (
    <div className="flex items-center border-b border-gray-100 flex-shrink-0">
      {segmentOptions.map((opt) => {
        const active = page.isMobile
          ? (opt.key === 'overview' ? page.mobileView === 'overview' : page.mobileView === 'opportunities')
          : page.pcView === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => {
              if (page.isMobile) {
                page.setMobileView(opt.key === 'overview' ? 'overview' : 'opportunities')
              } else {
                page.setPcView(opt.key)
              }
            }}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              active
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )

  // ---- 无选中商机：全屏总览（segment 切换） ----
  const overviewContainer = (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {segmentBar}
      <div className="flex-1 overflow-hidden">
        {page.isMobile ? (
          page.mobileView === 'overview' ? overviewPanel : listPanel
        ) : (
          page.pcView === 'list' ? listPanel : overviewPanel
        )}
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {page.selectedOid ? (
        /* 有选中商机：全屏详情工作区（PC + 移动 Push） */
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {workspaceContent}
        </div>
      ) : (
        overviewContainer
      )}

      {/* Sheet 编辑器 */}
      <MaterialEditSheet
        materialId={page.editingMaterialId}
        selectedOid={page.selectedOid}
        open={page.editingMaterialId !== null}
        onClose={page.closeEditor}
        materials={page.selectedOid ? page.materials : page.overviewMaterials}
      />

      {/* 批量创建弹窗 */}
      <CreateMaterialModal
        open={page.showCreateModal}
        onClose={() => page.setShowCreateModal(false)}
        source={page.selectedOpportunity ? { type: 'opp', opportunity: page.selectedOpportunity } : null}
        onCreate={handleCreateMaterials}
        isPending={page.createMaterialsMutation.isPending}
      />

      {/* 切换商机弹窗（唯一新增弹窗）— PC Modal lg / 移动 BottomSheet */}
      <OpportunitySwitchModal
        open={page.switchOpen}
        onClose={() => page.setSwitchOpen(false)}
        opportunities={page.opportunities}
        total={page.oppTotal}
        isLoading={page.oppLoading}
        error={page.oppError}
        onRetry={page.oppRefetch}
        page={page.oppPage}
        onPageChange={page.setOppPage}
        search={page.oppSearch}
        onSearchChange={page.setOppSearch}
        status={page.oppStatus}
        onStatusChange={page.setOppStatus}
        summaryStatus={page.oppSummaryStatus}
        onSummaryStatusChange={page.setOppSummaryStatus}
        selectedOid={page.selectedOid}
        onPick={handleSwitchPick}
        onFocusReview={handleFocusReview}
      />
    </div>
  )
}
