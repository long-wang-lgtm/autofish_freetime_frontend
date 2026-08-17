'use client'

import { useQuery } from '@tanstack/react-query'
import { listMaterials } from '@/lib/api/batch-publish'

interface UseSpreadDataParams {
  search: string
  status: string | undefined
}

/**
 * 铺货工作台数据层 — 全量拉取（单次 100 条），前端按源分组。
 * 分页已移除，搜索/状态仍走服务端过滤（debounced search 由 filters 提供）。
 */
export function useSpreadData({ search, status }: UseSpreadDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'materials', 'all', { search, status }],
    queryFn: () => listMaterials({
      page_size: 100,
      description: search || undefined,
      status: status || undefined,
    }),
  })

  return {
    data: data?.items ?? [],
    isLoading,
    error,
    refetch,
  }
}
