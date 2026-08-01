'use client'

import { RefreshCw, Search, X } from 'lucide-react'
import type { AccountName } from '@/lib/api/accounts'
import type { ItemsFilterState } from '@/hooks/useItemsFilters'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

export interface ItemsFilterBarProps {
  accounts: AccountName[]
  filterState: ItemsFilterState
  onFilterChange: (updater: (prev: ItemsFilterState) => ItemsFilterState) => void
  onRefresh: () => void
  isRefreshing: boolean
}

export function ItemsFilterBarDesktop({
  accounts,
  filterState,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: ItemsFilterBarProps) {
  const { uid, status, title, gid } = filterState

  const setUid = (v: string) =>
    onFilterChange((prev) => ({ ...prev, uid: v || undefined }))
  const setStatus = (v: number | undefined) =>
    onFilterChange((prev) => ({ ...prev, status: v }))
  const setTitle = (v: string) =>
    onFilterChange((prev) => ({ ...prev, title: v }))
  const setGid = (v: string) =>
    onFilterChange((prev) => ({ ...prev, gid: v }))
  const clearAll = () =>
    onFilterChange(() => ({
      uid: undefined,
      status: undefined,
      title: '',
      gid: '',
      orderBy: null,
      asc: false,
      page: 1,
    }))

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 左区：刷新商品 */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={!uid || isRefreshing}
          title={!uid ? '请先选择账号' : '从闲鱼刷新商品列表'}
          className={`h-8 px-2 py-0 text-sm font-medium rounded-lg border flex items-center gap-2 shrink-0 transition-colors ${
            !uid || isRefreshing
              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'border-blue-600 bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRefreshing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isRefreshing ? '刷新中...' : '刷新商品'}
        </button>

        {/* 中区：筛选控件 */}
        <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
          {/* 账号下拉 */}
          <select
            value={uid ?? ''}
            onChange={(e) => setUid(e.target.value)}
            className="h-8 px-2 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部账号</option>
            {accounts.map((acc) => (
              <option key={acc.uid} value={acc.uid}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* 状态下拉 */}
          <select
            value={status ?? ''}
            onChange={(e) =>
              setStatus(e.target.value ? Number(e.target.value) : undefined)
            }
            className="h-8 px-2 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部状态</option>
            <option value="0">在售</option>
            <option value="-2">已下架</option>
            <option value="1">已售出</option>
          </select>

          {/* 商品标题搜索 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="商品标题"
              className="h-8 pl-7 pr-7 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-36"
            />
            {title && (
              <button
                onClick={() => setTitle('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 商品ID搜索 */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={gid}
              onChange={(e) => setGid(e.target.value)}
              placeholder="商品ID"
              className="h-8 pl-7 pr-7 py-0 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-28"
            />
            {gid && (
              <button
                onClick={() => setGid('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 右区：清空筛选 */}
        <button
          type="button"
          onClick={clearAll}
          className="h-8 px-4 py-0 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 transition-colors"
        >
          清空筛选
        </button>
      </div>
    </div>
  )
}
