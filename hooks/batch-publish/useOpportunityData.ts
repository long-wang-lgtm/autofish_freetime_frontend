'use client'

import { useQuery } from '@tanstack/react-query'
import { listOpportunities } from '@/lib/api/batch-publish'

interface UseOpportunityDataParams {
  page: number
  pageSize: number
  search: string
  status: string | undefined
}

export function useOpportunityData({ page, pageSize, search, status }: UseOpportunityDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { page, pageSize, search, status }],
    queryFn: () => listOpportunities({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
    }),
  })

  return {
    data: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  }
}
