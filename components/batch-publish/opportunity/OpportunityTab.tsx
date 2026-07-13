'use client'

import { useState } from 'react'
import { useOpportunityPage } from '@/hooks/batch-publish/useOpportunityPage'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { Pagination } from '@/components/ui/data/Pagination'
import { Sheet } from '@/components/ui/overlay/Sheet'
import { ViewToggle } from '@/components/selection/shared/ViewToggle'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityForm } from './OpportunityForm'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OpportunityItem } from '@/lib/api/batch-publish'

export function OpportunityTab() {
  const {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    createMutation, updateMutation, deleteMutation,
  } = useOpportunityPage()

  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [editingItem, setEditingItem] = useState<OpportunityItem | null>(null)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create')
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelect = (item: OpportunityItem) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(item.id))
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  const handleEdit = (item: OpportunityItem) => {
    setEditingItem(item)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    setSheetMode('create')
    setSheetOpen(true)
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
          placeholder="搜索商机..."
          value={search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
        <div className="flex-1" />
        <ViewToggle view={view} onChange={setView} />
        <button
          onClick={handleCreate}
          className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          新建商机
        </button>
      </SearchToolbar>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {data.length === 0 && !isLoading ? (
          <EmptyState
            size="md"
            title="暂无商机"
            description="点击右上角「新建商机」创建第一个商机"
            action={{ label: '新建商机', onClick: handleCreate }}
          />
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item) => (
                  <OpportunityCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onSelect={handleSelect}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                {data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">📦 {item.monitoredItemCount ?? 0}</span>
                    <span className="text-sm text-gray-600">📝 {item.materialCount ?? 0}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 rounded"
                    >
                      编辑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetMode === 'create' ? '新建商机' : '编辑商机'}
        width="500px"
      >
        <div className="p-6">
          <OpportunityForm
            defaultValues={editingItem ?? undefined}
            onSubmit={(values) => {
              if (sheetMode === 'create') {
                createMutation.mutate(values, { onSuccess: () => setSheetOpen(false) })
              } else if (editingItem) {
                updateMutation.mutate(
                  { oid: editingItem.id, opp: values },
                  { onSuccess: () => setSheetOpen(false) }
                )
              }
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
            submitLabel={sheetMode === 'create' ? '创建商机' : '保存修改'}
          />
        </div>
      </Sheet>
    </div>
  )
}
