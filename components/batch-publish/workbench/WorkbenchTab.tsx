'use client'

import { useState, useCallback, useEffect } from 'react'
import { useWorkbenchPage } from '@/hooks/batch-publish/useWorkbenchPage'
import { ResizableDivider } from '@/components/publish/ResizableDivider'
import { WorkbenchOverview } from './WorkbenchOverview'
import { OpportunityListPanel } from './OpportunityListPanel'
import { MaterialWorkspace } from './MaterialWorkspace'
import { MaterialEditSheet } from './MaterialEditSheet'
import { CreateMaterialModal } from './CreateMaterialModal'

const LEFT_PANEL_DEFAULT_WIDTH = 320
const LEFT_PANEL_MIN_WIDTH = 260
const LEFT_PANEL_MAX_WIDTH = 480

export function WorkbenchTab() {
  const page = useWorkbenchPage()

  const [leftWidth, setLeftWidth] = useState(LEFT_PANEL_DEFAULT_WIDTH)

  // 从 localStorage 恢复分栏宽度
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

  const handleCreateMaterials = useCallback((num: number) => {
    if (!page.selectedOpportunity) return
    page.createMaterialsMutation.mutate(
      { num, opp: page.selectedOpportunity },
      { onSuccess: () => page.setShowCreateModal(false) }
    )
  }, [page])

  // ---- 概览视图（桌面端 + 移动端共享） ----
  if (!page.selectedOid) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm">
        <WorkbenchOverview
          materials={page.overviewMaterials}
          total={page.overviewTotal}
          isLoading={page.overviewLoading}
          error={page.overviewError}
          onRetry={page.overviewRefetch}
          page={page.overviewPage}
          pageSize={50}
          onPageChange={page.setOverviewPage}
        />
      </div>
    )
  }

  // ---- 移动端：Push/Pop 导航 ----
  if (page.isMobile) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* 概览视图 */}
        {page.mobileView === 'overview' && (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <WorkbenchOverview
              materials={page.overviewMaterials}
              total={page.overviewTotal}
              isLoading={page.overviewLoading}
              error={page.overviewError}
              onRetry={page.overviewRefetch}
              page={page.overviewPage}
              pageSize={50}
              onPageChange={page.setOverviewPage}
            />
          </div>
        )}

        {/* 商机列表（Push） */}
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
              />
            </div>
          </div>
        )}

        {/* 素材工作区（Push） */}
        {page.mobileView === 'workspace' && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => page.setMobileView(page.selectedOid ? 'opportunity-list' : 'overview')}
                className="flex items-center justify-center w-11 h-11 -ml-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-900 truncate">
                {page.selectedOpportunity?.name ?? '创作台'}
              </span>
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

  // ---- PC 端：左右分栏 ----
  return (
    <div className="flex-1 flex min-h-0">
      {/* 左侧：商机列表 */}
      <div style={{ width: leftWidth }} className="flex-shrink-0">
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
          />
        </div>
      </div>

      {/* 拖拽分隔线 */}
      <ResizableDivider direction="horizontal" onResize={handleResize} />

      {/* 右侧：素材工作区 */}
      <div className="flex-1 min-w-0">
        <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
          />
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
