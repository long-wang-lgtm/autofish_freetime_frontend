# Batch-Publish 三表格重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 batch-publish 三个表格添加表头冻结+内部滚动、行点击、列优化，同步增强 DataTable 基础设施

**Architecture:** 从下到上实施——先改 DataTable 和 BatchActionBar 两个共享组件，再逐个重构 MonitorTable / MonitorTab / MonitorDetailPanel，最后改 MaterialTable / MaterialsTab。每步独立可验证。

**Tech Stack:** React + TypeScript + Tailwind CSS v3 + CSS Grid

**Spec:** `docs/superpowers/specs/2026-07-14-batch-publish-table-redesign.md`

---

### Task 1: DataTable — 新增 maxHeight 滚动容器

**Files:**
- Modify: `components/ui/data/DataTable.tsx:46-51, 99-101, 162-237`

- [ ] **Step 1: 添加 maxHeight 和 onRowClick 类型定义**

在 `DataTableProps` 接口末尾（`stickyHeader?: boolean` 之后）添加：

```typescript
  // 行点击
  onRowClick?: (item: T, index: number) => void
  // 滚动容器（opt-in，传入时启用）
  maxHeight?: string
```

修改位置：`DataTable.tsx` 第 49-50 行之后。

- [ ] **Step 2: 解构新 props**

在 `DataTable` 函数解构参数末尾添加（`stickyHeader = false,` 之后第 126 行）：

```typescript
  onRowClick,
  maxHeight,
```

- [ ] **Step 3: 将数据渲染包裹在条件滚动容器中**

将 data 渲染部分（从 `// 4. Data` 注释的 return 开始，约第 163-237 行）改为：

```typescript
  // 4. Data — 表头 + 数据行
  const renderTable = () => (
    <>
      {/* 表头 */}
      <div
        className={cn(
          'grid gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800',
          'text-xs font-medium text-gray-500 dark:text-gray-400',
          'border-b border-gray-200 dark:border-gray-700',
          stickyHeader && maxHeight && 'sticky top-0 z-10',
        )}
        style={{ gridTemplateColumns }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              col.className,
              col.align === 'center' && 'flex items-center justify-center',
              col.align === 'right' && 'flex items-center justify-end',
            )}
          >
            {col.sortable && onSortChange ? (
              <SortHeaderButton
                field={col.key}
                label={typeof col.header === 'string' ? col.header : col.key}
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

        const handleRowClick = onRowClick
          ? (e: React.MouseEvent<HTMLDivElement>) => {
              // 如果点击目标是 button/a/input/select，不触发行点击
              const target = e.target as HTMLElement
              if (target.closest('button, a, input, select')) return
              onRowClick(item, index)
            }
          : undefined

        const handleKeyDown = onRowClick
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                // 如果焦点在 button/a/input/select 上，不触发
                const target = e.target as HTMLElement
                if (target.closest('button, a, input, select')) return
                onRowClick(item, index)
              }
            }
          : undefined

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
              onRowClick && 'cursor-pointer',
              extraClass,
            )}
            style={{ gridTemplateColumns }}
            onClick={handleRowClick}
            onKeyDown={handleKeyDown}
            tabIndex={onRowClick ? 0 : undefined}
            role={onRowClick ? 'button' : undefined}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  col.className,
                  col.align === 'center' && 'flex items-center justify-center',
                  col.align === 'right' && 'flex items-center justify-end',
                )}
              >
                {col.render(item, index)}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )

  return (
    <div className={cn('', className)}>
      {maxHeight ? (
        <div className="overflow-auto" style={{ maxHeight }}>
          {renderTable()}
        </div>
      ) : (
        renderTable()
      )}
    </div>
  )
```

- [ ] **Step 4: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add components/ui/data/DataTable.tsx
git commit -m "feat(DataTable): add maxHeight opt-in scroll container and onRowClick with keyboard a11y"
```

---

### Task 2: BatchActionBar — 新增 sticky prop

**Files:**
- Modify: `components/batch-publish/shared/BatchActionBar.tsx:1-52`

- [ ] **Step 1: 添加 sticky prop 并条件应用 className**

```typescript
'use client'

interface BatchActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }[]
  sticky?: boolean  // 默认 true，向后兼容
}

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function BatchActionBar({ selectedCount, onClear, actions, sticky = true }: BatchActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg -mx-1 ${sticky ? 'sticky bottom-0 z-20' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">
          已选{' '}
          <span className="text-blue-600 font-semibold">{selectedCount}</span>{' '}
          项
        </span>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          取消选择
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              variantStyles[action.variant || 'primary']
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

核心改动：`sticky?: boolean` prop（默认 `true`），className 中 `sticky bottom-0 z-20` 改为条件渲染 `${sticky ? 'sticky bottom-0 z-20' : ''}`。

- [ ] **Step 2: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/shared/BatchActionBar.tsx
git commit -m "feat(BatchActionBar): add sticky prop (default true) for flexible positioning"
```

---

### Task 3: MonitorTable — 列重构（11→9 列）

**Files:**
- Modify: `components/batch-publish/monitor/MonitorTable.tsx` (full rewrite of columns)

- [ ] **Step 1: 重写 MonitorTable——合并 gid+标题、删除操作列、全部居中、绑定商机用 button**

将 MonitorTable.tsx 整个文件内容替换为：

```typescript
'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorTableProps {
  data: MonitoredItem[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  orderBy: string | null
  asc: boolean
  onSortChange: (field: string | null) => void
  selectedGids: Set<string>
  onToggleSelect: (gid: string) => void
  onToggleAll: () => void
  onOpenDetail: (item: MonitoredItem) => void
  onBindOpportunity: (gid: string) => void
  onNavigateOpportunity: (oid: number) => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

const GRID_COLS = '32px 2fr 0.7fr 0.8fr 0.8fr 0.7fr 0.6fr 0.6fr 0.8fr'

const ITEM_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0: { label: '在售', color: 'green' },
  1: { label: '下架', color: 'gray' },
  2: { label: '售出', color: 'amber' },
}

export function MonitorTable({
  data,
  isLoading,
  error,
  onRetry,
  orderBy,
  asc,
  onSortChange,
  selectedGids,
  onToggleSelect,
  onToggleAll,
  onOpenDetail,
  onBindOpportunity,
  onNavigateOpportunity,
  page,
  total,
  pageSize,
  onPageChange,
}: MonitorTableProps) {
  const columns = useMemo<DataTableColumn<MonitoredItem>[]>(() => [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={data.length > 0 && selectedGids.size === data.length}
          onChange={onToggleAll}
          className="w-4 h-4 rounded border-gray-300"
        />
      ),
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedGids.has(item.gid)}
          onChange={() => onToggleSelect(item.gid)}
          className="w-4 h-4 rounded border-gray-300"
        />
      ),
    },
    {
      key: 'productInfo',
      header: '商品信息',
      render: (item) => (
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-gray-500 tabular-nums truncate">{item.gid}</span>
          <span className="text-sm text-gray-800 leading-snug line-clamp-1">{item.title || '-'}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: '价格',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.price != null ? fmtPrice(item.price) : '-'}
        </span>
      ),
    },
    {
      key: 'wantSlope',
      header: '想要斜率',
      sortable: true,
      align: 'center',
      render: (item) => {
        const td = item.trendData as Record<string, unknown> | null | undefined
        const fc = td?.fetchCount as number | undefined
        const windows = td?.windows as number | undefined
        const lowConfidence = fc != null && fc < 6
        return (
          <div className="flex flex-col items-center">
            <span className={`text-sm tabular-nums ${(item.wantSlope ?? 0) > 0 ? 'text-green-600' : (item.wantSlope ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {fmtGrowth(item.wantSlope ?? null)}
            </span>
            <span className={`text-xs ${lowConfidence ? 'italic text-amber-600' : 'text-gray-400'}`}>
              {fc != null ? `采集${fc}次` : '无数据'}·窗口{windows ?? '?'}天
            </span>
          </div>
        )
      },
    },
    {
      key: 'wantAvg',
      header: '日均想要',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.wantAvg != null ? fmtNumber(item.wantAvg) : '-'}
        </span>
      ),
    },
    {
      key: 'convertRate',
      header: '转化率',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {fmtPercent(item.convertRate ?? null)}
        </span>
      ),
    },
    {
      key: 'itemStatus',
      header: '商品状态',
      align: 'center',
      render: (item) => (
        <StatusBadge status={item.itemStatus ?? 0} config={ITEM_STATUS_CONFIG} />
      ),
    },
    {
      key: 'monitorStatus',
      header: '监控状态',
      align: 'center',
      render: (item) => (
        <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
      ),
    },
    {
      key: 'opportunity',
      header: '绑定商机',
      align: 'center',
      render: (item) => {
        if (item.opportunity?.id) {
          return (
            <button
              onClick={() => onNavigateOpportunity(item.opportunity!.id)}
              className="text-sm text-blue-600 hover:underline transition-colors"
            >
              {item.opportunity.name ?? `商机 #${item.opportunity.id}`}
            </button>
          )
        }
        return (
          <button
            onClick={() => onBindOpportunity(item.gid)}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            未绑定
          </button>
        )
      },
    },
  ], [selectedGids, onToggleSelect, onToggleAll, onBindOpportunity, onNavigateOpportunity, data.length])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.gid}
        gridTemplateColumns={GRID_COLS}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="暂无监控商品"
        emptyDescription="添加关键词后，系统将自动采集监控商品数据"
        orderBy={orderBy}
        asc={asc}
        onSortChange={onSortChange}
        onRowClick={onOpenDetail}
        maxHeight="calc(100vh - 320px)"
        stickyHeader
      />
      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </div>
  )
}
```

核心改动：
1. `GRID_COLS` 从 11 列 → 9 列
2. `gid` + `title` 合并为 `productInfo` 列（上行 gid gray-500 text-xs，下行 title text-sm leading-snug line-clamp-1）
3. 删除 `actions` 列（行点击替代）
4. `price` / `wantSlope` / `wantAvg` / `convertRate` / `itemStatus` / `monitorStatus` / `opportunity` 全部 `align: 'center'`
5. `opportunity` 列使用 `<button>` 替代 `<span>`
6. 新增 props: `onBindOpportunity`, `onNavigateOpportunity`
7. 传入 `onRowClick={onOpenDetail}`, `maxHeight="calc(100vh - 320px)"`
8. `ITEM_STATUS_CONFIG` 提取到文件顶部常量（从 render 内联提升）

- [ ] **Step 2: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

Expected: 由于 MonitorTab 尚未更新 props，此时会有类型错误。预期——下一步 MonitorTab 会修复。

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/monitor/MonitorTable.tsx
git commit -m "refactor(MonitorTable): 11→9 cols — merge gid+title, drop actions, center-align, button-based opportunity binding"
```

---

### Task 4: BindOpportunityModal — 新增 mode prop

**Files:**
- Modify: `components/batch-publish/monitor/BindOpportunityModal.tsx:10-16, 68`

- [ ] **Step 1: 添加 mode prop**

将接口改为：

```typescript
interface BindOpportunityModalProps {
  open: boolean
  onClose: () => void
  selectedCount: number
  mode?: 'batch' | 'single'  // 默认 'batch'
  onConfirm: (opportunityId: number) => void
  isPending: boolean
}

export function BindOpportunityModal({
  open,
  onClose,
  selectedCount,
  mode = 'batch',
  onConfirm,
  isPending,
}: BindOpportunityModalProps) {
```

Modal 标题行（第 68 行附近 `title={`绑定商品到商机（已选 ${selectedCount} 个）`}`）改为根据 mode 显示不同文案：

```typescript
      title={
        mode === 'single'
          ? '绑定商品到商机'
          : `绑定商品到商机（已选 ${selectedCount} 个）`
      }
```

- [ ] **Step 2: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/monitor/BindOpportunityModal.tsx
git commit -m "feat(BindOpportunityModal): add mode prop for batch vs single binding"
```

---

### Task 5: MonitorDetailPanel — 新增 props + 快捷操作区 + EmptyState

**Files:**
- Modify: `components/batch-publish/monitor/MonitorDetailPanel.tsx:1-87`

- [ ] **Step 1: 重写 MonitorDetailPanel**

```typescript
'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { MonitorTrendCharts } from './MonitorTrendCharts'
import { fmtPrice } from '@/lib/utils/format'
import { useState } from 'react'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorDetailPanelProps {
  item: MonitoredItem
  onClose: () => void
  onSingleBind?: (gid: string) => void
  onDeleteItem?: (gid: string) => void
}

const ITEM_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0: { label: '在售', color: 'green' },
  1: { label: '下架', color: 'gray' },
  2: { label: '售出', color: 'amber' },
}

export function MonitorDetailPanel({ item, onClose, onSingleBind, onDeleteItem }: MonitorDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const td = item.trendData as Record<string, unknown> | null | undefined
  const trendTime = td?.trendTime as { timestamp?: unknown } | undefined
  const hasTrendData = Array.isArray(trendTime?.timestamp) && (trendTime!.timestamp as unknown[]).length > 0
  const fetchCount = td?.fetchCount as number | undefined
  const windows = td?.windows as number | undefined
  const lowConfidence = fetchCount != null && fetchCount < 6
  const hasOpportunity = !!item.opportunity?.id

  return (
    <>
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">商品详情</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Bar */}
        {(onSingleBind || onDeleteItem) && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 flex-shrink-0">
            {onSingleBind && !hasOpportunity && (
              <button
                onClick={() => onSingleBind(item.gid)}
                className="h-8 px-3 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                绑定商机
              </button>
            )}
            {onDeleteItem && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                取消监控
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
          <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{item.title || '无标题'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.price != null && (
              <span className="text-sm font-semibold text-gray-900">{fmtPrice(item.price)}</span>
            )}
            <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
            {item.itemStatus != null && (
              <StatusBadge status={item.itemStatus} config={ITEM_STATUS_CONFIG} />
            )}
          </div>
          {td && (
            <p className="text-xs text-gray-400">
              采集{fetchCount ?? '?'}次 · 窗口{windows ?? '?'}天
            </p>
          )}
          {lowConfidence && (
            <p className="text-xs text-amber-600 italic">
              采集次数较少（{fetchCount}次），数据置信度较低
            </p>
          )}
        </div>

        {/* Trend Charts */}
        <div className="flex-1 min-h-0 p-4">
          {hasTrendData ? (
            <MonitorTrendCharts
              trendData={{
                trendTime: td!.trendTime as any,
                trendDays: td!.trendDays as any,
                fetchCount: (fetchCount ?? 0),
                windows: (windows ?? 0),
              }}
            />
          ) : (
            <EmptyState
              size="sm"
              title="暂无趋势数据"
              description="持续监控后将自动生成趋势图表"
            />
          )}
        </div>
      </div>

      {/* Delete ConfirmDialog */}
      {onDeleteItem && (
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false) }}
          title="确认取消监控"
          description={`确定要取消对 "${item.title || item.gid}" 的监控吗？此操作不可恢复。`}
          confirmLabel="取消监控"
          variant="danger"
          onConfirm={() => {
            onDeleteItem(item.gid)
            setShowDeleteConfirm(false)
          }}
        />
      )}
    </>
  )
}
```

核心改动：
- 新增 props: `onSingleBind`, `onDeleteItem`
- 新增操作栏（Summary 上方）：绑定商机按钮（仅未绑定时显示）、取消监控按钮（红色）
- 空状态：纯文本 → `EmptyState size="sm"`
- 取消监控带 `ConfirmDialog`

- [ ] **Step 2: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/monitor/MonitorDetailPanel.tsx
git commit -m "feat(MonitorDetailPanel): add action buttons, EmptyState, and new props for bind/delete"
```

---

### Task 6: MonitorTab — 单条绑定 + BatchActionBar sticky={false} + 行点击绑定

**Files:**
- Modify: `components/batch-publish/monitor/MonitorTab.tsx` (full rewrite)

- [ ] **Step 1: 重写 MonitorTab**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useMonitorPage } from '@/hooks/batch-publish/useMonitorPage'
import { MonitorFilterBar } from './MonitorFilterBar'
import { MonitorTable } from './MonitorTable'
import { MonitorDetailPanel } from './MonitorDetailPanel'
import { MonitorCard } from './MonitorCard'
import { BindOpportunityModal } from './BindOpportunityModal'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { renderErrorGuard } from '@/components/batch-publish/shared/ErrorGuard'
import { useRouter } from 'next/navigation'
import type { MonitoredItem } from '@/lib/api/batch-publish'

export function MonitorTab() {
  const {
    search, monitorStatus, bindStatus, onFilterChange,
    orderBy, asc, onSortChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    bindMutation, unbindMutation, deleteMutation,
    singleBindMutation,
    isMobile,
  } = useMonitorPage()

  const router = useRouter()

  // 批量选择
  const [selectedGids, setSelectedGids] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  // 单条绑定
  const [singleBindGid, setSingleBindGid] = useState<string | null>(null)
  const [bindModalOpen, setBindModalOpen] = useState(false)

  // 详情侧边栏
  const [detailItem, setDetailItem] = useState<MonitoredItem | null>(null)

  // 确认弹窗
  const [unbindTarget, setUnbindTarget] = useState<MonitoredItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MonitoredItem | null>(null)

  const onToggleSelect = useCallback((gid: string) => {
    setSelectedGids((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid); else next.add(gid)
      return next
    })
  }, [])

  const onToggleAll = useCallback(() => {
    if (selectedGids.size === data.length) {
      setSelectedGids(new Set())
    } else {
      setSelectedGids(new Set(data.map((d) => d.gid)))
    }
  }, [selectedGids, data])

  const onClearSelection = useCallback(() => {
    setSelectedGids(new Set())
    setSelectionMode(false)
    setSingleBindGid(null)
    setBindModalOpen(false)
  }, [])

  // 批量绑定
  const handleBatchBindConfirm = useCallback((opportunityId: number) => {
    bindMutation.mutate(
      { gids: Array.from(selectedGids), opportunityId },
      { onSuccess: () => { onClearSelection() } }
    )
  }, [selectedGids, bindMutation, onClearSelection])

  // 单条绑定
  const handleSingleBindConfirm = useCallback((opportunityId: number) => {
    if (!singleBindGid) return
    singleBindMutation.mutate(
      { gid: singleBindGid, opportunityId },
      { onSuccess: () => { setSingleBindGid(null); onClearSelection() } }
    )
  }, [singleBindGid, singleBindMutation, onClearSelection])

  const bindModalOnConfirm = singleBindGid ? handleSingleBindConfirm : handleBatchBindConfirm
  const bindModalSelectedCount = singleBindGid ? 1 : selectedGids.size
  const bindModalMode = singleBindGid ? 'single' as const : 'batch' as const
  const bindModalIsPending = singleBindGid ? singleBindMutation.isPending : bindMutation.isPending

  const handleOpenSingleBind = useCallback((gid: string) => {
    setSingleBindGid(gid)
    setBindModalOpen(true)
  }, [])

  const handleOpenBatchBind = useCallback(() => {
    setSingleBindGid(null)
    setBindModalOpen(true)
  }, [])

  const handleNavigateOpportunity = useCallback((oid: number) => {
    router.push(`/dashboard/batch-publish?tab=workbench&oid=${oid}`)
  }, [router])

  const handleCloseDetail = useCallback(() => setDetailItem(null), [])

  const errorGuard = renderErrorGuard({
    error,
    isLoading,
    hasData: data.length > 0,
    onRetry: () => refetch(),
  })
  if (errorGuard) return errorGuard

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <MonitorFilterBar
        search={search}
        monitorStatus={monitorStatus}
        bindStatus={bindStatus}
        onFilterChange={onFilterChange}
        onRefresh={() => refetch()}
      />

      {/* BatchActionBar — 非 sticky，在筛选栏和表格之间 */}
      {!isMobile && selectedGids.size > 0 && (
        <BatchActionBar
          selectedCount={selectedGids.size}
          onClear={onClearSelection}
          sticky={false}
          actions={[
            { label: '绑定商机', onClick: handleOpenBatchBind, variant: 'primary' },
          ]}
        />
      )}

      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              size="sm"
              title="暂无监控商品"
              description="添加关键词后，系统将自动采集监控商品数据"
            />
          ) : (
            data.map((item) => (
              <MonitorCard
                key={item.gid}
                item={item}
                isSelected={selectedGids.has(item.gid)}
                onToggleSelect={onToggleSelect}
                onOpenDetail={setDetailItem}
                selectionMode={selectionMode}
              />
            ))
          )}
          {selectionMode && (
            <BatchActionBar
              selectedCount={selectedGids.size}
              onClear={onClearSelection}
              actions={[
                { label: '绑定商机', onClick: handleOpenBatchBind, variant: 'primary' },
                { label: '退出选择', onClick: () => { setSelectionMode(false); onClearSelection() }, variant: 'secondary' },
              ]}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MonitorTable
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            orderBy={orderBy}
            asc={asc}
            onSortChange={onSortChange}
            selectedGids={selectedGids}
            onToggleSelect={onToggleSelect}
            onToggleAll={onToggleAll}
            onOpenDetail={setDetailItem}
            onBindOpportunity={handleOpenSingleBind}
            onNavigateOpportunity={handleNavigateOpportunity}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Detail Panel */}
      {detailItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-20" onClick={handleCloseDetail} />
          <MonitorDetailPanel
            item={detailItem}
            onClose={handleCloseDetail}
            onSingleBind={handleOpenSingleBind}
            onDeleteItem={(gid) => {
              const item = data.find((d) => d.gid === gid)
              if (item) setDeleteTarget(item)
            }}
          />
        </>
      )}

      {/* Bind Modal */}
      <BindOpportunityModal
        open={bindModalOpen}
        onClose={() => { setBindModalOpen(false); setSingleBindGid(null) }}
        selectedCount={bindModalSelectedCount}
        mode={bindModalMode}
        onConfirm={bindModalOnConfirm}
        isPending={bindModalIsPending}
      />

      {/* Unbind Confirm */}
      {unbindTarget && (
        <ConfirmDialog
          open={!!unbindTarget}
          onOpenChange={(open) => { if (!open) setUnbindTarget(null) }}
          title="确认解绑"
          description={`确定要解绑商品 "${unbindTarget.title || unbindTarget.gid}" 吗？`}
          confirmLabel="解绑"
          variant="danger"
          loading={unbindMutation.isPending}
          onConfirm={() => unbindMutation.mutate(unbindTarget.gid, { onSuccess: () => setUnbindTarget(null) })}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          title="确认删除"
          description={`确定要删除监控商品 "${deleteTarget.title || deleteTarget.gid}" 吗？此操作不可恢复。`}
          confirmLabel="删除"
          variant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.gid, { onSuccess: () => setDeleteTarget(null) })}
        />
      )}
    </div>
  )
}
```

核心改动：
1. 从 `useMonitorPage` 解构 `singleBindMutation`（之前未使用）
2. 新增 `singleBindGid` 状态 → 单条绑定时设值，触发 modal 打开（`bindModalOpen = selectedGids.size > 0 || singleBindGid !== null`）
3. 根据 `singleBindGid` 切换 confirm handler（`handleBatchBindConfirm` vs `handleSingleBindConfirm`）
4. 新增 `handleOpenSingleBind(gid)` → `setSingleBindGid(gid)`
5. 新增 `handleNavigateOpportunity(oid)` → `router.push`
6. MonitorTable 传入 `onBindOpportunity` / `onNavigateOpportunity`
7. BatchActionBar 传入 `sticky={false}`（非 sticky），位置上移到筛选栏和表格之间
8. MonitorDetailPanel 传入 `onSingleBind` / `onDeleteItem`
9. 导入 `useRouter`

- [ ] **Step 2: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/monitor/MonitorTab.tsx
git commit -m "refactor(MonitorTab): single-bind flow, BatchActionBar non-sticky, row click wiring, modal mode support"
```

---

### Task 7: MaterialTable — 列顺序重排 + 对齐 + 默认筛选

**Files:**
- Modify: `components/batch-publish/materials/MaterialTable.tsx` (rewrite columns)
- Modify: `components/batch-publish/materials/MaterialsTab.tsx` (maxHeight prop)
- Modify: `hooks/batch-publish/useMaterialsFilters.ts:8` (default status)

- [ ] **Step 1: 修改 useMaterialsFilters 默认 status**

将第 8 行：
```typescript
  const [status, setStatus] = useState('')
```
改为：
```typescript
  const [status, setStatus] = useState('published,publish_failed')
```

- [ ] **Step 2: 重写 MaterialTable 列**

将 `MaterialTable.tsx` 完整替换为：

```typescript
'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtDateTime, fmtPrice } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialTableProps {
  data: PublishMaterial[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  onOpportunityClick: (id: number) => void
}

const GRID_COLS = '1fr 2.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.7fr 0.8fr'

export function MaterialTable({
  data, isLoading, error, onRetry,
  page, total, pageSize, onPageChange,
  onOpportunityClick,
}: MaterialTableProps) {
  const columns = useMemo<DataTableColumn<PublishMaterial>[]>(() => [
    {
      key: 'opportunity',
      header: '所属商机',
      align: 'center',
      render: (item) => {
        if (item.opportunity?.id) {
          return (
            <button
              onClick={() => onOpportunityClick(item.opportunity!.id)}
              className="text-sm text-blue-600 hover:underline transition-colors"
            >
              {item.opportunity.name ?? `商机 #${item.opportunity.id}`}
            </button>
          )
        }
        return <span className="text-sm text-gray-400">—</span>
      },
    },
    {
      key: 'description',
      header: '描述',
      render: (item) => (
        <span className="text-sm text-gray-800 leading-snug line-clamp-2">{item.description || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: '价格',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.price != null ? fmtPrice(item.price) : '-'}
        </span>
      ),
    },
    {
      key: 'category',
      header: '类目',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.category || '-'}</span>
      ),
    },
    {
      key: 'to_uid',
      header: '发布账号',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.to_uid || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      align: 'center',
      render: (item) => (
        <StatusBadge status={item.status} config={MATERIAL_STATUS_CONFIG} />
      ),
    },
    {
      key: 'to_gid',
      header: '发布商品',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-600 tabular-nums">{item.to_gid || '-'}</span>
      ),
    },
    {
      key: 'updated_at',
      header: '发布时间',
      align: 'center',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.updated_at ? fmtDateTime(item.updated_at) : '-'}
        </span>
      ),
    },
  ], [onOpportunityClick])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns={GRID_COLS}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="暂无发布记录"
        emptyDescription="在创作台完成素材发布后，记录将出现在这里"
        stickyHeader
        maxHeight="calc(100vh - 320px)"
      />
      <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
    </div>
  )
}
```

核心改动：
1. `GRID_COLS` 从 `'0.8fr 2fr 0.6fr 0.8fr 0.6fr 1fr 0.7fr 0.7fr'` → `'1fr 2.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.7fr 0.8fr'`
2. 列顺序：`opportunity → description → price → category → to_uid → status → to_gid → updated_at`
3. 全部 `align: 'center'`（仅 description 左对齐）
4. 无商机显示灰色 "—"（纯文本不可点击）
5. 传入 `maxHeight="calc(100vh - 320px)"`

- [ ] **Step 3: TypeScript 检查**

Run: `cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/batch-publish/materials/MaterialTable.tsx hooks/batch-publish/useMaterialsFilters.ts
git commit -m "refactor(MaterialTable): reorder columns, center-align, default filter to published+publish_failed"
```

---

### Task 8: 最终验证与构建

- [ ] **Step 1: 完整 TypeScript 检查**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

Expected: zero errors across all files.

- [ ] **Step 2: 生产构建验证**

```bash
cd E:\.project\autofish_freetime\frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: 最终 commit (如有未提交文件)**

```bash
git status
git add -A
git commit -m "chore: final verification — TypeScript check and build pass"
```

---

## Changed Files Summary

| # | File | Change Type |
|---|------|-------------|
| 1 | `components/ui/data/DataTable.tsx` | Modify — add `maxHeight`, `onRowClick`, keyboard a11y |
| 2 | `components/batch-publish/shared/BatchActionBar.tsx` | Modify — add `sticky` prop |
| 3 | `components/batch-publish/monitor/MonitorTable.tsx` | Modify — 11→9 cols, merged gid+title, `<button>` opportunity, `onRowClick` |
| 4 | `components/batch-publish/monitor/BindOpportunityModal.tsx` | Modify — add `mode` prop |
| 5 | `components/batch-publish/monitor/MonitorDetailPanel.tsx` | Modify — new props, action buttons, EmptyState |
| 6 | `components/batch-publish/monitor/MonitorTab.tsx` | Modify — single-bind flow, BatchActionBar non-sticky, wiring |
| 7 | `components/batch-publish/materials/MaterialTable.tsx` | Modify — column reorder, center-align, maxHeight |
| 8 | `hooks/batch-publish/useMaterialsFilters.ts` | Modify — default status `published,publish_failed` |
