'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { useOriginalFilters } from './useOriginalFilters'
import { useOriginalData } from './useOriginalData'
import { useOriginalMutations } from './useOriginalMutations'
import { useOpportunityMutations } from './useOpportunityMutations'
import { listAccounts, type Account } from '@/lib/api/accounts'

export function useOriginalPage() {
  const filters = useOriginalFilters()
  const opportunityMutations = useOpportunityMutations()

  // 商机列表的筛选
  const [oppSearch, setOppSearch] = useState('')
  const [oppStatus, setOppStatus] = useState('')
  const [oppSummaryStatus, setOppSummaryStatus] = useState('') // 提炼状态筛选（见 OPPORTUNITY_SUMMARY_STATUS_FILTER_OPTIONS）
  const [oppPage, setOppPage] = useState(1)
  const debouncedOppSearch = useDebounce(oppSearch, 300)

  // 素材表格分页
  const [materialPage, setMaterialPage] = useState(1)

  const data = useOriginalData({
    selectedOid: filters.selectedOid,
    oppSearch: debouncedOppSearch,
    oppStatus,
    oppSummaryStatus,
    oppPage,
    materialPage,
  })

  const workbenchData = data

  const mutations = useOriginalMutations(filters.selectedOid)

  // 全局账号列表 — 挂载时获取，长期缓存
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // 切换商机弹窗
  const [switchOpen, setSwitchOpen] = useState(false)

  // rejected 徽章点击 → 详情判定区聚焦信号（递增 token，MaterialWorkspace 挂载后滚动）
  const [reviewFocusToken, setReviewFocusToken] = useState(0)

  return {
    ...filters,
    ...workbenchData,
    ...mutations,
    accounts,
    oppSearch, oppStatus, oppSummaryStatus, oppPage,
    setOppSearch, setOppStatus, setOppSummaryStatus, setOppPage,
    materialPage, setMaterialPage,
    switchOpen, setSwitchOpen,
    reviewFocusToken, setReviewFocusToken,
    // 商机 CRUD（来自 useOpportunityMutations，注意不与 ...mutations 中 deleteMaterialMutation 冲突）
    createOpportunity: opportunityMutations.createMutation,
    updateOpportunity: opportunityMutations.updateMutation,
    deleteOpportunity: opportunityMutations.deleteMutation,
  }
}
