'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useToast } from '@/components/ui/Toaster'
import { listMaterials, editMaterial, type PublishMaterial, type MaterialStatus } from '@/lib/api/batch-publish'
import { getAccountNames, type AccountName } from '@/lib/api/accounts'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'

interface DistributionViewProps {
  /** 源类型：item=监控商品，opp=商机 */
  sourceType: 'item' | 'opp'
  sourceId: string | number
  sourceName?: string
}

/** 素材状态简单徽章 — 复用 STATUS_MAP（MATERIAL_STATUS_CONFIG）的 label/color */
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

/**
 * 分发视图 — 回答「这个源铺到了哪些账号、各账号发布情况、还有多少未分配」。
 * 素材按 to_uid 分组展示，未分配素材可批量分配到账号。
 */
export function DistributionView({ sourceType, sourceId, sourceName }: DistributionViewProps) {
  const isMobile = useIsMobile()
  const toast = useToast()
  const queryClient = useQueryClient()

  // ---- 该源全部素材（每源素材量不大，一次拉取） ----
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

  // ---- 按 to_uid 分组，to_uid 为空归「未分配」 ----
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

  const coveredCount = assignedGroups.length
  const total = data?.total ?? items.length
  const unassignedCount = unassigned.length

  // ---- 已分配账号折叠（限量展示 5 个） ----
  const [expanded, setExpanded] = useState(false)
  const visibleGroups = expanded ? assignedGroups : assignedGroups.slice(0, 5)
  const hiddenCount = assignedGroups.length - visibleGroups.length

  // ---- 批量分配弹窗 ----
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedUid, setSelectedUid] = useState('')
  const [assigning, setAssigning] = useState(false)

  const handleOpenAssign = () => {
    setSelectedUid('')
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    if (!selectedUid || unassigned.length === 0) return
    setAssigning(true)
    try {
      const results = await Promise.allSettled(
        unassigned.map((m) => editMaterial({ id: m.id, to_uid: selectedUid }))
      )
      const okCount = results.filter((r) => r.status === 'fulfilled').length
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials'] })
      if (okCount === results.length) {
        toast.addToast({ title: `已分配 ${okCount} 条素材`, variant: 'success' })
        setAssignOpen(false)
      } else {
        toast.addToast({ title: `部分失败：成功 ${okCount}/${results.length} 条`, variant: 'warning' })
      }
    } catch (err) {
      toast.addToast({ title: `分配失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    } finally {
      setAssigning(false)
    }
  }

  const btnH = isMobile ? 'h-11' : 'h-10'

  const assignContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">发布账号</label>
        <select
          value={selectedUid}
          onChange={(e) => setSelectedUid(e.target.value)}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">请选择账号</option>
          {accountNames.map((acc) => (
            <option key={acc.uid} value={acc.uid}>{acc.name || acc.uid}</option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-400">将把 {unassignedCount} 条未分配素材分配到所选账号</p>
    </div>
  )

  const assignFooter = (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => setAssignOpen(false)}
        disabled={assigning}
        className={`px-4 ${btnH} text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50`}
      >
        取消
      </button>
      <button
        onClick={handleAssign}
        disabled={assigning || !selectedUid}
        className={`px-4 ${btnH} text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50`}
      >
        {assigning ? '分配中...' : '确认分配'}
      </button>
    </div>
  )

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900">分发进度</h4>
          {sourceName && <p className="text-xs text-gray-400 mt-0.5 truncate">{sourceName}</p>}
          <p className="text-xs text-gray-500 mt-1.5">
            已覆盖 <span className="font-medium text-gray-800">{coveredCount}</span> 个账号
            <span className="mx-1.5 text-gray-300">/</span>
            共 <span className="font-medium text-gray-800">{total}</span> 条素材
            <span className="mx-1.5 text-gray-300">/</span>
            <span className={`font-medium ${unassignedCount > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
              {unassignedCount}
            </span>{' '}
            条未分配
          </p>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : error ? (
            <ErrorBanner message="加载分发进度失败" variant="inline" onRetry={refetch} />
          ) : items.length === 0 ? (
            <EmptyState size="sm" title="暂无素材" description="点击创建素材后，此处展示各账号分发情况" />
          ) : (
            <div className="space-y-4">
              {/* 已分配账号分组 */}
              {visibleGroups.map(([uid, materials]) => (
                <div key={uid} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {accountNameMap.get(uid) ?? uid}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{materials.length} 条</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {materials.map((m) => (
                      <MaterialStatusChip key={m.id} status={m.status} />
                    ))}
                  </div>
                </div>
              ))}

              {/* 折叠切换 */}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className={`w-full inline-flex items-center justify-center ${btnH} text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors`}
                >
                  {expanded ? '收起' : `+${hiddenCount} 个账号`}
                </button>
              )}

              {/* 未分配组 */}
              {unassignedCount > 0 && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">未分配</span>
                    <span className="text-xs text-amber-600">{unassignedCount} 条未分配</span>
                  </div>
                  <button
                    onClick={handleOpenAssign}
                    className={`inline-flex items-center gap-1.5 px-3 ${btnH} text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    批量分配账号
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 批量分配弹窗 — 桌面 Modal / 移动端 BottomSheet（常驻渲染，open 控制显示，保留过渡动画） */}
      {isMobile ? (
        <BottomSheet
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title="批量分配账号"
          subtitle={sourceName}
          footer={assignFooter}
        >
          <div className="p-4">{assignContent}</div>
        </BottomSheet>
      ) : (
        <Modal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title="批量分配账号"
          size="sm"
          footer={assignFooter}
        >
          {assignContent}
        </Modal>
      )}
    </>
  )
}
