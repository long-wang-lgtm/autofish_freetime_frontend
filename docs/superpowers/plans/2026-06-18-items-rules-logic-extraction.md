# 商品管理 & 关键词规则页 — 通用逻辑提取实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 items/page.tsx（466 行）和 rules/page.tsx（145 行）中的重复 `useQuery(["keywords"])` + `rulesStats` 计算逻辑提取到共享 hook `useKeywords`，同时将 items 页面业务逻辑提取到 `useItemsPage`，清理死代码，合并过度拆分的 hook。

**Architecture:** 两层 hook 架构 — `useKeywords` 封装关键词数据查询和通用计算（两个页面共享 React Query 缓存），`useItemsPage` 封装 items 页全部业务逻辑（状态 + 查询 + 变更 + 计算）。page.tsx 降为纯 JSX 渲染层。

**Tech Stack:** Next.js + React + TanStack React Query + TypeScript

**关联设计文档:** `docs/superpowers/specs/2026-06-18-items-rules-logic-extraction-design.md`

---

## 文件变更总览

| 操作 | 文件 |
|------|------|
| ➕ 新建 | `hooks/useKeywords.ts` |
| ➕ 新建 | `hooks/useItemsPage.ts` |
| 🗑️ 删除 | `components/items/parts/SortIcon.tsx` |
| 🗑️ 删除 | `components/items/parts/RefreshButton.tsx` |
| ✏️ 修改 | `components/items/parts/SendCodeEditor.tsx` |
| 🗑️ 删除 | `components/items/parts/useSendCodeEdit.ts` |
| ✏️ 重写 | `app/dashboard/items/page.tsx` |
| ✏️ 重写 | `app/dashboard/rules/page.tsx` |

---

### Task 1: 新建 `hooks/useKeywords.ts`

**Files:**
- Create: `hooks/useKeywords.ts`

- [ ] **Step 1.1: 创建 useKeywords hook 文件**

```typescript
// hooks/useKeywords.ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { listKeywordRules } from "@/lib/api/keywords"

export interface KeywordStats {
  total: number
  enabled: number
  disabled: number
  linkedItems: number
  linkedGroups: number
}

export function useKeywords() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["keywords"],
    queryFn: listKeywordRules,
    refetchInterval: 30000,
  })

  const rules = data?.rules ?? []

  const stats = useMemo<KeywordStats>(() => ({
    total: rules.length,
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
    linkedItems: rules.reduce((sum, r) => sum + r.linked_items, 0),
    linkedGroups: rules.reduce((sum, r) => sum + r.linked_groups, 0),
  }), [rules])

  const itemKeywordCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const rule of rules) {
      for (const item of rule.linked_item_list) {
        counts[item.item_id] = (counts[item.item_id] || 0) + 1
      }
    }
    return counts
  }, [rules])

  return { rules, isLoading, error, stats, itemKeywordCounts }
}
```

- [ ] **Step 1.2: 验证 tsc 编译通过**

```bash
npx tsc --noEmit hooks/useKeywords.ts
```

Expected: 无错误（可能需要 `--skipLibCheck` 如果全局类型有问题）

---

### Task 2: 新建 `hooks/useItemsPage.ts`

**Files:**
- Create: `hooks/useItemsPage.ts`

- [ ] **Step 2.1: 创建 useItemsPage hook 文件**

```typescript
// hooks/useItemsPage.ts
"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listItems, Item, ItemFilters, updateItem, refreshItems } from "@/lib/api/items"
import { getAccountNames } from "@/lib/api/accounts"
import { useToast } from "@/components/ui/toaster"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsMobile } from "@/hooks/useIsMobile"
import { useKeywords } from "@/hooks/useKeywords"
import type { ConfigField } from "@/components/items/config"
import type { KeywordRule } from "@/lib/api/keywords"

export function useItemsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()

  // ——— 状态 ———
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [keywordItem, setKeywordItem] = useState<Item | null>(null)
  const [mobileConfig, setMobileConfig] = useState<{ item: Item; field: ConfigField } | null>(null)
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filters, setFilters] = useState<ItemFilters>({ status: 0 })
  const [searchInput, setSearchInput] = useState({ uid: "", title: "", gid: "" })
  const [sortField, setSortField] = useState<"title" | "price" | "publishTime" | "status" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ——— 查询 ———
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountNames,
  })

  const debouncedFilters = useDebounce(searchInput, 400)

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      uid: debouncedFilters.uid || undefined,
      title: debouncedFilters.title || undefined,
      gid: debouncedFilters.gid || undefined,
    }))
  }, [debouncedFilters])

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => listItems(filters),
    refetchInterval: 30000,
  })

  const { isLoading: keywordsLoading, error: keywordsError, stats: rulesStats, itemKeywordCounts } = useKeywords()

  // ——— 变更 ———
  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Parameters<typeof updateItem>[1] }) =>
      updateItem(gid, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }) },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  // ——— 处理器 ———
  const handleToggle = useCallback((item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => {
    updateMutation.mutate({ gid: item.gid, data: { [field]: !item[field] } })
  }, [updateMutation])

  const handleClearFilters = useCallback(() => {
    setSearchInput({ uid: "", title: "", gid: "" })
    setFilters({ status: 0 })
  }, [])

  // 注意：不包裹 useCallback — handler 内部直接读取最新 state，避免闭包陷阱
  const handleSort = (field: "title" | "price" | "publishTime" | "status") => {
    if (sortField !== field) { setSortField(field); setSortDirection("asc") }
    else if (sortDirection === "asc") { setSortDirection("desc") }
    else { setSortField(null); setSortDirection(null) }
  }

  const handleRefresh = useCallback(async () => {
    if (!filters.uid) { addToast({ title: "刷新失败", description: "请先选择账号", variant: "error" }); return }
    setIsRefreshing(true)
    try {
      const result = await refreshItems(filters.uid)
      if (result.success) { queryClient.invalidateQueries({ queryKey: ["items"] }) }
      else { addToast({ title: "刷新失败", description: result.message, variant: "error" }) }
    } catch (e) {
      addToast({ title: "刷新失败", description: e instanceof Error ? e.message : "刷新失败", variant: "error" })
    } finally { setIsRefreshing(false) }
  }, [filters.uid, queryClient, addToast])

  // ——— 派生数据 ———
  const sortedItems = useMemo(() => {
    if (!sortField || !sortDirection || !data) return data || []
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]
      if (sortField === "publishTime") { aVal = aVal ? Number(aVal) : 0; bVal = bVal ? Number(bVal) : 0 }
      else if (sortField === "price") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0 }
      else if (sortField === "status") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0 }
      else { aVal = String(aVal || ""); bVal = String(bVal || "") }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [data, sortField, sortDirection])

  const stats = useMemo(() => ({
    total: data?.length || 0,
    onSale: data?.filter(i => i.status === 0).length || 0,
    offSale: data?.filter(i => i.status === 1).length || 0,
    sold: data?.filter(i => i.status === -2).length || 0,
  }), [data])

  return {
    // 状态
    editingItem, setEditingItem,
    keywordItem, setKeywordItem,
    mobileConfig, setMobileConfig,
    editingRule, setEditingRule,
    showCreateForm, setShowCreateForm,
    filters, setFilters,
    searchInput, setSearchInput,
    sortField, sortDirection,
    isRefreshing,
    // 查询结果
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    // 派生数据
    rulesStats,
    itemKeywordCounts,
    sortedItems,
    stats,
    // 处理器
    updateMutation,
    handleToggle,
    handleClearFilters,
    handleSort,
    handleRefresh,
    // 工具
    isMobile,
  }
}
```

- [ ] **Step 2.2: 验证 tsc 编译通过**

```bash
npx tsc --noEmit
```

Expected: 无新增错误（`hooks/useItemsPage.ts` 和 `hooks/useKeywords.ts` 相关）

---

### Task 3: 删除死代码文件

**Files:**
- Delete: `components/items/parts/SortIcon.tsx`
- Delete: `components/items/parts/RefreshButton.tsx`

- [ ] **Step 3.1: 确认零引用后删除**

```bash
# 确认 SortIcon 无其他文件引用
grep -r "from.*parts/SortIcon" --include="*.ts" --include="*.tsx" . || echo "零引用，安全删除"

# 确认 RefreshButton 无其他文件引用
grep -r "from.*parts/RefreshButton" --include="*.ts" --include="*.tsx" . || echo "零引用，安全删除"
```

Expected: 两个 grep 都输出 "零引用，安全删除"

- [ ] **Step 3.2: 删除死代码文件**

```bash
rm components/items/parts/SortIcon.tsx
rm components/items/parts/RefreshButton.tsx
```

- [ ] **Step 3.3: 验证 tsc 编译通过**

```bash
npx tsc --noEmit
```

Expected: 无错误（删除的文件没有被引用）

---

### Task 4: 合并 `useSendCodeEdit.ts` 到 `SendCodeEditor.tsx`

**Files:**
- Modify: `components/items/parts/SendCodeEditor.tsx`
- Delete: `components/items/parts/useSendCodeEdit.ts`

- [ ] **Step 4.1: 将 hook 内联到 SendCodeEditor.tsx**

将 `useSendCodeEdit` 函数内联为模块私有函数，放在文件顶部 export 之前，然后删除 `import { useSendCodeEdit } from "./useSendCodeEdit"`。

修改后的 `SendCodeEditor.tsx`：

```typescript
// components/items/parts/SendCodeEditor.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"

// ——— 模块私有 hook（从 useSendCodeEdit.ts 内联合并） ———
function useSendCodeEdit(
  gid: string,
  sendCode: string | null,
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim()
    const current = sendCode || ""
    if (trimmed !== current) {
      onUpdateField(gid, "sendCode", trimmed)
    }
    setEditing(false)
  }, [editValue, sendCode, gid, onUpdateField])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave()
      } else if (e.key === "Escape") {
        setEditing(false)
      }
    },
    [handleSave]
  )

  const startEdit = useCallback(() => {
    setEditValue(sendCode || "")
    setEditing(true)
  }, [sendCode])

  return { editing, editValue, setEditValue, inputRef, handleSave, handleKeyDown, startEdit }
}

// ——— SendCodeEditor 组件（不变） ———
interface SendCodeEditorProps {
  gid: string
  sendCode: string | null
  variant: "cell" | "row"
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
  hasValue?: boolean
}

export function SendCodeEditor({
  gid,
  sendCode,
  variant,
  onUpdateField,
  hasValue: propHasValue,
}: SendCodeEditorProps) {
  const { editing, editValue, setEditValue, inputRef, handleSave, handleKeyDown, startEdit } =
    useSendCodeEdit(gid, sendCode, onUpdateField)

  const actualHasValue = propHasValue ?? !!(sendCode && sendCode.trim().length > 0)

  if (editing) {
    if (variant === "cell") {
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full text-center text-xs px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )
    }
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-gray-600">⌨️ 指令码</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-16 text-center text-xs px-1.5 py-1 border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    )
  }

  if (variant === "cell") {
    const hasValue = sendCode && sendCode.trim().length > 0
    return (
      <button
        onClick={startEdit}
        className={`w-full text-xs text-center hover:underline ${
          hasValue ? "text-gray-700" : "text-gray-400"
        }`}
        title="此配置仅作为买家时生效"
      >
        {hasValue ? sendCode.trim() : "-"}
      </button>
    )
  }
  return (
    <button
      onClick={startEdit}
      title="指令码 — 仅买家时生效"
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
    >
      <span className={actualHasValue ? "text-gray-600" : "text-gray-400"}>⌨️ 指令码</span>
      <span className="flex items-center gap-1">
        <span
          className={`text-xs max-w-[100px] truncate ${
            actualHasValue ? "text-gray-700 font-mono" : "text-gray-400"
          }`}
        >
          {actualHasValue ? (sendCode || "").trim() : "未配置"}
        </span>
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}
```

- [ ] **Step 4.2: 删除 useSendCodeEdit.ts**

```bash
rm components/items/parts/useSendCodeEdit.ts
```

- [ ] **Step 4.3: 确认无其他文件引用 useSendCodeEdit.ts**

```bash
grep -r "from.*useSendCodeEdit" --include="*.ts" --include="*.tsx" . || echo "零引用，安全删除"
```

Expected: 输出 "零引用，安全删除"

- [ ] **Step 4.4: 验证 tsc 编译通过**

```bash
npx tsc --noEmit
```

Expected: 无错误

---

### Task 5: 重写 `app/dashboard/items/page.tsx`

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 5.1: 用 useItemsPage() 替换内联逻辑**

将整个文件替换为以下内容：

```typescript
// app/dashboard/items/page.tsx
"use client"

import { Suspense } from "react"
import { useTabRouting } from "@/hooks/useTabRouting"
import { TabBar } from "@/components/ui/Tab"
import { RuleTable } from "@/components/rules/RuleTable"
import { RuleForm } from "@/components/rules/RuleForm"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { FilterBar } from "@/components/items/FilterBar"
import { ItemRow } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/KeywordDrawer"
import { useItemsPage } from "@/hooks/useItemsPage"

function ItemsPageContent() {
  const {
    editingItem, setEditingItem,
    keywordItem, setKeywordItem,
    mobileConfig, setMobileConfig,
    editingRule, setEditingRule,
    showCreateForm, setShowCreateForm,
    filters, setFilters,
    searchInput, setSearchInput,
    sortField, sortDirection,
    isRefreshing,
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    rulesStats,
    itemKeywordCounts,
    sortedItems,
    stats,
    updateMutation,
    handleToggle,
    handleClearFilters,
    handleSort,
    handleRefresh,
    isMobile,
  } = useItemsPage()

  const [activeTab, setActiveTab] = useTabRouting(['items', 'rules'] as const, 'items')

  return (
    <div className="flex flex-col min-h-0 h-full space-y-5">
      {/* Tab 栏 */}
      <TabBar
        tabs={[
          { key: "items", label: "商品管理" },
          { key: "rules", label: "回复规则" },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as "items" | "rules")}
        variant="overline"
      />

      {/* Tab 描述 */}
      <p className="text-sm text-gray-500 -mt-3">
        {activeTab === "items"
          ? "可配置功能：自动发货、发货配置、自动上架、自动回复规则绑定、AI回复、AI提示词"
          : "可配置功能：自动回复关键词规则，匹配买家消息并自动发送预设回复"}
      </p>

      {/* 商品管理 tab */}
      {activeTab === "items" && (
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* 移动端筛选栏 */}
          {isMobile && (
            <FilterBar
              accounts={accountsData || []}
              searchInput={searchInput}
              statusFilter={filters.status}
              onSearchChange={setSearchInput}
              onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
              onRefresh={handleRefresh}
              onClear={handleClearFilters}
              isRefreshing={isRefreshing}
              selectedUid={filters.uid}
              stats={stats}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSort}
            />
          )}

          <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* 桌面端搜索表单 */}
            <div className="hidden md:block">
              <FilterBar
                accounts={accountsData || []}
                searchInput={searchInput}
                statusFilter={filters.status}
                onSearchChange={setSearchInput}
                onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
                onRefresh={handleRefresh}
                onClear={handleClearFilters}
                isRefreshing={isRefreshing}
                selectedUid={filters.uid}
                stats={stats}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSort}
              />
            </div>

            {/* 加载/错误/空状态 */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
                加载商品列表失败: {String(error)}
              </div>
            )}
            {!isLoading && !error && data && data.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center m-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">暂无商品</h3>
                <p className="text-sm text-gray-500">没有找到符合条件的商品</p>
              </div>
            )}

            {!isLoading && !error && data && data.length > 0 && (
              <>
                {/* === 桌面端表格 === */}
                <div className="flex-1 overflow-auto hidden md:block" style={{ minHeight: "200px" }}>
                  {/* 表头 */}
                  <div
                    className="sticky top-0 z-10 grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600"
                    style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
                  >
                    <div className="col-span-2">
                      <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => handleSort("title")}>
                        商品信息
                        {sortField === "title"
                          ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-gray-300">↕</span>
                        }
                      </button>
                    </div>
                    <div className="col-span-1 text-right">
                      <button className="flex items-center gap-1 ml-auto hover:text-blue-600" onClick={() => handleSort("price")}>
                        价格
                        {sortField === "price"
                          ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-gray-300">↕</span>
                        }
                      </button>
                    </div>
                    <div className="col-span-1 text-center">
                      <button className="flex items-center gap-1 mx-auto hover:text-blue-600" onClick={() => handleSort("publishTime")}>
                        发布时间
                        {sortField === "publishTime"
                          ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                          : <span className="text-gray-300">↕</span>
                        }
                      </button>
                    </div>
                    <div className="col-span-1 text-center">数据</div>
                    <div className="col-span-1 text-center">AI回复</div>
                    <div className="col-span-1 text-center">自动发货</div>
                    <div className="col-span-1 text-center">付款后发货</div>
                    <div className="col-span-1 text-center">收货后赠送</div>
                    <div className="col-span-1 text-center">评价后赠送</div>
                    <div className="col-span-1 text-center">关键词回复</div>
                    <div className="col-span-1 text-center">AI提示词</div>
                    <div className="col-span-1 text-center">自动上架</div>
                    <div className="col-span-1 text-center">指令码</div>
                  </div>

                  {/* 内容区域 */}
                  {sortedItems.map((item, index) => (
                    <ItemRow
                      key={item.gid}
                      item={item}
                      isEven={index % 2 === 0}
                      onToggle={handleToggle}
                      onEdit={() => setEditingItem(item)}
                      onKeywordClick={() => setKeywordItem(item)}
                      keywordCount={itemKeywordCounts[item.gid] || 0}
                      onUpdateField={(gid, field, value) =>
                        updateMutation.mutate({ gid, data: { [field]: value } })
                      }
                    />
                  ))}
                </div>

                {/* === 移动端卡片列表 === */}
                <div className="flex-1 overflow-auto md:hidden px-1 pb-2 space-y-2.5" style={{ minHeight: "200px" }}>
                  {sortedItems.map((item) => (
                    <MobileProductCard
                      key={item.gid}
                      item={item}
                      keywordCount={itemKeywordCounts[item.gid] || 0}
                      onToggle={handleToggle}
                      onEdit={() => setEditingItem(item)}
                      onKeywordClick={() => setKeywordItem(item)}
                      onConfigClick={(field) => setMobileConfig({ item, field })}
                      onSendCodeChange={(gid, value) =>
                        updateMutation.mutate({ gid, data: { sendCode: value } })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 关键词规则 tab */}
      {activeTab === "rules" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* 统计信息 */}
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{rulesStats.total}</div>
              <div className="text-xs text-gray-500">规则总数</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{rulesStats.enabled}</div>
              <div className="text-xs text-gray-500">已启用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-600">{rulesStats.disabled}</div>
              <div className="text-xs text-gray-500">已禁用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{rulesStats.linkedItems}</div>
              <div className="text-xs text-gray-500">关联商品</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{rulesStats.linkedGroups}</div>
              <div className="text-xs text-gray-500">关联商品组</div>
            </div>
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500">
              {rulesStats.total === 0
                ? "暂无规则"
                : `共 ${rulesStats.total} 条规则，按优先级降序排列`}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建规则
            </button>
          </div>

          {/* 规则列表 / 空状态 */}
          {keywordsLoading && (
            <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
          )}
          {keywordsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
              加载规则列表失败: {String(keywordsError)}
            </div>
          )}
          {!keywordsLoading && !keywordsError && rulesStats.total === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
              <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                创建规则
              </button>
            </div>
          )}
          {!keywordsLoading && !keywordsError && rulesStats.total > 0 && (
            <RuleTable
              className="border-0 rounded-none shadow-none"
              rules={[]}
              onEdit={setEditingRule}
            />
          )}
        </div>
      )}

      {/* 编辑商品 — 响应式抽屉 */}
      {editingItem && (
        <ItemEditDrawer
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复 — 响应式抽屉 */}
      {keywordItem && (
        <KeywordDrawer
          item={keywordItem}
          open={!!keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}

      {/* 配置编辑 — 响应式抽屉 */}
      {mobileConfig && (
        <ConfigDrawer
          open={!!mobileConfig}
          item={mobileConfig.item}
          field={mobileConfig.field}
          onClose={() => setMobileConfig(null)}
          onSave={(gid, field, value) => {
            updateMutation.mutate({ gid, data: { [field]: value } })
            setMobileConfig(null)
          }}
        />
      )}

      {/* 创建规则表单 */}
      {showCreateForm && (
        <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />
      )}
      {/* 编辑规则表单 */}
      {editingRule && (
        <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />
      )}
    </div>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <ItemsPageContent />
    </Suspense>
  )
}
```

- [ ] **Step 5.2: 验证 tsc 编译通过**

```bash
npx tsc --noEmit
```

Expected: 无错误

---

### Task 6: 重写 `app/dashboard/rules/page.tsx`

**Files:**
- Modify: `app/dashboard/rules/page.tsx`

- [ ] **Step 6.1: 用 useKeywords() 替换内联 query + stats**

将整个文件替换为以下内容：

```typescript
// app/dashboard/rules/page.tsx
"use client"

import { useState } from "react"
import { useKeywords } from "@/hooks/useKeywords"
import type { KeywordRule } from "@/lib/api/keywords"
import { RuleForm } from "@/components/rules/RuleForm"
import { RuleTable } from "@/components/rules/RuleTable"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const STAT_CARDS = [
  { key: "total", label: "规则总数",   color: "text-gray-900" },
  { key: "enabled", label: "已启用",   color: "text-green-600" },
  { key: "disabled", label: "已禁用",  color: "text-gray-600" },
  { key: "linkedItems", label: "关联商品", color: "text-blue-600" },
  { key: "linkedGroups", label: "关联商品组", color: "text-purple-600" },
] as const

export default function RulesPage() {
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { rules, isLoading, error, stats } = useKeywords()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">关键词规则</h1>
        <p className="text-sm text-gray-500 mt-1">管理自动回复关键词规则，匹配买家消息并自动发送预设回复</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-5 gap-3">
        {STAT_CARDS.map(({ key, label, color }) => (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className={`text-2xl font-bold ${color}`}>{stats[key]}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {rules.length === 0 ? "暂无规则" : `共 ${rules.length} 条规则，按优先级降序排列`}
        </div>
        <button onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建规则
        </button>
      </div>

      {/* 规则列表 / 加载 / 错误 / 空 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          加载规则列表失败: {String(error)}
        </div>
      )}
      {!isLoading && !error && rules.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
          <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
          <button onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
            创建规则
          </button>
        </div>
      )}
      {!isLoading && !error && rules.length > 0 && (
        <RuleTable rules={rules} onEdit={setEditingRule} />
      )}

      {showCreateForm && <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />}
      {editingRule && <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />}
    </div>
  )
}
```

- [ ] **Step 6.2: 验证 tsc 编译通过**

```bash
npx tsc --noEmit
```

Expected: 无错误

---

### Task 7: 最终验证与清理

- [ ] **Step 7.1: 完整 tsc 类型检查**

```bash
npx tsc --noEmit
```

Expected: 零错误

- [ ] **Step 7.2: 确认最终文件结构**

```bash
echo "=== 新建文件 ===" && ls -la hooks/useKeywords.ts hooks/useItemsPage.ts && echo "" && echo "=== 已删除文件（应不存在）===" && ls components/items/parts/SortIcon.tsx 2>&1 && ls components/items/parts/RefreshButton.tsx 2>&1 && ls components/items/parts/useSendCodeEdit.ts 2>&1 && echo "" && echo "=== 行数统计 ===" && wc -l hooks/useKeywords.ts hooks/useItemsPage.ts app/dashboard/items/page.tsx app/dashboard/rules/page.tsx components/items/parts/SendCodeEditor.tsx
```

Expected:
- 新建文件存在
- 3 个删除文件 "No such file or directory"
- items/page.tsx 约 280 行（从 466 减少）
- rules/page.tsx 约 100 行（从 145 减少）

- [ ] **Step 7.3: Commit**

```bash
git add hooks/useKeywords.ts hooks/useItemsPage.ts
git add components/items/parts/SendCodeEditor.tsx
git rm components/items/parts/useSendCodeEdit.ts
git rm components/items/parts/SortIcon.tsx
git rm components/items/parts/RefreshButton.tsx
git add app/dashboard/items/page.tsx app/dashboard/rules/page.tsx
git commit -m "refactor: extract useKeywords & useItemsPage hooks, remove dead code

- 新建 hooks/useKeywords.ts — 封装关键词查询+stats+itemKeywordCounts
- 新建 hooks/useItemsPage.ts — 封装 items 页全部业务逻辑
- 删除 SortIcon.tsx / RefreshButton.tsx（零引用死代码）
- 合并 useSendCodeEdit.ts → SendCodeEditor.tsx（单消费者内联）
- 重写 items/page.tsx（466→~280行，纯渲染）
- 重写 rules/page.tsx（145→~100行，共享 useKeywords 缓存）

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 自检

**1. Spec coverage:**
- ✅ useKeywords hook — Task 1
- ✅ useItemsPage hook — Task 2
- ✅ 删除死代码（SortIcon, RefreshButton） — Task 3
- ✅ 合并 useSendCodeEdit — Task 4
- ✅ 重写 items/page.tsx — Task 5
- ✅ 重写 rules/page.tsx — Task 6
- ✅ tsc 验证 — Tasks 1-7 各有验证步骤
- ✅ 约束遵守：不碰 rules tab JSX、不碰 RuleForm/RuleTable、不碰 drawers/views/FilterBar、handleSort 逻辑等价、无动态路由

**2. Placeholder scan:** 无 TBD/TODO/占位符

**3. Type consistency:** 所有类型名在 hook 定义和消费者中一致
