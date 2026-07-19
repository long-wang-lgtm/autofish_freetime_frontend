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
  /** 表格布局算法。'auto' 由内容决定列宽，'fixed' 严格按 col width 比例分配。默认 'auto' */
  tableLayout?: 'auto' | 'fixed'
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
  tableLayout = 'auto',
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
      <table className={cn('w-full border-collapse', tableLayout === 'fixed' ? 'table-fixed' : 'table-auto')}>
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
