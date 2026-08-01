'use client'

import { RefreshCw, Search, X, Eraser } from 'lucide-react'
import type { AccountName } from '@/lib/api/accounts'
import {
  ITEM_SORT_FIELDS,
} from '@/lib/api/items'
import type { ItemsFilterState } from '@/hooks/useItemsFilters'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import type { ItemsFilterBarProps } from '@/components/items/parts/ItemsFilterBarDesktop'

export function ItemsFilterBarMobile({
  accounts,
  filterState,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: ItemsFilterBarProps) {
  const { uid, status, title, gid, orderBy, asc } = filterState

  const setUid = (v: string) =>
    onFilterChange((prev) => ({ ...prev, uid: v || undefined }))
  const setStatus = (v: number | undefined) =>
    onFilterChange((prev) => ({ ...prev, status: v }))
  const setTitle = (v: string) =>
    onFilterChange((prev) => ({ ...prev, title: v }))
  const setGid = (v: string) =>
    onFilterChange((prev) => ({ ...prev, gid: v }))
  const clearAll = () => {
    onFilterChange(() => ({
      uid: undefined,
      status: undefined,
      title: '',
      gid: '',
      orderBy: null,
      asc: false,
      page: 1,
    }))
  }

  const handleSort = (fieldKey: string) => {
    onFilterChange((prev) => {
      if (prev.orderBy === fieldKey) {
        if (prev.asc === false) return { ...prev, asc: true, page: 1 }
        return { ...prev, orderBy: null, asc: false, page: 1 }
      }
      return { ...prev, orderBy: fieldKey, asc: false, page: 1 }
    })
  }

  return (
    <div className="border-b border-gray-100">
      {/* Row 1: 账号 + 状态 + 清空 + 刷新 */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <select
          value={uid ?? ''}
          onChange={(e) => setUid(e.target.value)}
          className="flex-1 min-w-0 px-1 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 truncate"
        >
          <option value="">全部账号</option>
          {accounts.map((acc) => (
            <option key={acc.uid} value={acc.uid}>
              {acc.name}
            </option>
          ))}
        </select>

        <select
          value={status ?? ''}
          onChange={(e) =>
            setStatus(e.target.value ? Number(e.target.value) : undefined)
          }
          className="w-16 px-1.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0"
        >
          <option value="">全部</option>
          <option value="0">在售</option>
          <option value="-2">下架</option>
          <option value="1">售出</option>
        </select>

        {/* 清空筛选 */}
        <button
          onClick={clearAll}
          className="flex-shrink-0 p-1.5 rounded-lg border bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title="清空筛选"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* 刷新按钮 */}
        <button
          onClick={onRefresh}
          disabled={!uid || isRefreshing}
          title={!uid ? '请先选择账号' : '从闲鱼刷新商品列表'}
          className={`flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
            !uid || isRefreshing
              ? 'bg-gray-50 border-gray-200 text-gray-400'
              : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
          }`}
        >
          {isRefreshing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Row 2: 商品标题 + 商品ID 搜索 */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-gray-100">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="商品标题"
            className="w-full h-9 pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {title && (
            <button
              onClick={() => setTitle('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative w-24 flex-shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={gid}
            onChange={(e) => setGid(e.target.value)}
            placeholder="ID"
            className="w-full h-9 pl-7 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {gid && (
            <button
              onClick={() => setGid('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 3: 排序横向滚动胶囊 */}
      <div
        className="flex items-center gap-1 px-2 pb-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {ITEM_SORT_FIELDS.map((f) => (
          <SortChip
            key={f.key}
            label={f.label}
            field={f.key}
            orderBy={orderBy}
            asc={asc}
            onClick={() => handleSort(f.key)}
          />
        ))}
      </div>
    </div>
  )
}

/** 排序标签 */
function SortChip({
  label,
  field,
  orderBy,
  asc,
  onClick,
}: {
  label: string
  field: string
  orderBy: string | null
  asc: boolean
  onClick: () => void
}) {
  const isActive = orderBy === field
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-full transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {label}
      <span className="text-xs">{isActive ? (asc ? '↑' : '↓') : '↕'}</span>
    </button>
  )
}
