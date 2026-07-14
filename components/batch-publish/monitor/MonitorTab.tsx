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
import type { MonitoredItem } from '@/lib/api/batch-publish'

export function MonitorTab() {
  const {
    search, monitorStatus, bindStatus, onFilterChange,
    orderBy, asc, onSortChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    bindMutation, unbindMutation, deleteMutation,
    isMobile,
  } = useMonitorPage()

  const [selectedGids, setSelectedGids] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [bindModalOpen, setBindModalOpen] = useState(false)
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
  }, [])

  const handleBindConfirm = useCallback((opportunityId: number) => {
    bindMutation.mutate(
      { gids: Array.from(selectedGids), opportunityId },
      { onSuccess: () => { setBindModalOpen(false); onClearSelection() } }
    )
  }, [selectedGids, bindMutation, onClearSelection])

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
              />
            ))
          )}
          {/* 移动端：长按进入批量选择，BatchActionBar 常驻底部 */}
          {selectionMode && (
            <BatchActionBar
              selectedCount={selectedGids.size}
              onClear={onClearSelection}
              actions={[
                { label: '绑定商机', onClick: () => setBindModalOpen(true), variant: 'primary' },
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
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* PC 端批量操作栏 */}
      {!isMobile && selectedGids.size > 0 && (
        <BatchActionBar
          selectedCount={selectedGids.size}
          onClear={onClearSelection}
          actions={[
            { label: '绑定商机', onClick: () => setBindModalOpen(true), variant: 'primary' },
          ]}
        />
      )}

      {/* 侧边栏详情面板 */}
      {detailItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-20" onClick={() => setDetailItem(null)} />
          <MonitorDetailPanel item={detailItem} onClose={() => setDetailItem(null)} />
        </>
      )}

      {/* 绑定弹窗 */}
      <BindOpportunityModal
        open={bindModalOpen}
        onClose={() => setBindModalOpen(false)}
        selectedCount={selectedGids.size}
        onConfirm={handleBindConfirm}
        isPending={bindMutation.isPending}
      />

      {/* 解绑确认 */}
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

      {/* 删除确认 */}
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
