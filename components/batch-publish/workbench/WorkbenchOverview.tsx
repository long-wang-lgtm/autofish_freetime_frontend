'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtRelative } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface WorkbenchOverviewProps {
  materials: PublishMaterial[]
  total: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  pageSize: number
  onPageChange: (p: number) => void
}

/** 分组：有 publish_failed 的商机置顶 → 最近编辑在前 */
function groupByOpportunity(materials: PublishMaterial[]): Map<string, PublishMaterial[]> {
  const groups = new Map<string, PublishMaterial[]>()
  for (const m of materials) {
    const key = m.opportunity?.name ?? `商机 #${m.opportunity?.id ?? '未知'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  const entries = Array.from(groups.entries())
  entries.sort((a, b) => {
    const aHasFailed = a[1].some(m => m.status === 'publish_failed')
    const bHasFailed = b[1].some(m => m.status === 'publish_failed')
    if (aHasFailed !== bHasFailed) return aHasFailed ? -1 : 1
    const aLatest = Math.max(...a[1].map(m => new Date(m.updated_at ?? 0).getTime()))
    const bLatest = Math.max(...b[1].map(m => new Date(m.updated_at ?? 0).getTime()))
    return bLatest - aLatest
  })
  return new Map(entries)
}

export function WorkbenchOverview({
  materials, total, isLoading, error, onRetry,
  page, pageSize, onPageChange,
}: WorkbenchOverviewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => groupByOpportunity(materials), [materials])

  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleRowClick = (material: PublishMaterial) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    if (material.opportunity?.id) {
      params.set('oid', String(material.opportunity.id))
    }
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error && !isLoading && materials.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={onRetry}
      />
    )
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        size="md"
        title="暂无待处理素材"
        description="所有素材已完成发布。去商机管理或监控页面创建新的素材。"
      />
    )
  }

  const groupCount = grouped.size

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* 摘要 */}
      <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100 flex-shrink-0">
        待发布素材（{groupCount} 个商机，共 {total} 份素材未完成）
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(grouped.entries()).map(([name, items]) => {
          const isCollapsed = collapsedGroups.has(name)
          const pendingCount = items.filter(m => m.status !== 'published').length
          const hasFailed = items.some(m => m.status === 'publish_failed')

          return (
            <div key={name} className="border-b border-gray-100">
              {/* 分组标题 */}
              <button
                onClick={() => toggleGroup(name)}
                className={`flex items-center gap-2 w-full px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${hasFailed ? 'text-red-700' : 'text-gray-700'}`}
              >
                <svg
                  className={`w-3 h-3 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-90'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex-1 text-left">{name}</span>
                <span className="text-xs text-gray-400 font-normal">
                  {pendingCount} 份待处理
                </span>
                {hasFailed && (
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="有发布失败" />
                )}
              </button>

              {/* 分组内素材 */}
              {!isCollapsed && (
                <div>
                  {items.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleRowClick(m)}
                      className="grid gap-2 px-6 py-2 items-center text-xs leading-tight border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      style={{ gridTemplateColumns: '1.5fr 0.8fr 0.7fr 0.5fr' }}
                    >
                      <span className="text-sm text-gray-800 line-clamp-1">
                        素材 #{m.id} · {m.description?.slice(0, 30) || '(无描述)'}
                      </span>
                      <StatusBadge status={m.status} config={MATERIAL_STATUS_CONFIG} />
                      <span className="text-gray-400 tabular-nums">
                        {m.updated_at ? fmtRelative(m.updated_at) : '-'}
                      </span>
                      <span className="text-gray-400 text-right">→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分页 */}
      <div className="flex-shrink-0 border-t border-gray-100">
        <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
      </div>
    </div>
  )
}
