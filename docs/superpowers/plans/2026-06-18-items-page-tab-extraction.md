# 商品管理页 Tab 提取 & 规则表单统一 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract two tab contents from 344-line `items/page.tsx` into separate components, enhance Sheet/BottomSheet with dismiss-prevention, delete dead `rules/` route, then unify keyword rule editing into shared `KeywordRuleForm` component with drawer-based UI.

**Architecture:** Two-phase approach. Phase 1 (Tasks 1-6): Pure JSX extraction — no logic changes, tsc verification after each task. Phase 2 (Tasks 7-13): Extract `KeywordRuleForm` and `RuleBindingPanel` from duplicated form logic in `KeywordDrawer` and `RuleForm`, convert `RuleForm` modal to `RuleDrawer` drawer, delete old `RuleForm.tsx`.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v3, react-hook-form + zod

**Source directory:** `E:\.project\autofish_freetime\frontend`

---

## Phase 1: Tab Extraction + Sheet Enhancement

### Task 1: Add `closeOnBackdrop` prop to Sheet and BottomSheet

**Files:**
- Modify: `components/ui/Sheet.tsx`

- [ ] **Step 1: Add `closeOnBackdrop` to SheetProps and Sheet component**

In `components/ui/Sheet.tsx`, update the `SheetProps` interface and `Sheet` function:

```typescript
interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: string
  children: ReactNode
  /** 点击遮罩是否关闭抽屉。默认 true。false 时只能通过 onClose 回调退出 */
  closeOnBackdrop?: boolean
}

export function Sheet({ open, onClose, title, width = "500px", children, closeOnBackdrop = true }: SheetProps) {
  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* 侧栏面板 — 右侧滑入 */}
      <div
        className={`fixed right-0 top-0 h-full bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width }}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 — 可滚动 */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add `closeOnBackdrop` to BottomSheetProps and BottomSheet component**

In the same file, update `BottomSheetProps` and `BottomSheet`:

```typescript
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  /** 底部操作按钮区 */
  footer?: ReactNode
  /** 高度占屏幕比例，默认 0.9 (90%) */
  heightRatio?: number
  /** 点击遮罩是否关闭抽屉。默认 true。false 时拖拽手柄不渲染、下拉手势禁用 */
  closeOnBackdrop?: boolean
}

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  heightRatio = 0.9,
  closeOnBackdrop = true,
}: BottomSheetProps) {
  const startY = useRef(0)
  const currentY = useRef(0)

  // 阻止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // 下拉关闭手势（仅在 closeOnBackdrop 时启用）
  const maybeTouchHandlers = closeOnBackdrop
    ? {
        onTouchStart: (e: React.TouchEvent) => { startY.current = e.touches[0].clientY },
        onTouchMove: (e: React.TouchEvent) => { currentY.current = e.touches[0].clientY },
        onTouchEnd: () => { if (currentY.current - startY.current > 80) onClose() },
      }
    : {}

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* 底部面板 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: `${heightRatio * 100}vh` }}
        {...maybeTouchHandlers}
      >
        {/* 拖拽手柄 — closeOnBackdrop=false 时不渲染 */}
        {closeOnBackdrop && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* 标题栏 */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex-1 min-w-0 mr-4">
              {title && (
                <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 — 可滚动 */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* 底部操作区 */}
        {footer && (
          <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0">{footer}</div>
        )}
      </div>
    </>
  )
}
```

Note: Remove the old `handleTouchStart`/`handleTouchMove`/`handleTouchEnd` functions. The inline handlers on the div are replaced by `maybeTouchHandlers`.

- [ ] **Step 3: Verify with TypeScript**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors. Backward compatible — all existing consumers still compile because `closeOnBackdrop` defaults to `true`.

- [ ] **Step 4: Commit**

```bash
git add components/ui/Sheet.tsx
git commit -m "feat(Sheet): add closeOnBackdrop prop for dismiss prevention

- Sheet: backdrop onClick respects closeOnBackdrop (default true)
- BottomSheet: backdrop, drag handle, and touch gestures respect closeOnBackdrop
- closeOnBackdrop=false: drag handle not rendered, touch gestures disabled
- Fully backward compatible (default true)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Create ItemsTab component

**Files:**
- Create: `components/items/ItemsTab.tsx`
- Read (reference): `app/dashboard/items/page.tsx:66-211`

- [ ] **Step 1: Create `components/items/ItemsTab.tsx`**

Copy the items tab JSX from page.tsx lines 66-211 into a new component:

```typescript
"use client"

import { type UseMutationResult } from "@tanstack/react-query"
import { FilterBar } from "@/components/items/FilterBar"
import { ItemRow } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Reuse types from hooks — adjust imports as needed for your project
interface ItemsTabProps {
  // Filter data
  isMobile: boolean
  accountsData: unknown[] | undefined
  searchInput: string
  filters: { status: string; uid: string }
  stats: { total: number; onShelf: number; offShelf: number }
  sortField: string | null
  sortDirection: "asc" | "desc"
  isRefreshing: boolean

  // Filter callbacks
  onSearchChange: (value: string) => void
  onStatusChange: (status: string) => void
  onRefresh: () => void
  onClearFilters: () => void
  onSortChange: (field: string) => void

  // Data
  data: unknown[] | undefined
  sortedItems: unknown[]
  itemKeywordCounts: Record<string, number>

  // States
  isLoading: boolean
  error: unknown

  // Actions
  onToggle: (gid: string, field: string) => void
  updateMutation: UseMutationResult<unknown, Error, { gid: string; data: Record<string, unknown> }>
  onEdit: (item: unknown) => void
  onKeywordClick: (item: unknown) => void
  onConfigClick: (config: { item: unknown; field: string }) => void
  onSendCodeChange: (gid: string, value: string) => void
}

export function ItemsTab({
  isMobile,
  accountsData,
  searchInput,
  filters,
  stats,
  sortField,
  sortDirection,
  isRefreshing,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClearFilters,
  onSortChange,
  data,
  sortedItems,
  itemKeywordCounts,
  isLoading,
  error,
  onToggle,
  updateMutation,
  onEdit,
  onKeywordClick,
  onConfigClick,
  onSendCodeChange,
}: ItemsTabProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4">
      {/* 移动端筛选栏 */}
      {isMobile && (
        <FilterBar
          accounts={accountsData || []}
          searchInput={searchInput}
          statusFilter={filters.status}
          onSearchChange={onSearchChange}
          onStatusChange={(status) => onStatusChange(status)}
          onRefresh={onRefresh}
          onClear={onClearFilters}
          isRefreshing={isRefreshing}
          selectedUid={filters.uid}
          stats={stats}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />
      )}

      <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* 桌面端搜索表单 */}
        <div className="hidden md:block">
          <FilterBar
            accounts={accountsData || []}
            searchInput={searchInput}
            statusFilter={filters.status}
            onSearchChange={onSearchChange}
            onStatusChange={(status) => onStatusChange(status)}
            onRefresh={onRefresh}
            onClear={onClearFilters}
            isRefreshing={isRefreshing}
            selectedUid={filters.uid}
            stats={stats}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
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
                  <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => onSortChange("title")}>
                    商品信息
                    {sortField === "title"
                      ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      : <span className="text-gray-300">↕</span>
                    }
                  </button>
                </div>
                <div className="col-span-1 text-right">
                  <button className="flex items-center gap-1 ml-auto hover:text-blue-600" onClick={() => onSortChange("price")}>
                    价格
                    {sortField === "price"
                      ? <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      : <span className="text-gray-300">↕</span>
                    }
                  </button>
                </div>
                <div className="col-span-1 text-center">
                  <button className="flex items-center gap-1 mx-auto hover:text-blue-600" onClick={() => onSortChange("publishTime")}>
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
              {sortedItems.map((item: any, index: number) => (
                <ItemRow
                  key={item.gid}
                  item={item}
                  isEven={index % 2 === 0}
                  onToggle={onToggle}
                  onEdit={() => onEdit(item)}
                  onKeywordClick={() => onKeywordClick(item)}
                  keywordCount={itemKeywordCounts[item.gid] || 0}
                  onUpdateField={(gid: string, field: string, value: unknown) =>
                    updateMutation.mutate({ gid, data: { [field]: value } })
                  }
                />
              ))}
            </div>

            {/* === 移动端卡片列表 === */}
            <div className="flex-1 overflow-auto md:hidden px-1 pb-2 space-y-2.5" style={{ minHeight: "200px" }}>
              {sortedItems.map((item: any) => (
                <MobileProductCard
                  key={item.gid}
                  item={item}
                  keywordCount={itemKeywordCounts[item.gid] || 0}
                  onToggle={onToggle}
                  onEdit={() => onEdit(item)}
                  onKeywordClick={() => onKeywordClick(item)}
                  onConfigClick={(field: string) => onConfigClick({ item, field })}
                  onSendCodeChange={(gid: string, value: string) =>
                    updateMutation.mutate({ gid, data: { sendCode: value } })
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors. The component is new and not yet imported anywhere, so no consumers to break.

- [ ] **Step 3: Commit**

```bash
git add components/items/ItemsTab.tsx
git commit -m "feat: add ItemsTab component, extracted from items/page.tsx

Pure JSX extraction — no logic changes. Contains FilterBar (desktop+mobile),
loading/error/empty states, desktop table with 14-column header, and mobile
card list via ItemRow/MobileProductCard.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Create RulesTab component

**Files:**
- Create: `components/items/RulesTab.tsx`
- Read (reference): `app/dashboard/items/page.tsx:214-291` and `app/dashboard/rules/page.tsx:10-16`

- [ ] **Step 1: Create `components/items/RulesTab.tsx`**

Extract the rules tab JSX from page.tsx, using the STAT_CARDS array pattern from `rules/page.tsx`:

```typescript
"use client"

import type { KeywordRule, KeywordRuleListResponse } from "@/lib/api/keywords"
import { RuleTable } from "@/components/rules/RuleTable"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface KeywordStats {
  total: number
  enabled: number
  disabled: number
  linkedItems: number
  linkedGroups: number
}

interface RulesTabProps {
  keywordRules: KeywordRule[]
  rulesStats: KeywordStats
  keywordsLoading: boolean
  keywordsError: unknown
  onCreateRule: () => void
  onEditRule: (rule: KeywordRule) => void
}

const STAT_CARDS = [
  { key: "total", label: "规则总数",   color: "text-gray-900" },
  { key: "enabled", label: "已启用",   color: "text-green-600" },
  { key: "disabled", label: "已禁用",  color: "text-gray-600" },
  { key: "linkedItems", label: "关联商品", color: "text-blue-600" },
  { key: "linkedGroups", label: "关联商品组", color: "text-purple-600" },
] as const

export function RulesTab({
  keywordRules,
  rulesStats,
  keywordsLoading,
  keywordsError,
  onCreateRule,
  onEditRule,
}: RulesTabProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* 统计信息 */}
      <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
        {STAT_CARDS.map(({ key, label, color }) => (
          <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className={`text-2xl font-bold ${color}`}>{rulesStats[key]}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="text-sm text-gray-500">
          {rulesStats.total === 0
            ? "暂无规则"
            : `共 ${rulesStats.total} 条规则，按优先级降序排列`}
        </div>
        <button
          onClick={onCreateRule}
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
            onClick={onCreateRule}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            创建规则
          </button>
        </div>
      )}
      {!keywordsLoading && !keywordsError && rulesStats.total > 0 && (
        <RuleTable
          className="border-0 rounded-none shadow-none"
          rules={keywordRules}
          onEdit={onEditRule}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/items/RulesTab.tsx
git commit -m "feat: add RulesTab component, extracted from items/page.tsx

Uses STAT_CARDS array pattern for stat cards. Contains loading/error/empty
states and RuleTable. Props are minimal (data + callbacks only).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Rewrite `items/page.tsx` as thin shell

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire file with the thin shell:

```typescript
"use client"

import { Suspense } from "react"
import { useTabRouting } from "@/hooks/useTabRouting"
import { TabBar } from "@/components/ui/Tab"
import { RuleForm } from "@/components/rules/RuleForm"
import { ItemsTab } from "@/components/items/ItemsTab"
import { RulesTab } from "@/components/items/RulesTab"
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
    keywordRules,
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

      {/* Tab 内容 */}
      {activeTab === "items" && (
        <ItemsTab
          isMobile={isMobile}
          accountsData={accountsData}
          searchInput={searchInput}
          filters={filters}
          stats={stats}
          sortField={sortField}
          sortDirection={sortDirection}
          isRefreshing={isRefreshing}
          onSearchChange={setSearchInput}
          onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          onRefresh={handleRefresh}
          onClearFilters={handleClearFilters}
          onSortChange={handleSort}
          data={data}
          sortedItems={sortedItems}
          itemKeywordCounts={itemKeywordCounts}
          isLoading={isLoading}
          error={error}
          onToggle={handleToggle}
          updateMutation={updateMutation}
          onEdit={setEditingItem}
          onKeywordClick={setKeywordItem}
          onConfigClick={setMobileConfig}
          onSendCodeChange={(gid, value) => updateMutation.mutate({ gid, data: { sendCode: value } })}
        />
      )}

      {activeTab === "rules" && (
        <RulesTab
          keywordRules={keywordRules}
          rulesStats={rulesStats}
          keywordsLoading={keywordsLoading}
          keywordsError={keywordsError}
          onCreateRule={() => setShowCreateForm(true)}
          onEditRule={setEditingRule}
        />
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

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors. The page uses the same props from `useItemsPage`, same drawer components, same RuleForm.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/items/page.tsx
git commit -m "refactor(items): rewrite page.tsx as thin shell using ItemsTab/RulesTab

344→50 lines. Page now only renders TabBar, switches between ItemsTab
and RulesTab, and manages drawer/form overlays. All tab JSX moved to
components/items/.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Delete dead `rules/` route

**Files:**
- Delete: `app/dashboard/rules/page.tsx`
- Delete: `app/dashboard/rules/` directory

- [ ] **Step 1: Verify no imports reference rules/page.tsx**

```bash
cd E:\.project\autofish_freetime\frontend && grep -r "rules/page" --include="*.ts" --include="*.tsx" .
```

Expected: No output (no references found).

- [ ] **Step 2: Delete the file and directory**

```bash
rm "E:\.project\autofish_freetime\frontend\app\dashboard\rules\page.tsx"
rmdir "E:\.project\autofish_freetime\frontend\app\dashboard\rules"
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A app/dashboard/rules/
git commit -m "chore: delete unused rules route page

app/dashboard/rules/page.tsx was dead code — rules tab is integrated
into items/page.tsx via ItemsTab/RulesTab components.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Final Phase 1 verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Grep for any stale references**

```bash
cd E:\.project\autofish_freetime\frontend && grep -r "from.*rules/page" --include="*.ts" --include="*.tsx" .
cd E:\.project\autofish_freetime\frontend && grep -r "from.*/dashboard/rules" --include="*.ts" --include="*.tsx" .
```

Expected: No output from either.

- [ ] **Step 3: Verify file structure**

```bash
ls E:\.project\autofish_freetime\frontend\components\items\ItemsTab.tsx
ls E:\.project\autofish_freetime\frontend\components\items\RulesTab.tsx
ls E:\.project\autofish_freetime\frontend\app\dashboard\items\page.tsx
ls E:\.project\autofish_freetime\frontend\app\dashboard\rules 2>&1
```

Expected: First three files exist; last command fails with "No such file or directory".

- [ ] **Step 4: Commit if any fixes**

```bash
git add -A
git diff --cached --stat  # review
git commit -m "chore: final Phase 1 verification — clean slate for Phase 2"
```

---

## Phase 2: Rule Form Unification

### Task 7: Create KeywordRuleForm shared component

**Files:**
- Create: `components/items/parts/KeywordRuleForm.tsx`
- Read (reference): `KeywordDrawer.tsx:24-521` (form logic) and `RuleForm.tsx:26-606` (form JSX)

- [ ] **Step 1: Create `components/items/parts/KeywordRuleForm.tsx`**

Extract shared form fields, placeholder logic, and item card picker from both KeywordDrawer and RuleForm:

```typescript
"use client"

import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  type KeywordRule,
  PREDEFINED_KEYWORDS,
  listRuleItems,
} from "@/lib/api/keywords"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PlaceholderPicker } from "./PlaceholderPicker"

const makeItemCardPlaceholder = (itemId: string) => `[ITEM:${itemId}]`

export const ruleSchema = z.object({
  reply_type: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  reply_content: z.string().min(1, "回复内容不能为空"),
  match_type: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
})

export type RuleFormData = z.infer<typeof ruleSchema>

export interface KeywordRuleFormProps {
  rule?: KeywordRule
  linkedItem?: { title?: string; price?: number; gid?: string }
  bindingWarning?: string
  onSubmit: (data: RuleFormData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  children?: ReactNode
}

export function KeywordRuleForm({
  rule,
  linkedItem,
  bindingWarning,
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
  children,
}: KeywordRuleFormProps) {
  const [loading, setLoading] = useState(false)
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [itemPickerSearch, setItemPickerSearch] = useState("")

  const isEdit = !!rule

  // Item list for card picker
  const { data: allItemsData } = useQuery({
    queryKey: ["keyword-form-items"],
    queryFn: listRuleItems,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      reply_type: rule?.reply_type || "custom",
      keyword: rule?.reply_type === "predefined"
        ? (rule.keyword || "first_reply")
        : (rule?.keyword || ""),
      reply_content: rule?.reply_content || "",
      match_type: rule?.match_type || "exact",
      priority: rule?.priority || 0,
      enabled: rule?.enabled ?? true,
    },
  })

  const replyType = watch("reply_type")
  const replyContent = watch("reply_content")

  // Report dirty state to parent
  useEffect(() => {
    onDirtyChange?.(Object.keys(dirtyFields).length > 0)
  }, [dirtyFields, onDirtyChange])

  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const currentValue = replyContent || ""
      setValue("reply_content", currentValue + placeholder, { shouldValidate: true, shouldDirty: true })
    },
    [replyContent, setValue]
  )

  const insertItemCard = useCallback(
    (itemId: string) => {
      const placeholder = makeItemCardPlaceholder(itemId)
      const currentValue = replyContent || ""
      setValue("reply_content", currentValue + placeholder, { shouldValidate: true, shouldDirty: true })
      setShowItemPicker(false)
      setItemPickerSearch("")
    },
    [replyContent, setValue]
  )

  const handleReplyContentDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const text = e.dataTransfer.getData("text/plain")
      if (text && text.startsWith("[ITEM:")) {
        const currentValue = replyContent || ""
        setValue("reply_content", currentValue + text, { shouldValidate: true, shouldDirty: true })
      }
    },
    [replyContent, setValue]
  )

  const filteredPickerItems = useMemo(() => {
    if (!allItemsData) return []
    if (!itemPickerSearch.trim()) return allItemsData
    const search = itemPickerSearch.toLowerCase()
    return allItemsData.filter(
      (i) =>
        i.gid.toLowerCase().includes(search) ||
        (i.title && i.title.toLowerCase().includes(search))
    )
  }, [allItemsData, itemPickerSearch])

  const handleFormSubmit = async (data: RuleFormData) => {
    setLoading(true)
    try {
      await onSubmit(data)
      onDirtyChange?.(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onDirtyChange?.(false)
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 回复类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">回复类型</label>
          <select
            {...register("reply_type")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="custom">自定义关键词</option>
            <option value="predefined">预定义关键词</option>
          </select>
        </div>

        {/* 关键词 / 预定义关键词 */}
        {replyType === "predefined" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预定义关键词</label>
            <select
              {...register("keyword")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {PREDEFINED_KEYWORDS.map((kw) => (
                <option key={kw.value} value={kw.value}>{kw.label}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
              <input
                {...register("keyword")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="例如: 多少钱 / 价格"
              />
              {errors.keyword && <p className="mt-1 text-xs text-red-500">{errors.keyword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">匹配类型</label>
              <select
                {...register("match_type")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="exact">精确匹配</option>
                <option value="fuzzy">模糊匹配</option>
                <option value="regex">正则匹配</option>
              </select>
            </div>
          </div>
        )}

        {/* 优先级 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
          <input
            type="number"
            {...register("priority", { valueAsNumber: true })}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
        </div>

        {/* 回复内容 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              回复内容 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowItemPicker(!showItemPicker)}
              className="text-xs text-orange-600 hover:text-orange-800 font-medium"
            >
              {showItemPicker ? "收起商品选择" : "+ 插入商品卡片"}
            </button>
          </div>

          <PlaceholderPicker onInsert={insertPlaceholder} />

          <div className="mt-2">
            <textarea
              {...register("reply_content")}
              rows={4}
              onDrop={handleReplyContentDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              placeholder="当消息匹配时，自动发送此回复内容"
            />
            {errors.reply_content && (
              <p className="mt-1 text-xs text-red-500">{errors.reply_content.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              占位符格式：{"{占位符名称}"}，商品卡片格式：[ITEM:商品ID]
            </p>
          </div>

          {/* 内联商品卡片选择器 */}
          {showItemPicker && (
            <div className="border rounded-lg p-3 space-y-2 bg-gray-50 mt-2">
              <input
                type="text"
                value={itemPickerSearch}
                onChange={(e) => setItemPickerSearch(e.target.value)}
                placeholder="搜索商品..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {filteredPickerItems.length > 0 ? (
                  filteredPickerItems.map((i) => (
                    <button
                      key={i.gid}
                      type="button"
                      onClick={() => insertItemCard(i.gid)}
                      className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-orange-300 transition-colors bg-white"
                    >
                      <div className="font-medium text-gray-900 truncate text-sm">{i.title || "无标题"}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>ID: {i.gid.slice(0, 12)}...</span>
                        <span>¥{i.price}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-4 text-sm">
                    {itemPickerSearch ? "未找到匹配的商品" : "暂无可选的商品"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 启用开关 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register("enabled")}
            id="kwf_enabled"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="kwf_enabled" className="text-sm text-gray-700">启用此规则</label>
        </div>

        {/* children 插槽 — 表单字段与按钮之间 */}
        {children}

        {/* 关联商品提示 */}
        {linkedItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs text-blue-700">
              <span className="font-medium">关联商品：</span>
              {linkedItem.title || "无标题"}
              {linkedItem.price !== undefined && ` (¥${linkedItem.price})`}
            </div>
          </div>
        )}

        {/* 编辑警告 */}
        {bindingWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs text-amber-700">{bindingWarning}</div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 flex-shrink-0">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 mr-auto"
          >
            删除
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {isEdit ? "保存" : "创建"}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors. Component is new, no consumers yet.

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/KeywordRuleForm.tsx
git commit -m "feat: add KeywordRuleForm shared component

Extracted from KeywordDrawer and RuleForm: form schema, all form fields,
PlaceholderPicker integration, inline item card picker, dirty state
tracking via onDirtyChange callback, children slot for RuleBindingPanel.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Create RuleBindingPanel component

**Files:**
- Create: `components/items/parts/RuleBindingPanel.tsx`
- Read (reference): `RuleForm.tsx:476-585` (right sidebar binding UI)

- [ ] **Step 1: Create `components/items/parts/RuleBindingPanel.tsx`**

Extract the right-panel item/group binding UI into a two-column layout:

```typescript
"use client"

import { useState, useMemo } from "react"
import type { RuleItem } from "@/lib/api/keywords"
import type { ItemGroup } from "@/lib/api/items"

export interface RuleBindingPanelProps {
  items: RuleItem[]
  groups: ItemGroup[]
  selectedItemIds: string[]
  selectedGroupIds: string[]
  onToggleItem: (id: string) => void
  onToggleGroup: (id: string) => void
  onSelectAllItems: () => void
  onSelectAllGroups: () => void
  onItemSearchChange: (q: string) => void
  onGroupSearchChange: (q: string) => void
}

export function RuleBindingPanel({
  items,
  groups,
  selectedItemIds,
  selectedGroupIds,
  onToggleItem,
  onToggleGroup,
  onSelectAllItems,
  onSelectAllGroups,
  onItemSearchChange,
  onGroupSearchChange,
}: RuleBindingPanelProps) {
  const [itemSearch, setItemSearch] = useState("")
  const [groupSearch, setGroupSearch] = useState("")

  const filteredItems = useMemo(() => {
    if (!items) return []
    if (!itemSearch.trim()) return items
    const s = itemSearch.toLowerCase()
    return items.filter(
      (i) => i.gid.toLowerCase().includes(s) || (i.title && i.title.toLowerCase().includes(s))
    )
  }, [items, itemSearch])

  const filteredGroups = useMemo(() => {
    if (!groups) return []
    if (!groupSearch.trim()) return groups
    const s = groupSearch.toLowerCase()
    return groups.filter(
      (g) => g.groupId.toLowerCase().includes(s) || g.groupName.toLowerCase().includes(s)
    )
  }, [groups, groupSearch])

  return (
    <div className="border-t border-gray-100 pt-4 mt-2">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        商品与商品组关联
        {(selectedItemIds.length > 0 || selectedGroupIds.length > 0) &&
          ` (已选 ${selectedItemIds.length} 商品 / ${selectedGroupIds.length} 商品组)`}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* 左列：关联商品 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              关联商品 ({selectedItemIds.length}个)
            </label>
            <button
              type="button"
              onClick={() => { onSelectAllItems(); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selectedItemIds.length === filteredItems.length && filteredItems.length > 0
                ? "取消全选" : "全选"}
            </button>
          </div>
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => { setItemSearch(e.target.value); onItemSearchChange(e.target.value); }}
            placeholder="搜索商品..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
          />
          <div className="border border-gray-300 rounded-md p-2 max-h-44 overflow-y-auto">
            {filteredItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {filteredItems.map((item) => (
                  <label
                    key={item.gid}
                    className={`px-2 py-1 text-xs rounded cursor-pointer ${
                      selectedItemIds.includes(item.gid)
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.gid)}
                      onChange={() => onToggleItem(item.gid)}
                      className="sr-only"
                    />
                    {item.title || item.gid.slice(0, 10)}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">
                {itemSearch ? "未找到匹配的商品" : "暂无可关联的商品"}
              </p>
            )}
          </div>
        </div>

        {/* 右列：关联商品组 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              关联商品组 ({selectedGroupIds.length}个)
            </label>
            <button
              type="button"
              onClick={() => { onSelectAllGroups(); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {selectedGroupIds.length === filteredGroups.length && filteredGroups.length > 0
                ? "取消全选" : "全选"}
            </button>
          </div>
          <input
            type="text"
            value={groupSearch}
            onChange={(e) => { setGroupSearch(e.target.value); onGroupSearchChange(e.target.value); }}
            placeholder="搜索商品组..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
          />
          <div className="border border-gray-300 rounded-md p-2 max-h-44 overflow-y-auto">
            {filteredGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {filteredGroups.map((group) => (
                  <label
                    key={group.groupId}
                    className={`px-2 py-1 text-xs rounded cursor-pointer ${
                      selectedGroupIds.includes(group.groupId)
                        ? "bg-purple-100 text-purple-700 border border-purple-300"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.groupId)}
                      onChange={() => onToggleGroup(group.groupId)}
                      className="sr-only"
                    />
                    {group.groupName}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">
                {groupSearch ? "未找到匹配的商品组" : "暂无可关联的商品组"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/RuleBindingPanel.tsx
git commit -m "feat: add RuleBindingPanel shared component

Two-column layout for item and group selection. Extracted from RuleForm's
right sidebar. Handles empty/no-match states internally.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Refactor KeywordDrawer to use KeywordRuleForm

**Files:**
- Modify: `components/items/drawers/KeywordDrawer.tsx`

- [ ] **Step 1: Rewrite KeywordDrawer to use KeywordRuleForm**

Replace the inline form with `KeywordRuleForm`, retaining the rule list view:

```typescript
"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type KeywordRule,
  createKeywordRule,
  updateKeywordRule,
  deleteKeywordRule,
  linkItemToRule,
  PREDEFINED_KEYWORDS,
  getRulesForItem,
} from "@/lib/api/keywords"
import type { Item } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"

interface KeywordDrawerProps {
  item: Item
  open: boolean
  onClose: () => void
}

export function KeywordDrawer({ item, open, onClose }: KeywordDrawerProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Fetch rules for this item
  const { data: linkedRulesData, isLoading: linkedLoading } = useQuery({
    queryKey: ["keywords", "item", item.gid],
    queryFn: () => getRulesForItem(item.gid),
  })

  const handleCreateNew = () => {
    setEditingRule(null)
    setShowCreateForm(true)
    setIsDirty(false)
  }

  const handleEditRule = (rule: KeywordRule) => {
    setEditingRule(rule)
    setShowCreateForm(true)
    setIsDirty(false)
  }

  const handleDeleteRule = async (rule: KeywordRule) => {
    if (!confirm(`确定要删除规则"${rule.keyword}"吗？`)) return
    setLoading(true)
    try {
      await deleteKeywordRule(rule.rule_id)
      addToast({ title: "已删除", description: "规则已删除" })
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
    } catch (e) {
      addToast({ title: "删除失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: RuleFormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        await updateKeywordRule(editingRule.rule_id, data)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const savedRule = await createKeywordRule(data)
        await linkItemToRule(savedRule.rule_id, item.gid)
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
      setIsDirty(false)
    } catch (e) {
      addToast({
        title: editingRule ? "更新失败" : "创建失败",
        description: String(e),
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const getDisplayKeyword = (rule: KeywordRule) => {
    if (rule.reply_type === "predefined") {
      return PREDEFINED_KEYWORDS.find((k) => k.value === rule.keyword)?.label || rule.keyword
    }
    return rule.keyword
  }

  // Compute binding warning
  const bindingWarning = editingRule
    ? `此规则已关联 ${editingRule.linked_items} 个商品，修改将影响所有关联商品`
    : undefined

  // Rule list view
  const ruleListView = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          已关联 {linkedRulesData?.total || 0} 个规则
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + 创建新规则
        </button>
      </div>

      {linkedLoading ? (
        <div className="flex items-center justify-center py-8"><LoadingSpinner size="md" /></div>
      ) : linkedRulesData?.rules && linkedRulesData.rules.length > 0 ? (
        <div className="space-y-2">
          {linkedRulesData.rules.map((rule) => (
            <div key={rule.rule_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${rule.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {rule.enabled ? "启用" : "禁用"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{getDisplayKeyword(rule)}</span>
                    <span className="text-xs text-gray-400">{rule.reply_type === "predefined" ? "预定义" : rule.match_type}</span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">{rule.reply_content || "(无回复内容)"}</div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleEditRule(rule)} className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors">编辑</button>
                  <button onClick={() => handleDeleteRule(rule)} disabled={loading} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>暂无关联的关键词规则</p>
          <p className="text-xs mt-1">点击上方按钮创建新规则</p>
        </div>
      )}
    </div>
  )

  const title = "关键词回复"
  const subtitle = `为商品「${item.title || item.gid.slice(0, 10)}...」配置关键词自动回复`

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} heightRatio={0.95} closeOnBackdrop={!isDirty}>
        <div className="flex-1 overflow-y-auto">
          {!showCreateForm ? ruleListView : (
            <KeywordRuleForm
              rule={editingRule ?? undefined}
              linkedItem={item}
              bindingWarning={bindingWarning}
              onSubmit={handleSave}
              onCancel={() => { setShowCreateForm(false); setEditingRule(null); setIsDirty(false); }}
              onDelete={editingRule ? () => handleDeleteRule(editingRule) : undefined}
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} width="560px" closeOnBackdrop={!isDirty}>
      <div className="flex-1 overflow-y-auto">
        {!showCreateForm ? ruleListView : (
          <KeywordRuleForm
            rule={editingRule ?? undefined}
            linkedItem={item}
            bindingWarning={bindingWarning}
            onSubmit={handleSave}
            onCancel={() => { setShowCreateForm(false); setEditingRule(null); setIsDirty(false); }}
            onDelete={editingRule ? () => handleDeleteRule(editingRule) : undefined}
            onDirtyChange={setIsDirty}
          />
        )}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/items/drawers/KeywordDrawer.tsx
git commit -m "refactor(KeywordDrawer): use shared KeywordRuleForm component

Replaces inline form with KeywordRuleForm. Adds closeOnBackdrop={!isDirty}
for dismiss prevention. Shows bindingWarning when editing already-bound rules.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Create RuleDrawer (replace RuleForm modal)

**Files:**
- Create: `components/items/drawers/RuleDrawer.tsx`
- Read (reference): `RuleForm.tsx:65-668` (full component — binding logic to be reused)

- [ ] **Step 1: Create `components/items/drawers/RuleDrawer.tsx`**

New drawer component that replaces the RuleForm modal:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type KeywordRule,
  type KeywordRuleUpdate,
  type KeywordRuleCreate,
  createKeywordRule,
  updateKeywordRule,
  linkItemToRule,
  unlinkItemFromRule,
  linkGroupToRule,
  unlinkGroupFromRule,
  listRuleItems,
} from "@/lib/api/keywords"
import { listItemGroups } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"
import { RuleBindingPanel } from "../parts/RuleBindingPanel"

interface RuleDrawerProps {
  rule?: KeywordRule
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RuleDrawer({ rule, open, onClose, onSuccess }: RuleDrawerProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const isEdit = !!rule

  // Data for binding panel
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["keyword-rule-items"],
    queryFn: listRuleItems,
  })
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["item-groups"],
    queryFn: listItemGroups,
  })

  // Selected binding state
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  useEffect(() => {
    if (rule) {
      setSelectedItems(rule.linked_item_list.map((i) => i.item_id))
      setSelectedGroups(rule.linked_group_list.map((g) => g.group_id))
    } else {
      setSelectedItems([])
      setSelectedGroups([])
    }
  }, [rule])

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const selectAllItems = () => {
    if (!itemsData) return
    if (selectedItems.length === itemsData.length) setSelectedItems([])
    else setSelectedItems(itemsData.map((i) => i.gid))
  }
  const selectAllGroups = () => {
    if (!groupsData?.groups) return
    if (selectedGroups.length === groupsData.groups.length) setSelectedGroups([])
    else setSelectedGroups(groupsData.groups.map((g) => g.groupId))
  }

  const handleSave = async (data: RuleFormData) => {
    setLoading(true)
    try {
      let savedRule: KeywordRule | null = null
      if (isEdit) {
        savedRule = await updateKeywordRule(rule!.rule_id, data as KeywordRuleUpdate)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        savedRule = await createKeywordRule(data as KeywordRuleCreate)
        addToast({ title: "创建成功", description: "规则已创建" })
      }

      // Sync bindings
      if (savedRule) {
        const currentItems = rule?.linked_item_list.map((i) => i.item_id) || []
        for (const id of selectedItems) { if (!currentItems.includes(id)) await linkItemToRule(savedRule.rule_id, id) }
        for (const id of currentItems) { if (!selectedItems.includes(id)) await unlinkItemFromRule(savedRule.rule_id, id) }

        const currentGroups = rule?.linked_group_list.map((g) => g.group_id) || []
        for (const id of selectedGroups) { if (!currentGroups.includes(id)) await linkGroupToRule(savedRule.rule_id, id) }
        for (const id of currentGroups) { if (!selectedGroups.includes(id)) await unlinkGroupFromRule(savedRule.rule_id, id) }
      }

      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setIsDirty(false)
      onSuccess()
    } catch (e) {
      addToast({ title: isEdit ? "更新失败" : "创建失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsDirty(false)
    onClose()
  }

  const title = isEdit ? "编辑规则" : "创建规则"
  const isDataReady = !itemsLoading && !groupsLoading

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} heightRatio={0.95} closeOnBackdrop={!isDirty}>
        <KeywordRuleForm
          rule={rule}
          onSubmit={handleSave}
          onCancel={handleCancel}
          onDirtyChange={setIsDirty}
        >
          {isDataReady ? (
            <RuleBindingPanel
              items={itemsData || []}
              groups={groupsData?.groups || []}
              selectedItemIds={selectedItems}
              selectedGroupIds={selectedGroups}
              onToggleItem={toggleItem}
              onToggleGroup={toggleGroup}
              onSelectAllItems={selectAllItems}
              onSelectAllGroups={selectAllGroups}
              onItemSearchChange={() => {}}
              onGroupSearchChange={() => {}}
            />
          ) : (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          )}
        </KeywordRuleForm>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} width="min(900px, 66vw)" closeOnBackdrop={!isDirty}>
      <KeywordRuleForm
        rule={rule}
        onSubmit={handleSave}
        onCancel={handleCancel}
        onDirtyChange={setIsDirty}
      >
        {isDataReady ? (
          <RuleBindingPanel
            items={itemsData || []}
            groups={groupsData?.groups || []}
            selectedItemIds={selectedItems}
            selectedGroupIds={selectedGroups}
            onToggleItem={toggleItem}
            onToggleGroup={toggleGroup}
            onSelectAllItems={selectAllItems}
            onSelectAllGroups={selectAllGroups}
            onItemSearchChange={() => {}}
            onGroupSearchChange={() => {}}
          />
        ) : (
          <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
        )}
      </KeywordRuleForm>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/items/drawers/RuleDrawer.tsx
git commit -m "feat: add RuleDrawer — drawer-based rule editor replacing RuleForm modal

Wide drawer (min(900px, 66vw)) with KeywordRuleForm + RuleBindingPanel
as children slot. Manages binding state + sync on save.
No delete (RuleTable handles it).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Update page.tsx — replace RuleForm with RuleDrawer

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 1: Replace RuleForm import and usage**

In `app/dashboard/items/page.tsx`, replace:

```typescript
// Remove this line:
import { RuleForm } from "@/components/rules/RuleForm"
// Add this line:
import { RuleDrawer } from "@/components/items/drawers/RuleDrawer"
```

Replace the RuleForm usage at the bottom of the JSX:

```typescript
{/* Replace: */}
{showCreateForm && (
  <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />
)}
{editingRule && (
  <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />
)}

{/* With: */}
{showCreateForm && (
  <RuleDrawer open={showCreateForm} onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />
)}
{editingRule && (
  <RuleDrawer rule={editingRule} open={!!editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />
)}
```

- [ ] **Step 2: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/items/page.tsx
git commit -m "refactor(page): replace RuleForm modal with RuleDrawer drawer

Switches rule create/edit from centered modal to responsive side drawer
with KeywordRuleForm + RuleBindingPanel.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Delete RuleForm.tsx

**Files:**
- Delete: `components/rules/RuleForm.tsx`
- Keep: `components/rules/RuleTable.tsx`

- [ ] **Step 1: Verify no remaining imports of RuleForm**

```bash
cd E:\.project\autofish_freetime\frontend && grep -r "from.*rules/RuleForm" --include="*.ts" --include="*.tsx" .
cd E:\.project\autofish_freetime\frontend && grep -r "RuleForm" --include="*.ts" --include="*.tsx" .
```

Expected: First command returns nothing. Second returns only references in `KeywordRuleForm.tsx` type name (not import).

- [ ] **Step 2: Delete the file**

```bash
rm "E:\.project\autofish_freetime\frontend\components\rules\RuleForm.tsx"
```

- [ ] **Step 3: Verify compilation**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A components/rules/
git commit -m "chore: delete RuleForm.tsx, replaced by RuleDrawer

RuleDrawer (components/items/drawers/) replaces the old modal-based
RuleForm with a responsive drawer + shared KeywordRuleForm.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: Final Phase 2 verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Verify no dead references**

```bash
cd E:\.project\autofish_freetime\frontend && grep -r "RuleForm" --include="*.ts" --include="*.tsx" .
cd E:\.project\autofish_freetime\frontend && grep -r "rules/RuleForm" --include="*.ts" --include="*.tsx" .
cd E:\.project\autofish_freetime\frontend && grep -r "app/dashboard/rules" --include="*.ts" --include="*.tsx" .
```

Expected: First may show `RuleFormData` type references (valid). Second and third return nothing.

- [ ] **Step 3: Verify final file structure**

```bash
ls E:\.project\autofish_freetime\frontend\components\items\parts\KeywordRuleForm.tsx
ls E:\.project\autofish_freetime\frontend\components\items\parts\RuleBindingPanel.tsx
ls E:\.project\autofish_freetime\frontend\components\items\drawers\RuleDrawer.tsx
ls E:\.project\autofish_freetime\frontend\components\rules\RuleTable.tsx     # should exist
ls E:\.project\autofish_freetime\frontend\components\rules\RuleForm.tsx      # should NOT exist
```

Expected: First four exist; last fails.

- [ ] **Step 4: Line count summary**

```bash
wc -l E:\.project\autofish_freetime\frontend\app\dashboard\items\page.tsx
wc -l E:\.project\autofish_freetime\frontend\components\items\ItemsTab.tsx
wc -l E:\.project\autofish_freetime\frontend\components\items\RulesTab.tsx
wc -l E:\.project\autofish_freetime\frontend\components\items\parts\KeywordRuleForm.tsx
wc -l E:\.project\autofish_freetime\frontend\components\items\parts\RuleBindingPanel.tsx
```

Expected: page.tsx ~50, ItemsTab ~180, RulesTab ~100, KeywordRuleForm ~220, RuleBindingPanel ~120.

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
git commit -m "chore: final Phase 2 verification — all checks pass"
```
