'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelectionPage } from '@/hooks/batch-publish/useSelectionPage'
import { listMaterials } from '@/lib/api/batch-publish'
import { MonitorFilterBar } from './MonitorFilterBar'
import { MonitorTable } from './MonitorTable'
import { MonitorDetailPanel } from './MonitorDetailPanel'
import { MonitorCard } from './MonitorCard'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
import { CreateMaterialModal, type CreateMaterialSource } from '@/components/batch-publish/original/CreateMaterialModal'
import type { MonitoredItem } from '@/lib/api/batch-publish'

export function SelectionTab() {
  const {
    search, monitorStatus, onFilterChange,
    orderBy, asc, onSortChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    deleteMutation, createByItemMutation, statusToggleMutation,
    isMobile,
  } = useSelectionPage()

  // 分发进度 — 全量拉取素材（单次 100 条），按源商品 gid 统计已发布素材覆盖的不同账号数（to_uid 去重）
  const { data: allMaterials } = useQuery({
    queryKey: ['batch-publish', 'materials', 'all'],
    queryFn: () => listMaterials({ page_size: 100 }),
  })

  const coverageMap = useMemo<Record<string, number>>(() => {
    // gid → 已发布素材覆盖的账号 uid（Set 去重，仅用 size 计数）
    const byGid = new Map<string, Set<string>>()
    for (const m of allMaterials?.items ?? []) {
      if (m.status !== 'published_success') continue
      const gid = m.souItem?.gid
      const uid = m.to_uid
      if (!gid || !uid) continue
      const uids = byGid.get(gid) ?? new Set<string>()
      uids.add(uid)
      byGid.set(gid, uids)
    }
    const map: Record<string, number> = {}
    Array.from(byGid.entries()).forEach(([gid, uids]) => {
      map[gid] = uids.size
    })
    return map
  }, [allMaterials])

  const [selectedGids, setSelectedGids] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [detailItem, setDetailItem] = useState<MonitoredItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MonitoredItem | null>(null)
  const [createSource, setCreateSource] = useState<CreateMaterialSource | null>(null)

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

  // 单个创作 — 按监控商品创建素材
  const handleOpenCreate = useCallback((item: MonitoredItem) => {
    setCreateSource({ type: 'item', item })
  }, [])

  // 批量创作 — 按选中商品批量创建素材
  const handleOpenBatchCreate = useCallback(() => {
    setCreateSource({ type: 'batch', count: selectedGids.size })
  }, [selectedGids.size])

  const handleCreateConfirm = useCallback((num: number, toUid?: string) => {
    if (!createSource) return
    if (createSource.type === 'item') {
      createByItemMutation.mutate(
        { num, souItemId: createSource.item.gid, toUid },
        { onSuccess: () => setCreateSource(null) }
      )
    } else if (createSource.type === 'batch') {
      const gids = Array.from(selectedGids)
      if (gids.length === 0) return
      Promise.all(
        gids.map((gid) => createByItemMutation.mutateAsync({ num, souItemId: gid, toUid }))
      )
        .then(() => {
          setCreateSource(null)
          onClearSelection()
        })
        .catch(() => {
          // 单个失败已由 mutation onError toast，保留弹窗供用户重试
        })
    }
  }, [createSource, createByItemMutation, selectedGids, onClearSelection])

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
            { label: '批量创建素材', onClick: handleOpenBatchCreate, variant: 'primary' },
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
                coverage={coverageMap[item.gid] ?? 0}
                isSelected={selectedGids.has(item.gid)}
                onToggleSelect={onToggleSelect}
                onOpenDetail={setDetailItem}
                selectionMode={selectionMode}
                onStatusToggle={handleStatusToggle}
                onCreate={handleOpenCreate}
              />
            ))
          )}
          {selectionMode && (
            <BatchActionBar
              selectedCount={selectedGids.size}
              onClear={onClearSelection}
              actions={[
                { label: '批量创建素材', onClick: handleOpenBatchCreate, variant: 'primary' },
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
            onCreate={handleOpenCreate}
            onStatusToggle={handleStatusToggle}
            coverageMap={coverageMap}
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
            onCreate={handleOpenCreate}
            onDeleteItem={(gid) => {
              const target = data.find((d) => d.gid === gid)
              if (target) setDeleteTarget(target)
            }}
          />
        </>
      )}

      {/* Create Material Modal */}
      <CreateMaterialModal
        open={createSource !== null}
        onClose={() => setCreateSource(null)}
        source={createSource}
        isPending={createByItemMutation.isPending}
        onCreate={handleCreateConfirm}
      />

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
