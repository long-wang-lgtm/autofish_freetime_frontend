'use client'

import { useState } from 'react'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MONITOR_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'

interface MonitorFilterBarProps {
  /** 标题搜索（模糊） */
  title: string
  /** 店铺 uid（精确匹配） */
  uid: string
  /** 商品 gid（精确匹配） */
  gid: string
  monitorStatus: string
  onFilterChange: (key: string, value: string) => void
  onRefresh: () => void
}

/** 单字段搜索框 — 一框一字段，右侧清除按钮清空该框 */
function SearchField({
  value,
  onChange,
  placeholder,
  inputMode,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  inputMode?: 'numeric'
  className?: string
}) {
  return (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      />
      {value !== '' && (
        <button
          type="button"
          aria-label={`清除${placeholder}`}
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function MonitorFilterBar({
  title,
  uid,
  gid,
  monitorStatus,
  onFilterChange,
  onRefresh,
}: MonitorFilterBarProps) {
  const isMobile = useIsMobile()
  // 移动端筛选栏：gid 条件行展开状态，默认收起
  const [filterExpanded, setFilterExpanded] = useState(false)

  return (
    <SearchToolbar>
      {isMobile ? (
        <div className="w-full flex flex-col gap-2">
          {/* Row1：标题 + 店铺uid 并排（高频搜索常驻） */}
          <div className="flex items-center gap-2">
            <SearchField
              value={title}
              onChange={(v) => onFilterChange('title', v)}
              placeholder="搜索标题..."
              className="flex-1 min-w-0"
            />
            <SearchField
              value={uid}
              onChange={(v) => onFilterChange('uid', v)}
              placeholder="店铺uid"
              inputMode="numeric"
              className="flex-1 min-w-0"
            />
          </div>
          {/* Row2：筛选按钮（展开 gid，gid 非空时带激活计数）+ 状态下拉 + 刷新（紧凑 h-10 去全宽） */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterExpanded((prev) => !prev)}
              aria-expanded={filterExpanded}
              className={`h-10 px-3 flex-none inline-flex items-center gap-1 text-sm font-medium rounded-lg border transition-colors ${
                gid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              筛选{gid ? ' 1' : ''}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${filterExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <select
              value={monitorStatus}
              onChange={(e) => onFilterChange('monitorStatus', e.target.value)}
              className="h-10 w-28 flex-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {MONITOR_STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              onClick={onRefresh}
              className="h-10 px-3 flex-none text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              刷新
            </button>
          </div>
          {/* Row3：展开区（默认收起）——商品gid 整行 */}
          {filterExpanded && (
            <SearchField
              value={gid}
              onChange={(v) => onFilterChange('gid', v)}
              placeholder="商品gid"
              inputMode="numeric"
              className="w-full"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          <SearchField
            value={title}
            onChange={(v) => onFilterChange('title', v)}
            placeholder="搜索标题..."
            className="flex-1 min-w-[140px] max-w-xs"
          />
          <SearchField
            value={uid}
            onChange={(v) => onFilterChange('uid', v)}
            placeholder="店铺uid"
            inputMode="numeric"
            className="flex-1 min-w-[140px] max-w-xs"
          />
          <SearchField
            value={gid}
            onChange={(v) => onFilterChange('gid', v)}
            placeholder="商品gid"
            inputMode="numeric"
            className="flex-1 min-w-[140px] max-w-xs"
          />

          <select
            value={monitorStatus}
            onChange={(e) => onFilterChange('monitorStatus', e.target.value)}
            className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white w-28 flex-none"
          >
            {MONITOR_STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <button
            onClick={onRefresh}
            className="h-10 flex-none px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            刷新
          </button>
        </div>
      )}
    </SearchToolbar>
  )
}
