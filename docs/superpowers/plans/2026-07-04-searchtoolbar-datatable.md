# SearchToolbar + DataTable 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 SearchToolbar（筛选栏布局壳）和 DataTable（通用数据表格）两个共享组件，并将 ItemsTab 迁移到 DataTable。

**Architecture:** SearchToolbar 是纯布局壳（children 模式），DataTable 是列定义驱动的 CSS Grid 表格（封装四态 + 排序 + 斑马纹 + sticky 表头）。两者均不处理移动端和分页。

**Tech Stack:** React + TypeScript + Tailwind CSS v3，使用项目已有的 `cn` 工具（`@/lib/utils`）。

**Spec:** `docs/superpowers/specs/2026-07-04-searchtoolbar-datatable-design.md`

---

## 文件结构

| 文件 | 职责 | 操作 |
|------|------|------|
| `components/ui/SearchToolbar.tsx` | 筛选栏布局壳 — 卡片容器 + flex row | 新建 |
| `components/ui/DataTable.tsx` | 数据表格 — 列定义 + 四态 + 排序 + 斑马纹 | 新建 |
| `components/items/ItemsTab.tsx` | 迁移到 DataTable，删除 SortHeader | 修改 |
| `.claude/docs/COMPONENTS.md` | 组件索引更新 | 修改 |
| `.claude/rules/frontend-components.md` | 标记 SearchToolbar/DataTable 为 ✅ | 修改 |

---

### Task 1: 创建 SearchToolbar 组件

**Files:**
- Create: `components/ui/SearchToolbar.tsx`

- [ ] **Step 1: 创建 SearchToolbar.tsx**

```tsx
'use client'

import { cn } from '@/lib/utils'

interface SearchToolbarProps {
  children: React.ReactNode
  className?: string
}

export function SearchToolbar({ children, className }: SearchToolbarProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4',
        className,
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 编译检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无 SearchToolbar 相关错误。

- [ ] **Step 3: Commit**

```bash
git add components/ui/SearchToolbar.tsx
git commit -m "feat: add SearchToolbar component
- pure layout shell for filter bars
- children-based design, no structural constraints
- dark mode support

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 创建 DataTable 组件

**Files:**
- Create: `components/ui/DataTable.tsx`

- [ ] **Step 1: 创建 DataTable.tsx — 类型定义 + SortHeaderButton**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { EmptyState } from '@/components/ui/EmptyState'

// ---- 类型 ----

export interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  className?: string
  render: (item: T, index: number) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[] | undefined
  keyExtractor: (item: T) => string
  gridTemplateColumns: string

  className?: string

  // 四态
  isLoading?: boolean
  error?: unknown
  errorMessage?: string
  onRetry?: () => void
  onDismissError?: () => void

  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  emptyIcon?: React.ReactNode
  emptySize?: 'sm' | 'md'

  // 排序
  orderBy?: string | null
  asc?: boolean
  onSortChange?: (field: string | null) => void

  // 行样式
  rowClassName?: string | ((item: T, index: number) => string)

  // 表头
  stickyHeader?: boolean
}

// ---- 内部子组件（从 ItemsTab SortHeader 迁移而来） ----

function SortHeaderButton({
  field,
  label,
  orderBy,
  asc,
  onClick,
}: {
  field: string
  label: string
  orderBy: string | null
  asc: boolean
  onClick: (field: string | null) => void
}) {
  const isActive = orderBy === field

  const handleClick = () => {
    if (!isActive) {
      onClick(field)
    } else if (!asc) {
      onClick(field)
    } else {
      onClick(null)
    }
  }

  const arrow = isActive ? (asc ? '↑' : '↓') : '↕'

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-0.5 transition-colors',
        'hover:text-blue-600 dark:hover:text-blue-400',
        isActive
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400',
      )}
    >
      <span>{label}</span>
      <span className="text-xs leading-none">{arrow}</span>
    </button>
  )
}
```

- [ ] **Step 2: 创建 DataTable.tsx — 主组件函数**

```tsx
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  gridTemplateColumns,

  className,

  isLoading,
  error,
  errorMessage,
  onRetry,
  onDismissError,

  emptyTitle = '暂无数据',
  emptyDescription,
  emptyAction,
  emptyIcon,
  emptySize = 'md',

  orderBy,
  asc = false,
  onSortChange,

  rowClassName,
  stickyHeader = false,
}: DataTableProps<T>) {
  // 四态按优先级渲染

  // 1. Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // 2. Error
  if (error && !isLoading) {
    return (
      <ErrorBanner
        message={errorMessage ?? `加载失败: ${String(error)}`}
        variant="banner"
        onRetry={onRetry}
        onDismiss={onDismissError}
      />
    )
  }

  // 3. Empty
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        icon={emptyIcon}
        size={emptySize}
      />
    )
  }

  // 4. Data
  return (
    <div className={cn('', className)}>
      {/* 表头 */}
      <div
        className={cn(
          'grid gap-2 px-0 py-2 bg-gray-100 dark:bg-gray-800',
          'text-xs font-medium text-gray-500 dark:text-gray-400',
          'border-b border-gray-200 dark:border-gray-700',
          stickyHeader && 'sticky top-0 z-10',
        )}
        style={{ gridTemplateColumns }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              col.align === 'center' && 'text-center',
              col.align === 'right' && 'text-right',
            )}
          >
            {col.sortable && onSortChange ? (
              <SortHeaderButton
                field={col.key}
                label={String(col.header)}
                orderBy={orderBy ?? null}
                asc={asc}
                onClick={onSortChange}
              />
            ) : (
              col.header
            )}
          </div>
        ))}
      </div>

      {/* 数据行 */}
      {data.map((item, index) => {
        const isEven = index % 2 === 0
        const extraClass =
          typeof rowClassName === 'function'
            ? rowClassName(item, index)
            : rowClassName

        return (
          <div
            key={keyExtractor(item)}
            className={cn(
              'grid gap-2 px-4 py-2 items-center text-xs leading-tight',
              'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
              'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
              isEven
                ? 'bg-white dark:bg-gray-900'
                : 'bg-gray-50/30 dark:bg-gray-800/30',
              extraClass,
            )}
            style={{ gridTemplateColumns }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  col.className,
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                )}
              >
                {col.render(item, index)}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript 编译检查**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 无 DataTable 相关错误。

- [ ] **Step 4: 检查 LoadingSpinner / ErrorBanner / EmptyState 的 Props 签名，确保 DataTable 透传正确**

验证要点：
- `LoadingSpinner` 接受 `size?: 'sm' | 'md' | 'lg'` → 使用 `size="lg"` ✅
- `ErrorBanner` 接受 `message`、`variant`、`onRetry`、`onDismiss` → 全部透传 ✅
- `EmptyState` 接受 `title`、`description`、`action`、`icon`、`size` → 全部透传 ✅

- [ ] **Step 5: Commit**

```bash
git add components/ui/DataTable.tsx
git commit -m "feat: add DataTable component
- column-driven CSS Grid table
- four-state handling (loading/error/empty/data)
- sortable headers with three-state cycle (encapsulated)
- zebra striping + hover highlight
- sticky header support
- dark mode support
- SortHeader extracted from ItemsTab

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 迁移 ItemsTab 到 DataTable

**Files:**
- Modify: `components/items/ItemsTab.tsx`

- [ ] **Step 1: 读取当前 ItemsTab 完整内容，确认需要替换的代码块**

当前文件结构（第 1-227 行）：
- 1-34: imports + Props
- 35-52: 组件函数开头 + 状态定义
- 53-62: scrollRef + useEffect
- 64-193: render（加载/错误/空/数据 + 移动端 + 分页 + 抽屉）
- 196-227: SortHeader 子组件

替换范围：
- 第 6 行 import：添加 DataTable 导入 ← 注意 `ItemRow` 依然需要导入（移动端卡片用了 Item 类型？不用，但 `ITEMS_GRID_COLS` 从 ItemRow 导出）
- 第 93-146 行：桌面端表格（sticky 表头 + 数据行 map）替换为 DataTable
- 第 196-227 行：SortHeader 子组件删除

- [ ] **Step 2: 修改 ItemsTab.tsx — 添加 DataTable import**

```tsx
// 第 6 行附近，添加：
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import type { Item } from '@/lib/api/items'
```

删除第 6 行 `import { ItemRow, ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"` 中的 `ItemRow, ` 部分（保留 `ITEMS_GRID_COLS` 导入因为我们需要 grid 列宽常量）。

等等——`ItemRow` 依然被移动端的 `MobileProductCard` 使用吗？检查代码：移动端用的是 `MobileProductCard`，不依赖 `ItemRow`。ItemRow 仅在桌面端表格中使用。迁移后可以完全移除 `ItemRow` 的 import。

**修改 import：**
```tsx
// Before:
import { ItemRow, ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"

// After:
import { ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
```

- [ ] **Step 3: 修改 ItemsTab.tsx — 添加 columns 定义**

在 `ItemsTab` 函数体内、return 之前、`useEffect` 之后添加列定义。列定义放在组件函数体外（文件底部、SortHeader 当前位置之前）以避免每次渲染重新创建。

```tsx
// 在文件底部、原来的 SortHeader 位置，替换为列定义：
const ITEM_TABLE_COLUMNS: DataTableColumn<Item>[] = [
  {
    key: 'title',
    header: '商品信息',
    sortable: true,
    render: (item) => (
      <div className="col-span-2 min-w-0">
        <span
          className="text-left block w-full text-sm text-gray-800 dark:text-gray-200 leading-snug truncate"
          title={item.title || '无标题'}
        >
          {item.title || '无标题'}
        </span>
        <div className="flex items-center gap-1 mt-0.5 text-gray-400 truncate text-xs">
          <span title={item.gid} className="min-w-[85px]">{item.gid}</span>
          <span className="text-gray-300">|</span>
          <span title={item.account.uid} className="truncate">{item.account.name}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'price',
    header: '价格',
    sortable: true,
    align: 'center',
    render: (item) => (
      <span className="text-orange-600 font-semibold">¥{item.price}</span>
    ),
  },
  {
    key: 'publishTime',
    header: '发布时间',
    sortable: true,
    align: 'center',
    render: (item) => (
      <span className="text-xs text-gray-500">{formatPublishTime(item.publishTime)}</span>
    ),
  },
  {
    key: 'auto_ai_reply',
    header: 'AI回复',
    align: 'center',
    render: (item, _index) => (
      <IconToggle
        active={item.auto_ai_reply}
        activeClass="text-purple-500 bg-purple-50"
        title={item.auto_ai_reply ? 'AI回复：开' : 'AI回复：关'}
        onClick={() => onToggleRef.current?.(item, 'auto_ai_reply')}
      />
    ),
  },
  {
    key: 'auto_delivery',
    header: '自动发货',
    align: 'center',
    render: (item, _index) => (
      <IconToggle
        active={item.auto_delivery}
        activeClass="text-green-500 bg-green-50"
        title={item.auto_delivery ? '自动发货：开' : '自动发货：关'}
        onClick={() => onToggleRef.current?.(item, 'auto_delivery')}
      />
    ),
  },
  // ... 注意：IconToggle / ConfigCell / SendCodeEditor 的回调需要访问 onToggle / onUpdateField
  // 这些 props 在列定义中是闭包变量，所以列定义必须在 ItemsTab 函数体内
]
```

**问题**：`IconToggle.onClick` 需要调用 `onToggle(item, field)`，`ConfigCell.onClick` 需要 `setConfigField()`（这是 ItemsTab 内部的状态），`SendCodeEditor.onSave` 需要 `updateMutation.mutate()`。这些回调依赖于 ItemsTab 的 props/state。

如果列定义放在函数体外，这些回调闭包会失效。因此列定义必须放在 ItemsTab 函数体内（在 `useEffect` 之后、return 之前），使用 `useMemo` 包裹以避免不必要的重建。

但规范不建议过早优化。我们先做简单的内联定义（在函数体内），后续如果性能有问题再 `useMemo`。

- [ ] **Step 4: 修改 ItemsTab.tsx — 替换桌面端表格**

**Before**（第 93-146 行）：
```tsx
{/* === 桌面端表格 === */}
<div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
  {/* 表头 */}
  <div
    className="sticky top-0 z-10 grid gap-2 px-0 py-2 bg-gray-100 border-b border-gray-100 text-sm font-medium"
    style={{ gridTemplateColumns: ITEMS_GRID_COLS }}
  >
    <SortHeader className="col-span-2" field="title" label="商品信息" orderBy={orderBy} asc={asc} onClick={onSortChange} />
    <SortHeader className="col-span-1" field="price" label="价格" orderBy={orderBy} asc={asc} onClick={onSortChange} />
    <SortHeader className="col-span-1 text-center" field="publishTime" label="发布时间" orderBy={orderBy} asc={asc} onClick={onSortChange} />
    <div className="col-span-1 text-center text-gray-600">AI回复</div>
    <div className="col-span-1 text-center text-gray-600">自动发货</div>
    <div className="col-span-1 text-center text-gray-600">付款后发货</div>
    <div className="col-span-1 text-center text-gray-600">收货后赠送</div>
    <div className="col-span-1 text-center text-gray-600">评价后赠送</div>
    <div className="col-span-1 text-center text-gray-600">关键词回复</div>
    <div className="col-span-1 text-center text-gray-600">AI提示词</div>
    <div className="col-span-1 text-center text-gray-600">自动上架</div>
    <SortHeader className="col-span-1 text-center" field="sendCode" label="指令码" orderBy={orderBy} asc={asc} onClick={onSortChange} />
  </div>

  {/* 内容区域 */}
  {data.map((item, index) => (
    <ItemRow
      key={item.gid}
      item={item}
      isEven={index % 2 === 0}
      onToggle={onToggle}
      onEdit={() => setEditingItem(item)}
      onKeywordClick={() => setKeywordItem(item)}
      keywordCount={itemKeywordCounts[item.gid] || 0}
      onUpdateField={(gid, field, value) =>
        updateMutation.mutate({ gid, data: { [field]: value } })
      }
    />
  ))}
</div>
```

**After**：
```tsx
{/* === 桌面端表格 === */}
<div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
  <DataTable
    columns={[
      {
        key: 'title',
        header: '商品信息',
        sortable: true,
        render: (item) => (
          <div className="min-w-0">
            <span
              className="text-left block w-full text-sm text-gray-800 dark:text-gray-200 leading-snug truncate"
              title={item.title || '无标题'}
            >
              {item.title || '无标题'}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-gray-400 truncate text-xs">
              <span title={item.gid} className="min-w-[85px]">{item.gid}</span>
              <span className="text-gray-300">|</span>
              <span title={item.account.uid} className="truncate">{item.account.name}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'price',
        header: '价格',
        sortable: true,
        align: 'center',
        render: (item) => (
          <span className="text-orange-600 font-semibold">¥{item.price}</span>
        ),
      },
      {
        key: 'publishTime',
        header: '发布时间',
        sortable: true,
        align: 'center',
        render: (item) => (
          <span className="text-xs text-gray-500">{formatPublishTime(item.publishTime)}</span>
        ),
      },
      {
        key: 'auto_ai_reply',
        header: 'AI回复',
        align: 'center',
        render: (item) => (
          <IconToggle
            active={item.auto_ai_reply}
            activeClass="text-purple-500 bg-purple-50"
            title={item.auto_ai_reply ? 'AI回复：开' : 'AI回复：关'}
            onClick={() => onToggle(item, 'auto_ai_reply')}
          />
        ),
      },
      {
        key: 'auto_delivery',
        header: '自动发货',
        align: 'center',
        render: (item) => (
          <IconToggle
            active={item.auto_delivery}
            activeClass="text-green-500 bg-green-50"
            title={item.auto_delivery ? '自动发货：开' : '自动发货：关'}
            onClick={() => onToggle(item, 'auto_delivery')}
          />
        ),
      },
      {
        key: 'deliveryContent',
        header: '付款后发货',
        align: 'center',
        render: (item) => (
          <ConfigCell
            value={item.deliveryContent || ''}
            onClick={() => setMobileConfig({ item, field: 'deliveryContent' })}
          />
        ),
      },
      {
        key: 'receiptAfter',
        header: '收货后赠送',
        align: 'center',
        render: (item) => (
          <ConfigCell
            value={item.receiptAfter || ''}
            onClick={() => setMobileConfig({ item, field: 'receiptAfter' })}
          />
        ),
      },
      {
        key: 'positiveReviewAfter',
        header: '评价后赠送',
        align: 'center',
        render: (item) => (
          <ConfigCell
            value={item.positiveReviewAfter || ''}
            onClick={() => setMobileConfig({ item, field: 'positiveReviewAfter' })}
          />
        ),
      },
      {
        key: 'keywordCount',
        header: '关键词回复',
        align: 'center',
        render: (item) => {
          const count = itemKeywordCounts[item.gid] || 0
          return (
            <button
              onClick={() => setKeywordItem(item)}
              className={`text-xs font-medium ${
                count > 0
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {count > 0 ? `${count}条规则` : '未配置'}
            </button>
          )
        },
      },
      {
        key: 'aiReplyItemPrompt',
        header: 'AI提示词',
        align: 'center',
        render: (item) => (
          <ConfigCell
            value={item.aiReplyItemPrompt || ''}
            onClick={() => setMobileConfig({ item, field: 'ai_reply_item_prompt' })}
          />
        ),
      },
      {
        key: 'auto_restock',
        header: '自动上架',
        align: 'center',
        render: (item) => (
          <IconToggle
            active={item.auto_restock}
            activeClass="text-teal-500 bg-teal-50"
            title={item.auto_restock ? '自动上架：开' : '自动上架：关'}
            disabled={item.account.pro}
            disabledTooltip="Pro 账号不支持自动上架"
            onClick={() => onToggle(item, 'auto_restock')}
          />
        ),
      },
      {
        key: 'sendCode',
        header: '指令码',
        sortable: true,
        align: 'center',
        render: (item) => (
          <SendCodeEditor
            variant="cell"
            value={item.sendCode || ''}
            onSave={(value) =>
              updateMutation.mutate({ gid: item.gid, data: { sendCode: value } })
            }
          />
        ),
      },
    ]}
    data={data}
    keyExtractor={(item) => item.gid}
    gridTemplateColumns={ITEMS_GRID_COLS}
    stickyHeader
    orderBy={orderBy}
    asc={asc}
    onSortChange={(field) => onSortChange(field ?? '')}
  />
</div>
```

> **重要说明**：列定义中使用 `ConfigCell`、`IconToggle`、`SendCodeEditor` 组件——这些是从 `ItemRow.tsx` 导入的。迁移后需要确保 ItemsTab 正确导入这些组件。

> **回调适配**：`ConfigCell.onClick` 原来触发 `ItemRow` 内部的 `setConfigField`，这里改用 `setMobileConfig`（ItemsTab 的现有状态），与移动端逻辑保持一致。原来 `ItemRow` 中的 `ConfigDrawer` 不再需要（因为 `mobileConfig` 已经覆盖了桌面端的 ConfigDrawer）。

> **`onSortChange` 适配**：DataTable 内部有 `SortHeaderButton` 子组件。但注意——DataTable 接收的 `onSortChange` 和 ItemsTab 接收的 `onSortChange` prop 名字相同，但类型不同（DataTable 的接受 `field | null`，ItemsTab 的接受 `field: string`）。适配：`(field) => onSortChange(field ?? '')` — 但这丢失了"取消排序"的能力。需要检查 ItemsTab 的 props 来源...

实际上，ItemsTab 的 `onSortChange` prop 由父组件（`ItemsPageContent`）传入，其实现是：
```ts
onSortChange={(field) => onFilterChange((prev) => {
  if (prev.orderBy === field) {
    if (prev.asc === false) return { ...prev, asc: true, page: 1 }
    return { ...prev, orderBy: null, asc: false, page: 1 }
  }
  return { ...prev, orderBy: field, asc: false, page: 1 }
})}
```

这是旧的"外部三态"逻辑。现在 DataTable 内部处理三态，父组件不需要再判断三态。但是 ItemsTab 的 props 类型是 `onSortChange: (field: string) => void`，我们需要在 ItemsTab 内部做适配：

```tsx
// ItemsTab 内部适配
const handleSortChange = (field: string | null) => {
  if (field === null) {
    // 取消排序 — 需要触发 "第三次点击同一列" 的效果
    // 即令父组件的 onFilterChange 清除 orderBy
    // 但我们不能直接调用 onFilterChange...
  }
  // DataTable 内部已处理好三态，这里只需通知父组件当前排序状态
  onSortChange(field ?? '') // 但这不能正确表达"取消排序"
}
```

问题：ItemsTab 的 `onSortChange` prop 是 `(field: string) => void`，不支持 `null`。需要修改 ItemsTab 的 Props 类型，或者让 ItemsTab 内部持有排序状态...

**简化方案**：暂时保持 ItemsTab 的 `onSortChange` 签名不变。在 DataTable 的 `onSortChange` 回调中做适配——当 field 为 null 时不做任何操作（等待未来 ItemsTab props 升级后再支持取消排序）。这样第一次点击 → 排序，第二次点击 → 反向，第三次点击 → 不取消。

或者更好的方式：直接改 ItemsTab 的 props，让 `onSortChange` 接受 `(field: string | null)`。但这又涉及 ItemsPageContent 的修改...

**最简方案（避免改动过多文件）**：ItemsTab 内部用一个 wrapper 函数桥接。三态中，"取消排序"时调用 `onSortChange(orderBy!)` — 即把当前排序字段再发一次，让父组件判断 asc 状态后取消。这利用了父组件现有的三态逻辑：

```tsx
// If DataTable tells us to cancel (field === null), we call onSortChange with the current orderBy
// The parent's existing logic will see orderBy === orderBy && !asc → asc, then → null
// Wait, that won't work because we'd need to call it twice...
```

让我重新想... 实际上父组件的现有逻辑是：
1. orderBy !== field → set orderBy=field, asc=false
2. orderBy === field && !asc → set asc=true  
3. orderBy === field && asc → set orderBy=null, asc=false

DataTable 的三态逻辑产生：
1. 非本列 → `onSortChange(field)` → 父组件 case 1 ✅
2. 本列 desc → `onSortChange(field)` → 父组件 case 2 ✅
3. 本列 asc → `onSortChange(null)` → 父组件需要处理 null

如果 ItemsTab 内部适配为：
```tsx
onSortChange={(field) => {
  if (field === null) {
    // Third click on same column (was asc) → cancel
    // Call parent with current orderBy — parent will hit case 3 and cancel
    onSortChange(orderBy!)
  } else {
    onSortChange(field)
  }
}}
```

当 DataTable 传出 `null`（第三次点击同列），我们传 `orderBy` 给父组件。父组件判断 `prev.orderBy === field` && `prev.asc === true`，走 case 3，清除排序。

✅ 这样就对了！不需要修改 ItemsTab 的 props 签名。

- [ ] **Step 5: 删除 ItemsTab 的 SortHeader 子组件**

删除文件末尾第 196-227 行的 `SortHeader` 函数定义。

- [ ] **Step 6: 检查并更新 ItemsTab 的 imports**

确认需要的 imports：
```tsx
// 新增：
import { DataTable } from '@/components/ui/DataTable'

// 保留（从 ItemRow.tsx 仅导入常量）：
import { ITEMS_GRID_COLS } from '@/components/items/views/ItemRow'

// 保留（ItemRow.tsx 中定义的子组件，DataTable 列定义需要用到）：
// 注意：ConfigCell、IconToggle、SendCodeEditor 是在 ItemRow.tsx 内部定义的私有组件
// 需要把它们从 ItemRow.tsx 导出，或者把它们的逻辑内联到列定义的 render 中
```

> ⚠️ **阻塞问题**：`ConfigCell`、`IconToggle`、`SendCodeEditor` 目前是 ItemRow.tsx 的私有子组件，没有 export。迁移到 DataTable 的列渲染需要使用这些组件。

**解决方案**：
- `IconToggle` → 已在 `components/items/parts/IconToggle.tsx` 中独立存在，直接导入
- `SendCodeEditor` → 已在 `components/items/parts/SendCodeEditor.tsx` 中独立存在，直接导入
- `ConfigCell` → ItemRow.tsx 的私有组件，需要提取到独立文件或导出

检查实际的导入路径：

```tsx
// ItemsTab 当前的 imports（第 3-14 行）：
import type { Item } from "@/lib/api/items"
import type { ConfigField } from "@/components/items/config"
import { ItemRow, ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ErrorBanner } from "@/components/ui/ErrorBanner"
import { EmptyState } from "@/components/ui/EmptyState"
import { Pagination } from "@/components/ui/pagination"
```

迁移后需要的 imports：
```tsx
// 新增：
import { DataTable } from '@/components/ui/DataTable'
import { IconToggle } from '@/components/items/parts/IconToggle'
import { SendCodeEditor } from '@/components/items/parts/SendCodeEditor'

// 保留：
import { ITEMS_GRID_COLS } from '@/components/items/views/ItemRow'
// ItemRow 不再需要

// 删除：
// import { ItemRow } 移除
// LoadingSpinner → 不再需要（DataTable 内部使用）
// ErrorBanner → 不再需要（DataTable 内部使用）
// EmptyState → 不再需要（DataTable 内部使用）
```

> 但 `ConfigCell` 是 ItemRow.tsx 内部的私有组件。我们需要一个替代方案。查看 ItemRow.tsx 中 ConfigCell 的实现（从探索结果）：
> ```tsx
> function ConfigCell({ value, onClick }: { value: string; onClick: () => void }) {
>   const hasValue = value && value.trim().length > 0
>   return (
>     <button onClick={onClick} className={`...`} title={value || "点击配置"}>
>       {hasValue ? <span>已配置</span> : "未配置"}
>     </button>
>   )
> }
> ```
> 最简单的做法：在列定义内联一个简化版的 ConfigCell。

**最终方案**：ItemsTab 迁移时，ConfigCell / IconToggle / SendCodeEditor 的使用方式如下：
- `IconToggle` → 已独立，从 `@/components/items/parts/IconToggle` 导入 ✅
- `SendCodeEditor` → 已独立，从 `@/components/items/parts/SendCodeEditor` 导入 ✅
- `ConfigCell` → 在 ItemsTab 中内联为简单 button（ItemRow.tsx 的 ConfigCell 本就简单）

- [ ] **Step 7: Commit**

```bash
git add components/items/ItemsTab.tsx
git commit -m "refactor: migrate ItemsTab to DataTable component
- replace inline grid table with DataTable
- remove SortHeader sub-component (now internal to DataTable)
- remove ItemRow dependency (each column renders directly)
- ~30 lines removed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 更新组件索引和规范文档

**Files:**
- Modify: `.claude/docs/COMPONENTS.md`
- Modify: `.claude/rules/frontend-components.md`

- [ ] **Step 1: 更新 COMPONENTS.md**

在 SearchToolbar 和 DataTable 的行将状态从 🔴 改为 ✅：

```
| `SearchToolbar` | 搜索栏（搜索框 + 筛选 + 操作按钮） | ✅ |
| `DataTable` | 通用数据表格封装 | ✅ |
```

同时确认以下条目是否需要修改：
- `EmptyState` → 已 ✅
- `ErrorBanner` → 已 ✅
- `ConfirmDialog` → 已 ✅
- `Pagination` → 已 ✅
- `StatusBadge` → 已 ✅
- `AIConfigFormFields` → 已 ✅

- [ ] **Step 2: 更新 frontend-components.md**

找到 SearchToolbar 和 DataTable 的行：
```
| `SearchToolbar` | 搜索栏（搜索框 + 筛选 + 操作按钮） | 🔴 计划中 |
| `DataTable` | 通用数据表格封装 | 🔴 计划中 |
```

改为：
```
| `SearchToolbar` | 搜索栏（搜索框 + 筛选 + 操作按钮） | ✅ |
| `DataTable` | 通用数据表格封装 | ✅ |
```

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/COMPONENTS.md .claude/rules/frontend-components.md
git commit -m "docs: mark SearchToolbar and DataTable as completed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 最终 TypeScript 检查和验证

- [ ] **Step 1: 运行 TypeScript 编译检查**

```bash
npx tsc --noEmit 2>&1
```

Expected: 无错误或仅有预先存在的错误。

- [ ] **Step 2: 检查 ItemsTab.tsx 未使用的 imports**

迁移后以下 import 应被移除：
- `import { LoadingSpinner }` — DataTable 内部使用
- `import { ErrorBanner }` — DataTable 内部使用
- `import { EmptyState }` — DataTable 内部使用
- `import { ItemRow, ... }` — 不再使用
- `import type { ConfigField }` — 检查是否仍有使用（mobileConfig 的 ConfigDrawer 可能仍需）

确认后清理未使用的 imports。

- [ ] **Step 3: 手动验证关键场景**

通过代码 review 确认：
1. 加载态 — DataTable 的 `isLoading` 分支渲染 LoadingSpinner ✅
2. 错误态 — DataTable 的 `error` 分支渲染 ErrorBanner + onRetry ✅
3. 空数据 — DataTable 的 `data.length === 0` 分支渲染 EmptyState ✅
4. 排序 — SortHeaderButton 三态循环 + onSortChange 回调 ✅
5. 桌面端 — `hidden md:block` 容器 + DataTable ✅
6. 移动端 — `md:hidden` 的 MobileProductCard 不受影响 ✅
7. 分页 — 外部 `<Pagination>` 不受影响 ✅
8. 抽屉 — editingItem / keywordItem / mobileConfig 逻辑不受影响 ✅

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final TypeScript cleanup and import optimization

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 依赖关系

```
Task 1 (SearchToolbar) ──┐
                          ├──→ Task 3 (ItemsTab 迁移) ──→ Task 5 (最终检查)
Task 2 (DataTable) ──────┘                                     │
                          Task 4 (文档) ←─────────────────────┘
```

Task 1 和 Task 2 可并行执行。Task 3 依赖 Task 2（DataTable 就绪后迁移）。Task 4 和 Task 5 可并行执行。
