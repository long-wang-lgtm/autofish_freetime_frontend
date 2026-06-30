'use client'

import { useState, useEffect } from 'react'
import { SlidersHorizontal, RefreshCw, Search, X, Eraser } from 'lucide-react'
import type { AccountName } from '@/lib/api/accounts'
import {
  ITEM_SORT_FIELDS,
  SEARCH_FIELD_LABELS,
  type ItemsFilterState,
  type SearchField,
} from '@/lib/api/items'
import { SearchChip } from '@/components/items/parts/SearchChip'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { ItemsFilterBarProps } from '@/components/items/parts/ItemsFilterBarDesktop'

const ALL_SEARCH_FIELDS: SearchField[] = [
  'title',
  'gid',
  'deliveryContent',
  'receiptAfter',
  'positiveReviewAfter',
  'aiReplyItemPrompt',
  'sendCode',
]

export function ItemsFilterBarMobile({
  accounts,
  filterState,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: ItemsFilterBarProps) {
  const [expanded, setExpanded] = useState(false)
  const [searchField, setSearchField] = useState<SearchField>('title')
  const [searchValue, setSearchValue] = useState('')

  const { uid, status, chips, orderBy, asc } = filterState

  const usedFields = new Set(chips.map((c) => c.field))

  // 自动选择第一个未使用的搜索字段
  useEffect(() => {
    if (usedFields.has(searchField)) {
      const next = ALL_SEARCH_FIELDS.find((f) => !usedFields.has(f))
      if (next) setSearchField(next)
    }
  }, [chips, searchField, usedFields])

  const setUid = (v: string) =>
    onFilterChange((prev) => ({ ...prev, uid: v || undefined }))
  const setStatus = (v: number | undefined) =>
    onFilterChange((prev) => ({ ...prev, status: v }))
  const addOrUpdateChip = (field: SearchField, value: string) => {
    if (!value.trim()) return
    const existing = chips.find((c) => c.field === field)
    if (existing) {
      onFilterChange((prev) => ({
        ...prev,
        chips: prev.chips.map((c) => (c.field === field ? { ...c, value: value.trim() } : c)),
      }))
    } else {
      onFilterChange((prev) => ({
        ...prev,
        chips: [...prev.chips, { field, value: value.trim() }],
      }))
    }
    setSearchValue('')
  }
  const removeChip = (field: SearchField) =>
    onFilterChange((prev) => ({
      ...prev,
      chips: prev.chips.filter((c) => c.field !== field),
    }))
  const updateChip = (field: SearchField, value: string) =>
    onFilterChange((prev) => ({
      ...prev,
      chips: prev.chips.map((c) => (c.field === field ? { ...c, value } : c)),
    }))
  const clearAll = () => {
    onFilterChange(() => ({
      uid: undefined,
      status: undefined,
      chips: [],
      orderBy: null,
      asc: false,
      page: 1,
    }))
    setExpanded(false)
    setSearchValue('')
  }

  const handleSearch = () => {
    if (!searchValue.trim()) return
    addOrUpdateChip(searchField, searchValue.trim())
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

        {/* 清空筛选 — 始终可见，与刷新/筛选按钮统一 */}
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

      {/* Row 2: 搜索字段选择器 + 输入 + 搜索 + 筛选展开 */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-gray-100">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as SearchField)}
          className="w-16 flex-shrink-0 h-9 px-1 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {ALL_SEARCH_FIELDS.map((f) => (
            <option key={f} value={f} disabled={usedFields.has(f)}>
              {SEARCH_FIELD_LABELS[f]}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索..."
            className="w-full h-9 pl-2 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={!searchValue.trim()}
          className={`flex-shrink-0 h-9 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            searchValue.trim()
              ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
              : 'border-gray-200 bg-gray-100 text-gray-400'
          }`}
        >
          搜索
        </button>

        {/* 筛选展开按钮 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`relative flex-shrink-0 p-1.5 rounded-lg border transition-colors ${
            expanded || chips.length > 0
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {chips.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[10px] font-semibold bg-blue-600 text-white rounded-full flex items-center justify-center">
              {chips.length}
            </span>
          )}
        </button>
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

      {/* 展开的筛选面板 — 仅显示芯片列表 */}
      {expanded && (
        <div className="px-2 pb-2 pt-1 border-t border-gray-100">
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <SearchChip
                  key={chip.field}
                  field={chip.field}
                  value={chip.value}
                  label={SEARCH_FIELD_LABELS[chip.field]}
                  onRemove={() => removeChip(chip.field)}
                  onChange={(v) => updateChip(chip.field, v)}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-1 text-center">
              使用上方搜索栏添加筛选条件
            </p>
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
