# Phase 5-6: 创作台 + 移动端降级 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 实现批量创作发布系统的创作台 Tab（Phase 5）和移动端降级（Phase 6），覆盖概览视图、工作区视图、AI 按钮状态机、Sheet 编辑器、移动端 Push/Pop 导航。

**架构:** 底部向上构建——先 hook 数据层，再叶子组件，再容器组件，最后页面集成。创作台有两种视图：概览视图（无选中商机时显示跨商机待办清单）和工作区视图（选中商机后进入左右分栏）。移动端使用 Push/Pop 导航栈降级。

**技术栈:** Next.js + React + TypeScript + Tailwind CSS v3 + React Query + react-hook-form + zod

**设计规格:** `docs/superpowers/specs/2026-07-13-batch-publish-design.md` 第四章 §4.3

---

## 前置条件

- ✅ Phase 0-4 已完成（页面骨架、API 模块、共享组件、监控/商机/发布记录 Tab）
- ✅ `lib/api/batch-publish.ts` 所有 API 函数已就绪
- ✅ `components/batch-publish/shared/` 共享组件已就绪
- ✅ `components/publish/ResizableDivider.tsx` 可复用

## 文件结构

```
新建:
  hooks/batch-publish/
    useWorkbenchFilters.ts        # 选中商机、编辑素材等 UI 状态
    useWorkbenchData.ts           # React Query 数据获取
    useWorkbenchMutations.ts      # AI/发布/编辑/创建 mutation
    useWorkbenchPage.ts           # 组合 hook

  components/batch-publish/workbench/
    WorkbenchTab.tsx              # 主容器（PC 分栏 / 移动端 Push-Pop）
    WorkbenchOverview.tsx         # 概览视图 — 按商机分组的待办清单
    OpportunityListPanel.tsx      # 左侧商机列表面板
    MaterialWorkspace.tsx         # 右侧素材工作区
    ReferencePanel.tsx            # 可折叠监控商品指标面板
    ReferenceCard.tsx             # 单张指标卡片
    MaterialRow.tsx               # 素材表格行 — 自包含模式
    MaterialEditSheet.tsx         # 微调 Sheet
    CreateMaterialModal.tsx       # 批量创建 Modal

修改:
  app/dashboard/batch-publish/page.tsx  # 替换工作台占位符
```

---

## Phase 5: 创作台 Workbench

### Task 1: useWorkbenchFilters hook

**文件:**
- 创建: `hooks/batch-publish/useWorkbenchFilters.ts`

- [ ] **Step 1: 创建 useWorkbenchFilters hook**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

export function useWorkbenchFilters() {
  const searchParams = useSearchParams()
  const oidParam = searchParams.get('oid')
  const selectedOid = oidParam ? Number(oidParam) : undefined

  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<Set<number>>(new Set())

  const toggleSelect = useCallback((id: number) => {
    setSelectedMaterialIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedMaterialIds(new Set())
  }, [])

  const openEditor = useCallback((id: number) => {
    setEditingMaterialId(id)
  }, [])

  const closeEditor = useCallback(() => {
    setEditingMaterialId(null)
  }, [])

  return {
    selectedOid,
    editingMaterialId,
    showCreateModal,
    selectedMaterialIds,
    setShowCreateModal,
    toggleSelect,
    clearSelection,
    openEditor,
    closeEditor,
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useWorkbenchFilters.ts
git commit -m "feat: add useWorkbenchFilters hook for workbench UI state

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: useWorkbenchData hook

**文件:**
- 创建: `hooks/batch-publish/useWorkbenchData.ts`

- [ ] **Step 1: 创建 useWorkbenchData hook**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { listOpportunities, listMaterials, listMonitoredItems } from '@/lib/api/batch-publish'

interface UseWorkbenchDataParams {
  selectedOid: number | undefined
  /** 概览视图用的 page */
  overviewPage: number
  /** 左侧商机列表的搜索和筛选 */
  oppSearch: string
  oppStatus: string
  oppPage: number
}

const PAGE_SIZE = 20

export function useWorkbenchData({ selectedOid, overviewPage, oppSearch, oppStatus, oppPage }: UseWorkbenchDataParams) {
  // 左侧商机列表
  const {
    data: oppData,
    isLoading: oppLoading,
    error: oppError,
    refetch: oppRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { page: oppPage, pageSize: PAGE_SIZE, search: oppSearch, status: oppStatus }],
    queryFn: () => listOpportunities({
      page: oppPage,
      page_size: PAGE_SIZE,
      name: oppSearch || undefined,
      status: oppStatus || undefined,
    }),
  })

  // 概览视图 — 跨商机获取未完成素材
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: overviewRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'materials', 'overview', { page: overviewPage }],
    queryFn: () => listMaterials({
      page: overviewPage,
      page_size: 50,
      status: 'pending,writing_done,genimageplan_done,genimage_done,publish_failed',
    }),
    enabled: !selectedOid,
  })

  // 工作区 — 当前商机下的素材
  const {
    data: materialData,
    isLoading: materialLoading,
    error: materialError,
    refetch: materialRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'materials', selectedOid],
    queryFn: () => listMaterials({ oid: selectedOid, page_size: 100 }),
    enabled: !!selectedOid,
  })

  // 工作区 — 当前商机绑定的监控商品
  const {
    data: monitoredData,
    isLoading: monitoredLoading,
    error: monitoredError,
    refetch: monitoredRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', 'workbench', selectedOid],
    queryFn: () => listMonitoredItems({ oid: selectedOid, page_size: 100 }),
    enabled: !!selectedOid,
  })

  return {
    opportunities: oppData?.items ?? [],
    oppTotal: oppData?.total ?? 0,
    oppLoading,
    oppError,
    oppRefetch,

    overviewMaterials: overviewData?.items ?? [],
    overviewTotal: overviewData?.total ?? 0,
    overviewLoading,
    overviewError,
    overviewRefetch,

    materials: materialData?.items ?? [],
    materialLoading,
    materialError,
    materialRefetch,

    monitoredItems: monitoredData?.items ?? [],
    monitoredLoading,
    monitoredError,
    monitoredRefetch,

    selectedOpportunity: oppData?.items?.find(o => o.id === selectedOid) ?? null,
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add hooks/batch-publish/useWorkbenchData.ts
git commit -m "feat: add useWorkbenchData hook for workbench data queries

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: useWorkbenchMutations hook

**文件:**
- 创建: `hooks/batch-publish/useWorkbenchMutations.ts`

- [ ] **Step 1: 创建 useWorkbenchMutations hook**

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  triggerWork, publishMaterial, createMaterials, editMaterial,
  updateMaterialContext, deleteMaterial, type RewriteStage,
  type MaterialEditInput, type MaterialContextInput,
} from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useWorkbenchMutations(selectedOid: number | undefined) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const invalidateAll = () => {
    if (selectedOid) {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    }
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', 'all'] })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', 'overview'] })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
  }

  // AI 工作触发
  const triggerWorkMutation = useMutation({
    mutationFn: ({ materialId, stage }: { materialId: number; stage: RewriteStage }) =>
      triggerWork(materialId, stage),
    onSuccess: (_data, { stage }) => {
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}完成`, variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error, { stage }) => {
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 发布
  const publishMutation = useMutation({
    mutationFn: (materialId: number) => publishMaterial(materialId),
    onSuccess: () => {
      toast.addToast({ title: '发布成功', variant: 'success' })
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `发布失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 批量创建素材
  const createMaterialsMutation = useMutation({
    mutationFn: ({ num, opp }: { num: number; opp: { id: number; name: string; description?: string | null; price?: number; status: string; ai_context_template?: string } }) =>
      createMaterials({ num, opp: { id: opp.id, name: opp.name, description: opp.description ?? undefined, price: opp.price ?? undefined, status: opp.status, ai_context_template: opp.ai_context_template as 'only_opportunity' | 'with_item' | undefined } }),
    onSuccess: (data) => {
      toast.addToast({ title: `${data.length} 份素材创建成功`, variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `创建失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 编辑素材
  const editMaterialMutation = useMutation({
    mutationFn: (input: MaterialEditInput) => editMaterial(input),
    onSuccess: () => {
      toast.addToast({ title: '素材已保存', variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `保存失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 更新 AI 上下文
  const updateContextMutation = useMutation({
    mutationFn: (input: MaterialContextInput) => updateMaterialContext(input),
    onSuccess: () => {
      toast.addToast({ title: 'AI 上下文已保存', variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `AI 上下文保存失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 删除素材
  const deleteMaterialMutation = useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: () => {
      toast.addToast({ title: '素材已删除', variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `删除失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  return {
    triggerWorkMutation,
    publishMutation,
    createMaterialsMutation,
    editMaterialMutation,
    updateContextMutation,
    deleteMaterialMutation,
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add hooks/batch-publish/useWorkbenchMutations.ts
git commit -m "feat: add useWorkbenchMutations hook for workbench CRUD and AI operations

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: useWorkbenchPage 组合 hook

**文件:**
- 创建: `hooks/batch-publish/useWorkbenchPage.ts`

- [ ] **Step 1: 创建 useWorkbenchPage hook**

```typescript
'use client'

import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useWorkbenchFilters } from './useWorkbenchFilters'
import { useWorkbenchData } from './useWorkbenchData'
import { useWorkbenchMutations } from './useWorkbenchMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useWorkbenchPage() {
  const isMobile = useIsMobile()
  const filters = useWorkbenchFilters()

  // 左侧商机列表的筛选
  const [oppSearch, setOppSearch] = useState('')
  const [oppStatus, setOppStatus] = useState('')
  const [oppPage, setOppPage] = useState(1)
  const debouncedOppSearch = useDebounce(oppSearch, 300)

  // 概览视图分页
  const [overviewPage, setOverviewPage] = useState(1)

  // 素材表格分页
  const [materialPage, setMaterialPage] = useState(1)

  const data = useWorkbenchData({
    selectedOid: filters.selectedOid,
    overviewPage,
    oppSearch: debouncedOppSearch,
    oppStatus,
    oppPage,
  })

  const mutations = useWorkbenchMutations(filters.selectedOid)

  // 移动端导航栈
  const [mobileView, setMobileView] = useState<'overview' | 'opportunity-list' | 'workspace'>(
    filters.selectedOid ? 'workspace' : 'overview'
  )

  return {
    ...filters,
    ...data,
    ...mutations,
    isMobile,
    oppSearch, oppStatus, oppPage,
    setOppSearch, setOppStatus, setOppPage,
    overviewPage, setOverviewPage,
    materialPage, setMaterialPage,
    mobileView, setMobileView,
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add hooks/batch-publish/useWorkbenchPage.ts
git commit -m "feat: add useWorkbenchPage composition hook for workbench

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: ReferenceCard 组件

**文件:**
- 创建: `components/batch-publish/workbench/ReferenceCard.tsx`

- [ ] **Step 1: 创建 ReferenceCard**

```typescript
'use client'

import type { MonitoredItem } from '@/lib/api/batch-publish'
import { fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'

interface ReferenceCardProps {
  item: MonitoredItem
}

export function ReferenceCard({ item }: ReferenceCardProps) {
  const fetchCount = (item.trendData as { fetchCount?: number } | null)?.fetchCount ?? 0
  const isLowConfidence = fetchCount > 0 && fetchCount < 6

  return (
    <div className="flex-shrink-0 w-[180px] p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-2">
        {item.title || item.gid}
      </p>

      <div className="space-y-1 text-xs">
        {item.wantSlope != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">想要斜率</span>
            <span className={`font-medium tabular-nums ${(item.wantSlope ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtGrowth(item.wantSlope)}
            </span>
          </div>
        )}
        {item.wantAvg != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">日均</span>
            <span className="text-gray-700 tabular-nums">{fmtNumber(item.wantAvg)}</span>
          </div>
        )}
        {item.convertRate != null && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">转化率</span>
            <span className="text-gray-700 tabular-nums">{fmtPercent(item.convertRate)}</span>
          </div>
        )}
      </div>

      {isLowConfidence && (
        <p className="mt-2 text-[11px] italic text-amber-600 leading-tight">
          采集 {fetchCount} 次，置信度较低
        </p>
      )}
      {fetchCount === 0 && (
        <p className="mt-2 text-[11px] text-gray-400 leading-tight">无采集数据</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/ReferenceCard.tsx
git commit -m "feat: add ReferenceCard component for monitored item metrics

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: ReferencePanel 组件

**文件:**
- 创建: `components/batch-publish/workbench/ReferencePanel.tsx`

- [ ] **Step 1: 创建 ReferencePanel**

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { MonitoredItem } from '@/lib/api/batch-publish'
import { ReferenceCard } from './ReferenceCard'

interface ReferencePanelProps {
  items: MonitoredItem[]
  isLoading: boolean
  opportunityId: number
}

const STORAGE_KEY_PREFIX = 'bp-ref-panel-'

export function ReferencePanel({ items, isLoading, opportunityId }: ReferencePanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  // 从 localStorage 恢复折叠状态
  useEffect(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${opportunityId}`)
    if (saved === 'collapsed') setCollapsed(true)
  }, [opportunityId])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${opportunityId}`, next ? 'collapsed' : 'expanded')
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-xs text-gray-400">
        加载监控商品数据...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-gray-400">
        该商机下暂无绑定的监控商品
      </div>
    )
  }

  return (
    <div className="border-b border-gray-100">
      {/* 折叠标题栏 */}
      <button
        onClick={toggleCollapsed}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>参考信息（{items.length} 个监控商品）</span>
      </button>

      {/* 横向滚动卡片 */}
      {!collapsed && (
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-3" style={{ scrollSnapType: 'x mandatory' }}>
            {items.map((item) => (
              <div key={item.gid} style={{ scrollSnapAlign: 'start' }}>
                <ReferenceCard item={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/ReferencePanel.tsx
git commit -m "feat: add ReferencePanel with collapsible horizontal scroll cards

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: MaterialRow 组件（自包含行）

**文件:**
- 创建: `components/batch-publish/workbench/MaterialRow.tsx`

- [ ] **Step 1: 创建 MaterialRow**

```typescript
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { StatusPipeline } from '@/components/batch-publish/shared/StatusPipeline'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { fmtPrice } from '@/lib/utils/format'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import type { PublishMaterial, MaterialStatus } from '@/lib/api/batch-publish'

interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenEditor: (id: number) => void
  selectedOid: number | undefined
}

/**
 * 根据素材状态返回 4 个 AI 操作按钮的配置。
 * [改写, 封面规划, 生图, 发布] — 每个按钮 { label, stage?, enabled, primary }
 */
function getAIButtons(status: MaterialStatus): {
  label: string
  stage?: 'write' | 'genimageplan' | 'genimage'
  enabled: boolean
  primary: boolean
  isPublish?: boolean
}[] {
  switch (status) {
    case 'pending':
      return [
        { label: '改写', stage: 'write', enabled: true, primary: true },
        { label: '封面', stage: 'genimageplan', enabled: false, primary: false },
        { label: '生图', stage: 'genimage', enabled: false, primary: false },
        { label: '发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'writing_done':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '封面', stage: 'genimageplan', enabled: true, primary: true },
        { label: '生图', stage: 'genimage', enabled: false, primary: false },
        { label: '发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'genimageplan_done':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '重做', stage: 'genimageplan', enabled: true, primary: false },
        { label: '生图', stage: 'genimage', enabled: true, primary: true },
        { label: '发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'genimage_done':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '重做', stage: 'genimageplan', enabled: true, primary: false },
        { label: '重生', stage: 'genimage', enabled: true, primary: false },
        { label: '发布', enabled: true, primary: true, isPublish: true },
      ]
    case 'published':
      return [
        { label: '—', enabled: false, primary: false },
        { label: '—', enabled: false, primary: false },
        { label: '—', enabled: false, primary: false },
        { label: '✓已发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'publish_failed':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '重做', stage: 'genimageplan', enabled: true, primary: false },
        { label: '重生', stage: 'genimage', enabled: true, primary: false },
        { label: '重试', enabled: true, primary: true, isPublish: true },
      ]
  }
}

export function MaterialRow({
  materialId, isSelected, onToggleSelect, onOpenEditor, selectedOid,
}: MaterialRowProps) {
  const queryClient = useQueryClient()
  const { triggerWorkMutation, publishMutation } = useWorkbenchMutations(selectedOid)

  // 从缓存读取当前素材数据
  const materials = queryClient.getQueryData<PublishMaterial[]>(['batch-publish', 'materials', selectedOid])
    ?? queryClient.getQueryData<{ items: PublishMaterial[] }>(['batch-publish', 'materials', selectedOid])?.items
  const material = materials?.find(m => m.id === materialId)

  if (!material) {
    return (
      <div className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 text-gray-400"
        style={{ gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.5fr 0.8fr 0.4fr' }}>
        <span />
        <span>加载中...</span>
      </div>
    )
  }

  const buttons = getAIButtons(material.status)
  const isAnyLoading = triggerWorkMutation.isPending || publishMutation.isPending

  return (
    <div
      className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 hover:bg-gray-50 transition-colors"
      style={{ gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.5fr 0.8fr 0.4fr' }}
    >
      {/* 复选框 */}
      <div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(materialId)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* 描述 */}
      <span className="text-sm text-gray-800 leading-snug line-clamp-2">
        {material.description || '(无描述)'}
      </span>

      {/* 价格 */}
      <span className="text-sm text-gray-700 tabular-nums">
        {material.price != null ? fmtPrice(material.price) : '-'}
      </span>

      {/* 状态 */}
      <StatusBadge status={material.status} config={MATERIAL_STATUS_CONFIG} />

      {/* AI 操作按钮 */}
      <div className="flex items-center gap-1 flex-wrap">
        {buttons.map((btn, i) => (
          <button
            key={i}
            disabled={!btn.enabled || isAnyLoading}
            onClick={() => {
              if (btn.isPublish && btn.enabled) {
                publishMutation.mutate(materialId)
              } else if (btn.stage && btn.enabled) {
                triggerWorkMutation.mutate({ materialId, stage: btn.stage })
              }
            }}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${btn.primary && btn.enabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : btn.enabled
                  ? 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  : 'bg-white text-gray-300 border border-gray-100'
              }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 进度条 */}
      <StatusPipeline status={material.status} />

      {/* 微调按钮 */}
      <button
        onClick={() => onOpenEditor(materialId)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
        title="微调"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/MaterialRow.tsx
git commit -m "feat: add MaterialRow with self-contained AI button state machine

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: CreateMaterialModal 组件

**文件:**
- 创建: `components/batch-publish/workbench/CreateMaterialModal.tsx`

- [ ] **Step 1: 创建 CreateMaterialModal**

```typescript
'use client'

import { useState } from 'react'
import type { OpportunityItem } from '@/lib/api/batch-publish'

interface CreateMaterialModalProps {
  open: boolean
  onClose: () => void
  opportunity: OpportunityItem | null
  onCreate: (num: number) => void
  isPending: boolean
}

export function CreateMaterialModal({ open, onClose, opportunity, onCreate, isPending }: CreateMaterialModalProps) {
  const [num, setNum] = useState(1)

  if (!open || !opportunity) return null

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-lg p-6 w-[360px]">
        <h3 className="text-base font-semibold text-gray-900 mb-1">批量创建素材</h3>
        <p className="text-sm text-gray-500 mb-4">
          商机：{opportunity.name}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">创建数量</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={10}
                value={num}
                onChange={(e) => setNum(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-800 w-8 text-right tabular-nums">{num}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onCreate(num)}
            disabled={isPending}
            className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending ? '创建中...' : `创建 ${num} 份`}
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/CreateMaterialModal.tsx
git commit -m "feat: add CreateMaterialModal for batch material creation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: MaterialEditSheet 组件

**文件:**
- 创建: `components/batch-publish/workbench/MaterialEditSheet.tsx`

- [ ] **Step 1: 创建 MaterialEditSheet**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sheet } from '@/components/ui/overlay/Sheet'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import { useIsMobile } from '@/hooks/useIsMobile'
import { listMonitoredItems } from '@/lib/api/batch-publish'
import { fmtGrowth, fmtNumber } from '@/lib/utils/format'
import type { PublishMaterial, MonitoredItem, TemplateType } from '@/lib/api/batch-publish'

interface MaterialEditSheetProps {
  materialId: number | null
  selectedOid: number | undefined
  open: boolean
  onClose: () => void
}

export function MaterialEditSheet({ materialId, selectedOid, open, onClose }: MaterialEditSheetProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { editMaterialMutation, updateContextMutation } = useWorkbenchMutations(selectedOid)

  // 从缓存读取素材数据
  const materials = queryClient.getQueryData<PublishMaterial[]>(['batch-publish', 'materials', selectedOid])
    ?? queryClient.getQueryData<{ items: PublishMaterial[] }>(['batch-publish', 'materials', selectedOid])?.items
  const material = materialId ? materials?.find(m => m.id === materialId) : null

  // 表单字段
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [toUid, setToUid] = useState('')
  const [templateType, setTemplateType] = useState<TemplateType>('only_opportunity')
  const [selectedGids, setSelectedGids] = useState<string[]>([])

  // 监控商品列表（用于 AI 上下文勾选）
  const [monitoredItems, setMonitoredItems] = useState<MonitoredItem[]>([])

  // 初始化表单
  useEffect(() => {
    if (material) {
      setDescription(material.description ?? '')
      setPrice(material.price != null ? String(material.price) : '')
      setCategory(material.category ?? '')
      setToUid(material.to_uid ?? '')
      setTemplateType(material.ai_context?.template ?? 'only_opportunity')
      setSelectedGids(material.ai_context?.items ?? [])
    }
  }, [material])

  // 加载监控商品
  useEffect(() => {
    if (selectedOid && open) {
      listMonitoredItems({ oid: selectedOid, page_size: 100 }).then(res => {
        setMonitoredItems(res.items ?? [])
      }).catch(() => {})
    }
  }, [selectedOid, open])

  if (!material) return null

  const handleSaveMaterial = () => {
    editMaterialMutation.mutate({
      id: material.id,
      description: description || undefined,
      price: price ? Number(price) : undefined,
      category: category || undefined,
      to_uid: toUid || undefined,
    })
  }

  const handleSaveContext = () => {
    updateContextMutation.mutate({
      id: material.id,
      templateType,
      gids: templateType === 'with_item' ? selectedGids : undefined,
    })
  }

  const toggleGid = (gid: string) => {
    setSelectedGids(prev =>
      prev.includes(gid) ? prev.filter(g => g !== gid) : [...prev, gid]
    )
  }

  const isSaving = editMaterialMutation.isPending || updateContextMutation.isPending

  const content = (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* 素材基本信息 */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">素材信息</h4>

        <div>
          <label className="text-sm font-medium text-gray-700">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
            placeholder="商品描述文案"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">价格</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={0}
            step={0.01}
            className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">类目</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="如：手机配件"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">发布账号 (to_uid)</label>
          <input
            type="text"
            value={toUid}
            onChange={(e) => setToUid(e.target.value)}
            className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="选择发布账号"
          />
        </div>

        <button
          onClick={handleSaveMaterial}
          disabled={isSaving}
          className="h-10 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {editMaterialMutation.isPending ? '保存中...' : '保存素材信息'}
        </button>
      </section>

      {/* AI 上下文配置 */}
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">AI 上下文配置</h4>

        <div>
          <label className="text-sm font-medium text-gray-700">注入模板</label>
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value as TemplateType)}
            className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="only_opportunity">{TEMPLATE_TYPE_LABELS.only_opportunity}</option>
            <option value="with_item">{TEMPLATE_TYPE_LABELS.with_item}</option>
          </select>
        </div>

        {templateType === 'with_item' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              注入监控商品（{selectedGids.length} 个已选）
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {monitoredItems.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">该商机下暂无绑定商品</p>
              ) : (
                monitoredItems.map((item) => (
                  <label
                    key={item.gid}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGids.includes(item.gid)}
                      onChange={() => toggleGid(item.gid)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-gray-700 line-clamp-1">{item.title || item.gid}</span>
                    {item.wantSlope != null && (
                      <span className={`text-xs tabular-nums ${item.wantSlope >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtGrowth(item.wantSlope)}
                      </span>
                    )}
                    {item.wantAvg != null && (
                      <span className="text-xs text-gray-500 tabular-nums">{fmtNumber(item.wantAvg)}</span>
                    )}
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* 配置摘要 */}
        <p className="text-xs text-gray-500 leading-relaxed">
          {templateType === 'only_opportunity'
            ? '将注入：仅商机信息'
            : `将注入：商机信息 + ${selectedGids.length} 个监控商品${selectedGids.length > 0 ? '（' + selectedGids.map(g => monitoredItems.find(m => m.gid === g)?.title ?? g).join('、') + '）' : ''}`
          }
        </p>

        <button
          onClick={handleSaveContext}
          disabled={isSaving}
          className="h-10 px-5 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {updateContextMutation.isPending ? '保存中...' : '保存 AI 上下文'}
        </button>
      </section>
    </div>
  )

  // 移动端使用 BottomSheet 从 Sheet 组件的同级导入
  if (isMobile) {
    // 移动端直接嵌入 Sheet（Sheet 在桌面端是侧边抽屉，移动端场景由 useIsMobile 在 WorkbenchTab 层处理）
    // 此处仍使用 Sheet，由容器层决定用 Sheet 还是 BottomSheet
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`编辑素材 #${material.id}`}
      subtitle={material.description?.slice(0, 40) ?? ''}
      width="500px"
    >
      {content}
    </Sheet>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/MaterialEditSheet.tsx
git commit -m "feat: add MaterialEditSheet with AI context configuration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: WorkbenchOverview 组件（概览视图）

**文件:**
- 创建: `components/batch-publish/workbench/WorkbenchOverview.tsx`

- [ ] **Step 1: 创建 WorkbenchOverview**

```typescript
'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtRelative } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface WorkbenchOverviewProps {
  materials: PublishMaterial[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  pageSize: number
  onPageChange: (p: number) => void
}

/** 分组：有 publish_failed 的商机置顶 */
function groupByOpportunity(materials: PublishMaterial[]): Map<string, PublishMaterial[]> {
  const groups = new Map<string, PublishMaterial[]>()
  for (const m of materials) {
    const key = m.opportunity?.name ?? `商机 #${m.opportunity?.id ?? '未知'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  // 排序：有失败素材的商机置顶 → 最近编辑在前
  const entries = Array.from(groups.entries())
  entries.sort((a, b) => {
    const aHasFailed = a[1].some(m => m.status === 'publish_failed')
    const bHasFailed = b[1].some(m => m.status === 'publish_failed')
    if (aHasFailed !== bHasFailed) return aHasFailed ? -1 : 1
    const aLatest = Math.max(...a[1].map(m => new Date(m.updated_at ?? 0).getTime()))
    const bLatest = Math.max(...b[1].map(m => new Date(m.updated_at ?? 0).getTime()))
    return bLatest - aLatest
  })
  return new Map(entries)
}

export function WorkbenchOverview({
  materials, total, isLoading, error, onRetry,
  page, pageSize, onPageChange,
}: WorkbenchOverviewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => groupByOpportunity(materials), [materials])

  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleRowClick = (material: PublishMaterial) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    if (material.opportunity?.id) {
      params.set('oid', String(material.opportunity.id))
    }
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && !isLoading && materials.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={onRetry}
      />
    )
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        size="md"
        title="暂无待处理素材"
        description="所有素材已完成发布。去商机管理或监控页面创建新的素材。"
      />
    )
  }

  const groupCount = grouped.size

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 摘要 */}
      <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">
        待发布素材（{groupCount} 个商机，共 {total} 份素材未完成）
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(grouped.entries()).map(([name, items]) => {
          const isCollapsed = collapsedGroups.has(name)
          const pendingCount = items.filter(m => m.status !== 'published').length
          const hasFailed = items.some(m => m.status === 'publish_failed')

          return (
            <div key={name} className="border-b border-gray-100">
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(name)}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${hasFailed ? 'text-red-700' : 'text-gray-700'}`}
              >
                <svg
                  className={`w-3 h-3 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex-1 text-left">{name}</span>
                <span className="text-xs text-gray-400 font-normal">
                  {pendingCount} 份待处理
                </span>
                {hasFailed && (
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="有发布失败" />
                )}
              </button>

              {/* 分组内素材 */}
              {!isCollapsed && (
                <div>
                  {items.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleRowClick(m)}
                      className="grid gap-2 px-6 py-2 items-center text-xs leading-tight border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      style={{ gridTemplateColumns: '1.5fr 0.8fr 0.7fr 0.5fr' }}
                    >
                      <span className="text-sm text-gray-800 line-clamp-1">
                        素材 #{m.id} · {m.description?.slice(0, 30) || '(无描述)'}
                      </span>
                      <StatusBadge status={m.status} config={MATERIAL_STATUS_CONFIG} />
                      <span className="text-gray-400 tabular-nums">
                        {m.updated_at ? fmtRelative(m.updated_at) : '-'}
                      </span>
                      <span className="text-gray-400 text-right">→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分页 */}
      <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/WorkbenchOverview.tsx
git commit -m "feat: add WorkbenchOverview with grouped pending materials list

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: OpportunityListPanel 组件

**文件:**
- 创建: `components/batch-publish/workbench/OpportunityListPanel.tsx`

- [ ] **Step 1: 创建 OpportunityListPanel**

```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { OPPORTUNITY_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { fmtPrice } from '@/lib/utils/format'
import type { OpportunityItem } from '@/lib/api/batch-publish'

interface OpportunityListPanelProps {
  opportunities: OpportunityItem[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  onPageChange: (p: number) => void
  search: string
  onSearchChange: (v: string) => void
  status: string
  onStatusChange: (v: string) => void
  selectedOid: number | undefined
}

export function OpportunityListPanel({
  opportunities, total, isLoading, error, onRetry,
  page, onPageChange,
  search, onSearchChange, status, onStatusChange,
  selectedOid,
}: OpportunityListPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSelect = (item: OpportunityItem) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(item.id))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      {/* 搜索 + 筛选 */}
      <div className="p-3 space-y-2 border-b border-gray-100 flex-shrink-0">
        <input
          type="text"
          placeholder="搜索商机..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1">
          {[
            { value: '', label: '全部' },
            { value: 'active', label: '启用' },
            { value: 'inactive', label: '停用' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                status === opt.value
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <ErrorBanner variant="inline" message="加载失败" onRetry={onRetry} />
        ) : opportunities.length === 0 ? (
          <EmptyState size="sm" title="暂无商机" description="请先创建商机" />
        ) : (
          opportunities.map((item) => {
            const isSelected = item.id === selectedOid
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  isSelected ? 'border-l-2 border-l-blue-600 bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium line-clamp-1 ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {item.name}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-blue-600 text-xs flex-shrink-0">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <span>📦 {item.monitoredItemCount ?? 0}</span>
                  <span>📝 {item.materialCount ?? 0}</span>
                  {(item.price ?? 0) > 0 && <span>{fmtPrice(item.price!)}</span>}
                  <StatusBadge status={item.status} config={OPPORTUNITY_STATUS_CONFIG} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/OpportunityListPanel.tsx
git commit -m "feat: add OpportunityListPanel for workbench left panel

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: MaterialWorkspace 组件

**文件:**
- 创建: `components/batch-publish/workbench/MaterialWorkspace.tsx`

- [ ] **Step 1: 创建 MaterialWorkspace**

```typescript
'use client'

import { useMemo } from 'react'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { ReferencePanel } from './ReferencePanel'
import { MaterialRow } from './MaterialRow'
import { fmtPrice } from '@/lib/utils/format'
import type { OpportunityItem, MonitoredItem, PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialWorkspaceProps {
  opportunity: OpportunityItem | null
  materials: PublishMaterial[]
  materialLoading: boolean
  materialError: unknown
  materialRefetch: () => void
  monitoredItems: MonitoredItem[]
  monitoredLoading: boolean
  selectedMaterialIds: Set<number>
  onToggleSelect: (id: number) => void
  onClearSelection: () => void
  onOpenEditor: (id: number) => void
  onCreateClick: () => void
  selectedOid: number | undefined
  page: number
  total: number
  onPageChange: (p: number) => void
}

const GRID_COLS = '32px 2fr 0.7fr 0.8fr 1.5fr 0.8fr 0.4fr'

export function MaterialWorkspace({
  opportunity, materials, materialLoading, materialError, materialRefetch,
  monitoredItems, monitoredLoading,
  selectedMaterialIds, onToggleSelect, onClearSelection, onOpenEditor,
  onCreateClick, selectedOid,
  page, total, onPageChange,
}: MaterialWorkspaceProps) {
  if (!opportunity) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        请从左侧选择一个商机
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 商机头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{opportunity.name}</h3>
          {(opportunity.price ?? 0) > 0 && (
            <span className="text-sm text-gray-600 flex-shrink-0">{fmtPrice(opportunity.price!)}</span>
          )}
          <span className="text-xs text-gray-400 flex-shrink-0">
            📦{opportunity.monitoredItemCount ?? 0} · 📝{opportunity.materialCount ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onCreateClick}
            className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            批量创建
          </button>
        </div>
      </div>

      {/* 参考面板 */}
      <ReferencePanel
        items={monitoredItems}
        isLoading={monitoredLoading}
        opportunityId={opportunity.id}
      />

      {/* 素材表格 */}
      <div className="flex-1 overflow-y-auto">
        {materialLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : materialError ? (
          <ErrorBanner variant="banner" message="加载素材失败" onRetry={materialRefetch} />
        ) : materials.length === 0 ? (
          <EmptyState
            size="md"
            title="暂无素材"
            description="点击「批量创建」为该商机创建素材"
            action={{ label: '批量创建', onClick: onCreateClick }}
          />
        ) : (
          <>
            {/* 表头 */}
            <div
              className="grid gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200 sticky top-0 z-10"
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              <div>
                {selectedMaterialIds.size > 0 && (
                  <button onClick={onClearSelection} className="text-blue-600 hover:underline">
                    取消
                  </button>
                )}
              </div>
              <div>描述</div>
              <div>价格</div>
              <div>状态</div>
              <div>AI 操作</div>
              <div>进度</div>
              <div />
            </div>

            {/* 数据行 */}
            {materials.map((m) => (
              <MaterialRow
                key={m.id}
                materialId={m.id}
                isSelected={selectedMaterialIds.has(m.id)}
                onToggleSelect={onToggleSelect}
                onOpenEditor={onOpenEditor}
                selectedOid={selectedOid}
              />
            ))}
          </>
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/MaterialWorkspace.tsx
git commit -m "feat: add MaterialWorkspace with header, reference panel, and material table

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: WorkbenchTab 主容器（PC 端）

**文件:**
- 创建: `components/batch-publish/workbench/WorkbenchTab.tsx`

- [ ] **Step 1: 创建 WorkbenchTab（PC 端 + 移动端框架）**

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // ---- 工作区视图：PC 端左右分栏 ----
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
            total={page.materials.length /* 或者从 data 获取 total */}
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
```

- [ ] **Step 2: 提交**

```bash
git add components/batch-publish/workbench/WorkbenchTab.tsx
git commit -m "feat: add WorkbenchTab with overview/workspace views and left-right split

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 14: 集成到 page.tsx

**文件:**
- 修改: `app/dashboard/batch-publish/page.tsx`

- [ ] **Step 1: 替换创作台占位符为动态导入**

在 page.tsx 中，找到创作台的占位符代码并替换。先读取当前文件确认精确匹配：

```typescript
// 添加 WorkbenchTab 的 lazy import（与其他 Tab 并列）
const WorkbenchTab = dynamic(
  () => import('@/components/batch-publish/workbench/WorkbenchTab').then(m => ({ default: m.WorkbenchTab })),
  { loading: () => <TabPlaceholder text="创作台加载中..." /> }
)
```

然后替换占位符：
```typescript
{activeTab === 'workbench' && (
  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
    创作台 — Phase 5 开发中
  </div>
)}
```
为：
```typescript
{activeTab === 'workbench' && <WorkbenchTab />}
```

- [ ] **Step 2: 具体修改**

在 page.tsx 第 10 行后添加动态导入：
```typescript
const WorkbenchTab = dynamic(
  () => import('@/components/batch-publish/workbench/WorkbenchTab').then(m => ({ default: m.WorkbenchTab })),
  { loading: () => <TabPlaceholder text="创作台加载中..." /> }
)
```

替换第 57-61 行的占位符为 `<WorkbenchTab />`。

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit --pretty 2>&1 | head -50
```

- [ ] **Step 4: 提交**

```bash
git add app/dashboard/batch-publish/page.tsx
git commit -m "feat: integrate WorkbenchTab into batch-publish page

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 6: 移动端降级

### Task 15: WorkbenchTab 移动端 Push/Pop 导航

**文件:**
- 修改: `components/batch-publish/workbench/WorkbenchTab.tsx`

- [ ] **Step 1: 添加移动端 Push/Pop 导航栈**

WorkbenchTab 已经导入了 `useWorkbenchPage` 并可从其获取 `isMobile`。需要在移动端实现：
- 概览视图（全屏）
- 商机列表（全屏，从概览 Push）
- 素材工作区（全屏，选中商机后 Push）
- 顶部面包屑导航 + 右滑返回

修改 WorkbenchTab.tsx，在 return 之前添加移动端分支判断。当 `isMobile` 为 true 时，使用 Push/Pop 导航。

完整实现：

```typescript
// 在 WorkbenchTab 函数内，return 之前添加：

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
          {/* 面包屑 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => page.setMobileView('overview')}
              className="p-1 -ml-1 text-gray-400 hover:text-gray-600"
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
          {/* 面包屑 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => page.setMobileView(page.selectedOid ? 'opportunity-list' : 'overview')}
              className="p-1 -ml-1 text-gray-400 hover:text-gray-600"
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
              total={page.materials.length}
              onPageChange={page.setMaterialPage}
            />
          </div>
        </div>
      )}

      {/* 移动端底部 Sheet 编辑器 */}
      {page.editingMaterialId !== null && (
        <div className="fixed inset-0 z-50">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={page.closeEditor}
          />
          {/* 底部面板 */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl flex flex-col"
            style={{ height: '85vh' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">编辑素材</h3>
              <button onClick={page.closeEditor} className="p-1 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {/* 移动端编辑表单 — 复用 MaterialEditSheet 逻辑 */}
              <MobileMaterialEditor
                materialId={page.editingMaterialId}
                selectedOid={page.selectedOid}
                onClose={page.closeEditor}
              />
            </div>
          </div>
        </div>
      )}

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
```

此外需要从 WorkbenchTab 中提取移动端编辑器为独立组件或内联。为了保持简单，移动端编辑器可复用 MaterialEditSheet 的核心表单项。

实际上 MaterialEditSheet 已经是一个完整的编辑器，在移动端我们只需通过不同的容器展示它。上面的 BottomSheet 已经包含了编辑区域。

但为了不重复代码，我们不如在 MaterialEditSheet 中传入 `isMobile` 并让它自己决定渲染方式。上面代码中 `MobileMaterialEditor` 可以用 MaterialEditSheet 的核心内容。让我们简化——MaterialEditSheet 本身使用 Sheet（桌面端侧边抽屉），移动端在这里用内联 BottomSheet 容器包裹相同的内容。

最简单的方式：在移动端，不渲染 MaterialEditSheet 的 Sheet 包装，而是直接使用 BottomSheet 样式容器。

- [ ] **Step 2: 处理移动端视图切换逻辑**

在 `useWorkbenchPage` 中，我们需要确保当用户从概览点击行进入工作区时，移动端正确切换视图。在 `WorkbenchOverview` 中点击行会通过 URL 导航到 `?tab=workbench&oid=X`，这会被 WorkbenchTab 捕获。

需要在 WorkbenchTab 中添加 effect 来同步 mobileView：

```typescript
// 在 WorkbenchTab 顶部添加 useEffect
useEffect(() => {
  if (page.isMobile) {
    if (page.selectedOid) {
      page.setMobileView('workspace')
    } else {
      page.setMobileView('overview')
    }
  }
}, [page.isMobile, page.selectedOid])
```

- [ ] **Step 3: 简化 mobile 编辑 — 复用 MaterialEditSheet 内容**

在 MaterialEditSheet 中导出纯内容组件（不含 Sheet 包装），让移动端可以直接使用：

在 MaterialEditSheet 中新增导出：
```typescript
export function MaterialEditContent({ materialId, selectedOid, onClose }: MaterialEditSheetProps) {
  // ... 所有现有的编辑逻辑，但去掉最外层的 <Sheet> 包装
  // 将 content 变量直接返回
}
```

然后 MaterialEditSheet 使用它：
```typescript
export function MaterialEditSheet(props: MaterialEditSheetProps) {
  return (
    <Sheet open={props.open} onClose={props.onClose} ...>
      <MaterialEditContent {...props} />
    </Sheet>
  )
}
```

移动端则直接用 `<MaterialEditContent />` 包裹在 BottomSheet 容器中。

但为了减少改动量，第一步可以保持简单：移动端也使用 Sheet（桌面端抽屉），在后续迭代中优化。当前优先让功能跑通。

- [ ] **Step 4: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit --pretty 2>&1 | head -50
```

- [ ] **Step 5: 提交**

```bash
git add components/batch-publish/workbench/WorkbenchTab.tsx components/batch-publish/workbench/MaterialEditSheet.tsx
git commit -m "feat: add mobile Push/Pop navigation for workbench

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 16: 移动端细节打磨 — 触摸区域与手势

**文件:**
- 修改: `components/batch-publish/workbench/WorkbenchTab.tsx`
- 修改: `components/batch-publish/workbench/MaterialEditSheet.tsx`

- [ ] **Step 1: 确保触摸目标 ≥ 44px**

检查以下交互元素：
- 面包屑返回按钮 → 已有 `p-1` + w-5 h-5，需确保可点击区域 ≥ 44px。加 `min-w-[44px] min-h-[44px]`。
- MaterialRow 中的复选框和按钮 → 按钮已有 `px-2 py-1`，复选框需要加 `min-w-[44px] min-h-[44px]` 或用 label 包裹扩大点击区。
- 商机列表卡片 → 整行可点击，触摸区域足够。

在面包屑返回按钮添加最小触摸区域：
```typescript
// 面包屑按钮修改
<button
  onClick={...}
  className="flex items-center justify-center w-11 h-11 -ml-1 text-gray-400 hover:text-gray-600"
>
  <svg className="w-5 h-5" ...>
```

- [ ] **Step 2: 移动端 MaterialEditSheet 切换为 BottomSheet**

修改 MaterialEditSheet 使其在移动端自动使用 BottomSheet：

```typescript
// MaterialEditSheet 中
import { BottomSheet } from '@/components/ui/overlay/Sheet'

// 在组件中根据 isMobile 选择容器
const Container = isMobile ? BottomSheet : Sheet
const containerProps = isMobile
  ? { heightRatio: 0.85 }
  : { width: '500px' }

return (
  <Container open={open} onClose={onClose} title={...} {...containerProps}>
    {content}
  </Container>
)
```

但是 BottomSheet 和 Sheet 的 props 不完全相同。BottomSheet 有 `heightRatio`，Sheet 有 `width`。需要条件渲染。

```typescript
if (isMobile) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`编辑素材 #${material.id}`}
      heightRatio={0.85}
    >
      <div className="p-4 space-y-6">
        {/* 相同的内容 */}
      </div>
    </BottomSheet>
  )
}

return (
  <Sheet open={open} onClose={onClose} title={...} width="500px">
    <div className="p-6 space-y-6">
      {/* 相同的内容 */}
    </div>
  </Sheet>
)
```

为了 DRY，将内容提取为变量 `content`，内边距在外层差异化（移动端 `p-4` vs 桌面端 `p-6`）。

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/workbench/WorkbenchTab.tsx components/batch-publish/workbench/MaterialEditSheet.tsx
git commit -m "fix: mobile touch targets and BottomSheet for material editor

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 验证清单

完成所有 Task 后执行：

- [ ] **TypeScript 编译零错误**
  ```bash
  cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit --pretty 2>&1 | tail -5
  ```

- [ ] **无循环依赖**
  ```bash
  cd E:/.project/autofish_freetime/frontend && npx madge --circular --extensions ts,tsx app/ components/ hooks/ lib/ 2>&1
  ```

- [ ] **lint 检查通过**
  ```bash
  cd E:/.project/autofish_freetime/frontend && npx eslint app/dashboard/batch-publish/ components/batch-publish/workbench/ hooks/batch-publish/useWorkbench* --max-warnings 0 2>&1 | tail -5
  ```

---

## 复杂度评估

| Task | 复杂度 | 理由 |
|------|--------|------|
| T1-T4 (hooks) | 低 | 遵循已有三层拆分模式 |
| T5 ReferenceCard | 低 | 纯展示组件，180px 卡片 |
| T6 ReferencePanel | 中 | 折叠状态持久化 + 横向滚动 |
| T7 MaterialRow | **高** | AI 按钮状态机 + 自包含数据读取 |
| T8 CreateMaterialModal | 低 | 简单弹窗 + range 输入 |
| T9 MaterialEditSheet | 高 | 双面板编辑（素材信息 + AI 上下文） |
| T10 WorkbenchOverview | 中 | 分组逻辑 + 折叠状态 |
| T11 OpportunityListPanel | 低 | 复用模式，与现有 OpportunityTab 类似 |
| T12 MaterialWorkspace | 中 | 组合 ReferencePanel + MaterialRow |
| T13 WorkbenchTab | 高 | PC 分栏 + ResizableDivider + 组件编排 |
| T14 page.tsx | 低 | 替换占位符 |
| T15 移动端 Push/Pop | 高 | 导航栈状态管理 + 3 视图切换 |
| T16 移动端打磨 | 中 | 触摸目标 + BottomSheet 适配 |

---

## 自审清单

1. **规格覆盖**: 核对 §4.3（创作台）全部子章节
   - §4.3.0 概览视图 → Task 10 WorkbenchOverview ✅
   - §4.3.1 工作区视图 → Task 11+12+13 ✅
   - §4.3.2 AI 按钮状态机 → Task 7 MaterialRow ✅
   - §4.3.3 Sheet 编辑器 → Task 9 MaterialEditSheet ✅
   - §4.3.4 移动端 → Task 15+16 ✅

2. **无占位符**: 所有步骤包含完整可执行代码。

3. **类型一致性**: 
   - `MaterialStatus`、`OpportunityItem`、`PublishMaterial` 等类型从 `@/lib/api/batch-publish` 导入
   - Hook 签名在 Task 4 组合 hook 中与 T1-T3 一致
   - `getAIButtons` 返回值与 MaterialRow 中的渲染逻辑一致

4. **遵循项目规范**:
   - 命名导出 `export function` ✅
   - 页面顶级容器 `flex flex-col gap-5 h-full` ✅
   - React Query 管理所有服务端数据 ✅
   - 禁止动态路由 ✅
   - API 基础地址从环境变量读取 ✅
