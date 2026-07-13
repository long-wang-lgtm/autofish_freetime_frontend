'use client'

import { useMaterialsPage } from '@/hooks/batch-publish/useMaterialsPage'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { MaterialTable } from './MaterialTable'
import { MaterialCard } from './MaterialCard'
import { MATERIALS_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { useRouter, useSearchParams } from 'next/navigation'

export function MaterialsTab() {
  const {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    isMobile,
  } = useMaterialsPage()

  const router = useRouter()
  const searchParams = useSearchParams()

  const handleOpportunityClick = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(id))
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <SearchToolbar>
        <input
          type="text"
          placeholder="搜索描述..."
          value={search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {MATERIALS_STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SearchToolbar>

      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              size="sm"
              title="暂无发布记录"
              description="在创作台完成素材发布后，记录将出现在这里"
            />
          ) : (
            data.map((item) => (
              <MaterialCard
                key={item.id}
                item={item}
                onOpportunityClick={handleOpportunityClick}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MaterialTable
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onOpportunityClick={handleOpportunityClick}
          />
        </div>
      )}
    </div>
  )
}
