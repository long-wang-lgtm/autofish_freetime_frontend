'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOriginalPage } from '@/hooks/batch-publish/useOriginalPage'
import { ResizableDivider } from '@/components/ui/ResizableDivider'
import { PendingOverviewPanel } from './PendingOverviewPanel'
import { OpportunityListPanel } from './OpportunityListPanel'
import { MaterialWorkspace } from './MaterialWorkspace'
import { MaterialEditSheet } from './MaterialEditSheet'
import { CreateMaterialModal } from './CreateMaterialModal'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
import type { PublishMaterial, OpportunityParams } from '@/lib/api/batch-publish'

const LEFT_PANEL_DEFAULT_WIDTH = 320
const LEFT_PANEL_MIN_WIDTH = 260
const LEFT_PANEL_MAX_WIDTH = 480

export function OriginalTab() {
  const page = useOriginalPage()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [leftWidth, setLeftWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH)

  useEffect(() => {
    const saved = localStorage.getItem('bp-workbench-left-width')
    if (saved) setLeftWidth(Number(saved))
  }, [])

  const handleResize = useCallback((delta: number) => {
    setLeftWidth(prev => {
      const next = Math.min(Math.max(prev + delta, LEFT_PANEL_MIN_WIDTH), LEFT_PANEL_MAX_WIDTH)
      localStorage.setItem('bp-workbench-left-width', String(next))
      return next
    })
  }, [])

  // Back to overview → clear oid param
  const handleBackToOverview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.delete('oid')
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Select opportunity → set URL param → right panel switches to workspace
  const handleSelectOid = useCallback((oid: number) => {
    if (oid === page.selectedOid) {
      handleBackToOverview()
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(oid))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams, page.selectedOid, handleBackToOverview])

  // From PendingOverviewPanel: click material row → select its opportunity
  const handleSelectFromOverview = useCallback((material: PublishMaterial) => {
    if (material.opportunity?.id) {
      handleSelectOid(material.opportunity.id)
    }
  }, [handleSelectOid])

  const handleCreateMaterials = useCallback((num: number) => {
    if (!page.selectedOpportunity) return
    page.createMaterialsMutation.mutate(
      { num, opp: page.selectedOpportunity },
      { onSuccess: () => page.setShowCreateModal(false) }
    )
  }, [page])

  // ---- Opportunity CRUD callbacks (passed to left panel) ----
  const handleCreateOpportunity = useCallback((values: OpportunityParams) => {
    page.createOpportunity.mutate(values)
  }, [page.createOpportunity])

  const handleUpdateOpportunity = useCallback((oid: number, values: Partial<OpportunityParams>) => {
    page.updateOpportunity.mutate({ oid, opp: values })
  }, [page.updateOpportunity])

  const handleDeleteOpportunity = useCallback((oid: number) => {
    page.deleteOpportunity.mutate(oid)
  }, [page.deleteOpportunity])

  const isOppMutating =
    page.createOpportunity.isPending ||
    page.updateOpportunity.isPending ||
    page.deleteOpportunity.isPending

  // ---- Common left panel component ----
  const leftPanel = (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
        selectedOid={page.selectedOid}
        onSelectOid={handleSelectOid}
        onCreateOpportunity={handleCreateOpportunity}
        onUpdateOpportunity={handleUpdateOpportunity}
        onDeleteOpportunity={handleDeleteOpportunity}
        isMutating={isOppMutating}
      />
    </div>
  )

  // ---- Right panel content (PC: switches between overview ↔ workspace) ----
  const rightPanelContent = page.selectedOid ? (
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
      materialPage={page.materialPage}
    />
  ) : (
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

  // ---- Mobile: dual-view toggle + Push workspace ----
  if (page.isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* 无选中商机：双视图切换 */}
        {!page.selectedOid && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* 视图切换按钮 */}
            <div className="flex items-center border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => page.setMobileView('overview')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  page.mobileView === 'overview'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                待办概览
              </button>
              <button
                onClick={() => page.setMobileView('opportunities')}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                  page.mobileView === 'opportunities'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                商机列表
              </button>
            </div>

            {/* 视图内容 */}
            <div className="flex-1 overflow-hidden">
              {page.mobileView === 'overview' ? (
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
              ) : (
                leftPanel
              )}
            </div>
          </div>
        )}

        {/* 选中商机：Push 工作区（header 由 MaterialWorkspace 自己渲染） */}
        {!!page.selectedOid && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
              materialPage={page.materialPage}
            />
          </div>
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
      </div>
    )
  }

  // ---- PC: left-right split ----
  return (
    <div className="flex-1 flex min-h-0">
      {/* 左侧：商机列表（持久可见） */}
      <div style={{ width: leftWidth }} className="flex-shrink-0">
        {leftPanel}
      </div>

      {/* 拖拽分隔线 */}
      <ResizableDivider direction="horizontal" onResize={handleResize} />

      {/* 右侧：内容区（切换 PendingOverviewPanel ↔ MaterialWorkspace） */}
      <div className="flex-1 min-w-0">
        <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {rightPanelContent}
        </div>
      </div>

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
    </div>
  )
}
