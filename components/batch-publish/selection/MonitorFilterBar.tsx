'use client'

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

  return (
    <SearchToolbar>
      <div className={isMobile ? 'w-full flex flex-col gap-2' : 'flex flex-1 items-center gap-3 flex-wrap'}>
        <SearchField
          value={title}
          onChange={(v) => onFilterChange('title', v)}
          placeholder="搜索标题..."
          className={isMobile ? 'w-full' : 'flex-1 min-w-[140px] max-w-xs'}
        />
        <SearchField
          value={uid}
          onChange={(v) => onFilterChange('uid', v)}
          placeholder="店铺uid"
          inputMode="numeric"
          className={isMobile ? 'w-full' : 'flex-1 min-w-[140px] max-w-xs'}
        />
        <SearchField
          value={gid}
          onChange={(v) => onFilterChange('gid', v)}
          placeholder="商品gid"
          inputMode="numeric"
          className={isMobile ? 'w-full' : 'flex-1 min-w-[140px] max-w-xs'}
        />

        <select
          value={monitorStatus}
          onChange={(e) => onFilterChange('monitorStatus', e.target.value)}
          className={`h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white ${
            isMobile ? 'w-full' : 'w-28 flex-none'
          }`}
        >
          {MONITOR_STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className={isMobile ? 'hidden' : 'flex-1'} />

        <button
          onClick={onRefresh}
          className={`px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
            isMobile ? 'w-full h-11' : 'h-10 flex-none'
          }`}
        >
          刷新
        </button>
      </div>
    </SearchToolbar>
  )
}
