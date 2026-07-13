'use client'

import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
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

// ---- 主组件 ----

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
          'grid gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800',
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
    </div>
  )
}
