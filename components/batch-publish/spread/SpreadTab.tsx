'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSpreadPage } from '@/hooks/batch-publish/useSpreadPage'
import { useOriginalMutations } from '@/hooks/batch-publish/useOriginalMutations'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { Pagination } from '@/components/ui/data/Pagination'
import { MaterialTable } from './MaterialTable'
import { MaterialCard } from './MaterialCard'
import { MaterialEditSheet } from '../original/MaterialEditSheet'
import { CreateMaterialModal, type CreateMaterialSource } from '../original/CreateMaterialModal'
import { SourcePickerModal } from './SourcePickerModal'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { MATERIALS_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { getAccountNames, type AccountName } from '@/lib/api/accounts'
import {
  triggerWork, publishMaterial, editMaterial,
  createMaterialsByOpp, createMaterialsByItem,
  type RewriteStage, type PublishMaterial, type OpportunityItem, type MonitoredItem,
} from '@/lib/api/batch-publish'

type BatchOp = 'write' | 'genimageplan' | 'genimage' | 'publish' | 'assign'

interface MaterialGroup {
  key: string
  title: string
  materials: PublishMaterial[]
  published: number
}

/** 双层分页：组列表每页 20 组，组内素材每页 10 条 */
const GROUP_PAGE_SIZE = 20
const MATERIAL_PAGE_SIZE = 10

/** 单字段搜索框 — 一框一字段，右侧清除按钮清空该框（移动端筛选栏专用，就地复制避免抽公共组件） */
function SearchField({
  value,
  onChange,
  placeholder,
  inputMode,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  inputMode?: 'numeric'
  className?: string
}) {
  return (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />
      {value !== '' && (
        <button
          type="button"
          aria-label={`清除${placeholder}`}
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function SpreadTab() {
  const { filters, onFilterChange, data, isLoading, error, refetch, isMobile } = useSpreadPage()

  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()

  // 单素材操作 mutation（批量操作用直接 API 调用，避免逐条触发 toast）
  const { triggerWorkMutation, publishMutation, editMaterialMutation, deleteMaterialMutation } =
    useOriginalMutations(undefined)

  // ---- UI 状态 ----
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false)
  const [pickerSelection, setPickerSelection] = useState<{ opps: OpportunityItem[]; items: MonitoredItem[] } | null>(null)
  const [createSource, setCreateSource] = useState<CreateMaterialSource | null>(null)
  const [createPending, setCreatePending] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null)
  const [batchOp, setBatchOp] = useState<BatchOp | null>(null)
  const [assignAccountOpen, setAssignAccountOpen] = useState(false)
  const [assignToUid, setAssignToUid] = useState('')
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set())
  // 移动端筛选栏：条件筛选行（选品标题/商品ID/账号ID）展开状态，默认收起
  const [filterExpanded, setFilterExpanded] = useState(false)
  // 双层分页：组列表页码 + 组内素材页码（按组记录）
  const [groupPage, setGroupPage] = useState(1)
  const [groupMatPages, setGroupMatPages] = useState<Record<string, number>>({})

  const groupRefs = useRef(new Map<string, HTMLDivElement>())
  const appliedDeepLinkRef = useRef<string | null>(null)
  const didScrollDeepLinkRef = useRef<string | null>(null)

  // 发布账号列表（批量分配账号下拉）
  const { data: accountNames = [] } = useQuery<AccountName[]>({
    queryKey: ['batch-publish', 'account-names'],
    queryFn: () => getAccountNames(),
  })

  const isAnyLoading =
    triggerWorkMutation.isPending ||
    publishMutation.isPending ||
    editMaterialMutation.isPending ||
    deleteMaterialMutation.isPending ||
    batchOp !== null

  // ---- 单素材操作 ----
  const handleTriggerWork = useCallback(async (materialId: number, stage: RewriteStage) => {
    try {
      await triggerWorkMutation.mutateAsync({ materialId, stage })
    } catch {
      /* 静默——mutation onError 已提示 */
    }
  }, [triggerWorkMutation])

  const handlePublish = useCallback(async (materialId: number) => {
    try {
      await publishMutation.mutateAsync(materialId)
    } catch {
      /* 静默——mutation onError 已提示 */
    }
  }, [publishMutation])

  const handleOpportunityClick = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'original')
    params.set('oid', String(id))
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  // ---- 按源分组 ----
  const groups = useMemo<MaterialGroup[]>(() => {
    const map = new Map<string, { title: string; materials: PublishMaterial[] }>()
    for (const m of data) {
      if (m.opportunity?.id) {
        const key = `opp-${m.opportunity.id}`
        const title = m.opportunity.name ?? `商机 #${m.opportunity.id}`
        const existing = map.get(key)
        if (existing) existing.materials.push(m)
        else map.set(key, { title, materials: [m] })
      } else if (m.souItem?.gid) {
        const key = `item-${m.souItem.gid}`
        const title = m.souItem.title || m.souItem.gid
        const existing = map.get(key)
        if (existing) existing.materials.push(m)
        else map.set(key, { title, materials: [m] })
      } else {
        const key = 'unassigned'
        const existing = map.get(key)
        if (existing) existing.materials.push(m)
        else map.set(key, { title: '未分配账号', materials: [m] })
      }
    }
    const list = Array.from(map.entries()).map(([key, v]) => ({
      key,
      title: v.title,
      materials: v.materials,
      published: v.materials.filter((x) => x.status === 'published_success').length,
    }))
    // 未分配组固定排最后
    return list.sort((a, b) => (a.key === 'unassigned' ? 1 : 0) - (b.key === 'unassigned' ? 1 : 0))
  }, [data])

  const materialById = useMemo(() => new Map(data.map((m) => [m.id, m])), [data])

  // 组列表分页：每页 20 组（页码越界时钳制到最后一页）
  const totalGroupPages = Math.max(1, Math.ceil(groups.length / GROUP_PAGE_SIZE))
  const clampedGroupPage = Math.min(groupPage, totalGroupPages)
  const pagedGroups = useMemo(() => {
    const start = (clampedGroupPage - 1) * GROUP_PAGE_SIZE
    return groups.slice(start, start + GROUP_PAGE_SIZE)
  }, [groups, clampedGroupPage])

  // 组集合变化（增删组/切换筛选）时回到第 1 页；单组内素材内容变化不重置页码
  const groupKeySignature = useMemo(() => groups.map((g) => g.key).join('|'), [groups])
  useEffect(() => {
    setGroupPage(1)
    setGroupMatPages({})
  }, [groupKeySignature])

  // ---- 深链：oid / item → 切到对应组所在页、展开且高亮，其余折叠 ----
  const oidParam = searchParams.get('oid')
  const itemParam = searchParams.get('item')
  const deepLinkKey = oidParam ? `opp-${oidParam}` : itemParam ? `item-${itemParam}` : null

  useEffect(() => {
    if (groups.length === 0) return
    if (appliedDeepLinkRef.current === deepLinkKey) return
    appliedDeepLinkRef.current = deepLinkKey
    if (deepLinkKey) {
      const idx = groups.findIndex((g) => g.key === deepLinkKey)
      if (idx >= 0) {
        // 先算目标组所在页码并切页，滚动效果等该组渲染到当页后再执行
        setGroupPage(Math.floor(idx / GROUP_PAGE_SIZE) + 1)
        setCollapsedKeys(new Set(groups.map((g) => g.key).filter((k) => k !== deepLinkKey)))
      } else {
        setCollapsedKeys(new Set())
      }
    } else {
      setCollapsedKeys(new Set())
    }
  }, [groups, deepLinkKey])

  // 深链组渲染后滚动到可见区域（仅首次生效；跨页深链等待 groupPage 切换完成）
  useEffect(() => {
    if (!deepLinkKey || didScrollDeepLinkRef.current === deepLinkKey) return
    if (!groups.some((g) => g.key === deepLinkKey)) return
    if (!groupRefs.current.has(deepLinkKey)) return
    didScrollDeepLinkRef.current = deepLinkKey
    const timer = setTimeout(() => {
      groupRefs.current.get(deepLinkKey)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
    return () => clearTimeout(timer)
  }, [deepLinkKey, groups, groupPage])

  const setGroupRef = useCallback((key: string) => (node: HTMLDivElement | null) => {
    if (node) groupRefs.current.set(key, node)
    else groupRefs.current.delete(key)
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }, [])

  // ---- 多选（跨组生效） ----
  const onToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const onToggleAll = useCallback((items: PublishMaterial[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = items.every((m) => next.has(m.id))
      if (allSelected) items.forEach((m) => next.delete(m.id))
      else items.forEach((m) => next.add(m.id))
      return next
    })
  }, [])

  const onClearSelection = useCallback(() => setSelectedIds(new Set()), [])

  // ---- 批量操作 ----
  const runBatch = useCallback(async (
    op: BatchOp,
    opLabel: string,
    ids: number[],
    fn: (id: number) => Promise<unknown>,
  ) => {
    setBatchOp(op)
    const results = await Promise.allSettled(ids.map(fn))
    setBatchOp(null)
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials'] })
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - ok
    toast.addToast({
      title: fail > 0 ? `${opLabel}完成 ${ok} 条，失败 ${fail} 条` : `${opLabel}完成 ${ok} 条`,
      variant: fail > 0 ? 'error' : 'success',
    })
  }, [queryClient, toast])

  const handleBatchTrigger = useCallback(async (stage: RewriteStage) => {
    if (batchOp) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const label = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面' : '生图'
    await runBatch(stage, label, ids, (id) => triggerWork(id, stage))
  }, [batchOp, selectedIds, runBatch])

  const handleBatchPublish = useCallback(async () => {
    if (batchOp) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    // 跳过未分配账号的素材
    const publishable: number[] = []
    let skipped = 0
    for (const id of ids) {
      if (materialById.get(id)?.to_uid) publishable.push(id)
      else skipped += 1
    }
    if (skipped > 0) toast.addToast({ title: `${skipped} 条未分配账号已跳过`, variant: 'warning' })
    if (publishable.length === 0) return
    await runBatch('publish', '发布', publishable, (id) => publishMaterial(id))
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
  }, [batchOp, selectedIds, materialById, runBatch, toast, queryClient])

  const handleBatchAssign = useCallback(async (toUid: string) => {
    if (batchOp) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setAssignAccountOpen(false)
    await runBatch('assign', '分配账号', ids, (id) => editMaterial({ id, to_uid: toUid }))
  }, [batchOp, selectedIds, runBatch])

  // ---- 跨源批量创建 ----
  const handlePickerConfirm = useCallback((opps: OpportunityItem[], items: MonitoredItem[]) => {
    setPickerSelection({ opps, items })
    setCreateSource({ type: 'batch', count: opps.length + items.length })
    setSourcePickerOpen(false)
  }, [])

  const handleCloseCreate = useCallback(() => {
    setCreateSource(null)
    setPickerSelection(null)
  }, [])

  const handleBatchCreate = useCallback(async (num: number, toUid?: string) => {
    if (!pickerSelection) return
    const { opps, items } = pickerSelection
    const totalSources = opps.length + items.length
    if (totalSources === 0) return
    setCreatePending(true)
    let created = 0
    let failed = 0
    for (const opp of opps) {
      try {
        const res = await createMaterialsByOpp(num, opp, toUid)
        created += res.length
      } catch {
        failed += 1
      }
    }
    for (const item of items) {
      try {
        const res = await createMaterialsByItem(num, item.gid, toUid)
        created += res.length
      } catch {
        failed += 1
      }
    }
    setCreatePending(false)
    setCreateSource(null)
    setPickerSelection(null)
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials'] })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })

    const allFailed = created === 0 && failed > 0
    toast.addToast({
      title: allFailed ? '创建失败，请稍后重试' : `已创建 ${created} 份素材`,
      variant: allFailed ? 'error' : failed > 0 ? 'warning' : 'success',
      ...(allFailed ? {} : {
        action: {
          label: '去创作',
          onClick: () => {
            const params = new URLSearchParams(searchParams.toString())
            params.set('tab', 'spread')
            if (totalSources === 1) {
              if (opps.length === 1) {
                params.set('oid', String(opps[0].id))
                params.delete('item')
              } else if (items.length === 1) {
                params.set('item', items[0].gid)
                params.delete('oid')
              }
            } else {
              params.delete('oid')
              params.delete('item')
            }
            router.push(`/dashboard/batch-publish?${params.toString()}`)
          },
        },
      }),
    })
  }, [pickerSelection, queryClient, toast, searchParams, router])

  // ---- 渲染 ----
  const errorGuard = renderErrorGuard({ error, isLoading, hasData: data.length > 0, onRetry: () => refetch() })
  if (errorGuard) return errorGuard

  // 移动端筛选按钮激活计数：展开区三个字段（选品标题/商品ID/账号ID）非空个数
  const expandedFilterCount = [filters.itemTitle, filters.souItemId, filters.toUid].filter(Boolean).length

  const batchActions = [
    { label: batchOp === 'write' ? '改写中...' : '批量改写', onClick: () => handleBatchTrigger('write'), variant: 'primary' as const },
    { label: batchOp === 'genimageplan' ? '封面中...' : '批量封面', onClick: () => handleBatchTrigger('genimageplan'), variant: 'primary' as const },
    { label: batchOp === 'genimage' ? '生图中...' : '批量生图', onClick: () => handleBatchTrigger('genimage'), variant: 'primary' as const },
    { label: batchOp === 'publish' ? '发布中...' : '批量发布', onClick: handleBatchPublish, variant: 'primary' as const },
    { label: batchOp === 'assign' ? '分配中...' : '批量分配账号', onClick: () => { setAssignToUid(''); setAssignAccountOpen(true) }, variant: 'secondary' as const },
  ]

  const renderGroupHeader = (g: MaterialGroup, matPage: number, maxMatPages: number) => (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
      <button
        onClick={() => toggleGroup(g.key)}
        className="flex items-center gap-3 min-w-0 text-left min-h-11 py-1"
      >
        <span className="text-sm font-semibold text-gray-900 truncate">{g.title}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">{g.materials.length} 份素材</span>
        <span className="text-xs text-gray-400 flex-shrink-0">已发布 {g.published}/{g.materials.length}</span>
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        {maxMatPages > 1 && (
          <Pagination
            page={matPage}
            total={g.materials.length}
            pageSize={MATERIAL_PAGE_SIZE}
            onChange={(p) => setGroupMatPages((prev) => ({ ...prev, [g.key]: p }))}
          />
        )}
        <button
          onClick={() => toggleGroup(g.key)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsedKeys.has(g.key) ? '-rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )

  const accountPickerContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">分配账号</label>
        <select
          value={assignToUid}
          onChange={(e) => setAssignToUid(e.target.value)}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">请选择账号</option>
          {accountNames.map((acc) => (
            <option key={acc.uid} value={acc.uid}>{acc.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-2">将把选中的 {selectedIds.size} 条素材的发布账号改为所选账号</p>
      </div>
    </div>
  )

  const accountPickerFooter = (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => setAssignAccountOpen(false)}
        disabled={batchOp === 'assign'}
        className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        取消
      </button>
      <button
        onClick={() => handleBatchAssign(assignToUid)}
        disabled={!assignToUid || batchOp === 'assign'}
        className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {batchOp === 'assign' ? '分配中...' : '确定分配'}
      </button>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      {/* 工具行：五个独立搜索框 + 状态筛选 + 批量创建（PC 一行 / 移动端纵向） */}
      <SearchToolbar>
        {isMobile ? (
          <div className="w-full flex flex-col gap-2">
            {/* Row1：商机名 + 描述 并排（最常用两字段常驻） */}
            <div className="flex items-center gap-2">
              <SearchField
                value={filters.oppName ?? ''}
                onChange={(v) => onFilterChange('oppName', v)}
                placeholder="商机名..."
                className="flex-1 min-w-0"
              />
              <SearchField
                value={filters.description ?? ''}
                onChange={(v) => onFilterChange('description', v)}
                placeholder="描述..."
                className="flex-1 min-w-0"
              />
            </div>
            {/* Row2：筛选按钮（带激活计数）+ 状态下拉 + 批量创建（紧凑 h-10 去全宽） */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterExpanded((prev) => !prev)}
                aria-expanded={filterExpanded}
                className={`h-10 px-3 flex-none inline-flex items-center gap-1 text-sm font-medium rounded-lg border transition-colors ${
                  expandedFilterCount > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                筛选{expandedFilterCount > 0 ? ` ${expandedFilterCount}` : ''}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${filterExpanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <select
                value={filters.status ?? ''}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="h-10 w-28 flex-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {MATERIALS_STATUS_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button
                onClick={() => setSourcePickerOpen(true)}
                className="h-10 px-3 flex-none text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                批量创建素材
              </button>
            </div>
            {/* Row3：展开区（默认收起，就地展开）——选品标题整行 + 商品ID/账号ID 并排 */}
            {filterExpanded && (
              <div className="flex flex-col gap-2">
                <SearchField
                  value={filters.itemTitle ?? ''}
                  onChange={(v) => onFilterChange('itemTitle', v)}
                  placeholder="选品标题..."
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <SearchField
                    value={filters.souItemId ?? ''}
                    onChange={(v) => onFilterChange('souItemId', v)}
                    placeholder="商品ID"
                    inputMode="numeric"
                    className="flex-1 min-w-0"
                  />
                  <SearchField
                    value={filters.toUid ?? ''}
                    onChange={(v) => onFilterChange('toUid', v)}
                    placeholder="账号ID"
                    inputMode="numeric"
                    className="flex-1 min-w-0"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="描述..."
              value={filters.description ?? ''}
              onChange={(e) => onFilterChange('description', e.target.value)}
              className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0 flex-1 max-w-[160px]"
            />
            <input
              type="text"
              placeholder="商机名..."
              value={filters.oppName ?? ''}
              onChange={(e) => onFilterChange('oppName', e.target.value)}
              className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0 flex-1 max-w-[160px]"
            />
            <input
              type="text"
              placeholder="选品标题..."
              value={filters.itemTitle ?? ''}
              onChange={(e) => onFilterChange('itemTitle', e.target.value)}
              className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0 flex-1 max-w-[160px]"
            />
            <input
              type="text"
              placeholder="商品ID"
              inputMode="numeric"
              value={filters.souItemId ?? ''}
              onChange={(e) => onFilterChange('souItemId', e.target.value)}
              className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0 flex-1 max-w-[140px]"
            />
            <input
              type="text"
              placeholder="账号ID"
              inputMode="numeric"
              value={filters.toUid ?? ''}
              onChange={(e) => onFilterChange('toUid', e.target.value)}
              className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-0 flex-1 max-w-[140px]"
            />
            <select
              value={filters.status ?? ''}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white w-28 flex-none"
            >
              {MATERIALS_STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={() => setSourcePickerOpen(true)}
              className="h-10 flex-none px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              批量创建素材
            </button>
          </div>
        )}
      </SearchToolbar>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex-1 overflow-y-auto">
          <EmptyState
            size="sm"
            title="暂无发布记录"
            description="在创作台完成素材发布后，记录将出现在这里"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {pagedGroups.map((g) => {
            // 组内素材分页：每页 10 条，页码钳制避免越界
            const maxMatPages = Math.max(1, Math.ceil(g.materials.length / MATERIAL_PAGE_SIZE))
            const matPage = Math.min(groupMatPages[g.key] ?? 1, maxMatPages)
            const pagedMaterials = g.materials.slice((matPage - 1) * MATERIAL_PAGE_SIZE, matPage * MATERIAL_PAGE_SIZE)
            return (
              <div
                key={g.key}
                ref={setGroupRef(g.key)}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  deepLinkKey === g.key ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
                }`}
              >
                {renderGroupHeader(g, matPage, maxMatPages)}
                {!collapsedKeys.has(g.key) && (isMobile ? (
                  <div className="px-3 pb-3 space-y-3">
                    {pagedMaterials.map((item) => (
                      <MaterialCard
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.has(item.id)}
                        onToggleSelect={onToggleSelect}
                        onOpportunityClick={handleOpportunityClick}
                        onOpenEditor={setEditingMaterialId}
                        onTriggerWork={handleTriggerWork}
                        onPublish={handlePublish}
                        isAnyLoading={isAnyLoading}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <MaterialTable
                      data={pagedMaterials}
                      isLoading={false}
                      error={undefined}
                      onRetry={refetch}
                      selectedIds={selectedIds}
                      onToggleSelect={onToggleSelect}
                      onToggleAll={() => onToggleAll(pagedMaterials)}
                      onOpportunityClick={handleOpportunityClick}
                      onOpenEditor={setEditingMaterialId}
                      onTriggerWork={handleTriggerWork}
                      onPublish={handlePublish}
                      isAnyLoading={isAnyLoading}
                    />
                  </div>
                ))}
              </div>
            )
          })}

          {/* 组列表分页：每页 20 组（底部页码条，sticky 始终可见） */}
          {totalGroupPages > 1 && (
            <div className="sticky bottom-0 z-10 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Pagination
                page={clampedGroupPage}
                total={groups.length}
                pageSize={GROUP_PAGE_SIZE}
                onChange={setGroupPage}
              />
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="sticky bottom-0 z-10 px-3 pb-3">
              <BatchActionBar
                selectedCount={selectedIds.size}
                onClear={onClearSelection}
                actions={batchActions}
              />
            </div>
          )}
        </div>
      )}

      {/* 源选择弹窗 */}
      <SourcePickerModal
        open={sourcePickerOpen}
        onClose={() => setSourcePickerOpen(false)}
        onConfirm={handlePickerConfirm}
      />

      {/* 批量创建弹窗 */}
      <CreateMaterialModal
        open={createSource !== null}
        onClose={handleCloseCreate}
        source={createSource}
        isPending={createPending}
        onCreate={handleBatchCreate}
      />

      {/* 批量分配账号弹窗 */}
      {isMobile ? (
        <BottomSheet
          open={assignAccountOpen}
          onClose={() => setAssignAccountOpen(false)}
          title="批量分配账号"
          footer={accountPickerFooter}
        >
          <div className="p-4">{accountPickerContent}</div>
        </BottomSheet>
      ) : (
        <Modal
          open={assignAccountOpen}
          onClose={() => setAssignAccountOpen(false)}
          title="批量分配账号"
          size="sm"
          footer={accountPickerFooter}
        >
          {accountPickerContent}
        </Modal>
      )}

      {/* 编辑素材 Sheet——行内直接处理二创素材的完整创作流程 */}
      <MaterialEditSheet
        materialId={editingMaterialId}
        selectedOid={undefined}
        open={editingMaterialId !== null}
        onClose={() => setEditingMaterialId(null)}
        materials={data}
      />
    </div>
  )
}
