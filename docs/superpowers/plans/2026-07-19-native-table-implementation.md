# NativeTable 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 创建基于原生 `<table>` + `table-layout: fixed` 的 NativeTable 组件，替换 MaterialWorkspace 中手写的独立 Grid 表格，从架构上消除表头/表行列错位问题。

**架构:** 新组件 `NativeTable.tsx`——底层 `<table>` + `<colgroup>` 保证列对齐 100% 可靠。通过 `RowComponent` prop 支持需要 hooks 的复杂行渲染。MaterialRow 逻辑提取到 `MaterialTableRow` 组件（渲染 `<td>`），MaterialWorkspace 删除手写的 Grid 表头 + loading/error/empty 三态。DataTable 不动。

**技术栈:** React, TypeScript, Tailwind CSS v3, React Query

**设计文档勘误:** spec 3.3 节提议 `useMaterialRow` 在 render 回调中调用——这违反 React hooks 规则（hooks 不能在回调中调用）。纠正方案：NativeTable 新增 `RowComponent` prop，MaterialTableRow 是真正的 React 组件，可以自由使用 hooks。

---

## 文件清单

| 操作 | 文件 | 职责 |
|------|------|------|
| **新建** | `components/ui/data/NativeTable.tsx` | 原生 `<table>` 组件 — `<colgroup>` + 四态 + sticky header + 排序 + 行点击 |
| **修改** | `components/ui/data/index.ts` | 添加 NativeTable / NativeTableColumn / NativeTableProps 导出 |
| **新建** | `components/batch-publish/workbench/MaterialTableRow.tsx` | 每行组件 — 渲染 `<td>`，包含所有 hooks（cache 读取、mutation、state） |
| **修改** | `components/batch-publish/workbench/MaterialWorkspace.tsx` | 替换手写 Grid + loading/error/empty → NativeTable |
| **删除** | `components/batch-publish/workbench/MaterialRow.tsx` | 被 MaterialTableRow + NativeTable 替代 |
| **不动** | `components/ui/data/DataTable.tsx` | — |
| **不动** | `components/batch-publish/shared/constants.ts` | `MATERIAL_GRID_COLS` 暂时保留 |

---

### Task 1: 创建 NativeTable 组件

**文件:**
- 新建: `components/ui/data/NativeTable.tsx`

- [ ] **Step 1: 写入 NativeTable.tsx**

```typescript
'use client'

import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'

// ---- 类型 ----

export interface NativeTableColumn<T> {
  key: string
  header: React.ReactNode
  width?: string                     // CSS 宽度：'32px' / '28%' / '100px'，不设则浏览器均分剩余
  align?: 'left' | 'center' | 'right'
  className?: string                 // 应用于 <th> 和 <td>
  sortable?: boolean
  render?: (item: T, index: number) => React.ReactNode  // RowComponent 未提供时必需
}

export interface NativeTableProps<T> {
  columns: NativeTableColumn<T>[]
  data: T[] | undefined
  keyExtractor: (item: T) => string | number

  // 四态
  isLoading?: boolean
  error?: unknown
  errorMessage?: string
  onRetry?: () => void

  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }

  // 排序
  orderBy?: string | null
  asc?: boolean
  onSortChange?: (field: string | null) => void

  // 行
  /** 可选的行级组件。传入后替代 column.render() 渲染数据行——当单元格需要 hooks 时使用此 prop。组件必须返回 <td> 元素。 */
  RowComponent?: React.ComponentType<{ item: T; index: number }>
  rowClassName?: string | ((item: T, index: number) => string)
  onRowClick?: (item: T, index: number) => void

  stickyHeader?: boolean
  className?: string
}

// ---- 排序按钮 ----

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

// ---- 主组件 ----

export function NativeTable<T>({
  columns,
  data,
  keyExtractor,

  isLoading,
  error,
  errorMessage,
  onRetry,

  emptyTitle = '暂无数据',
  emptyDescription,
  emptyAction,

  orderBy,
  asc = false,
  onSortChange,

  RowComponent,
  rowClassName,
  onRowClick,

  stickyHeader = false,
  className,
}: NativeTableProps<T>) {
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
        size="md"
      />
    )
  }

  // 4. Data
  const handleRowClick = onRowClick
    ? (e: React.MouseEvent<HTMLTableRowElement>, item: T, index: number) => {
        const target = e.target as HTMLElement
        if (
          target.closest('button') ||
          target.closest('a') ||
          target.closest('input') ||
          target.closest('select')
        )
          return
        onRowClick(item, index)
      }
    : undefined

  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full table-fixed border-collapse">
        {/* 列宽定义 */}
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>

        {/* 表头 */}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-2 py-2 text-xs font-medium text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400',
                  'border-b border-gray-200 dark:border-gray-700',
                  stickyHeader && 'sticky top-0 z-10',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.className,
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
              </th>
            ))}
          </tr>
        </thead>

        {/* 数据行 */}
        <tbody>
          {data.map((item, index) => {
            const extraClass =
              typeof rowClassName === 'function'
                ? rowClassName(item, index)
                : rowClassName

            return (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'border-b border-gray-100 dark:border-gray-800',
                  'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                  onRowClick && 'cursor-pointer',
                  extraClass,
                )}
                onClick={handleRowClick ? (e) => handleRowClick(e, item, index) : undefined}
              >
                {RowComponent ? (
                  <RowComponent item={item} index={index} />
                ) : (
                  columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-2 py-2 text-sm text-gray-700 dark:text-gray-300 leading-tight',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.className,
                      )}
                    >
                      {col.render?.(item, index)}
                    </td>
                  ))
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "NativeTable" | head -10
```

期望：NativeTable.tsx 无类型错误。

- [ ] **Step 3: 提交**

```bash
git add components/ui/data/NativeTable.tsx
git commit -m "feat: add NativeTable — native <table> + table-layout:fixed component

- <table>/<thead>/<tbody>/<colgroup> for guaranteed column alignment
- Per-column width via NativeTableColumn.width (px or %), no fr units
- Four-state rendering: loading/error/empty/data
- Sticky header via <th class='sticky top-0'>
- SortHeaderButton (same logic as DataTable)
- Optional RowComponent prop for hook-based row rendering
- table-layout:fixed eliminates min-width:auto column drift entirely

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 添加 NativeTable 导出

**文件:**
- 修改: `components/ui/data/index.ts`

- [ ] **Step 1: 添加导出行**

文件: `components/ui/data/index.ts`

```typescript
export { DataTable } from './DataTable'
export type { DataTableColumn, DataTableProps } from './DataTable'
export { NativeTable } from './NativeTable'
export type { NativeTableColumn, NativeTableProps } from './NativeTable'
export { EditableCell } from './EditableCell'
export type { EditableCellProps } from './EditableCell'
export { Pagination } from './Pagination'
export { SearchToolbar } from './SearchToolbar'
```

改动：在 DataTable 导出后、EditableCell 导出前，插入两行 NativeTable 导出。

- [ ] **Step 2: 验证 TypeScript**

```bash
npx tsc --noEmit --pretty 2>&1 | grep "error TS" | head -10
```

期望：无新增错误。

- [ ] **Step 3: 提交**

```bash
git add components/ui/data/index.ts
git commit -m "feat: export NativeTable/NativeTableColumn/NativeTableProps from barrel

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 创建 MaterialTableRow 组件

**文件:**
- 新建: `components/batch-publish/workbench/MaterialTableRow.tsx`
- 参考读取: `components/batch-publish/workbench/MaterialRow.tsx`（逻辑来源）

MaterialTableRow 从 MaterialRow 提取所有数据+操作+状态逻辑，渲染 `<td>` 元素。它是 React 组件（不是 render 回调），因此可以自由使用 hooks。

**结构关键点：** `ConfirmDialog` 不能作为 `<td>` 的子元素（也不应放在 `<tr>` 内）。使用 `createPortal` 将 ConfirmDialog 渲染到 `document.body`，避免无效 DOM 嵌套。

- [ ] **Step 1: 写入 MaterialTableRow.tsx**

```typescript
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { InlineEditCell } from './InlineEditCell'
import { MaterialImageCell } from './MaterialImageCell'
import { ProgressActionCell } from './ProgressActionCell'
import { editMaterial, getChannel, triggerWork, publishMaterial, deleteMaterial } from '@/lib/api/batch-publish'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useToast } from '@/components/ui/Toaster'
import { useState } from 'react'
import type { PublishMaterial, MaterialListResponse, MaterialImage, ChannelItemResponse, RewriteStage } from '@/lib/api/batch-publish'
import type { Account } from '@/lib/api/accounts'

export interface MaterialTableRowProps {
  item: PublishMaterial
  index: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenEditor: (id: number) => void
  onOpenContextModal: (id: number) => void
  selectedOid: number | undefined
  materialPage: number
}

export function MaterialTableRow({
  item: material, index: _index, isSelected, onToggleSelect, onOpenEditor,
  onOpenContextModal, selectedOid, materialPage,
}: MaterialTableRowProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showDelete, setShowDelete] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)

  // 1. Accounts（仅 status === 1 = 正常）
  const accounts = queryClient.getQueryData<Account[]>(['accounts'])
  const activeAccounts = (accounts ?? []).filter(a => a.status === 1)

  // 2. Channel 选项（惰性加载：to_uid 存在且 category 为空时自动拉取；
  //    若已有 category，等用户点击下拉时再按需加载）
  const { data: channels = [], refetch: refetchChannels } = useQuery<ChannelItemResponse[]>({
    queryKey: ['batch-publish', 'channel', material.id],
    queryFn: () => getChannel(material.id),
    enabled: !!material.to_uid && !!material.description && !material.category,
    staleTime: 10 * 60 * 1000,
  })

  // ---- 行内保存辅助函数 ----

  const optimisticUpdate = (field: string, value: unknown) => {
    queryClient.setQueryData<MaterialListResponse>(
      ['batch-publish', 'materials', selectedOid, { page: materialPage }],
      (old) => old ? {
        ...old,
        items: old.items.map(m => m.id === material.id ? { ...m, [field]: value } : m)
      } : old
    )
  }

  const handleInlineSave = async (field: string, value: unknown) => {
    setSavingField(field)
    // to_uid 不乐观更新——getChannel 需等后端确认 + description 非空
    if (field !== 'to_uid') {
      optimisticUpdate(field, value)
    }
    try {
      await editMaterial({ id: material.id, [field]: value } as Parameters<typeof editMaterial>[0])
      if (field === 'to_uid') {
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
        queryClient.invalidateQueries({ queryKey: ['batch-publish', 'channel', material.id] })
      }
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: `保存失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    } finally {
      setSavingField(null)
    }
  }

  const handleImagesChange = (images: MaterialImage[]) => {
    optimisticUpdate('images', images)
  }

  const handleTriggerWork = async (stage: RewriteStage) => {
    try {
      await triggerWork(material.id, stage)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}完成`, variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `操作失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    }
  }

  const handlePublish = async () => {
    try {
      await publishMaterial(material.id)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '发布成功', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `发布失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    }
  }

  const handleDeleteMaterial = async () => {
    setSavingField('delete')
    try {
      await deleteMaterial(material.id)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
      toast.addToast({ title: '素材已删除', variant: 'success' })
    } catch (err) {
      toast.addToast({ title: `删除失败：${(err as Error)?.message || '请稍后重试'}`, variant: 'error' })
    } finally {
      setSavingField(null)
    }
    setShowDelete(false)
  }

  const isAnyLoading = savingField !== null

  return (
    <>
      {/* ☐ 复选框 */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(material.id)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>

      {/* 🖼 封面图 */}
      <td className="px-2 py-2 text-center">
        <MaterialImageCell
          images={material.images ?? []}
          materialId={material.id}
          toUid={material.to_uid}
          onImagesChange={handleImagesChange}
        />
      </td>

      {/* 📝 描述 */}
      <td className="px-2 py-2">
        <span className="text-sm text-gray-800 leading-snug line-clamp-2 dark:text-gray-200">
          {material.description || '(无描述)'}
        </span>
      </td>

      {/* 🎨 封面提示词 */}
      <td className="px-2 py-2">
        <span className="text-xs text-gray-700 leading-snug truncate dark:text-gray-300">
          {material.ai_context?.coverprompt || <span className="text-gray-400">（未设置）</span>}
        </span>
      </td>

      {/* 💰 价格 */}
      <td className="px-2 py-2 text-center">
        <InlineEditCell
          value={material.price}
          onSave={(v) => handleInlineSave('price', v)}
          isSaving={savingField === 'price'}
        />
      </td>

      {/* 👤 账号 */}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <select
          value={material.to_uid ?? ''}
          onChange={(e) => handleInlineSave('to_uid', e.target.value || undefined)}
          disabled={savingField === 'to_uid'}
          className="h-8 px-3 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
        >
          <option value="">未选择</option>
          {activeAccounts.map((a) => (
            <option key={a.uid} value={a.uid}>{a.name}</option>
          ))}
        </select>
      </td>

      {/* 📂 类目 */}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <select
          value={material.category ?? ''}
          onChange={(e) => handleInlineSave('category', e.target.value || undefined)}
          onMouseDown={() => {
            if (material.to_uid && material.category && channels.length === 0) {
              refetchChannels()
            }
          }}
          disabled={!material.to_uid || savingField === 'category'}
          className="h-8 px-3 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:disabled:bg-gray-800"
        >
          <option value="">{material.to_uid ? '请选择' : '请先选账号'}</option>
          {channels.length === 0 && material.category ? (
            <option value={material.category}>{material.category}</option>
          ) : (
            channels.map((ch) => (
              <option key={ch.channelCateId} value={ch.channelCateName}>{ch.channelCateName}</option>
            ))
          )}
        </select>
      </td>

      {/* 🤖 AI 上下文 */}
      <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpenContextModal(material.id)}
          className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer whitespace-nowrap dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          {material.ai_context?.template === 'with_item'
            ? `商机 + ${(material.ai_context?.items?.length ?? 0)} 商品`
            : material.ai_context?.template === 'only_opportunity'
              ? '仅商机'
              : '未配置'}
        </button>
      </td>

      {/* 📊 进度+操作 */}
      <td className="px-2 py-2 text-center">
        <ProgressActionCell
          status={material.status}
          onTriggerWork={handleTriggerWork}
          onPublish={handlePublish}
          isAnyLoading={isAnyLoading}
        />
      </td>

      {/* 🗑 删除 */}
      <td className="px-2 py-2 text-center">
        <button
          onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors dark:hover:bg-red-950"
          title="删除素材"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>

      {/* ConfirmDialog 通过 portal 渲染到 body，避免放在 <tr> 内导致无效 DOM 嵌套 */}
      {showDelete && createPortal(
        <ConfirmDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          title="删除素材"
          description={`确定要删除素材 #${material.id} 吗？此操作不可撤销。`}
          confirmLabel="删除"
          variant="danger"
          loading={savingField === 'delete'}
          onConfirm={handleDeleteMaterial}
        />,
        document.body
      )}
    </>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "MaterialTableRow\|error TS" | head -20
```

期望：MaterialTableRow.tsx 无类型错误。

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/workbench/MaterialTableRow.tsx
git commit -m "feat: add MaterialTableRow — <td>-based row component for NativeTable

Extracts all data-fetching, mutation, and state logic from MaterialRow
into a component that renders <td> elements. Uses createPortal for
ConfirmDialog to avoid invalid DOM nesting inside <tr>.

Designed as NativeTable's RowComponent prop — can freely use hooks
because it IS a component, not a render callback.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 重构 MaterialWorkspace 使用 NativeTable

**文件:**
- 修改: `components/batch-publish/workbench/MaterialWorkspace.tsx`

- [ ] **Step 1: 替换 import**

文件: `components/batch-publish/workbench/MaterialWorkspace.tsx`

删除：
```typescript
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { MaterialRow } from './MaterialRow'
import { MATERIAL_GRID_COLS, PAGE_SIZE } from '@/components/batch-publish/shared/constants'
```

新增：
```typescript
import { NativeTable } from '@/components/ui/data/NativeTable'
import type { NativeTableColumn } from '@/components/ui/data/NativeTable'
import { MaterialTableRow } from './MaterialTableRow'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'
```

- [ ] **Step 2: 添加 MATERIAL_COLUMNS 常量和行组件包装器**

在 `MaterialWorkspaceProps` interface 之后、`export function MaterialWorkspace` 之前，添加：

```typescript
/** 素材表格列定义 — 仅用于表头渲染（数据行由 MaterialTableRow 通过 RowComponent 渲染） */
const MATERIAL_COLUMNS: NativeTableColumn<PublishMaterial>[] = [
  { key: 'checkbox',  width: '32px',  align: 'center', header: ' ' },
  { key: 'cover',     width: '56px',  align: 'center', header: '封面' },
  { key: 'desc',      width: '28%',   align: 'left',   header: '描述' },
  { key: 'prompt',    width: '20%',   align: 'left',   header: '封面提示词' },
  { key: 'price',     width: '80px',  align: 'center', header: '价格' },
  { key: 'account',   width: '100px', align: 'center', header: '账号' },
  { key: 'category',  width: '100px', align: 'center', header: '类目' },
  { key: 'aiContext', width: '100px', align: 'center', header: 'AI上下文' },
  { key: 'progress',  width: '96px',  align: 'center', header: '进度/操作' },
  { key: 'delete',    width: '32px',  align: 'center', header: '删除' },
]
```

> `28%` 和 `20%` 对应原 `2fr` 和 `1.5fr` 的比例（2:1.5 ≈ 4:3 ≈ 28:20）。固定列合计 596px，两个 % 列按此比例分享剩余空间。

- [ ] **Step 3: 在组件内添加行组件包装器**

在 `export function MaterialWorkspace(...)` 的函数体内，`isMobile` 之后、`if (!opportunity)` 之前，添加：

```typescript
  // 行组件包装器——闭包捕获 workspace props 注入到 MaterialTableRow
  const RowWrapper = useCallback(
    ({ item }: { item: PublishMaterial; index: number }) => (
      <MaterialTableRow
        item={item}
        index={0}
        isSelected={selectedMaterialIds.has(item.id)}
        onToggleSelect={onToggleSelect}
        onOpenEditor={onOpenEditor}
        onOpenContextModal={onOpenContextModal}
        selectedOid={selectedOid}
        materialPage={materialPage}
      />
    ),
    [selectedMaterialIds, onToggleSelect, onOpenEditor, onOpenContextModal, selectedOid, materialPage]
  )
```

需要新增 import：
```typescript
import { useCallback } from 'react'
```

检查现有 import 是否有 `useCallback`——当前文件只有 `useIsMobile` 的 import，需要补充。

- [ ] **Step 4: 替换表格区域**

文件 `MaterialWorkspace.tsx`，替换「素材表格」整段（当前第 95-161 行），保留「分页」段不变：

当前（第 95-161 行）：
```typescript
      {/* 素材表格 */}
      <div className="flex-1 overflow-y-auto relative">
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
              style={{ gridTemplateColumns: MATERIAL_GRID_COLS }}
            >
              <div className="flex justify-center">
                {selectedMaterialIds.size > 0 && (
                  <button onClick={onClearSelection} className="text-blue-600 hover:underline text-xs">
                    取消
                  </button>
                )}
              </div>
              <div className="flex justify-center">封面</div>
              <div>描述</div>
              <div>封面提示词</div>
              <div className="flex justify-center">价格</div>
              <div className="flex justify-center">账号</div>
              <div className="flex justify-center">类目</div>
              <div className="flex justify-center">AI上下文</div>
              <div className="flex justify-center">进度/操作</div>
              <div className="flex justify-center">删除</div>
            </div>

            {/* 数据行 */}
            {materials.map((m) => (
              <MaterialRow
                key={m.id}
                materialId={m.id}
                isSelected={selectedMaterialIds.has(m.id)}
                onToggleSelect={onToggleSelect}
                onOpenSheet={onOpenEditor}
                onOpenContextModal={onOpenContextModal}
                selectedOid={selectedOid}
                materialPage={materialPage}
              />
            ))}

            {/* 批量操作栏 */}
            {selectedMaterialIds.size > 0 && (
              <div className="sticky bottom-0 px-3 pb-3 z-10">
                <BatchActionBar
                  selectedCount={selectedMaterialIds.size}
                  onClear={onClearSelection}
                  actions={[]}
                />
              </div>
            )}
          </>
        )}
      </div>
```

替换为：
```typescript
      {/* 素材表格 */}
      <div className="flex-1 min-h-0">
        <NativeTable
          columns={MATERIAL_COLUMNS}
          data={materials}
          keyExtractor={(m) => String(m.id)}
          isLoading={materialLoading}
          error={materialError}
          errorMessage="加载素材失败"
          onRetry={materialRefetch}
          emptyTitle="暂无素材"
          emptyDescription="点击「批量创建」为该商机创建素材"
          emptyAction={{ label: '批量创建', onClick: onCreateClick }}
          stickyHeader
          RowComponent={RowWrapper}
          onRowClick={(m) => onOpenEditor(m.id)}
          className="h-full"
        />

        {/* 批量操作栏 */}
        {selectedMaterialIds.size > 0 && (
          <div className="sticky bottom-0 px-3 pb-3 z-10">
            <BatchActionBar
              selectedCount={selectedMaterialIds.size}
              onClear={onClearSelection}
              actions={[]}
            />
          </div>
        )}
      </div>
```

- [ ] **Step 5: 清理不再需要的 import**

确保以下 import 已删除（在 Step 1 中处理）：
- `LoadingSpinner`
- `ErrorBanner`
- `EmptyState`
- `MaterialRow`
- `MATERIAL_GRID_COLS`

- [ ] **Step 6: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | grep "MaterialWorkspace\|error TS" | head -20
```

期望：MaterialWorkspace.tsx 无类型错误。

- [ ] **Step 7: 提交**

```bash
git add components/batch-publish/workbench/MaterialWorkspace.tsx
git commit -m "refactor: replace hand-rolled Grid table with NativeTable in MaterialWorkspace

- Delete 60+ lines of hand-written header grid, loading/error/empty branching
- Replace with NativeTable (built-in four-state + sticky header + column alignment)
- MATERIAL_COLUMNS constant defines 10 columns with proper widths (28%/20% for fr columns)
- RowWrapper closure injects workspace props into MaterialTableRow
- BatchActionBar retained outside NativeTable

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 删除 MaterialRow.tsx 并最终验证

**文件:**
- 删除: `components/batch-publish/workbench/MaterialRow.tsx`

- [ ] **Step 1: 确认 MaterialRow 无其他引用**

```bash
grep -r "MaterialRow" components/ app/ --include="*.tsx" --include="*.ts" | grep -v "MaterialTableRow" | grep -v "MaterialRow.tsx"
```

期望：只有 MaterialWorkspace.tsx 中作为 import path 的引用（已在 Task 4 中删除）。如果无其他引用，安全删除。

- [ ] **Step 2: 删除文件**

```bash
git rm components/batch-publish/workbench/MaterialRow.tsx
```

- [ ] **Step 3: 全项目 TypeScript 检查**

```bash
npx tsc --noEmit --pretty 2>&1 | tail -5
```

期望：零新增错误。

- [ ] **Step 4: 提交**

```bash
git commit -m "refactor: remove MaterialRow.tsx — replaced by MaterialTableRow + NativeTable

MaterialRow's logic moved to MaterialTableRow (<td>-based, uses RowComponent prop).
MaterialRow's hand-written grid wrapper replaced by NativeTable's <tr> generation.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 执行顺序

```
Task 1 (NativeTable.tsx) → Task 2 (index.ts exports)
  → Task 3 (MaterialTableRow.tsx) → Task 4 (MaterialWorkspace.tsx)
    → Task 5 (delete MaterialRow.tsx + final verify)
```

严格按此顺序——Task 4 依赖 Task 3 的 MaterialTableRow，Task 3 依赖 Task 1 的 NativeTable 类型。

## 审查检查清单

完成后逐项确认：

- [ ] MaterialWorkspace 页面渲染正常，表头与数据行列对齐
- [ ] 复选框选中/取消功能正常
- [ ] 账号下拉、类目下拉交互正常
- [ ] 价格行内编辑保存正常
- [ ] AI 上下文按钮正常
- [ ] 进度/操作按钮正常
- [ ] 删除确认弹窗正常
- [ ] 分页功能正常
- [ ] `MaterialRow.tsx` 已删除且无引用
- [ ] TypeScript 零错误
- [ ] DataTable.tsx 未被修改
