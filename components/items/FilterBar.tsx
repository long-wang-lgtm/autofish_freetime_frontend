"use client"

import { useState } from "react"
import { SlidersHorizontal, X, RefreshCw } from "lucide-react"
import { AccountName } from "@/lib/api/accounts"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useIsMobile } from "@/hooks/useIsMobile"
import { ITEM_SORT_FIELDS } from "@/lib/api/items"

interface FilterBarProps {
  accounts: AccountName[]
  searchInput: { uid: string; title: string; gid: string }
  statusFilter: number | undefined
  onSearchChange: (updater: (
    prev: { uid: string; title: string; gid: string }
  ) => { uid: string; title: string; gid: string }) => void
  onStatusChange: (status: number | undefined) => void
  onRefresh: () => void
  onClear: () => void
  isRefreshing: boolean
  selectedUid?: string
  stats: { total: number; onSale: number; offSale: number; sold: number }
  orderBy: string | null
  asc: boolean
  onSortChange: (fieldKey: string) => void
}

export function FilterBar(props: FilterBarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <FilterBarMobile {...props} />
  }
  return <FilterBarDesktop {...props} />
}

// ========== 桌面端 ==========

function FilterBarDesktop({
  accounts,
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClear,
  isRefreshing,
  selectedUid,
  orderBy,
  asc,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-end gap-3 flex-wrap">
        {/* 账号下拉框 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">账号</label>
          <select
            value={searchInput.uid}
            onChange={(e) =>
              onSearchChange((prev) => ({ ...prev, uid: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">全部账号</option>
            {accounts.map((acc) => (
              <option key={acc.uid} value={acc.uid}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
        {/* 商品ID */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">商品ID</label>
          <input
            type="text"
            value={searchInput.gid}
            onChange={(e) =>
              onSearchChange((prev) => ({ ...prev, gid: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="输入商品ID"
          />
        </div>
        {/* 商品标题 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">商品标题</label>
          <input
            type="text"
            value={searchInput.title}
            onChange={(e) =>
              onSearchChange((prev) => ({ ...prev, title: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="输入商品标题"
          />
        </div>
        {/* 状态下拉框 */}
        <div className="w-32">
          <label className="block text-xs text-gray-500 mb-1">商品状态</label>
          <select
            value={statusFilter ?? ""}
            onChange={(e) =>
              onStatusChange(e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">全部</option>
            <option value="0">在售</option>
            <option value="-2">已下架</option>
            <option value="1">已售出</option>
          </select>
        </div>
        {/* 刷新按钮 */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={!selectedUid || isRefreshing}
          title={!selectedUid ? "请先选择账号" : "从闲鱼刷新商品列表"}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
            !selectedUid || isRefreshing
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isRefreshing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isRefreshing ? "刷新中..." : "刷新商品"}
        </button>
        {/* 清空按钮 */}
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md"
        >
          清空筛选
        </button>
      </div>

      {/* 排序 Pill 组 */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-xs text-gray-400 shrink-0">排序</span>
        {ITEM_SORT_FIELDS.map((f) => (
          <SortChip
            key={f.key}
            label={f.label}
            field={f.key}
            orderBy={orderBy}
            asc={asc}
            onClick={() => onSortChange(f.key)}
          />
        ))}
      </div>
    </div>
  )
}

// ========== 移动端（来源：MobileFilterBar.tsx，逻辑完全保留） ==========

function FilterBarMobile({
  accounts,
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClear,
  isRefreshing,
  selectedUid,
  stats,
  orderBy,
  asc,
  onSortChange,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const hiddenFilterCount =
    (searchInput.title ? 1 : 0) + (searchInput.gid ? 1 : 0)

  return (
    <div className="border-b border-gray-100">
      {/* 顶部栏：账号 + 状态 + 更多筛选 + 刷新 */}
      <div className="flex items-center gap-2 px-3 py-2">
        <select
          value={searchInput.uid}
          onChange={(e) =>
            onSearchChange((prev) => ({ ...prev, uid: e.target.value }))
          }
          className="flex-1 min-w-0 px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 truncate"
        >
          <option value="">全部账号</option>
          {accounts.map((acc) => (
            <option key={acc.uid} value={acc.uid}>
              {acc.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter ?? ""}
          onChange={(e) =>
            onStatusChange(e.target.value ? Number(e.target.value) : undefined)
          }
          className="w-20 px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0"
        >
          <option value="">全部</option>
          <option value="0">在售</option>
          <option value="-2">已下架</option>
          <option value="1">已售出</option>
        </select>

        <button
          onClick={() => setExpanded(!expanded)}
          className={`relative flex-shrink-0 p-2 rounded-lg border transition-colors ${
            expanded || hiddenFilterCount > 0
              ? "bg-blue-50 border-blue-200 text-blue-600"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hiddenFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center">
              {hiddenFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={onRefresh}
          disabled={!selectedUid || isRefreshing}
          title={!selectedUid ? "请先选择账号" : "从闲鱼刷新商品列表"}
          className={`flex-shrink-0 p-2 rounded-lg border transition-colors ${
            !selectedUid || isRefreshing
              ? "bg-gray-50 border-gray-200 text-gray-400"
              : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
          }`}
        >
          {isRefreshing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 统计条 + 排序 */}
      <div className="flex items-center gap-3 px-3 pb-2 text-xs text-gray-500">
        <span>
          共 <span className="font-semibold text-gray-900">{stats.total}</span> 件
        </span>
        <span className="text-gray-300">|</span>
        <span>
          在售 <span className="font-medium text-green-600">{stats.onSale}</span>
        </span>
        <span className="text-gray-300">|</span>
        <span>
          已下架 <span className="font-medium text-gray-500">{stats.offSale}</span>
        </span>
        <span className="text-gray-300">|</span>
        <span>
          已售出 <span className="font-medium text-red-500">{stats.sold}</span>
        </span>

      </div>

      {/* 排序滑动栏 */}
      <div
        className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {ITEM_SORT_FIELDS.map((f) => (
          <SortChip
            key={f.key}
            label={f.label}
            field={f.key}
            orderBy={orderBy}
            asc={asc}
            onClick={() => onSortChange(f.key)}
          />
        ))}
      </div>

      {/* 展开的筛选面板 */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">商品标题</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput.title}
                  onChange={(e) =>
                    onSearchChange((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="搜索标题..."
                  className="w-full pl-2.5 pr-6 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {searchInput.title && (
                  <button
                    onClick={() =>
                      onSearchChange((prev) => ({ ...prev, title: "" }))
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">商品ID</label>
              <input
                type="text"
                value={searchInput.gid}
                onChange={(e) =>
                  onSearchChange((prev) => ({ ...prev, gid: e.target.value }))
                }
                placeholder="输入ID"
                className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
          {hiddenFilterCount > 0 && (
            <button
              onClick={() => {
                onClear()
                setExpanded(false)
              }}
              className="w-full py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              清空全部筛选
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** 排序标签（FilterBar 内部组件，桌面/移动端共用） */
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
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700 font-medium"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}
      <span className="text-[10px]">
        {isActive ? (asc ? "↑" : "↓") : "↕"}
      </span>
    </button>
  )
}
