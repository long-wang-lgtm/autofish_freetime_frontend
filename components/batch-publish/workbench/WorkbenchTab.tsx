'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkbenchPage } from '@/hooks/batch-publish/useWorkbenchPage'
import { ResizableDivider } from '@/components/publish/ResizableDivider'
import { PendingOverviewPanel } from './PendingOverviewPanel'
import { OpportunityListPanel } from './OpportunityListPanel'
import { MaterialWorkspace } from './MaterialWorkspace'
import { MaterialEditSheet } from './MaterialEditSheet'
import { CreateMaterialModal } from './CreateMaterialModal'
import type { PublishMaterial, OpportunityParams } from '@/lib/api/batch-publish'

const LEFT_PANEL_DEFAULT_WIDTH = 320
const LEFT_PANEL_MIN_WIDTH = 260
const LEFT_PANEL_MAX_WIDTH = 480

export function WorkbenchTab() {
  const page = useWorkbenchPage()
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

  // Select opportunity → set URL param → right panel switches to workspace
  const handleSelectOid = useCallback((oid: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(oid))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Back to overview → clear oid param
  const handleBackToOverview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.delete('oid')
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

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
      monitoredItems={page.monitoredItems}
      monitoredLoading={page.monitoredLoading}
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
    />
  ) : (
    <PendingOverviewPanel
      materials={page.overviewMaterials}
      total={page.overviewTotal}
      isLoading={page.overviewLoading}
      error={page.overviewError}
      onRetry={page.overviewRefetch}
      page={page.overviewPage}
      pageSize={50}
      onPageChange={page.setOverviewPage}
      onSelectMaterial={handleSelectFromOverview}
    />
  )

  // ---- Mobile: Push/Pop navigation ----
  if (page.isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* 概览层 */}
        {page.mobileView === 'overview' && !page.selectedOid && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* 商机快捷切换胶囊条 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 overflow-x-auto flex-shrink-0">
              <button
                onClick={() => {}}
                className={`flex-shrink-0 px-3 h-11 min-w-[60px] inline-flex items-center text-xs font-medium rounded-full transition-colors ${
                  !page.selectedOid
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                全部商机
              </button>
              {page.opportunities.slice(0, 6).map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => handleSelectOid(opp.id)}
                  className="flex-shrink-0 px-3 h-11 min-w-[60px] inline-flex items-center text-xs font-medium rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {opp.name.slice(0, 6)}
                </button>
              ))}
              <button
                onClick={() => page.setMobileView('opportunity-list')}
                className="flex-shrink-0 px-3 h-11 min-w-[44px] inline-flex items-center text-xs text-gray-400 hover:text-gray-600"
              >
                更多 →
              </button>
            </div>
            <PendingOverviewPanel
              materials={page.overviewMaterials}
              total={page.overviewTotal}
              isLoading={page.overviewLoading}
              error={page.overviewError}
              onRetry={page.overviewRefetch}
              page={page.overviewPage}
              pageSize={50}
              onPageChange={page.setOverviewPage}
              onSelectMaterial={handleSelectFromOverview}
            />
          </div>
        )}

        {/* 商机列表（Push from overview pill strip "更多"） */}
        {page.mobileView === 'opportunity-list' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => page.setMobileView('overview')}
                className="flex items-center justify-center w-11 h-11 -ml-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-900">选择商机</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {leftPanel}
            </div>
          </div>
        )}

        {/* 素材工作区（Push） */}
        {(page.mobileView === 'workspace' || (!!page.selectedOid && page.mobileView === 'overview')) && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => {
                  handleBackToOverview()
                  page.setMobileView('overview')
                }}
                className="flex items-center justify-center w-11 h-11 -ml-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                {page.selectedOpportunity?.name ?? '创作台'}
              </span>
              <button
                onClick={() => page.setShowCreateModal(true)}
                className="h-9 px-3 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                批量创建
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MaterialWorkspace
                opportunity={page.selectedOpportunity}
                materials={page.materials}
                materialLoading={page.materialLoading}
                materialError={page.materialError}
                materialRefetch={page.materialRefetch}
                monitoredItems={page.monitoredItems}
                monitoredLoading={page.monitoredLoading}
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
              />
            </div>
          </div>
        )}

        {/* Sheet 编辑器 */}
        <MaterialEditSheet
          materialId={page.editingMaterialId}
          selectedOid={page.selectedOid}
          open={page.editingMaterialId !== null}
          onClose={page.closeEditor}
        />

        {/* 批量创建弹窗 */}
        <CreateMaterialModal
          open={page.showCreateModal}
          onClose={() => page.setShowCreateModal(false)}
          opportunity={page.selectedOpportunity}
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
      />

      {/* 批量创建弹窗 */}
      <CreateMaterialModal
        open={page.showCreateModal}
        onClose={() => page.setShowCreateModal(false)}
        opportunity={page.selectedOpportunity}
        onCreate={handleCreateMaterials}
        isPending={page.createMaterialsMutation.isPending}
      />
    </div>
  )
}
