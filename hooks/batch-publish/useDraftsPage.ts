'use client'

import { useDraftsFilters } from './useDraftsFilters'
import { useDraftsData } from './useDraftsData'

export function useDraftsPage() {
  const { search, status, toUid, page, pageSize, setPage, filters, onFilterChange } = useDraftsFilters()
  const { data, total, isLoading, error, refetch, queryKey } = useDraftsData({ page, pageSize, ...filters })

  return {
    search, status, toUid, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    // 素材列表完整缓存 key——供行内编辑（MaterialTableRow）乐观更新命中当前列表
    listQueryKey: queryKey,
  }
}
