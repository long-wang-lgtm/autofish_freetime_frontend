'use client'

import { useQuery } from '@tanstack/react-query'
import { listMonitoredItems } from '@/lib/api/batch-publish'

interface UseSelectionDataParams {
  page: number
  pageSize: number
  title: string | undefined
  uid: string | undefined
  gid: string | undefined
  monitorStatus: string | undefined
  orderBy: string | null
  asc: boolean
}

export function useSelectionData({ page, pageSize, title, uid, gid, monitorStatus, orderBy, asc }: UseSelectionDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', { page, pageSize, title, uid, gid, monitorStatus, orderBy, asc }],
    queryFn: () => listMonitoredItems({
      page,
      page_size: pageSize,
      title,
      uid,
      gid,
      monitorStatus: monitorStatus ? Number(monitorStatus) : undefined,
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
