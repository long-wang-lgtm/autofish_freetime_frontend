# 商品管理页 & 关键词规则页 — 通用逻辑提取设计

> 日期：2026-06-18 | 状态：待审批

## 一、背景与问题

### 1.1 当前状态

经过上一轮重构，`components/items/` 已完成组件分层（`config.ts` / `parts/` / `views/` / `drawers/` / `FilterBar.tsx`），但存在三个遗留问题：

| 问题 | 说明 |
|------|------|
| **死代码** | `parts/SortIcon.tsx`（16行）和 `parts/RefreshButton.tsx`（59行）零引用 |
| **过度拆分** | `parts/useSendCodeEdit.ts`（47行）仅 `SendCodeEditor.tsx` 使用，强行拆成两个文件 |
| **计算逻辑未提取** | `page.tsx` 466 行，其中 ~140 行是状态/查询/计算逻辑；且与 `rules/page.tsx` 存在大量重叠 |

### 1.2 两个页面的重叠分析

| 重叠项 | items/page.tsx | rules/page.tsx | 是否相同 |
|--------|---------------|----------------|----------|
| `useQuery({ queryKey: ["keywords"] })` | 第 72-75 行 | 第 14-18 行 | ✅ 完全相同（同一 cache key） |
| `refetchInterval` | 30000 | 30000 | ✅ |
| `rulesStats` 计算（total/enabled/disabled/linkedItems/linkedGroups） | 第 91-100 行 | 第 20-26 行 | ✅ 逻辑完全相同 |
| `itemKeywordCounts` 计算 | 第 78-88 行 | — | items 页独有 |
| `RuleForm` 渲染模式（showCreateForm + editingRule） | 第 448-455 行 | 第 128-142 行 | ✅ 模式相同 |
| 统计卡片 JSX | 第 340-361 行（tab 内） | 第 38-58 行（独立页） | ⚠️ UI 相同但语义不同 |

**核心结论**：`useQuery(["keywords"], listKeywordRules)` 是最明确的共享单元 — 同一 cache key、同一 refetch 间隔、同一计算逻辑。

---

## 二、设计方案

### 2.1 新增文件

```
hooks/
├── useKeywords.ts              新 — 关键词数据查询 + 通用计算
└── useItemsPage.ts             新 — items 页面完整业务逻辑
```

### 2.2 删除/合并文件

| 操作 | 文件 | 原因 |
|------|------|------|
| 🗑️ 删除 | `components/items/parts/SortIcon.tsx` | 零引用 |
| 🗑️ 删除 | `components/items/parts/RefreshButton.tsx` | 零引用 |
| 🔀 合并 | `parts/useSendCodeEdit.ts` → `parts/SendCodeEditor.tsx` | 单消费者，同文件可读性更好 |

### 2.3 修改文件

| 文件 | 修改 |
|------|------|
| `app/dashboard/items/page.tsx` | 用 `useItemsPage()` + `useKeywords()` 替换内联逻辑，~280 行纯渲染 |
| `app/dashboard/rules/page.tsx` | 用 `useKeywords()` 替换内联 query + stats 计算 |
| `components/items/parts/SendCodeEditor.tsx` | 内联 `useSendCodeEdit` 逻辑 |

---

## 三、逐模块详设

### 3.1 `hooks/useKeywords.ts`

**职责**：封装关键词规则的数据查询和通用计算。两个消费者（items 页、rules 页）通过 React Query 共享同一份缓存数据。

```ts
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

**消费者使用方式**：

```
// items/page.tsx — 两个字段都用到
const { rules, isLoading: keywordsLoading, error: keywordsError, stats: rulesStats, itemKeywordCounts } = useKeywords()

// rules/page.tsx — 只用 stats
const { rules, isLoading, error, stats } = useKeywords()
```

**注意**：`itemKeywordCounts` 在 rules 页不会用到，但它的计算开销极小（O(rules × linked_items) 且 rules 数量通常 < 100），不需要条件跳过。如果未来 rules 数量变大，可以加 `enabled` 参数控制。

### 3.2 `hooks/useItemsPage.ts`

**职责**：封装 items 页面的全部业务逻辑（状态 + 查询 + 变更 + 计算），page.tsx 变为纯 JSX 渲染层。

```ts
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

**handleSort 逻辑说明**：原实现是三步位切换（null → field+asc → field+desc → null）。提取为 hook 时确保逻辑不变。

### 3.3 `app/dashboard/items/page.tsx`（修改后，~300 行）

只保留 JSX 渲染，所有逻辑通过 `useItemsPage()` 获取：

```tsx
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
    filters, setFilters, searchInput, setSearchInput,
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
      {/* ———— Tab 栏 ———— */}
      <TabBar
        tabs={[
          { key: "items", label: "商品管理" },
          { key: "rules", label: "回复规则" },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as "items" | "rules")}
        variant="overline"
      />

      <p className="text-sm text-gray-500 -mt-3">
        {activeTab === "items"
          ? "可配置功能：自动发货、发货配置、自动上架、自动回复规则绑定、AI回复、AI提示词"
          : "可配置功能：自动回复关键词规则，匹配买家消息并自动发送预设回复"}
      </p>

      {/* ———— 商品管理 tab ———— */}
      {activeTab === "items" && (
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
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
          {/* ...（FilterBar desktop + 表格/卡片列表 + 状态渲染 — 完整 JSX 在实施计划中展开） ... */}
        </div>
      )}

      {/* ———— 关键词规则 tab ———— */}
      {activeTab === "rules" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* 统计卡片 */}
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
            {/* 5 格统计 — 内联渲染，语义不同不提取组件 */}
          </div>
          {/* 操作栏 + 规则列表 + 空状态 — 完整 JSX 在实施计划中展开 */}
        </div>
      )}

      {/* ———— 抽屉/弹窗 ———— */}
      {editingItem && <ItemEditDrawer item={editingItem} open={!!editingItem} onClose={() => setEditingItem(null)} onSuccess={() => setEditingItem(null)} />}
      {keywordItem && <KeywordDrawer item={keywordItem} open={!!keywordItem} onClose={() => setKeywordItem(null)} />}
      {mobileConfig && <ConfigDrawer open={!!mobileConfig} item={mobileConfig.item} field={mobileConfig.field} onClose={() => setMobileConfig(null)} onSave={(gid, field, value) => { updateMutation.mutate({ gid, data: { [field]: value } }); setMobileConfig(null) }} />}
      {showCreateForm && <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />}
      {editingRule && <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />}
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

### 3.4 `app/dashboard/rules/page.tsx`（修改后，~100 行）

```tsx
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
      {isLoading && <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">加载规则列表失败: {String(error)}</div>}
      {!isLoading && !error && rules.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          {/* ... empty state ... */}
        </div>
      )}
      {!isLoading && !error && rules.length > 0 && <RuleTable rules={rules} onEdit={setEditingRule} />}

      {showCreateForm && <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />}
      {editingRule && <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />}
    </div>
  )
}
```

### 3.5 `parts/SendCodeEditor.tsx` — 合并 useSendCodeEdit

将 hook 逻辑内联到组件文件中：

```tsx
// 文件开头：hook 作为模块私有函数，不导出
function useSendCodeEdit(gid, sendCode, onUpdateField) { /* 原 useSendCodeEdit.ts 内容 */ }

// 文件后半：SendCodeEditor 组件，调用 useSendCodeEdit
export function SendCodeEditor({ gid, sendCode, variant, onUpdateField, hasValue }) { /* 不变 */ }
```

---

## 四、消费者映射

```
useKeywords() ──┬── items/page.tsx  →  items tab (stats + itemKeywordCounts)
                │                      rules tab (stats + itemKeywordCounts 中的 keywordCount)
                │
                └── rules/page.tsx  →  全局规则管理 (stats)
```

---

## 五、效果对比

| 指标 | 当前 | 设计后 |
|------|------|--------|
| `items/page.tsx` | 466 行 | ~280 行 |
| `rules/page.tsx` | 145 行 | ~100 行 |
| 重复 `useQuery(["keywords"])` | 2 处 | **0** 处（hook 内聚） |
| 重复 `rulesStats` 计算 | 2 处 | **0** 处 |
| 死代码文件 | 2 个 | **0** 个 |
| `useSendCodeEdit` 文件 | 独立 47 行 | 内联到 SendCodeEditor |

---

## 六、约束

1. **不碰 rules tab 的 JSX 渲染** — 统计卡片、规则列表、空状态保持内联
2. **不碰 RuleForm / RuleTable** — 已是共享组件，无需修改
3. **不碰 drawers / views / FilterBar / config.ts** — 上一轮重构产物，稳定
4. **`itemKeywordCounts` 计算保留** — 虽然 rules 页不用，但开销极小且语义属于 useKeywords
5. **`handleSort` 逻辑必须等價** — 三步位切换行为一致
6. **严禁动态路由**

---

## 七、执行顺序

| 步骤 | 操作 | 风险 |
|------|------|------|
| 1 | 新建 `hooks/useKeywords.ts` | 无 |
| 2 | 新建 `hooks/useItemsPage.ts` | 无 |
| 3 | 删除 `parts/SortIcon.tsx`、`parts/RefreshButton.tsx` | 无（零引用） |
| 4 | 合并 `useSendCodeEdit.ts` → `SendCodeEditor.tsx`，删原文件 | 低 |
| 5 | 重写 `items/page.tsx` 使用 `useItemsPage()` | 中 |
| 6 | 重写 `rules/page.tsx` 使用 `useKeywords()` | 低 |
| 7 | `npx tsc --noEmit` 最终验证 | — |

---

## 八、自检

- [x] 无 TBD / TODO
- [x] hook 接口完整（入参、返回值类型已定义）
- [x] 消费者代码示例清晰（每个页面如何使用 hook）
- [x] handleSort 逻辑标注了等價性
- [x] 死代码清理有明确依据（零引用 grep 结果）
