'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useMaterialsFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [opportunityId, setOpportunityId] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    status: status || undefined,
    opportunityId,
  }

  const onFilterChange = useCallback((key: string, value: string | number | undefined) => {
    if (key === 'search') setSearch(value as string)
    if (key === 'status') { setStatus(value as string); setPage(1) }
    if (key === 'opportunityId') { setOpportunityId(value as number | undefined); setPage(1) }
  }, [])

  return {
    search,
    status,
    opportunityId,
    page,
    pageSize,
    setPage,
    filters,
    onFilterChange,
  }
}
