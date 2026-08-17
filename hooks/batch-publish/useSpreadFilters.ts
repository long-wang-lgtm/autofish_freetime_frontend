'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useSpreadFilters() {
  const [search, setSearch] = useState('')
  // 素材工作台默认展示全部素材（含进行中的草稿，二创素材创建后立即可见）
  const [status, setStatus] = useState('')

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    status: status || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string | undefined) => {
    if (key === 'search') setSearch(value as string)
    if (key === 'status') setStatus(value as string)
  }, [])

  return {
    search,
    status,
    filters,
    onFilterChange,
  }
}
