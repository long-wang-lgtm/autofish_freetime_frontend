'use client'

import { RefreshCw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountName } from '@/lib/api/accounts'
import type { OrdersFilterState } from '@/hooks/useOrdersFilters'

export interface OrdersFilterBarProps {
  accounts: AccountName[]
  filters: OrdersFilterState
  onFilterChange: <K extends keyof OrdersFilterState>(key: K, value: OrdersFilterState[K]) => void
  /** 已填筛选个数（移动端折叠态徽章 / 清空按钮可用态） */
  activeCount: number
  onClear: () => void
  onSync: () => void
  isSyncing: boolean
}

/**
 * 一框一字段的文本筛选框（搜索图标 + 清除按钮）。
 * PC 与移动端共用，宽度与高度由调用方通过 className 决定。
 */
export function FilterInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="w-full h-8 pl-7 pr-7 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export function OrdersFilterBarDesktop({
  accounts,
  filters,
  onFilterChange,
  activeCount,
  onClear,
  onSync,
  isSyncing,
}: OrdersFilterBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 左区：同步（从闲鱼拉最新订单） */}
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          title="从闲鱼同步最新订单"
          className="h-8 px-2 py-0 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
          {isSyncing ? '同步中' : '同步'}
        </button>

        {/* 中区：筛选控件 —— 一个控件只筛一个字段 */}
        <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
          <select
            value={filters.uid ?? ''}
            onChange={(e) => onFilterChange('uid', e.target.value || undefined)}
            className="h-8 px-2 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部账号</option>
            {accounts.map((acc) => (
              <option key={acc.uid} value={acc.uid}>
                {acc.name}
              </option>
            ))}
          </select>

          <FilterInput
            label="商品标题"
            value={filters.title}
            onChange={(v) => onFilterChange('title', v)}
            className="w-36"
          />
          <FilterInput
            label="商品ID"
            value={filters.gid}
            onChange={(v) => onFilterChange('gid', v)}
            className="w-28"
          />
          <FilterInput
            label="订单号"
            value={filters.orderId}
            onChange={(v) => onFilterChange('orderId', v)}
            className="w-40"
          />
          <FilterInput
            label="买家昵称"
            value={filters.buyerName}
            onChange={(v) => onFilterChange('buyerName', v)}
            className="w-32"
          />
          <FilterInput
            label="买家ID"
            value={filters.buyerId}
            onChange={(v) => onFilterChange('buyerId', v)}
            className="w-28"
          />
        </div>

        {/* 右区：清空筛选 */}
        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className="h-8 px-4 py-0 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 transition-colors disabled:text-gray-400 disabled:hover:bg-gray-100"
        >
          清空筛选
        </button>
      </div>
    </div>
  )
}
