'use client'

import { useOpportunityFilters } from './useOpportunityFilters'
import { useOpportunityData } from './useOpportunityData'
import { useOpportunityMutations } from './useOpportunityMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useOpportunityPage() {
  const isMobile = useIsMobile()
  const { search, status, page, pageSize, setPage, filters, onFilterChange } = useOpportunityFilters()
  const { data, total, isLoading, error, refetch } = useOpportunityData({ page, pageSize, ...filters })
  const { createMutation, updateMutation, deleteMutation } = useOpportunityMutations()

  return {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    createMutation, updateMutation, deleteMutation,
    isMobile,
  }
}
