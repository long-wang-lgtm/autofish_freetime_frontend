'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listMaterials } from '@/lib/api/batch-publish'

interface UseDraftsDataParams {
  page: number
  pageSize: number
  search: string
  status: string | undefined
}

export function useDraftsData({ page, pageSize, search, status }: UseDraftsDataParams) {
  // 缓存维度 drafts——独立于「发布记录」的 all 维度，行内编辑乐观更新/失效通过 queryKey/listPrefix 精确命中。
  // 用 useMemo 保持 key 引用稳定，避免行组件每次渲染被重挂载。
  const queryKey = useMemo<unknown[]>(
    () => ['batch-publish', 'materials', 'drafts', { page, pageSize, search, status }],
    [page, pageSize, search, status],
  )

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => listMaterials({
      page,
      page_size: pageSize,
      description: search || undefined,
      status: status || undefined,
    }),
  })

  return {
    data: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
    queryKey,
  }
}
