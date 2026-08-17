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
    deleteMutation,
    createByItemMutation,
    statusToggleMutation,
  } = useMonitorMutations()

  return {
    // 筛选
    search,
    monitorStatus,
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
    deleteMutation,
    createByItemMutation,
    statusToggleMutation,
    isMobile,
  }
}
