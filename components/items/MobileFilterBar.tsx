"use client"

import { useState } from "react"
import { SlidersHorizontal, X, RefreshCw } from "lucide-react"
import { AccountName } from "@/lib/api/accounts"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface MobileFilterBarProps {
  accounts: AccountName[]
  searchInput: { uid: string; title: string; gid: string }
  statusFilter: number | undefined
  onSearchChange: (updater: (prev: { uid: string; title: string; gid: string }) => {
    uid: string
    title: string
    gid: string
  }) => void
  onStatusChange: (status: number | undefined) => void
  onRefresh: () => void
  onClear: () => void
  isRefreshing: boolean
  selectedUid?: string
  stats: {
    total: number
    onSale: number
    offSale: number
    sold: number
  }
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onSortChange: (field: "title" | "price" | "publishTime" | "status") => void
}

export function MobileFilterBar({
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
}: MobileFilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  // 仅统计折叠区内激活的筛选（标题 + GID）
  const hiddenFilterCount =
    (searchInput.title ? 1 : 0) +
    (searchInput.gid ? 1 : 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* === 顶部栏：账号 + 状态 + 更多筛选 + 刷新 === */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* 账号下拉（始终可见） */}
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

        {/* 状态下拉（始终可见） */}
        <select
          value={statusFilter ?? ""}
          onChange={(e) =>
            onStatusChange(
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="w-20 px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0"
        >
          <option value="">全部</option>
          <option value="0">在售</option>
          <option value="-2">已下架</option>
          <option value="1">已售出</option>
        </select>

        {/* 展开筛选按钮（标题 + GID） */}
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

        {/* 刷新按钮 */}
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

      {/* 统计条 */}
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

        {/* 排序 — 放在统计条右侧 */}
        <div className="ml-auto flex items-center gap-1">
          <SortChip
            label="标题"
            field="title"
            sortField={sortField}
            sortDirection={sortDirection}
            onClick={() => onSortChange("title")}
          />
          <SortChip
            label="价格"
            field="price"
            sortField={sortField}
            sortDirection={sortDirection}
            onClick={() => onSortChange("price")}
          />
          <SortChip
            label="时间"
            field="publishTime"
            sortField={sortField}
            sortDirection={sortDirection}
            onClick={() => onSortChange("publishTime")}
          />
        </div>
      </div>

      {/* === 展开的筛选面板：标题 + GID 同行 === */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* 商品标题搜索 */}
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">商品标题</label>
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
                    onClick={() => onSearchChange((prev) => ({ ...prev, title: "" }))}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 商品ID搜索 */}
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">商品ID</label>
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

          {/* 清空按钮 */}
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

/** 排序标签 */
function SortChip({
  label,
  field,
  sortField,
  sortDirection,
  onClick,
}: {
  label: string
  field: string
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onClick: () => void
}) {
  const isActive = sortField === field
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
        isActive
          ? "bg-blue-100 text-blue-700 font-medium"
          : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
      {isActive && (sortDirection === "asc" ? "↑" : "↓")}
    </button>
  )
}
