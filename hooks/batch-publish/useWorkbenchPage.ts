'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useWorkbenchFilters } from './useWorkbenchFilters'
import { useWorkbenchData } from './useWorkbenchData'
import { useWorkbenchMutations } from './useWorkbenchMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useWorkbenchPage() {
  const isMobile = useIsMobile()
  const filters = useWorkbenchFilters()

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
  })

  const mutations = useWorkbenchMutations(filters.selectedOid)

  // 移动端导航栈
  type MobileView = 'overview' | 'opportunity-list' | 'workspace'
  const [mobileView, setMobileView] = useState<MobileView>(
    filters.selectedOid ? 'workspace' : 'overview'
  )

  // 当 selectedOid 变化时同步 mobileView（深度链接、导航跳转）
  useEffect(() => {
    if (isMobile) {
      if (filters.selectedOid) {
        setMobileView('workspace')
      }
      // 不自动切回 overview — 由面包屑返回按钮触发
    }
  }, [isMobile, filters.selectedOid])

  return {
    ...filters,
    ...data,
    ...mutations,
    isMobile,
    oppSearch, oppStatus, oppPage,
    setOppSearch, setOppStatus, setOppPage,
    overviewPage, setOverviewPage,
    materialPage, setMaterialPage,
    mobileView, setMobileView,
  }
}
