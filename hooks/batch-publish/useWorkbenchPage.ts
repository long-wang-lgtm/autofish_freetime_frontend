'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { useWorkbenchFilters } from './useWorkbenchFilters'
import { useWorkbenchData } from './useWorkbenchData'
import { useWorkbenchMutations } from './useWorkbenchMutations'
import { useIsMobile } from '@/hooks/useIsMobile'
import { listAccounts, type Account } from '@/lib/api/accounts'

export function useWorkbenchPage() {
  const isMobile = useIsMobile()
  const filters = useWorkbenchFilters()

  // 左侧监控商品列表的筛选
  const [oppSearch, setOppSearch] = useState('')
  const [oppPage, setOppPage] = useState(1)
  const debouncedOppSearch = useDebounce(oppSearch, 300)

  // 概览视图分页
  const [overviewPage, setOverviewPage] = useState(1)

  // 素材表格分页
  const [materialPage, setMaterialPage] = useState(1)

  const data = useWorkbenchData({
    selectedGid: filters.selectedGid,
    overviewPage,
    oppSearch: debouncedOppSearch,
    oppPage,
    materialPage,
  })

  const mutations = useWorkbenchMutations(filters.selectedGid)

  // 全局账号列表 — 挂载时获取，长期缓存
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // 移动端顶层视图切换（仅控制无选中商品时显示概览还是商品列表）
  type MobileView = 'overview' | 'items'
  const [mobileView, setMobileView] = useState<MobileView>('overview')

  return {
    ...filters,
    ...data,
    ...mutations,
    isMobile,
    accounts,
    oppSearch, oppPage,
    setOppSearch, setOppPage,
    overviewPage, setOverviewPage,
    materialPage, setMaterialPage,
    mobileView, setMobileView,
  }
}
