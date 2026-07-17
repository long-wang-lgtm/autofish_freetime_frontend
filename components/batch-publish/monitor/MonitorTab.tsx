'use client'

import { useState, useCallback } from 'react'
import { useMonitorPage } from '@/hooks/batch-publish/useMonitorPage'
import { MonitorFilterBar } from './MonitorFilterBar'
import { MonitorTable } from './MonitorTable'
import { MonitorDetailPanel } from './MonitorDetailPanel'
import { MonitorCard } from './MonitorCard'
import { BindOpportunityModal } from './BindOpportunityModal'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
import { useRouter } from 'next/navigation'
import type { MonitoredItem } from '@/lib/api/batch-publish'

export function MonitorTab() {
  const {
    search, monitorStatus, bindStatus, onFilterChange,
    orderBy, asc, onSortChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    bindMutation, unbindMutation, deleteMutation,
    singleBindMutation, statusToggleMutation,
    isMobile,
  } = useMonitorPage()

  const router = useRouter()

  const [selectedGids, setSelectedGids] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [bindModalOpen, setBindModalOpen] = useState(false)
  const [singleBindGid, setSingleBindGid] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<MonitoredItem | null>(null)
  const [unbindTarget, setUnbindTarget] = useState<MonitoredItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MonitoredItem | null>(null)

  const onToggleSelect = useCallback((gid: string) => {
    setSelectedGids((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid); else next.add(gid)
      return next
    })
  }, [])

  const onToggleAll = useCallback(() => {
    if (selectedGids.size === data.length) {
      setSelectedGids(new Set())
    } else {
      setSelectedGids(new Set(data.map((d) => d.gid)))
    }
  }, [selectedGids, data])

  const onClearSelection = useCallback(() => {
    setSelectedGids(new Set())
    setSelectionMode(false)
    setSingleBindGid(null)
    setBindModalOpen(false)
  }, [])

  // 批量绑定
  const handleBatchBindConfirm = useCallback((opportunityId: number) => {
    bindMutation.mutate(
      { gids: Array.from(selectedGids), opportunityId },
      { onSuccess: () => { setBindModalOpen(false); onClearSelection() } }
    )
  }, [selectedGids, bindMutation, onClearSelection])

  // 单条绑定
  const handleSingleBindConfirm = useCallback((opportunityId: number) => {
    if (!singleBindGid) return
    singleBindMutation.mutate(
      { gid: singleBindGid, opportunityId },
      { onSuccess: () => { setSingleBindGid(null); setBindModalOpen(false); onClearSelection() } }
    )
  }, [singleBindGid, singleBindMutation, onClearSelection])

  const bindModalOnConfirm = singleBindGid ? handleSingleBindConfirm : handleBatchBindConfirm
  const bindModalSelectedCount = singleBindGid ? 1 : selectedGids.size
  const bindModalMode = singleBindGid ? 'single' as const : 'batch' as const
  const bindModalIsPending = singleBindGid ? singleBindMutation.isPending : bindMutation.isPending

  const handleOpenSingleBind = useCallback((gid: string) => {
    setSingleBindGid(gid)
    setBindModalOpen(true)
  }, [])

  const handleOpenBatchBind = useCallback(() => {
    setSingleBindGid(null)
    setBindModalOpen(true)
  }, [])

  const handleNavigateOpportunity = useCallback((oid: number) => {
    router.push(`/dashboard/batch-publish?tab=workbench&oid=${oid}`)
  }, [router])

  const handleStatusToggle = useCallback((gid: string, currentStatus: number) => {
    const newStatus = currentStatus === 0 ? 1 : 0
    statusToggleMutation.mutate({ gid, newStatus: newStatus as 0 | 1 })
  }, [statusToggleMutation])

  const handleCloseDetail = useCallback(() => setDetailItem(null), [])

  const errorGuard = renderErrorGuard({
    error,
    isLoading,
    hasData: data.length > 0,
    onRetry: () => refetch(),
  })
  if (errorGuard) return errorGuard

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <MonitorFilterBar
        search={search}
        monitorStatus={monitorStatus}
        bindStatus={bindStatus}
        onFilterChange={onFilterChange}
        onRefresh={() => refetch()}
      />

      {/* BatchActionBar — 非 sticky，在筛选栏和表格之间 */}
      {!isMobile && selectedGids.size > 0 && (
        <BatchActionBar
          selectedCount={selectedGids.size}
          onClear={onClearSelection}
          sticky={false}
          actions={[
            { label: '绑定商机', onClick: handleOpenBatchBind, variant: 'primary' },
          ]}
        />
      )}

      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              size="sm"
              title="暂无监控商品"
              description="添加关键词后，系统将自动采集监控商品数据"
            />
          ) : (
            data.map((item) => (
              <MonitorCard
                key={item.gid}
                item={item}
                isSelected={selectedGids.has(item.gid)}
                onToggleSelect={onToggleSelect}
                onOpenDetail={setDetailItem}
                selectionMode={selectionMode}
                onStatusToggle={handleStatusToggle}
              />
            ))
          )}
          {selectionMode && (
            <BatchActionBar
              selectedCount={selectedGids.size}
              onClear={onClearSelection}
              actions={[
                { label: '绑定商机', onClick: handleOpenBatchBind, variant: 'primary' },
                { label: '退出选择', onClick: () => { setSelectionMode(false); onClearSelection() }, variant: 'secondary' },
              ]}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MonitorTable
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            orderBy={orderBy}
            asc={asc}
            onSortChange={onSortChange}
            selectedGids={selectedGids}
            onToggleSelect={onToggleSelect}
            onToggleAll={onToggleAll}
            onOpenDetail={setDetailItem}
            onBindOpportunity={handleOpenSingleBind}
            onNavigateOpportunity={handleNavigateOpportunity}
            onStatusToggle={handleStatusToggle}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Detail Panel */}
      {detailItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-20" onClick={handleCloseDetail} />
          <MonitorDetailPanel
            item={detailItem}
            onClose={handleCloseDetail}
            onSingleBind={handleOpenSingleBind}
            onDeleteItem={(gid) => {
              const target = data.find((d) => d.gid === gid)
              if (target) setDeleteTarget(target)
            }}
          />
        </>
      )}

      {/* Bind Modal */}
      <BindOpportunityModal
        open={bindModalOpen}
        onClose={() => { setBindModalOpen(false); setSingleBindGid(null) }}
        selectedCount={bindModalSelectedCount}
        mode={bindModalMode}
        onConfirm={bindModalOnConfirm}
        isPending={bindModalIsPending}
      />

      {/* Unbind Confirm */}
      {unbindTarget && (
        <ConfirmDialog
          open={!!unbindTarget}
          onOpenChange={(open) => { if (!open) setUnbindTarget(null) }}
          title="确认解绑"
          description={`确定要解绑商品 "${unbindTarget.title || unbindTarget.gid}" 吗？`}
          confirmLabel="解绑"
          variant="danger"
          loading={unbindMutation.isPending}
          onConfirm={() => unbindMutation.mutate(unbindTarget.gid, { onSuccess: () => setUnbindTarget(null) })}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          title="确认删除"
          description={`确定要删除监控商品 "${deleteTarget.title || deleteTarget.gid}" 吗？此操作不可恢复。`}
          confirmLabel="删除"
          variant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.gid, { onSuccess: () => setDeleteTarget(null) })}
        />
      )}
    </div>
  )
}
