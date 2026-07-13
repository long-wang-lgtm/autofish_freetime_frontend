'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useOpportunityFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
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
