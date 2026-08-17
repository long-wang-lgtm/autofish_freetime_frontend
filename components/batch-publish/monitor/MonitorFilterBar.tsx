'use client'

import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { MONITOR_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'

interface MonitorFilterBarProps {
  search: string
  monitorStatus: string
  onFilterChange: (key: string, value: string) => void
  onRefresh: () => void
}

export function MonitorFilterBar({
  search,
  monitorStatus,
  onFilterChange,
  onRefresh,
}: MonitorFilterBarProps) {
  return (
    <SearchToolbar>
      <input
        type="text"
        placeholder="搜索商品标题/uid/gid..."
        value={search}
        onChange={(e) => onFilterChange('search', e.target.value)}
        className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 min-w-0 max-w-xs"
      />

      <select
        value={monitorStatus}
        onChange={(e) => onFilterChange('monitorStatus', e.target.value)}
        className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {MONITOR_STATUS_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div className="flex-1" />

      <button
        onClick={onRefresh}
        className="h-10 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        刷新
      </button>
    </SearchToolbar>
  )
}
