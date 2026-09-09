'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { DRAFT_BACKLOG_STATUS } from '@/components/batch-publish/shared/constants'

/** 草稿箱筛选状态——默认范围为全部未发布素材，不重复置位时只在状态/搜索变化时重置到第一页 */
export function useDraftsFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(DRAFT_BACKLOG_STATUS)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    status: status || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'search') setSearch(value)
    if (key === 'status') { setStatus(value); setPage(1) }
  }, [])

  return {
    search,
    status,
    page,
    pageSize,
    setPage,
    filters,
    onFilterChange,
  }
}
