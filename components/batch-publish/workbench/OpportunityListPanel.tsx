'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { OPPORTUNITY_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { fmtPrice } from '@/lib/utils/format'
import type { OpportunityItem } from '@/lib/api/batch-publish'

interface OpportunityListPanelProps {
  opportunities: OpportunityItem[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  onPageChange: (p: number) => void
  search: string
  onSearchChange: (v: string) => void
  status: string
  onStatusChange: (v: string) => void
  selectedOid: number | undefined
}

export function OpportunityListPanel({
  opportunities, total, isLoading, error, onRetry,
  page, onPageChange,
  search, onSearchChange, status, onStatusChange,
  selectedOid,
}: OpportunityListPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSelect = (item: OpportunityItem) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(item.id))
    router.push(`/dashboard/batch-publish?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 搜索 + 筛选 */}
      <div className="p-3 space-y-2 border-b border-gray-100 flex-shrink-0">
        <input
          type="text"
          placeholder="搜索商机..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-1">
          {[
            { value: '', label: '全部' },
            { value: 'active', label: '启用' },
            { value: 'inactive', label: '停用' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`px-2 py-1 text-xs rounded-full font-medium transition-colors ${
                status === opt.value
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <ErrorBanner variant="inline" message="加载失败" onRetry={onRetry} />
        ) : opportunities.length === 0 ? (
          <EmptyState size="sm" title="暂无商机" description="请先创建商机" />
        ) : (
          opportunities.map((item) => {
            const isSelected = item.id === selectedOid
            return (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  isSelected ? 'border-l-2 border-l-blue-600 bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium line-clamp-1 ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {item.name}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-blue-600 text-xs flex-shrink-0">✓</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400 flex-wrap">
                  <span>📦 {item.monitoredItemCount ?? 0}</span>
                  <span>📝 {item.materialCount ?? 0}</span>
                  {(item.price ?? 0) > 0 && <span>{fmtPrice(item.price!)}</span>}
                  <StatusBadge status={item.status} config={OPPORTUNITY_STATUS_CONFIG} />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 分页 */}
      <div className="border-t border-gray-100 flex-shrink-0">
        <Pagination page={page} total={total} pageSize={20} onChange={onPageChange} />
      </div>
    </div>
  )
}
