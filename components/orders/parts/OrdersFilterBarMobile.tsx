'use client'

import { useState } from 'react'
import { Eraser, RefreshCw } from 'lucide-react'
import { FilterInput, type OrdersFilterBarProps } from '@/components/orders/parts/OrdersFilterBarDesktop'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { cn } from '@/lib/utils'

/**
 * 移动端筛选栏：常驻 2 行 + 低频字段折叠。
 *
 * 手机竖向空间紧张，6 个字段全铺开会吃掉小半屏，所以只把最常用的账号/商品标题/商品ID
 * 常驻，订单号、买家昵称、买家ID 收进「筛选 N」展开区（N = 已填个数，有筛选时按钮高亮，
 * 收起也看得出筛选还生效）。
 */
export function OrdersFilterBarMobile({
  accounts,
  filters,
  onFilterChange,
  activeCount,
  onClear,
  onSync,
  isSyncing,
}: OrdersFilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2 space-y-2">
      {/* Row 1: 账号 + 筛选展开 + 清空 + 同步 */}
      <div className="flex items-center gap-1.5">
        <select
          value={filters.uid ?? ''}
          onChange={(e) => onFilterChange('uid', e.target.value || undefined)}
          className="flex-1 min-w-0 h-8 px-2 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 truncate"
        >
          <option value="">全部账号</option>
          {accounts.map((acc) => (
            <option key={acc.uid} value={acc.uid}>
              {acc.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'shrink-0 h-8 px-2 text-xs font-medium rounded-lg border transition-colors',
            expanded || activeCount > 0
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600',
          )}
        >
          筛选{activeCount > 0 ? ` ${activeCount}` : ''}
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          title="清空筛选"
          className="shrink-0 p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:text-gray-300 disabled:hover:bg-gray-50"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          title="从闲鱼同步最新订单"
          className="shrink-0 p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {isSyncing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* Row 2: 商品标题 + 商品ID */}
      <div className="flex items-center gap-1.5">
        <FilterInput
          label="商品标题"
          value={filters.title}
          onChange={(v) => onFilterChange('title', v)}
          className="flex-1 min-w-0"
        />
        <FilterInput
          label="商品ID"
          value={filters.gid}
          onChange={(v) => onFilterChange('gid', v)}
          className="w-24 shrink-0"
        />
      </div>

      {/* 展开区：订单号 / 买家昵称 / 买家ID */}
      {expanded && (
        <>
          <FilterInput
            label="订单号"
            value={filters.orderId}
            onChange={(v) => onFilterChange('orderId', v)}
            className="w-full"
          />
          <div className="flex items-center gap-1.5">
            <FilterInput
              label="买家昵称"
              value={filters.buyerName}
              onChange={(v) => onFilterChange('buyerName', v)}
              className="flex-1 min-w-0"
            />
            <FilterInput
              label="买家ID"
              value={filters.buyerId}
              onChange={(v) => onFilterChange('buyerId', v)}
              className="flex-1 min-w-0"
            />
          </div>
        </>
      )}
    </div>
  )
}
