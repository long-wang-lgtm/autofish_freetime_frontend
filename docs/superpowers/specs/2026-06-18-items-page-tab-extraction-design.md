# 商品管理页 Tab 内容提取设计文档

**日期**: 2026-06-18  
**状态**: 待审批  

---

## 背景

`app/dashboard/items/page.tsx` 当前 344 行，虽然业务逻辑已通过 `useItemsPage` hook 抽离，但两个 tab 的全部 JSX（商品管理 tab ~170 行 + 回复规则 tab ~70 行）仍挤在同一个文件中。

同时存在两个遗留问题：

1. **死代码路由** — `app/dashboard/rules/page.tsx`（85 行）是独立的规则管理页面，但实际从未使用，其功能已通过 items page 的 rules tab 提供
2. **重复布局** — items tab 和 rules tab 各自内联了容器、加载态、错误态、空态等相似 JSX，但写法略有差异

## 目标

- `page.tsx` 缩减到 ~50 行，只做 tab 切换 + 抽屉调度
- tab 内容分别移到 `components/items/ItemsTab.tsx` 和 `components/items/RulesTab.tsx`
- 删除无用路由 `app/dashboard/rules/`
- 统一两个 tab 中相似的 UI 模式（统计卡片、加载/错误/空态写法）

## 设计方案

### 组件层级

```
page.tsx (~50行)                          # 薄壳：TabBar + 描述 + tab 切换 + 抽屉
├── <TabBar />                            # 已有 — 一级 tab 导航
├── {items && <ItemsTab />}               # 新建 — 商品管理 tab
├── {rules && <RulesTab />}               # 新建 — 回复规则 tab
├── <ItemEditDrawer />                    # 已有 — 编辑商品抽屉
├── <KeywordDrawer />                     # 已有 — 关键词回复抽屉
├── <ConfigDrawer />                      # 已有 — 配置编辑抽屉
└── <RuleForm /> ×2                       # 已有 — 创建/编辑规则弹窗
```

### page.tsx 精简后的形态

```tsx
"use client"
import { Suspense } from "react"
import { useTabRouting } from "@/hooks/useTabRouting"
import { TabBar } from "@/components/ui/Tab"
import { ItemsTab } from "@/components/items/ItemsTab"
import { RulesTab } from "@/components/items/RulesTab"
import { RuleForm } from "@/components/rules/RuleForm"
import { ConfigDrawer, ItemEditDrawer, KeywordDrawer } from "@/components/items/drawers"
import { useItemsPage } from "@/hooks/useItemsPage"

function ItemsPageContent() {
  const { ... } = useItemsPage()
  const [activeTab, setActiveTab] = useTabRouting(['items', 'rules'] as const, 'items')

  return (
    <div className="flex flex-col min-h-0 h-full space-y-5">
      <TabBar ... />
      <p className="text-sm text-gray-500 -mt-3">...</p>

      {activeTab === "items" && <ItemsTab {...itemsProps} />}
      {activeTab === "rules" && <RulesTab {...rulesProps} />}

      {/* 抽屉 + 弹窗 */}
      {editingItem && <ItemEditDrawer ... />}
      {keywordItem && <KeywordDrawer ... />}
      {mobileConfig && <ConfigDrawer ... />}
      {showCreateForm && <RuleForm ... />}
      {editingRule && <RuleForm rule={editingRule} ... />}
    </div>
  )
}

export default function ItemsPage() {
  return <Suspense fallback={...}><ItemsPageContent /></Suspense>
}
```

## 逐组件详设

### ItemsTab (`components/items/ItemsTab.tsx`)

**职责**：商品管理 tab 的全部 UI，包含桌面端筛选栏、移动端筛选栏、加载/错误/空状态、桌面表格、移动端卡片列表。

**Props**（从 useItemsPage 解构传入）：

| 分类 | 字段 | 类型 |
|------|------|------|
| 筛选 | `accountsData`, `filters`, `searchInput`, `stats`, `sortField`, `sortDirection` | — |
| 筛选回调 | `onSearchChange`, `onStatusChange`, `onRefresh`, `onClearFilters`, `onSortChange` | — |
| 数据 | `data`, `sortedItems`, `itemKeywordCounts` | — |
| 状态 | `isLoading`, `error`, `isRefreshing`, `isMobile` | — |
| 操作 | `handleToggle`, `updateMutation`, `setEditingItem`, `setKeywordItem`, `setMobileConfig` | — |

**内部结构**：

```
<div className="flex-1 min-h-0 flex flex-col space-y-4">
  {/* 移动端筛选栏 */}
  {isMobile && <FilterBar ... />}

  <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
    {/* 桌面端筛选栏 */}
    <div className="hidden md:block"><FilterBar ... /></div>

    {/* 加载态 */}
    {isLoading && <LoadingSpinner />}

    {/* 错误态 */}
    {error && <ErrorBanner message={error} />}

    {/* 空态 */}
    {empty && <EmptyPlaceholder ... />}

    {/* 桌面表格 */}
    <div className="flex-1 overflow-auto hidden md:block">
      <TableHeader ... />
      {sortedItems.map(item => <ItemRow ... />)}
    </div>

    {/* 移动端卡片 */}
    <div className="flex-1 overflow-auto md:hidden">
      {sortedItems.map(item => <MobileProductCard ... />)}
    </div>
  </div>
</div>
```

**不变**：ItemRow、MobileProductCard、FilterBar、表头结构均保持不变，仅从 page.tsx 搬移。

### RulesTab (`components/items/RulesTab.tsx`)

**职责**：回复规则 tab 的全部 UI，包含统计卡片、操作栏、加载/错误/空状态、规则表格。

**Props**（从 useItemsPage 解构传入）：

| 分类 | 字段 | 类型 |
|------|------|------|
| 数据 | `keywordRules`, `rulesStats` | `KeywordRule[]`, `KeywordStats` |
| 状态 | `keywordsLoading`, `keywordsError` | — |
| 操作 | `setShowCreateForm`, `setEditingRule` | — |

**设计要点**：
- 采用 `rules/page.tsx` 中已有的 `STAT_CARDS` 数组映射模式，替代当前 `items/page.tsx` rules tab 中内联的 5 个重复卡片 div
- 统一空状态：和当前 items page rules tab 一致，空态内包含"创建规则"按钮

**内部结构**：

```
<div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
  {/* 统计卡片 */}
  <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
    {STAT_CARDS.map(...)}
  </div>

  {/* 操作栏 */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
    <CountText />
    <CreateButton />
  </div>

  {/* 加载态 */}
  {keywordsLoading && <LoadingSpinner />}

  {/* 错误态 */}
  {keywordsError && <ErrorBanner message={keywordsError} />}

  {/* 空态 */}
  {empty && <EmptyPlaceholder withCreateButton />}

  {/* 规则表格 */}
  {hasData && <RuleTable rules={keywordRules} onEdit={setEditingRule} />}
</div>
```

### 删除项

| 路径 | 原因 |
|------|------|
| `app/dashboard/rules/page.tsx` | 死代码，功能已在 items page rules tab 提供 |
| `app/dashboard/rules/` 目录 | 删除整个路由目录 |

### 不动项

以下文件和模块本次不修改：

- `hooks/useItemsPage.ts` — 已在上一轮重构中抽离，接口保持不变
- `hooks/useKeywords.ts` — 共享数据层，不变
- `hooks/useTabRouting.ts` — 工具 hook，不变
- `components/items/FilterBar.tsx` — 不变
- `components/items/drawers/*` — 三个抽屉组件不变
- `components/items/parts/*` — 不变
- `components/items/views/*` — ItemRow/MobileProductCard 不变
- `components/rules/RuleTable.tsx` — 不变
- `components/rules/RuleForm.tsx` — 不变
- `components/items/config.ts` — 不变

## 效果对比

| 指标 | 改前 | 改后 |
|------|------|------|
| page.tsx 行数 | 344 | ~50 |
| ItemsTab.tsx | 不存在 | ~180 (从 page.tsx 搬出) |
| RulesTab.tsx | 不存在 | ~100 (含 STAT_CARDS 优化) |
| 死代码 | rules/page.tsx (85行) | 0 |
| 总文件数 | 1 页面文件 | 1 页面 + 2 组件 |

## 执行顺序

1. 新建 `components/items/ItemsTab.tsx` — 搬移 items tab JSX
2. 新建 `components/items/RulesTab.tsx` — 搬移 rules tab JSX，采用 STAT_CARDS 模式
3. 重写 `app/dashboard/items/page.tsx` — 简化为薄壳
4. 删除 `app/dashboard/rules/page.tsx` + 目录
5. `npx tsc --noEmit` 验证零错误
6. 检查 `grep -r "rules/page"` 确保无残留引用

## 约束

- 不修改任何业务逻辑，纯 JSX 搬运
- 不修改 useItemsPage 的接口
- 不新增任何 UI 组件到 `components/ui/`
- 不改变现有视觉效果
