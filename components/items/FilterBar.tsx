"use client"

import { useState } from "react"
import { SlidersHorizontal, X, RefreshCw } from "lucide-react"
import { AccountName } from "@/lib/api/accounts"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { type ItemSortField } from "@/lib/api/items"

const SORT_LABELS: Record<string, string> = {
  gid: "商品ID",
  title: "标题",
  price: "价格",
  lookCount: "浏览量",
  wantCount: "想要数",
  collectCount: "收藏数",
  publishTime: "发布时间",
  deliveryType: "发货类型",
}
import { useIsMobile } from "@/hooks/useIsMobile"

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
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onSortChange: (field: ItemSortField) => void
}

export function FilterBar(props: FilterBarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <FilterBarMobile {...props} />
  }
  return <FilterBarDesktop {...props} />
}

// ========== 桌面端 ==========

function SortPills({
  sortField,
  sortDirection,
  onSortChange,
}: {
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onSortChange: (field: ItemSortField) => void
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Object.entries(SORT_LABELS).map(([key, label]) => {
        const isActive = sortField === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSortChange(key as ItemSortField)}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {label}
            {isActive && (
              <span className="ml-0.5">
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

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
  sortField,
  sortDirection,
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
      {/* 排序 */}
      <div className="px-4 pb-3 border-b border-gray-100">
        <SortPills
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />
      </div>
    </div>
  )
}

// ========== 移动端（来源：MobileFilterBar.tsx，逻辑完全保留） ==========

function SortTrigger({
  sortField,
  sortDirection,
  onSortChange,
}: {
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onSortChange: (field: ItemSortField) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${
          sortField
            ? "bg-blue-100 text-blue-700 font-medium"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        {sortField ? `${SORT_LABELS[sortField]}` : "排序"}
        {sortField && (sortDirection === "asc" ? "↑" : "↓")}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
            {Object.entries(SORT_LABELS).map(([key, label]) => {
              const isActive = sortField === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSortChange(key as ItemSortField)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{label}</span>
                  {isActive && (
                    <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

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
  sortField,
  sortDirection,
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

        <div className="ml-auto flex items-center gap-1">
          <SortTrigger
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
          />
        </div>
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

