'use client'

import { useQuery } from '@tanstack/react-query'
import { listAccounts, type Account } from '@/lib/api/accounts'
import { queryKeys } from '@/components/batch-publish/shared/constants'

/**
 * 账号列表 — 全局引用数据，全应用共享同一份 ['accounts'] 缓存。
 * 账号变化频率极低，延长 staleTime/gcTime 避免重复请求；
 * 其他模块可用 queryClient.getQueryData(queryKeys.accounts) 直接读取。
 */
export function useAccounts() {
  const { data = [], isLoading } = useQuery<Account[]>({
    queryKey: queryKeys.accounts,
    queryFn: () => listAccounts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  return { accounts: data, isLoading }
}
