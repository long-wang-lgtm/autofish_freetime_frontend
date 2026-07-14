# 创作台商机列表与素材列表交互修复 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 PendingOverviewPanel 职责错位（分组→平铺）、选中态无法 toggle、分页器数据脱节、移动端胶囊条→双视图切换、MaterialRow 纯文字加载、MaterialsTab/MonitorTab 复制粘贴 ErrorBanner 守卫。

**Architecture:** 自底向上：常量层 → ErrorGuard → 数据层 → 视图组件 → 集成层 → 验证。

**Tech Stack:** Next.js 14 + React 18 + TypeScript + TanStack Query v5 + Tailwind CSS v3

---

### Task 1: constants.ts — 新增 PAGE_SIZE，更新 queryKeys

**Files:**
- Modify: `components/batch-publish/shared/constants.ts` (末尾追加 + queryKeys 修改)

- [ ] **Step 1: 末尾追加 PAGE_SIZE 常量**

在文件末尾（`OPPORTUNITY_STATUS_FILTER_OPTIONS` 之后）追加：

```ts
// ============================================================
// 分页
// ============================================================

/** 列表统一分页大小——商机列表、概览待办、素材工作区均使用此值 */
export const PAGE_SIZE = 20
```

- [ ] **Step 2: 更新 queryKeys.materials.byOid 签名**

找到 `queryKeys` 对象（约第 142 行），将 `byOid` 增加 `page` 参数：

```ts
// 改前
byOid: (oid: number | undefined) => ['batch-publish', 'materials', oid] as const,

// 改后
byOid: (oid: number | undefined, page: number) =>
  ['batch-publish', 'materials', oid, { page }] as const,
```

- [ ] **Step 3: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS

- [ ] **Step 4: 提交**

```bash
git add components/batch-publish/shared/constants.ts
git commit -m "feat: add PAGE_SIZE constant, update queryKeys.materials.byOid signature"
```

---

### Task 2: ErrorGuard — 新建共享错误守卫

**Files:**
- Create: `components/batch-publish/shared/ErrorGuard.tsx`

- [ ] **Step 1: 创建 ErrorGuard 组件**

```tsx
'use client'

import type { ReactNode } from 'react'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'

interface ErrorGuardParams {
  error: unknown
  isLoading: boolean
  hasData: boolean
  onRetry: () => void
}

/**
 * 列表页错误守卫——当 error 存在、非 loading 态、且无数据时，
 * 返回 ErrorBanner（banner 变体）。其余情况返回 null。
 *
 * 消除 MaterialsTab / MonitorTab 中复制的 8 行 ErrorBanner 守卫代码。
 *
 * 用法：
 *   const guard = renderErrorGuard({ error, isLoading, hasData: data.length > 0, onRetry: () => refetch() })
 *   if (guard) return guard
 */
export function renderErrorGuard({ error, isLoading, hasData, onRetry }: ErrorGuardParams): ReactNode {
  if (error && !isLoading && !hasData) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={onRetry}
      />
    )
  }
  return null
}
```

- [ ] **Step 2: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/shared/ErrorGuard.tsx
git commit -m "feat: extract shared ErrorGuard to eliminate duplicated ErrorBanner guard code"
```

---

### Task 3: MaterialsTab + MonitorTab — 接入 ErrorGuard

**Files:**
- Modify: `components/batch-publish/materials/MaterialsTab.tsx`
- Modify: `components/batch-publish/monitor/MonitorTab.tsx`

- [ ] **Step 1: MaterialsTab.tsx — 替换 ErrorBanner 守卫**

删除 `ErrorBanner` import（第 8 行），新增 `renderErrorGuard` import：

```tsx
// 删除
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
// 新增
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
```

将第 30-38 行：
```tsx
  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={() => refetch()}
      />
    )
  }
```

替换为：
```tsx
  const errorGuard = renderErrorGuard({
    error,
    isLoading,
    hasData: data.length > 0,
    onRetry: () => refetch(),
  })
  if (errorGuard) return errorGuard
```

- [ ] **Step 2: MonitorTab.tsx — 同样替换**

删除 `ErrorBanner` import（第 13 行），新增 `renderErrorGuard` import：

```tsx
// 删除
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
// 新增
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
```

将第 61-69 行：
```tsx
  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={() => refetch()}
      />
    )
  }
```

替换为：
```tsx
  const errorGuard = renderErrorGuard({
    error,
    isLoading,
    hasData: data.length > 0,
    onRetry: () => refetch(),
  })
  if (errorGuard) return errorGuard
```

- [ ] **Step 3: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS

- [ ] **Step 4: 提交**

```bash
git add components/batch-publish/materials/MaterialsTab.tsx components/batch-publish/monitor/MonitorTab.tsx
git commit -m "refactor: replace inline ErrorBanner guard with shared ErrorGuard in MaterialsTab and MonitorTab"
```

---

### Task 4: useWorkbenchData — 分页修复 + page_size 统一

**Files:**
- Modify: `hooks/batch-publish/useWorkbenchData.ts`

- [ ] **Step 1: 接口增加 materialPage，概览 page_size 50→20**

修改 `UseWorkbenchDataParams` 接口（第 6-12 行）：
```ts
interface UseWorkbenchDataParams {
  selectedOid: number | undefined
  overviewPage: number
  oppSearch: string
  oppStatus: string
  oppPage: number
  materialPage: number  // 新增
}
```

概览查询（第 33-47 行），将 `page_size: 50` 改为 `page_size: 20`：
```ts
const {
  data: overviewData,
  isLoading: overviewLoading,
  error: overviewError,
  refetch: overviewRefetch,
} = useQuery({
  queryKey: ['batch-publish', 'materials', 'overview', { page: overviewPage }],
  queryFn: () => listMaterials({
    page: overviewPage,
    page_size: 20,  // 改前 50
    status: 'pending,writing_done,genimageplan_done,genimage_done,publish_failed',
  }),
  enabled: !selectedOid,
})
```

- [ ] **Step 2: 素材查询接入 materialPage，page_size 100→20**

素材查询（第 49-59 行）：
```ts
const {
  data: materialData,
  isLoading: materialLoading,
  error: materialError,
  refetch: materialRefetch,
} = useQuery({
  queryKey: ['batch-publish', 'materials', selectedOid, { page: materialPage }],
  queryFn: () => listMaterials({ oid: selectedOid, page: materialPage, page_size: 20 }),
  enabled: !!selectedOid,
})
```

删除文件顶部无用的 `const PAGE_SIZE = 20`（第 14 行，如有；现在由 constants.ts 导出）。

- [ ] **Step 3: useWorkbenchData 调用处传入 materialPage**

`useWorkbenchPage.ts` 中 `useWorkbenchData` 调用改为：
```ts
const data = useWorkbenchData({
  selectedOid: filters.selectedOid,
  overviewPage,
  oppSearch: debouncedOppSearch,
  oppStatus,
  oppPage,
  materialPage,  // 新增
})
```

注意：`materialPage` 在 `useWorkbenchPage` 中已声明（第 28 行 `const [materialPage, setMaterialPage] = useState(1)`），只需透传。

- [ ] **Step 4: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS

- [ ] **Step 5: 提交**

```bash
git add hooks/batch-publish/useWorkbenchData.ts hooks/batch-publish/useWorkbenchPage.ts
git commit -m "fix: connect materialPage to API query, unify page_size to 20"
```

---

### Task 5: useWorkbenchPage — MobileView 简化

**Files:**
- Modify: `hooks/batch-publish/useWorkbenchPage.ts`

- [ ] **Step 1: MobileView 类型改为 `'overview' | 'opportunities'`，删除 useEffect 同步**

将第 49-51 行：
```ts
type MobileView = 'overview' | 'opportunity-list' | 'workspace'
const [mobileView, setMobileView] = useState<MobileView>(
  filters.selectedOid ? 'workspace' : 'overview'
)
```

改为：
```ts
type MobileView = 'overview' | 'opportunities'
const [mobileView, setMobileView] = useState<MobileView>('overview')
```

删除第 55-61 行的 `useEffect`（它把 `selectedOid` 同步到 `mobileView = 'workspace'`）：
```tsx
// 删除整个 useEffect 块
useEffect(() => {
  if (isMobile) {
    if (filters.selectedOid) {
      setMobileView('workspace')
    }
  }
}, [isMobile, filters.selectedOid])
```

同时删除文件顶部 `useEffect` 的 import（如果没有其他地方使用）：
```ts
// 删除 import { useState, useEffect } from 'react' 中的 useEffect
import { useState } from 'react'
```

- [ ] **Step 2: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS（WorkbenchTab 的 mobileView 引用会报类型错误——在 Task 8 中一并修复）

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useWorkbenchPage.ts
git commit -m "refactor: simplify MobileView to 'overview' | 'opportunities', remove workspace sync useEffect"
```

---

### Task 6: MaterialRow — cache key 修复 + LoadingSpinner

**Files:**
- Modify: `components/batch-publish/workbench/MaterialRow.tsx`

- [ ] **Step 1: 接口新增 materialPage prop**

在 `MaterialRowProps` 接口（第 15-21 行）中新增：
```ts
interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenSheet: (id: number) => void
  selectedOid: number | undefined
  materialPage: number  // 新增——用于构造分页后的缓存 key
}
```

函数签名解构新增 `materialPage`：
```ts
export function MaterialRow({
  materialId, isSelected, onToggleSelect, onOpenSheet, selectedOid, materialPage,
}: MaterialRowProps) {
```

- [ ] **Step 2: 缓存读取/写入使用完整 key**

将第 32 行的 `getQueryData` 调用：
```ts
const cached = queryClient.getQueryData<MaterialListResponse>(['batch-publish', 'materials', selectedOid])
```
改为：
```ts
const cached = queryClient.getQueryData<MaterialListResponse>(
  ['batch-publish', 'materials', selectedOid, { page: materialPage }]
)
```

将第 63-70 行 `optimisticUpdate` 函数内的：
```ts
queryClient.setQueryData<MaterialListResponse>(
  ['batch-publish', 'materials', selectedOid],
  ...
)
```
改为：
```ts
queryClient.setQueryData<MaterialListResponse>(
  ['batch-publish', 'materials', selectedOid, { page: materialPage }],
  ...
)
```

- [ ] **Step 3: 缓存未命中时使用 LoadingSpinner**

将第 48-57 行的纯文字 `加载中...`：
```tsx
if (!material) {
  return (
    <div
      className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 text-gray-400"
      style={{ gridTemplateColumns: MATERIAL_GRID_COLS }}
    >
      <span />
      <span />
      <span>加载中...</span>
    </div>
  )
}
```

改为使用 `LoadingSpinner`：
```tsx
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

// ... 在组件内：
if (!material) {
  return (
    <div
      className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100"
      style={{ gridTemplateColumns: MATERIAL_GRID_COLS }}
    >
      <span />
      <span />
      <span className="inline-flex items-center gap-1 text-gray-400">
        <LoadingSpinner size="sm" />
      </span>
    </div>
  )
}
```

- [ ] **Step 4: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS（MaterialWorkspace 调用 MaterialRow 缺少 materialPage 的报错在 Task 7 修复）

- [ ] **Step 5: 提交**

```bash
git add components/batch-publish/workbench/MaterialRow.tsx
git commit -m "fix: use page-aware cache keys in MaterialRow, replace raw text with LoadingSpinner"
```

---

### Task 7: PendingOverviewPanel — 分组→平铺

**Files:**
- Modify: `components/batch-publish/workbench/PendingOverviewPanel.tsx`

- [ ] **Step 1: 删除分组相关代码**

删除以下内容：
- `useMemo` import（第 3 行 `useMemo`，保留 `useState`）
- `groupByOpportunity()` 函数（第 25-42 行）
- `collapsedGroups` state + `toggleGroup`（第 48 行 + 第 52-59 行）
- `grouped` useMemo（第 50 行）
- `groupCount` 变量（第 89 行）

- [ ] **Step 2: 标题行简化**

将第 93-95 行：
```tsx
<div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100 flex-shrink-0">
  待发布素材（{groupCount} 个商机，共 {total} 份素材未完成）
</div>
```
改为：
```tsx
<div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100 flex-shrink-0">
  待发布素材（共 {total} 份素材未完成）
</div>
```

- [ ] **Step 3: JSX 从折叠分组改为平铺列表**

将第 97-148 行的 `Array.from(grouped.entries()).map(...)` 折叠分组 JSX 全部删除。

替换为平铺列表——排序后直接 map materials：

```tsx
<div className="flex-1 overflow-y-auto">
  {[...materials]
    .sort((a, b) => {
      // publish_failed 置顶
      const aFailed = a.status === 'publish_failed' ? 1 : 0
      const bFailed = b.status === 'publish_failed' ? 1 : 0
      if (aFailed !== bFailed) return bFailed - aFailed
      // 同状态按 updated_at 倒序
      return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
    })
    .map((m) => (
      <div
        key={m.id}
        onClick={() => onSelectMaterial(m)}
        className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
        style={{ gridTemplateColumns: '1.5fr 0.8fr 0.7fr 0.5fr 0.3fr' }}
      >
        <span className="text-sm text-gray-800 line-clamp-1">
          素材 #{m.id} · {m.description?.slice(0, 30) || '(无描述)'}
        </span>
        <span className="text-xs text-gray-400 truncate">
          {m.opportunity?.name ?? `#${m.opportunity?.id ?? '未知'}`}
        </span>
        <StatusBadge status={m.status} config={MATERIAL_STATUS_CONFIG} />
        <span className="text-gray-400 tabular-nums">
          {m.updated_at ? fmtRelative(m.updated_at) : '-'}
        </span>
        <span className="text-gray-400 text-right">→</span>
      </div>
    ))}
</div>
```

注意：grid 新增第 5 列（商机名标签），原来 4 列 `'1.5fr 0.8fr 0.7fr 0.5fr'` → 5 列 `'1.5fr 0.8fr 0.7fr 0.5fr 0.3fr'`。

- [ ] **Step 4: 分页器 pageSize 改为常量**

将第 150-152 行的分页器：
```tsx
<div className="flex-shrink-0 border-t border-gray-100">
  <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
</div>
```
pageSize 保持使用传入的 prop（调用方 WorkbenchTab 将改为传 `PAGE_SIZE`）。

- [ ] **Step 5: 清理未使用的 import**

删除 `useState` import（不再需要 collapsedGroups）。
确认 `useMemo` 已删除。

- [ ] **Step 6: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS

- [ ] **Step 7: 提交**

```bash
git add components/batch-publish/workbench/PendingOverviewPanel.tsx
git commit -m "refactor: flatten PendingOverviewPanel — remove groupByOpportunity, add readonly opportunity label"
```

---

### Task 8: MaterialWorkspace — 透传 materialPage + PAGE_SIZE 常量

**Files:**
- Modify: `components/batch-publish/workbench/MaterialWorkspace.tsx`

- [ ] **Step 1: 接口新增 materialPage prop**

`MaterialWorkspaceProps` 接口（第 14-32 行）新增：
```ts
interface MaterialWorkspaceProps {
  // ... 现有 props ...
  onBackToOverview: () => void
  materialPage: number     // 新增
}
```

函数签名解构新增：
```ts
export function MaterialWorkspace({
  // ... 现有解构 ...
  onBackToOverview,
  materialPage,            // 新增
}: MaterialWorkspaceProps) {
```

- [ ] **Step 2: MaterialRow 调用处传入 materialPage**

在第 129-136 行的 `MaterialRow` 渲染处新增 `materialPage` prop：
```tsx
{materials.map((m) => (
  <MaterialRow
    key={m.id}
    materialId={m.id}
    isSelected={selectedMaterialIds.has(m.id)}
    onToggleSelect={onToggleSelect}
    onOpenSheet={onOpenEditor}
    selectedOid={selectedOid}
    materialPage={materialPage}   // 新增
  />
))}
```

- [ ] **Step 3: Pagination pageSize 使用 PAGE_SIZE 常量**

文件顶部新增 import：
```ts
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
```

将第 155 行：
```tsx
<Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
```
改为：
```tsx
<Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={onPageChange} />
```

- [ ] **Step 4: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS

- [ ] **Step 5: 提交**

```bash
git add components/batch-publish/workbench/MaterialWorkspace.tsx
git commit -m "fix: pass materialPage to MaterialRow, use PAGE_SIZE constant for pagination"
```

---

### Task 9: WorkbenchTab — toggle + 移动端双视图 + 删除胶囊条

**Files:**
- Modify: `components/batch-publish/workbench/WorkbenchTab.tsx`

这是集成点——依赖所有前置 Task 完成。

- [ ] **Step 1: handleSelectOid 增加 toggle**

在第 39-44 行 `handleSelectOid` 中增加 toggle 逻辑：

```tsx
const handleSelectOid = useCallback((oid: number) => {
  if (oid === page.selectedOid) {
    // 点击已选中的商机 → 取消选中
    handleBackToOverview()
    return
  }
  const params = new URLSearchParams(searchParams.toString())
  params.set('tab', 'workbench')
  params.set('oid', String(oid))
  router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
}, [router, searchParams, page.selectedOid])
```

> 注意：`handleBackToOverview` 在 closure 中引用了 `handleSelectOid`（间接），而 `handleSelectOid` 现在依赖 `page.selectedOid`。不存在循环依赖——`handleBackToOverview` 只操作 URL，不调用 `handleSelectOid`。

- [ ] **Step 2: 左侧面板 + 右侧面板透传 materialPage**

PC 端右侧面板（第 113-145 行）的 `MaterialWorkspace` 调用新增 `materialPage` prop：

在 `MaterialWorkspace` 的 props 中新增：
```tsx
<MaterialWorkspace
  // ... 现有 props ...
  onBackToOverview={handleBackToOverview}
  materialPage={page.materialPage}   // 新增
/>
```

右侧 `PendingOverviewPanel` 的 `pageSize` prop 改为 `PAGE_SIZE`（从 constants 导入）：

文件顶部新增 import：
```ts
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
```

将第 140 行的 `pageSize={50}` 改为 `pageSize={PAGE_SIZE}`：
```tsx
<PendingOverviewPanel
  // ... 其他 props ...
  pageSize={PAGE_SIZE}   // 改前 50
  onPageChange={page.setOverviewPage}
  onSelectMaterial={handleSelectFromOverview}
/>
```

- [ ] **Step 3: 移动端 — 完全重写为双视图切换**

将第 148-283 行的整个移动端 return 块替换为以下内容：

```tsx
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
                />
              ) : (
                <div className="h-full overflow-y-auto">
                  {leftPanel}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 选中商机：Push 工作区 */}
        {!!page.selectedOid && (
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={handleBackToOverview}
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
                materialPage={page.materialPage}
              />
            </div>
          </div>
        )}

        {/* Sheet 编辑器 + 批量创建弹窗（同 PC 端） */}
        <MaterialEditSheet
          materialId={page.editingMaterialId}
          selectedOid={page.selectedOid}
          open={page.editingMaterialId !== null}
          onClose={page.closeEditor}
        />
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

- [ ] **Step 4: 清理未使用的 import**

确认不再需要 `useEffect`（如果只用于之前的 mobileView 同步逻辑）。
删除 `useRouter`/`useSearchParams` 如果不再需要（需要——handleSelectOid 和 handleBackToOverview 仍然使用它们）。

- [ ] **Step 5: 验证编译**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit 2>&1 | head -20
```
预期：PASS（零错误）

- [ ] **Step 6: 提交**

```bash
git add components/batch-publish/workbench/WorkbenchTab.tsx
git commit -m "feat: add toggle deselect, mobile dual-view toggle replacing pill strip, fix pagination wiring"
```

---

### Task 10: 全局 TypeScript 检查 + 构建验证

**Files:**
- 无新建/修改

- [ ] **Step 1: 全量 TypeScript 检查**

```bash
cd E:/.project/autofish_freetime/frontend && npx tsc --noEmit
```
预期：PASS，零错误

- [ ] **Step 2: 生产构建**

```bash
cd E:/.project/autofish_freetime/frontend && npm run build 2>&1 | tail -20
```
预期：构建成功

- [ ] **Step 3: 提交（如有 lint 修复）**

```bash
git add -A
git commit -m "chore: typecheck and build verification pass"
```

---

## 自审

1. **Spec 覆盖**: 设计文档 §2.1-§2.7 共 6 项修复全部有对应 Task。
2. **无占位符**: 所有代码步骤都包含完整实现。
3. **类型一致性**: `materialPage` 从 useWorkbenchPage → useWorkbenchData → MaterialWorkspace → MaterialRow 全链路类型一致（`number`）；`PAGE_SIZE` 从 constants 导出，MaterialWorkspace 和 WorkbenchTab 导入使用；`MobileView` 类型在 useWorkbenchPage 和 WorkbenchTab 中一致。
