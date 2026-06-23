# 商品管理 — 分页与排序前端适配 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 前端对接后端 items/list 的分页+排序参数，新增 stats 接口调用，重构 FilterBar 排序 UI（桌面 Pill 组 + 移动横向滑动），去掉表头排序改为底部分页器。

**Architecture:** 按依赖顺序自底向上改 5 个文件：API 层 → Hook 层 → FilterBar → ItemsTab → page.tsx。stats 与列表查询解耦为独立 useQuery，排序从客户端 useMemo 移至服务端，分页用传统页码导航。

**Tech Stack:** Next.js + React + TypeScript + @tanstack/react-query + Tailwind CSS v3

---

### Task 1: API 层 — 新增类型、常量、getItemStats，扩展 ItemFilters 和 listItems

**Files:**
- Modify: `lib/api/items.ts`

- [ ] **Step 1: 在 ItemFilters 接口新增分页和排序字段**

在 `lib/api/items.ts` 第 67-72 行，修改 `ItemFilters` 接口：

```typescript
export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
  page?: number
  page_size?: number
  order_by?: string
  asc?: boolean
}
```

- [ ] **Step 2: 在 Item 接口之后、listItems 之前插入 ITEM_SORT_FIELDS 常量和 ItemStats 类型**

在 `lib/api/items.ts` 第 36 行（`}` 闭合 `Item` 接口后）和第 38 行（`ItemGroup` 之前）之间插入：

```typescript
/** 后端 SORTABLE_FIELDS 映射 */
export const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "price",        label: "价格" },
  { key: "lookCount",    label: "浏览" },
  { key: "wantCount",    label: "想要" },
  { key: "collectCount", label: "收藏" },
  { key: "publishTime",  label: "发布时间" },
  { key: "deliveryType", label: "发货方式" },
] as const

/** 商品统计响应 — GET /api/items/stats */
export interface ItemStats {
  status: Record<number, number>
  deliveryEmpty: number
  receiptEmpty: number
  reviewEmpty: number
}
```

- [ ] **Step 3: 修改 listItems 函数，追加分页和排序参数**

在 `lib/api/items.ts` 第 74-83 行，替换 `listItems` 函数：

```typescript
export async function listItems(filters?: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams()
  if (filters?.uid) params.append("uid", filters.uid)
  if (filters?.status !== undefined) params.append("status", String(filters.status))
  if (filters?.title) params.append("title", filters.title)
  if (filters?.gid) params.append("gid", filters.gid)
  if (filters?.page) params.append("page", String(filters.page))
  if (filters?.page_size) params.append("page_size", String(filters.page_size))
  if (filters?.order_by) params.append("order_by", filters.order_by)
  if (filters?.asc !== undefined) params.append("asc", String(filters.asc))

  const query = params.toString()
  return fetchApi<Item[]>(`/api/items/list${query ? `?${query}` : ""}`)
}
```

- [ ] **Step 4: 在文件末尾新增 getItemStats 函数**

在 `lib/api/items.ts` 文件末尾（第 104 行之后）追加：

```typescript
export async function getItemStats(uid?: string, status?: number): Promise<ItemStats> {
  const params = new URLSearchParams()
  if (uid) params.append("uid", uid)
  if (status !== undefined) params.append("status", String(status))
  const query = params.toString()
  return fetchApi<ItemStats>(`/api/items/stats${query ? `?${query}` : ""}`)
}
```

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

预期：无新增错误。

- [ ] **Step 6: 提交**

```bash
git add lib/api/items.ts
git commit -m "feat: ItemFilters 扩展分页/排序字段，新增 ITEM_SORT_FIELDS、ItemStats、getItemStats

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Hook 层 — 重构 useItemsPage（分页状态、stats 查询、服务端排序）

**Files:**
- Modify: `hooks/useItemsPage.ts`

- [ ] **Step 1: 替换 import，新增 getItemStats 和 ITEM_SORT_FIELDS 的导入**

修改 `hooks/useItemsPage.ts` 第 5 行：

```typescript
import { listItems, Item, ItemFilters, updateItem, refreshItems, getItemStats, ITEM_SORT_FIELDS } from "@/lib/api/items"
```

同时删除第 6 行的 `getAccountNames` 导入中不需要的部分（`getAccountNames` 保留不变）。

- [ ] **Step 2: 替换 sortField/sortDirection 为 orderBy/asc，新增 page/pageSize 状态**

替换 `hooks/useItemsPage.ts` 第 20-22 行：

```typescript
  const [orderBy, setOrderBy] = useState<string | null>(null)
  const [asc, setAsc] = useState<boolean>(false)
  const [page, setPage] = useState(1)
  const pageSize = 20
```

删除原第 20-21 行的 `sortField`、`sortDirection` 声明。

- [ ] **Step 3: 修改 items 查询，加入分页和排序参数，移除 refetchInterval**

替换 `hooks/useItemsPage.ts` 第 41-45 行：

```typescript
  const { data, isLoading, error } = useQuery({
    queryKey: ["items", filters, page, pageSize, orderBy, asc],
    queryFn: () => listItems({ ...filters, page, page_size: pageSize, order_by: orderBy ?? undefined, asc }),
  })
```

- [ ] **Step 4: 新增 stats 查询**

在 items 查询之后（第 45 行之后）插入：

```typescript
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["itemStats", filters.uid, filters.status],
    queryFn: () => getItemStats(filters.uid, filters.status),
  })
```

- [ ] **Step 5: 修改 updateMutation.onSuccess，增加失效 stats 缓存**

修改 `hooks/useItemsPage.ts` 第 53 行：

```typescript
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      queryClient.invalidateQueries({ queryKey: ["itemStats"] })
    },
```

- [ ] **Step 6: 替换 handleSort 为 3 态循环（desc→asc→清除）**

替换 `hooks/useItemsPage.ts` 第 70-74 行：

```typescript
  const handleSort = (fieldKey: string) => {
    if (orderBy === fieldKey) {
      if (asc === false) {
        setAsc(true)
      } else {
        setOrderBy(null)
      }
    } else {
      setOrderBy(fieldKey)
      setAsc(false)
    }
    setPage(1)
  }
```

- [ ] **Step 7: 新增 filters 变更时重置页码的 useEffect**

在 `handleSort` 之后（第 74 行之后）插入：

```typescript
  useEffect(() => {
    setPage(1)
  }, [filters.uid, filters.status, filters.title, filters.gid])
```

需要确保 `useEffect` 已被导入。检查第 3 行已有 `import { useState, useCallback, useMemo, useEffect } from "react"`，确认包含 `useEffect`。

- [ ] **Step 8: 修改 handleRefresh，增加失效 stats 缓存**

修改 `hooks/useItemsPage.ts` 第 81 行：

```typescript
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["items"] })
        queryClient.invalidateQueries({ queryKey: ["itemStats"] })
      }
```

- [ ] **Step 9: 替换派生数据 — 删除 sortedItems useMemo，改为 stats 派生**

删除 `hooks/useItemsPage.ts` 第 89-102 行的 `sortedItems` useMemo 块。替换第 104-109 行的 `stats` useMemo：

```typescript
  const totalItems = statsData ? Object.values(statsData.status).reduce((a, b) => a + b, 0) : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const stats = useMemo(() => ({
    total: totalItems,
    onSale: statsData?.status[0] || 0,
    offSale: statsData?.status[-2] || 0,
    sold: statsData?.status[1] || 0,
  }), [statsData, totalItems])
```

- [ ] **Step 10: 替换返回值 — 删除 sortedItems/sortField/sortDirection，新增 orderBy/asc/page 等**

替换 `hooks/useItemsPage.ts` 第 111-137 行的 return 语句：

```typescript
  return {
    // 状态
    filters, setFilters,
    searchInput, setSearchInput,
    orderBy, asc,
    page, pageSize, totalPages, setPage, totalItems,
    isRefreshing,
    // 查询结果
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    // 关键词数据
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    // 派生数据
    stats,
    statsLoading,
    // 处理器
    updateMutation,
    handleToggle,
    handleClearFilters,
    handleSort,
    handleRefresh,
    // 工具
    isMobile,
  }
```

- [ ] **Step 11: TypeScript 检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：无新增错误（page.tsx 中引用 `sortField`/`sortedItems` 等旧字段会报错，这是预期的，后续 Task 修复）。

- [ ] **Step 12: 提交**

```bash
git add hooks/useItemsPage.ts
git commit -m "refactor: useItemsPage 改为服务端分页+排序，新增 stats 查询

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: FilterBar — 桌面端 Pill 组 + 移动端横向滑动排序栏

**Files:**
- Modify: `components/items/FilterBar.tsx`

- [ ] **Step 1: 替换 FilterBarProps 中的 sort 相关 props**

修改 `components/items/FilterBar.tsx` 第 22-24 行：

```typescript
  orderBy: string | null
  asc: boolean
  onSortChange: (fieldKey: string) => void
```

删除原第 22-24 行的 `sortField`、`sortDirection`、`onSortChange` 声明。

- [ ] **Step 2: 导入 ITEM_SORT_FIELDS**

在 `components/items/FilterBar.tsx` 第 7 行之后插入：

```typescript
import { ITEM_SORT_FIELDS } from "@/lib/api/items"
```

- [ ] **Step 3: 重构 SortChip 组件参数**

修改 `components/items/FilterBar.tsx` 第 334-346 行的 `SortChip` 函数：

```typescript
function SortChip({
  label,
  field,
  orderBy,
  asc,
  onClick,
}: {
  label: string
  field: string
  orderBy: string | null
  asc: boolean
  onClick: () => void
}) {
  const isActive = orderBy === field
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700 font-medium"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}
      <span className="text-[10px]">
        {isActive ? (asc ? "↑" : "↓") : "↕"}
      </span>
    </button>
  )
}
```

- [ ] **Step 4: 桌面端 FilterBarDesktop — 在新 props 下增加排序 Pill 行**

在 `FilterBarDesktop` 函数中，筛选行（`<div className="flex items-end gap-3 flex-wrap">` 闭合 `</div>` 之后）与整个组件返回的 `</div>` 之前，插入排序 Pill 行。即修改函数参数名为新 props，并在第 140 行之前插入：

先修改 `FilterBarDesktop` 函数签名（第 38-48 行），解构新 props：

```typescript
function FilterBarDesktop({
  accounts,
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClear,
  isRefreshing,
  selectedUid,
  orderBy,
  asc,
  onSortChange,
}: FilterBarProps) {
```

然后在筛选行 `</div>`（第 140 行，清空按钮所在的 flex 容器结束标签）之后、`</div>`（第 141 行）之前插入：

```tsx
        {/* 排序 Pill 组 */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-xs text-gray-400 shrink-0">排序</span>
          {ITEM_SORT_FIELDS.map((f) => (
            <SortChip
              key={f.key}
              label={f.label}
              field={f.key}
              orderBy={orderBy}
              asc={asc}
              onClick={() => onSortChange(f.key)}
            />
          ))}
        </div>
```

注意：需将第 141 行 `</div>` 移到排序 Pill 行之后，确保排序行和外层容器同级。

- [ ] **Step 5: 移动端 FilterBarMobile — 替换统计条右侧 3 个 SortChip 为横向滑动排序栏**

修改 `FilterBarMobile` 函数签名（第 146-160 行）以解构新 props（已由 FilterBarProps 统一变更，无需额外改参数）。

删除第 250-272 行统计条右侧的 3 个硬编码 SortChip 及其包裹的 `<div className="ml-auto flex items-center gap-1">`，替换为：

在 `{/* 统计条 + 排序 */}` 那个 `<div>` 之后（即统计条 `</div>` 第 248 行之后），`{/* 展开的筛选面板 */}` 之前，插入横向滑动排序栏：

```tsx
      {/* 排序滑动栏 */}
      <div
        className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto whitespace-nowrap"
        style={{ scrollbarWidth: "none" }}
      >
        {ITEM_SORT_FIELDS.map((f) => (
          <SortChip
            key={f.key}
            label={f.label}
            field={f.key}
            orderBy={orderBy}
            asc={asc}
            onClick={() => onSortChange(f.key)}
          />
        ))}
      </div>
```

同时在文件顶部或使用全局 CSS 添加隐藏 webkit 滚动条的样式。最简单的方式是在这个 `<div>` 上增加一个 className 来实现。因为 Tailwind 不支持伪元素，需要在组件的 style 标签或全局 CSS 中处理。建议在容器 div 上同时加 `[&::-webkit-scrollbar]:hidden`（Tailwind v3 arbitrary variant）：

```tsx
      <div className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
```

- [ ] **Step 6: TypeScript 检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：page.tsx 中引用旧字段报错（后续修复），FilterBar 自身无新增错误。

- [ ] **Step 7: 提交**

```bash
git add components/items/FilterBar.tsx
git commit -m "refactor: FilterBar 桌面 Pill 组 + 移动端横向滑动排序栏，SortChip 参数扩展

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: ItemsTab — 表头去箭头，底部分页器

**Files:**
- Modify: `components/items/ItemsTab.tsx`

- [ ] **Step 1: 替换 ItemsTabProps 中的 sort 相关 props，新增分页 props**

修改 `components/items/ItemsTab.tsx` 第 15-36 行：

```typescript
interface ItemsTabProps {
  isMobile: boolean
  accountsData: AccountName[] | undefined
  searchInput: { uid: string; title: string; gid: string }
  filters: { status?: number; uid?: string }
  stats: { total: number; onSale: number; offSale: number; sold: number }
  orderBy: string | null
  asc: boolean
  page: number
  totalPages: number
  totalItems: number
  isRefreshing: boolean
  onSearchChange: (updater: (prev: { uid: string; title: string; gid: string }) => { uid: string; title: string; gid: string }) => void
  onStatusChange: (status: number | undefined) => void
  onRefresh: () => void
  onClearFilters: () => void
  onSortChange: (field: string) => void
  onPageChange: (page: number) => void
  data: Item[] | undefined
  itemKeywordCounts: Record<string, number>
  isLoading: boolean
  error: unknown
  onToggle: (item: Item, field: string) => void
  updateMutation: { mutate: (args: { gid: string; data: Record<string, unknown> }) => void }
}
```

- [ ] **Step 2: 更新 ItemsTab 函数参数解构**

修改 `components/items/ItemsTab.tsx` 第 38-59 行，替换 `sortedItems` 为 `data`（直接用），新增分页 props：

```typescript
export function ItemsTab({
  isMobile,
  accountsData,
  searchInput,
  filters,
  stats,
  orderBy,
  asc,
  page,
  totalPages,
  totalItems,
  isRefreshing,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClearFilters,
  onSortChange,
  onPageChange,
  data,
  itemKeywordCounts,
  isLoading,
  error,
  onToggle,
  updateMutation,
}: ItemsTabProps) {
```

- [ ] **Step 3: 更新 FilterBar 调用 — 新 props**

修改 `components/items/ItemsTab.tsx` 第 68-82 行的 `<FilterBar ... />`：

```tsx
        <FilterBar
          accounts={accountsData || []}
          searchInput={searchInput}
          statusFilter={filters.status}
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
          onRefresh={onRefresh}
          onClear={onClearFilters}
          isRefreshing={isRefreshing}
          selectedUid={filters.uid}
          stats={stats}
          orderBy={orderBy}
          asc={asc}
          onSortChange={onSortChange}
        />
```

- [ ] **Step 4: 表头 — 将 3 个可点击排序按钮改为纯文本 span**

替换 `components/items/ItemsTab.tsx` 第 112-137 行的 3 个表头按钮：

**商品信息（第 112-118 行）：**
```tsx
                <div className="col-span-2">
                  <span>商品信息</span>
                </div>
```

**价格（第 120-127 行）：**
```tsx
                <div className="col-span-1 text-right">
                  <span>价格</span>
                </div>
```

**发布时间（第 129-137 行）：**
```tsx
                <div className="col-span-1 text-center">
                  <span>发布时间</span>
                </div>
```

- [ ] **Step 5: 数据渲染 — sortedItems 改为 data**

修改 `components/items/ItemsTab.tsx` 第 151 行：

```tsx
              {data.map((item, index) => (
```

同时修改第 169 行移动端卡片：

```tsx
              {data.map((item) => (
```

- [ ] **Step 6: 新增列表区 ref 用于翻页时滚动到顶部**

在 ItemsTab 函数体内，第 60 行（drawer 状态之后）插入：

```typescript
  const listRef = useRef<HTMLDivElement>(null)
```

确保 `useRef` 已在 React import 中（检查第 3 行 `import { useState } from "react"` → 改为 `import { useState, useRef } from "react"`）。

将桌面端和移动端的滚动容器加上 `ref={listRef}`：

桌面上（第 105 行）：
```tsx
            <div ref={listRef} className="flex-1 overflow-auto hidden md:block" style={{ minHeight: "200px" }}>
```

移动端（第 168 行）：
```tsx
            <div ref={listRef} className="flex-1 overflow-auto md:hidden px-1 pb-2 space-y-2.5" style={{ minHeight: "200px" }}>
```

- [ ] **Step 7: 翻页时滚动到顶部**

在 ItemsTab 函数体内，useRef 之后插入：

```typescript
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])
```

确保 `useEffect` 已在 React import 中（第 3 行需包含）。

- [ ] **Step 8: 底部分页器**

在数据区闭合 `</div>` 之后（桌面端表格和移动端卡片列表的父容器之外），抽屉区之前，插入分页器：

```tsx
        {/* 分页器 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className={`text-sm px-3 py-1.5 rounded-md ${
                page <= 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-blue-600 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              ← 上一页
            </button>
            <span className="text-sm text-gray-500">
              共 {totalItems} 件，{page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className={`text-sm px-3 py-1.5 rounded-md ${
                page >= totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-blue-600 hover:bg-blue-50 cursor-pointer"
              }`}
            >
              下一页 →
            </button>
          </div>
        )}
```

注意：这个分页器需要放在数据区 DOM 之后但在整个 Fragment 之内。具体位置：在桌面端和移动端列表的闭合之后（第 183 行 `</>` 之前）。

- [ ] **Step 9: TypeScript 检查**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

预期：page.tsx 中引用旧字段报错（后续修复），ItemsTab 自身无新增错误。

- [ ] **Step 10: 提交**

```bash
git add components/items/ItemsTab.tsx
git commit -m "refactor: ItemsTab 表头去排序箭头，新增底部分页器与翻页滚动

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: page.tsx — 解构适配新 hook 返回值，传新 props

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 1: 更新解构，删旧字段加新字段**

修改 `app/dashboard/items/page.tsx` 第 10-30 行：

```typescript
function ItemsPageContent() {
  const {
    filters, setFilters,
    searchInput, setSearchInput,
    orderBy, asc,
    page, pageSize, totalPages, setPage, totalItems,
    isRefreshing,
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    stats,
    statsLoading,
    updateMutation,
    handleToggle,
    handleClearFilters,
    handleSort,
    handleRefresh,
    isMobile,
  } = useItemsPage()
```

- [ ] **Step 2: 更新 ItemsTab 传参**

修改 `app/dashboard/items/page.tsx` 第 54-77 行：

```tsx
      {activeTab === "items" && (
        <ItemsTab
          isMobile={isMobile}
          accountsData={accountsData}
          searchInput={searchInput}
          filters={filters}
          stats={stats}
          orderBy={orderBy}
          asc={asc}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          isRefreshing={isRefreshing}
          onSearchChange={setSearchInput}
          onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          onRefresh={handleRefresh}
          onClearFilters={handleClearFilters}
          onSortChange={handleSort}
          onPageChange={setPage}
          data={data}
          itemKeywordCounts={itemKeywordCounts}
          isLoading={isLoading}
          error={error}
          onToggle={(item, field) => handleToggle(item, field as "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock")}
          updateMutation={updateMutation}
        />
      )}
```

- [ ] **Step 3: TypeScript 检查 — 应无错误**

```bash
npx tsc --noEmit --pretty 2>&1
```

预期：无任何错误。

- [ ] **Step 4: 提交**

```bash
git add app/dashboard/items/page.tsx
git commit -m "refactor: page.tsx 适配 hook 新返回值，传递分页与排序 props

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 全量 TypeScript 检查**

```bash
npx tsc --noEmit --pretty 2>&1
```

预期输出为空（无错误）。

- [ ] **Step 2: 构建检查**

```bash
npx next build 2>&1 | tail -20
```

预期：构建成功。

- [ ] **Step 3: 提交最终验证**

```bash
git add -A
git commit -m "chore: 最终 TypeScript + 构建验证通过

Co-Authored-By: Claude <noreply@anthropic.com>"
```
