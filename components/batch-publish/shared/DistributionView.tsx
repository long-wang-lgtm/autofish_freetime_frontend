'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useToast } from '@/components/ui/Toaster'
import {
  listMaterials, editMaterial, copyMaterial,
  type PublishMaterial, type MaterialStatus,
} from '@/lib/api/batch-publish'
import { getAccountNames, type AccountName } from '@/lib/api/accounts'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'

// ============================================================
// 数据 hook — 该源素材 + 账号名映射 + 分组
// DistributionSummaryBar / DistributionView 共用，React Query 去重。
// ============================================================

export interface DistributionSource {
  /** 源类型：item=监控商品，opp=商机 */
  sourceType: 'item' | 'opp'
  sourceId: string | number
}

export function useDistributionData({ sourceType, sourceId }: DistributionSource) {
  // 该源全部素材（每源素材量不大，一次拉取）
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'materials', 'distribution', sourceType, sourceId],
    queryFn: () =>
      listMaterials({
        page_size: 100,
        ...(sourceType === 'item' ? { souItemId: String(sourceId) } : { oid: Number(sourceId) }),
      }),
  })

  // 账号 uid → name 映射
  const { data: accountNames = [] } = useQuery<AccountName[]>({
    queryKey: ['batch-publish', 'account-names'],
    queryFn: () => getAccountNames(),
  })

  const accountNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const acc of accountNames) map.set(acc.uid, acc.name)
    return map
  }, [accountNames])

  const items = useMemo(() => data?.items ?? [], [data])

  // 按 to_uid 分组，to_uid 为空归「未分配」
  const { assignedGroups, unassigned } = useMemo(() => {
    const map = new Map<string, PublishMaterial[]>()
    const unassignedArr: PublishMaterial[] = []
    for (const m of items) {
      if (m.to_uid) {
        const arr = map.get(m.to_uid) ?? []
        arr.push(m)
        map.set(m.to_uid, arr)
      } else {
        unassignedArr.push(m)
      }
    }
    return { assignedGroups: Array.from(map.entries()), unassigned: unassignedArr }
  }, [items])

  return {
    items,
    isLoading,
    error,
    refetch,
    assignedGroups,
    unassigned,
    accountNameMap,
    coveredCount: assignedGroups.length,
    total: data?.total ?? items.length,
    unassignedCount: unassigned.length,
    /** 拉取上限 100，超出截断（可选标注） */
    isTruncated: (data?.total ?? items.length) > 100,
  }
}

// ============================================================
// 素材状态小徽章
// ============================================================

const BADGE_COLOR_CLS: Record<'green' | 'red' | 'amber' | 'gray', string> = {
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  gray: 'bg-gray-100 text-gray-500',
}

function MaterialStatusChip({ status }: { status: MaterialStatus }) {
  const cfg = MATERIAL_STATUS_CONFIG[status]
  if (!cfg) return null
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${BADGE_COLOR_CLS[cfg.color]}`}
    >
      {cfg.label}
    </span>
  )
}

/** 素材是否属于「已发布」 */
function isPublished(m: PublishMaterial): boolean {
  return m.status === 'published_success'
}

// ============================================================
// 账号组状态聚合（6.1）
// ============================================================

function groupStatusSummary(materials: PublishMaterial[]): { published: number; draft: number; failed: number } {
  let published = 0
  let draft = 0
  let failed = 0
  for (const m of materials) {
    if (m.status === 'published_success') published++
    else if (m.status === 'publish_failed') failed++
    else draft++
  }
  return { published, draft, failed }
}

// ============================================================
// 分发摘要条（6.2）— 详情资料卡下方常驻一行
// ============================================================

interface DistributionSummaryBarProps extends DistributionSource {
  /** 触发批量分配（父组件打开分配弹窗，参数为全部未分配素材） */
  onAssignClick: (materials: PublishMaterial[]) => void
}

export function DistributionSummaryBar({ sourceType, sourceId, onAssignClick }: DistributionSummaryBarProps) {
  const { coveredCount, total, unassignedCount, unassigned, isLoading } = useDistributionData({ sourceType, sourceId })
  const btnH = 'h-8'

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-100 flex-shrink-0 bg-gray-50/60">
      <p className="text-xs text-gray-500 min-w-0 flex-1 truncate">
        已覆盖 <span className="font-medium text-gray-800">{coveredCount}</span> 个账号
        <span className="mx-1.5 text-gray-300">/</span>
        共 <span className="font-medium text-gray-800">{total}</span> 条
        <span className="mx-1.5 text-gray-300">/</span>
        <span className={`font-medium ${unassignedCount > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
          {unassignedCount}
        </span>{' '}
        条未分配
      </p>
      {!isLoading && unassignedCount > 0 && (
        <button
          onClick={() => onAssignClick(unassigned)}
          className={`${btnH} px-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0`}
        >
          批量分配
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ============================================================
// 分配弹窗（6.4②）— 多账号选择 + 均分/按序指定
// ============================================================

interface DistributionAssignModalProps {
  open: boolean
  onClose: () => void
  /** 待分配素材（未分配子集或全部未分配） */
  materials: PublishMaterial[]
  sourceName?: string
}

export function DistributionAssignModal({ open, onClose, materials, sourceName }: DistributionAssignModalProps) {
  const isMobile = useIsMobile()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: accountNames = [] } = useQuery<AccountName[]>({
    queryKey: ['batch-publish', 'account-names'],
    queryFn: () => getAccountNames(),
  })

  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [mode, setMode] = useState<'equal' | 'ordered'>('equal')
  const [quotas, setQuotas] = useState<Record<string, string>>({})

  // 打开时重置
  useEffect(() => {
    if (open) {
      setSelectedUids([])
      setMode('equal')
      setQuotas({})
    }
  }, [open])

  const toggleUid = (uid: string) => {
    setSelectedUids((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]))
  }

  const assignMutation = useMutation({
    mutationFn: async (assignments: { id: number; uid: string }[]) => {
      const results = await Promise.allSettled(
        assignments.map(({ id, uid }) => editMaterial({ id, to_uid: uid }))
      )
      return results
    },
    onSuccess: (results) => {
      const okCount = results.filter((r) => r.status === 'fulfilled').length
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
      if (okCount === results.length) {
        toast.addToast({ title: `已分配 ${okCount} 条素材`, variant: 'success' })
        onClose()
      } else {
        toast.addToast({ title: `部分失败：成功 ${okCount}/${results.length} 条`, variant: 'warning' })
      }
    },
    onError: (err: Error) => {
      toast.addToast({ title: `分配失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const handleAssign = () => {
    if (selectedUids.length === 0 || materials.length === 0) return
    let assignments: { id: number; uid: string }[]
    if (mode === 'equal') {
      // 均分：按选中素材顺序轮流分配给所选账号
      assignments = materials.map((m, i) => ({ id: m.id, uid: selectedUids[i % selectedUids.length] }))
    } else {
      // 按序指定：按账号顺序截取各自配额
      assignments = []
      let cursor = 0
      for (const uid of selectedUids) {
        const qty = Math.min(Number(quotas[uid] ?? 0) || 0, materials.length - cursor)
        for (let i = 0; i < qty; i++) {
          assignments.push({ id: materials[cursor].id, uid })
          cursor++
        }
        if (cursor >= materials.length) break
      }
    }
    if (assignments.length === 0) {
      toast.addToast({ title: '请先设置分配数量', variant: 'warning' })
      return
    }
    assignMutation.mutate(assignments)
  }

  const btnH = isMobile ? 'h-11' : 'h-10'
  const totalQuota = selectedUids.reduce((sum, uid) => sum + (Number(quotas[uid] ?? 0) || 0), 0)
  const orderedIncomplete = mode === 'ordered' && totalQuota < materials.length

  const content = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">发布账号（可多选）</label>
        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
          {accountNames.length === 0 && (
            <p className="text-xs text-gray-400 px-1 py-2">暂无可用账号</p>
          )}
          {accountNames.map((acc) => {
            const checked = selectedUids.includes(acc.uid)
            return (
              <label
                key={acc.uid}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleUid(acc.uid)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-800 truncate">{acc.name || acc.uid}</span>
                </span>
                {mode === 'ordered' && (
                  <input
                    type="number"
                    min={0}
                    value={quotas[acc.uid] ?? ''}
                    onChange={(e) => setQuotas((prev) => ({ ...prev, [acc.uid]: e.target.value }))}
                    placeholder="条数"
                    className="w-16 h-8 px-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-right"
                  />
                )}
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">分配方式</label>
        <div className="mt-2 flex gap-1">
          {[
            { key: 'equal' as const, label: '均分' },
            { key: 'ordered' as const, label: '按序指定' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className={`px-3 h-8 text-sm font-medium rounded-full transition-colors ${
                mode === opt.key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          将分配 {materials.length} 条素材
          {mode === 'equal'
            ? `，按所选账号轮流分配（每账号约 ${selectedUids.length > 0 ? Math.ceil(materials.length / selectedUids.length) : 0} 条）`
            : '，按账号顺序与设定条数依次分配'}
        </p>
      </div>

      {orderedIncomplete && (
        <p className="text-xs text-amber-600">
          各账号条数合计 {totalQuota} 条，仍有 {materials.length - totalQuota} 条未分配
        </p>
      )}
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        disabled={assignMutation.isPending}
        className={`px-4 ${btnH} text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50`}
      >
        取消
      </button>
      <button
        onClick={handleAssign}
        disabled={assignMutation.isPending || selectedUids.length === 0 || materials.length === 0}
        className={`px-4 ${btnH} text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50`}
      >
        {assignMutation.isPending ? '分配中...' : '确认分配'}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title="批量分配账号"
        subtitle={sourceName}
        footer={footer}
      >
        <div className="p-4">{content}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="批量分配账号" size="md" footer={footer}>
      <p className="text-sm text-gray-500 mb-4">{sourceName}</p>
      {content}
    </Modal>
  )
}

// ============================================================
// 账号组 — 聚合计数 + 可展开 chips 明细（6.1/6.4③）
// ============================================================

interface AssignedGroupProps {
  uid: string
  materials: PublishMaterial[]
  accountNameMap: Map<string, string>
  onCopy: (id: number) => void
  copyPendingId: number | null
}

function AssignedGroup({ uid, materials, accountNameMap, onCopy, copyPendingId }: AssignedGroupProps) {
  const [open, setOpen] = useState(false)
  const { published, draft, failed } = groupStatusSummary(materials)

  return (
    <div className="border border-gray-200 rounded-lg">
      {/* 聚合头部 */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-gray-800 truncate">
          {accountNameMap.get(uid) ?? uid}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {published > 0 && <span className="text-green-600">{published} 已发布</span>}
            {published > 0 && (draft > 0 || failed > 0) && <span className="text-gray-300"> · </span>}
            {draft > 0 && <span>{draft} 草稿</span>}
            {draft > 0 && failed > 0 && <span className="text-gray-300"> · </span>}
            {failed > 0 && <span className="text-red-600 font-medium">{failed} 失败</span>}
            {(published === 0 && draft === 0 && failed === 0) && <span>{materials.length} 条</span>}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* chips 明细（折叠可展开） */}
      {open && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100 pt-2">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 truncate min-w-0 flex-1">
                素材 #{m.id} · {m.description?.slice(0, 24) || '(无描述)'}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <MaterialStatusChip status={m.status} />
                {isPublished(m) && (
                  <button
                    onClick={() => onCopy(m.id)}
                    disabled={copyPendingId === m.id}
                    className="text-xs text-blue-600 hover:underline flex-shrink-0 disabled:opacity-50"
                    title="复制素材（封面图将清空）"
                  >
                    {copyPendingId === m.id ? '复制中...' : '复制'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 分发完整视图 — 可折叠常驻区块（6.3）
// ============================================================

interface DistributionViewProps extends DistributionSource {
  sourceName?: string
  /**
   * 触发批量分配（父组件打开分配弹窗），参数为选中的未分配子集或全部未分配。
   * 不传时组件内部自带分配弹窗（保持旧调用方兼容）。
   */
  onAssign?: (materials: PublishMaterial[]) => void
}

export function DistributionView({ sourceType, sourceId, sourceName, onAssign }: DistributionViewProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { isLoading, error, refetch, assignedGroups, unassigned, accountNameMap, total, isTruncated } =
    useDistributionData({ sourceType, sourceId })

  // 完整视图默认展开；折叠态用独立 state
  const [collapsed, setCollapsed] = useState(false)

  // ---- 未分配子集选择（6.4①） ----
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // 数据变化时清掉已不存在的选中
  const validUnassignedIds = unassigned.map((m) => m.id)
  const selectedSubset = unassigned.filter((m) => selectedIds.has(m.id))

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === validUnassignedIds.length && validUnassignedIds.length > 0
        ? new Set()
        : new Set(validUnassignedIds)
    )
  }

  // ---- 未分配批量分配：外部 onAssign 交给父组件；否则内部自带弹窗 ----
  const [internalAssignTarget, setInternalAssignTarget] = useState<PublishMaterial[] | null>(null)
  const handleAssign = (materials: PublishMaterial[]) => {
    if (onAssign) {
      onAssign(materials)
      return
    }
    setInternalAssignTarget(materials)
  }

  // ---- 已发布复制（6.4③） ----
  const copyMutation = useMutation({
    mutationFn: (id: number) => copyMaterial(id),
    onSuccess: () => {
      toast.addToast({ title: '已复制，封面图已清空，请重新编辑', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `复制失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 头部（可折叠） */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">分发进度</h4>
          {sourceName && <p className="text-xs text-gray-400 mt-0.5 truncate">{sourceName}</p>}
          {isTruncated && (
            <p className="text-xs text-amber-600 mt-0.5">超过 100 条，仅显示最近 100 条</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isLoading && assignedGroups.length > 0 && (
            <span className="text-xs text-gray-500">
              已覆盖 <span className="font-medium text-gray-800">{assignedGroups.length}</span> 个账号 · 共{' '}
              <span className="font-medium text-gray-800">{total}</span> 条
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <ErrorBanner message="加载分发进度失败" variant="inline" onRetry={refetch} />
          ) : total === 0 ? (
            <EmptyState size="sm" title="暂无素材" description="点击创建素材后，此处展示各账号分发情况" />
          ) : (
            <div className="space-y-2.5">
              {/* 已分配账号分组（聚合计数 + 可展开 chips） */}
              {assignedGroups.map(([uid, materials]) => (
                <AssignedGroup
                  key={uid}
                  uid={uid}
                  materials={materials}
                  accountNameMap={accountNameMap}
                  onCopy={(id) => copyMutation.mutate(id)}
                  copyPendingId={copyMutation.isPending ? copyMutation.variables ?? null : null}
                />
              ))}

              {/* 未分配组（明细 + 子集选择 + 分配入口） */}
              {unassigned.length > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-800">未分配</span>
                    <span className="text-xs text-amber-600">{unassigned.length} 条未分配</span>
                  </div>

                  <div className="px-3 py-2 space-y-1.5 max-h-64 overflow-y-auto">
                    {unassigned.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(m.id)}
                          onChange={() => toggleSelect(m.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 flex-shrink-0"
                          aria-label={`选择素材 #${m.id}`}
                        />
                        <span className="text-xs text-gray-500 truncate min-w-0 flex-1">
                          素材 #{m.id} · {m.description?.slice(0, 24) || '(无描述)'}
                        </span>
                        <MaterialStatusChip status={m.status} />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      {selectedSubset.length === unassigned.length && unassigned.length > 0 ? '取消全选' : '全选'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (selectedSubset.length > 0) handleAssign(selectedSubset)
                          else handleAssign(unassigned)
                        }}
                        disabled={unassigned.length === 0}
                        className="h-8 px-3 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        批量分配
                        {selectedSubset.length > 0 && <span>({selectedSubset.length})</span>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 内部分配弹窗（未提供 onAssign 时兜底，保持旧调用方兼容） */}
      {!onAssign && internalAssignTarget !== null && (
        <DistributionAssignModal
          open={internalAssignTarget !== null}
          onClose={() => setInternalAssignTarget(null)}
          materials={internalAssignTarget}
          sourceName={sourceName}
        />
      )}
    </div>
  )
}
