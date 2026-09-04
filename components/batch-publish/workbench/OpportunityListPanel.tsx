'use client'

import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { fmtPrice } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface OpportunityListPanelProps {
  /** 监控商品列表（数据源：monitor.item.list，原商机列表去商机化） */
  opportunities: MonitoredItem[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  onPageChange: (p: number) => void
  search: string
  onSearchChange: (v: string) => void
  selectedGid: string | undefined
  onSelectGid: (gid: string) => void
}

export function OpportunityListPanel({
  opportunities, total, isLoading, error, onRetry,
  page, onPageChange,
  search, onSearchChange,
  selectedGid, onSelectGid,
}: OpportunityListPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* 搜索（按商品标题）+ 筛选 */}
      <div className="p-3 space-y-2 border-b border-gray-100 flex-shrink-0">
        <input
          type="text"
          placeholder="搜索商品标题..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {/* 原 商机筛选pill 和 新建按钮，弃用 */}
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
          <EmptyState size="sm" title="暂无" description="去监控页添加监控商品" />
        ) : (
          opportunities.map((item) => {
            const isSelected = item.gid === selectedGid
            return (
              <div
                key={item.gid}
                onClick={() => onSelectGid(item.gid)}
                className={`px-3 py-3 border-b border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer ${
                  isSelected ? 'border-l-2 border-l-blue-600 bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium line-clamp-1 ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {item.title || '未命名'}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-blue-600 text-xs flex-shrink-0">✓</span>
                  )}
                </div>

                {/* 底部信息 + 操作按钮 */}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                    {/* 📝 素材数（原商机维度字段，监控商品无此数据，弃用占位） */}
                    {(item.wantCount ?? 0) > 0 && <span>想要 {item.wantCount}</span>}
                    {(item.price ?? 0) > 0 && <span>{fmtPrice(item.price!)}</span>}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); /* 编辑商品：待接入（后续优化） */ }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                      title="编辑"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); /* 删除监控商品：待接入（后续优化） */ }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
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
