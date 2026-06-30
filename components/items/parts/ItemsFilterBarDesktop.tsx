'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import type { AccountName } from '@/lib/api/accounts'
import {
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

  const { uid, status, chips } = filterState

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

        {/* 中区：筛选控件 + 搜索芯片 */}
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

          {/* +添加条件下拉 */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              disabled={usedFields.size >= ALL_SEARCH_FIELDS.length}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-colors ${
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
