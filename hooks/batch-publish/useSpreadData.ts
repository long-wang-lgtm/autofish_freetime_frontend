'use client'

import { useQuery } from '@tanstack/react-query'
import { listMaterials } from '@/lib/api/batch-publish'

interface UseSpreadDataParams {
  filters: {
    description?: string
    oppName?: string
    itemTitle?: string
    souItemId?: string
    toUid?: string
    status?: string
  }
}

/**
 * 铺货工作台数据层 — 全量拉取（单次 100 条），前端按源分组。
 * 分页已移除，五个搜索框 + 状态仍走服务端过滤（debounced filters 由 useSpreadFilters 提供）。
 */
export function useSpreadData({ filters }: UseSpreadDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'materials', 'all', filters],
    queryFn: () => listMaterials({
      page_size: 100,
      description: filters.description,
      oppName: filters.oppName,
      itemTitle: filters.itemTitle,
      souItemId: filters.souItemId,
      toUid: filters.toUid,
      status: filters.status,
    }),
  })

  return {
    data: data?.items ?? [],
    isLoading,
    error,
    refetch,
  }
}
