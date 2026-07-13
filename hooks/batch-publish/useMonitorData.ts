'use client'

import { useQuery } from '@tanstack/react-query'
import { listMonitoredItems } from '@/lib/api/batch-publish'

interface UseMonitorDataParams {
  page: number
  pageSize: number
  search: string
  monitorStatus: string | undefined
  bindStatus: string | undefined
  orderBy: string | null
  asc: boolean
}

export function useMonitorData({ page, pageSize, search, monitorStatus, bindStatus, orderBy, asc }: UseMonitorDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', { page, pageSize, search, monitorStatus, bindStatus, orderBy, asc }],
    queryFn: () => listMonitoredItems({
      page,
      page_size: pageSize,
      title: search || undefined,
      monitorStatus: monitorStatus ? Number(monitorStatus) : undefined,
      oid: bindStatus === 'bound' ? undefined : bindStatus === 'unbound' ? 0 : undefined,
      order_by: orderBy ?? undefined,
      asc,
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
