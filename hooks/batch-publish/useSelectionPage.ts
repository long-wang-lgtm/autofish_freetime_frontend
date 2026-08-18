'use client'

import { useSelectionFilters } from './useSelectionFilters'
import { useSelectionData } from './useSelectionData'
import { useSelectionMutations } from './useSelectionMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useSelectionPage() {
  const isMobile = useIsMobile()

  const {
    title,
    uid,
    gid,
    monitorStatus,
    page,
    pageSize,
    setPage,
    orderBy,
    asc,
    onSortChange,
    filters,
    onFilterChange,
  } = useSelectionFilters()

  const {
    data,
    total,
    isLoading,
    error,
    refetch,
  } = useSelectionData({ page, pageSize, ...filters, orderBy, asc })

  const {
    deleteMutation,
    createByItemMutation,
    statusToggleMutation,
  } = useSelectionMutations()

  return {
    // 筛选
    title,
    uid,
    gid,
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
