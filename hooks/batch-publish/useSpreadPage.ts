'use client'

import { useSpreadFilters } from './useSpreadFilters'
import { useSpreadData } from './useSpreadData'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useSpreadPage() {
  const isMobile = useIsMobile()
  const { search, status, opportunityId, page, pageSize, setPage, filters, onFilterChange } = useSpreadFilters()
  const { data, total, isLoading, error, refetch } = useSpreadData({ page, pageSize, ...filters })

  return {
    search, status, opportunityId, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    isMobile,
  }
}
