'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { useWorkbenchFilters } from './useWorkbenchFilters'
import { useWorkbenchData } from './useWorkbenchData'
import { useWorkbenchMutations } from './useWorkbenchMutations'
import { useOpportunityMutations } from './useOpportunityMutations'
import { useIsMobile } from '@/hooks/useIsMobile'
import { listAccounts, type Account } from '@/lib/api/accounts'

export function useWorkbenchPage() {
  const isMobile = useIsMobile()
  const filters = useWorkbenchFilters()
  const opportunityMutations = useOpportunityMutations()

  // 左侧商机列表的筛选
  const [oppSearch, setOppSearch] = useState('')
  const [oppStatus, setOppStatus] = useState('')
  const [oppPage, setOppPage] = useState(1)
  const debouncedOppSearch = useDebounce(oppSearch, 300)

  // 概览视图分页
  const [overviewPage, setOverviewPage] = useState(1)

  // 素材表格分页
  const [materialPage, setMaterialPage] = useState(1)

  const data = useWorkbenchData({
    selectedOid: filters.selectedOid,
    overviewPage,
    oppSearch: debouncedOppSearch,
    oppStatus,
    oppPage,
    materialPage,
  })

  const workbenchData = data

  const mutations = useWorkbenchMutations(filters.selectedOid)

  // 全局账号列表 — 挂载时获取，长期缓存
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // 移动端顶层视图切换（仅控制无选中商机时显示概览还是商机列表）
  type MobileView = 'overview' | 'opportunities'
  const [mobileView, setMobileView] = useState<MobileView>('overview')

  return {
    ...filters,
    ...workbenchData,
    ...mutations,
    isMobile,
    accounts,
    oppSearch, oppStatus, oppPage,
    setOppSearch, setOppStatus, setOppPage,
    overviewPage, setOverviewPage,
    materialPage, setMaterialPage,
    mobileView, setMobileView,
    // 商机 CRUD（来自 useOpportunityMutations，注意不与 ...mutations 中 deleteMaterialMutation 冲突）
    createOpportunity: opportunityMutations.createMutation,
    updateOpportunity: opportunityMutations.updateMutation,
    deleteOpportunity: opportunityMutations.deleteMutation,
  }
}
