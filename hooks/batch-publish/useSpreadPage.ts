'use client'

import { useSpreadFilters } from './useSpreadFilters'
import { useSpreadData } from './useSpreadData'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useSpreadPage() {
  const isMobile = useIsMobile()
  const { search, status, filters, onFilterChange } = useSpreadFilters()
  const { data, isLoading, error, refetch } = useSpreadData(filters)

  return {
    search, status, onFilterChange,
    data, isLoading, error, refetch,
    isMobile,
  }
}
