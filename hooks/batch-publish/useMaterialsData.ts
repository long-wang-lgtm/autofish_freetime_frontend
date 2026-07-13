'use client'

import { useQuery } from '@tanstack/react-query'
import { listMaterials } from '@/lib/api/batch-publish'

interface UseMaterialsDataParams {
  page: number
  pageSize: number
  search: string
  status: string | undefined
  opportunityId: number | undefined
}

export function useMaterialsData({ page, pageSize, search, status, opportunityId }: UseMaterialsDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'materials', 'all', { page, pageSize, search, status, opportunityId }],
    queryFn: () => listMaterials({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status as 'published' | 'publish_failed' | undefined,
      opportunity_id: opportunityId,
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
