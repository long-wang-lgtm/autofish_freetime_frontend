'use client'

import { useMaterialsFilters } from './useMaterialsFilters'
import { useMaterialsData } from './useMaterialsData'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useMaterialsPage() {
  const isMobile = useIsMobile()
  const { search, status, opportunityId, page, pageSize, setPage, filters, onFilterChange } = useMaterialsFilters()
  const { data, total, isLoading, error, refetch } = useMaterialsData({ page, pageSize, ...filters })

  return {
    search, status, opportunityId, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    isMobile,
  }
}
