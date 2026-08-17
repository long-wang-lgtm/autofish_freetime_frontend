'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useSelectionFilters() {
  const [search, setSearch] = useState('')
  const [monitorStatus, setMonitorStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [orderBy, setOrderBy] = useState<string | null>('wantSlope')
  const [asc, setAsc] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    monitorStatus: monitorStatus || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'search') setSearch(value)
    if (key === 'monitorStatus') { setMonitorStatus(value); setPage(1) }
  }, [])

  const onSortChange = useCallback((field: string | null) => {
    setOrderBy(field)
    setAsc(false)
    setPage(1)
  }, [])

  return {
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
  }
}
