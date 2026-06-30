'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import type { AccountName } from '@/lib/api/accounts'
import {
  ITEM_SORT_FIELDS,
  SEARCH_FIELD_LABELS,
  type ItemsFilterState,
  type SearchField,
} from '@/lib/api/items'
import { SearchChip } from '@/components/items/parts/SearchChip'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export interface ItemsFilterBarProps {
  accounts: AccountName[]
  filterState: ItemsFilterState
  onFilterChange: (updater: (prev: ItemsFilterState) => ItemsFilterState) => void
  onRefresh: () => void
  isRefreshing: boolean
}

const ALL_SEARCH_FIELDS: SearchField[] = [
  'title',
  'gid',
  'deliveryContent',
  'receiptAfter',
  'positiveReviewAfter',
  'aiReplyItemPrompt',
  'sendCode',
]

export function ItemsFilterBarDesktop({
  accounts,
  filterState,
  onFilterChange,
  onRefresh,
  isRefreshing,
}: ItemsFilterBarProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { uid, status, chips, orderBy, asc } = filterState

  // 点击外部关闭下拉
  useEffect(() => {
    if (!addMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [addMenuOpen])

  const usedFields = new Set(chips.map((c) => c.field))

  const setUid = (v: string) =>
    onFilterChange((prev) => ({ ...prev, uid: v || undefined }))
  const setStatus = (v: number | undefined) =>
    onFilterChange((prev) => ({ ...prev, status: v }))
  const addChip = (field: SearchField) => {
    setAddMenuOpen(false)
    onFilterChange((prev) => ({
      ...prev,
      chips: [...prev.chips, { field, value: '' }],
    }))
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
  const clearAll = () =>
    onFilterChange(() => ({
      uid: undefined,
      status: undefined,
      chips: [],
      orderBy: null,
      asc: false,
      page: 1,
    }))

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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      {/* Row 1: 账号 + 状态 + 清空 + 刷新 */}
      <div className="flex items-end gap-3 flex-wrap">
        {/* 账号下拉 */}
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-gray-500 mb-1">账号</label>
          <select
            value={uid ?? ''}
            onChange={(e) => setUid(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部账号</option>
            {accounts.map((acc) => (
              <option key={acc.uid} value={acc.uid}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* 状态下拉 */}
        <div className="w-32">
          <label className="block text-xs text-gray-500 mb-1">商品状态</label>
          <select
            value={status ?? ''}
            onChange={(e) =>
              setStatus(e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部</option>
            <option value="0">在售</option>
            <option value="-2">已下架</option>
            <option value="1">已售出</option>
          </select>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={clearAll}
            className="h-10 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            清空筛选
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            type="button"
            onClick={onRefresh}
            disabled={!uid || isRefreshing}
            title={!uid ? '请先选择账号' : '从闲鱼刷新商品列表'}
            className={`h-10 px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 transition-colors ${
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
        </div>
      </div>

      {/* Row 2: 添加条件 + 芯片列表 */}
      <div className="flex items-center gap-2 flex-wrap mt-3">
        {/* +添加条件下拉 */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            disabled={usedFields.size >= ALL_SEARCH_FIELDS.length}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border transition-colors ${
              usedFields.size >= ALL_SEARCH_FIELDS.length
                ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <Plus className="w-3 h-3" />
            添加条件
          </button>

          {addMenuOpen && (
            <div className="absolute top-full left-0 mt-1 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-md py-1">
              {ALL_SEARCH_FIELDS.map((f) => {
                const disabled = usedFields.has(f)
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && addChip(f)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {SEARCH_FIELD_LABELS[f]}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 已确认的芯片 */}
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

      {/* Row 3: 排序胶囊 */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-xs text-gray-400 shrink-0">排序</span>
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

/** 排序标签（内部组件，桌面/移动端共用） */
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
      className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full transition-colors ${
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
