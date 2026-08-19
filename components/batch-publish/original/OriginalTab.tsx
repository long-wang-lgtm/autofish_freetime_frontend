'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOriginalPage } from '@/hooks/batch-publish/useOriginalPage'
import { OpportunityListPanel } from './OpportunityListPanel'
import { MaterialWorkspace } from './MaterialWorkspace'
import { MaterialEditSheet } from './MaterialEditSheet'
import { CreateMaterialModal } from './CreateMaterialModal'
import { OpportunitySwitchModal } from './OpportunitySwitchModal'
import type { OpportunityParams } from '@/lib/api/batch-publish'

/**
 * 原创素材 Tab — v7 修正（商机列表表格化 + 待办概览移除）
 *
 * - 无选中商机：全屏商机表格（OpportunityListPanel manage，单行工具条 + NativeTable）
 * - 有选中商机：全屏详情（MaterialWorkspace，详情头部可切换商机）
 * - 移动端：无 oid = 全屏商机表格；有 oid = Push 详情
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {page.selectedOid ? workspaceContent : listPanel}
      </div>

      {/* Sheet 编辑器 */}
      <MaterialEditSheet
        materialId={page.editingMaterialId}
        selectedOid={page.selectedOid}
        open={page.editingMaterialId !== null}
        onClose={page.closeEditor}
        materials={page.materials}
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
