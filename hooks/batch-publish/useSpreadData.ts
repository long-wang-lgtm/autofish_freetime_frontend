'use client'

import { useQuery } from '@tanstack/react-query'
import { listMaterials } from '@/lib/api/batch-publish'

interface UseSpreadDataParams {
  page: number
  pageSize: number
  search: string
  status: string | undefined
  opportunityId: number | undefined
}

export function useSpreadData({ page, pageSize, search, status, opportunityId }: UseSpreadDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'materials', 'all', { page, pageSize, search, status, opportunityId }],
    queryFn: () => listMaterials({
      page,
      page_size: pageSize,
      description: search || undefined,
      status: status || undefined,
      oid: opportunityId,
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
