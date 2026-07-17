'use client'

import { useMonitorFilters } from './useMonitorFilters'
import { useMonitorData } from './useMonitorData'
import { useMonitorMutations } from './useMonitorMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useMonitorPage() {
  const isMobile = useIsMobile()

  const {
    search,
    monitorStatus,
    bindStatus,
    page,
    pageSize,
    setPage,
    orderBy,
    asc,
    onSortChange,
    filters,
    onFilterChange,
  } = useMonitorFilters()

  const {
    data,
    total,
    isLoading,
    error,
    refetch,
  } = useMonitorData({ page, pageSize, ...filters, orderBy, asc })

  const {
    bindMutation,
    unbindMutation,
    deleteMutation,
    singleBindMutation,
    bindAndCreateMutation,
    statusToggleMutation,
  } = useMonitorMutations()

  return {
    // 筛选
    search,
    monitorStatus,
    bindStatus,
    onFilterChange,
    // 排序 & 分页
    orderBy,
    asc,
    onSortChange,
    page,
    pageSize,
    total,
    setPage,
    // 数据
    data,
    isLoading,
    error,
    refetch,
    // 操作
    bindMutation,
    unbindMutation,
    deleteMutation,
    singleBindMutation,
    bindAndCreateMutation,
    statusToggleMutation,
    isMobile,
  }
}
