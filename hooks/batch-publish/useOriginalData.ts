'use client'

import { useQuery } from '@tanstack/react-query'
import { listOpportunities, listMaterials } from '@/lib/api/batch-publish'
import { PAGE_SIZE, toSummaryStatusQuery } from '@/components/batch-publish/shared/constants'

interface UseOriginalDataParams {
  selectedOid: number | undefined
  oppSearch: string
  oppStatus: string
  oppPage: number
  materialPage: number
  /** 提炼状态筛选选项 value（见 OPPORTUNITY_SUMMARY_STATUS_FILTER_OPTIONS） */
  oppSummaryStatus: string
}

export function useOriginalData({ selectedOid, oppSearch, oppStatus, oppPage, materialPage, oppSummaryStatus }: UseOriginalDataParams) {
  // 商机列表
  const summaryStatus = toSummaryStatusQuery(oppSummaryStatus)
  const {
    data: oppData,
    isLoading: oppLoading,
    error: oppError,
    refetch: oppRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { page: oppPage, pageSize: PAGE_SIZE, search: oppSearch, status: oppStatus, summaryStatus }],
    queryFn: () => listOpportunities({
      page: oppPage,
      page_size: PAGE_SIZE,
      name: oppSearch || undefined,
      status: oppStatus || undefined,
      summary_status: summaryStatus,
    }),
  })

  // 工作区 — 当前商机下的素材
  const {
    data: materialData,
    isLoading: materialLoading,
    error: materialError,
    refetch: materialRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'materials', selectedOid, { page: materialPage }],
    queryFn: () => listMaterials({ oid: selectedOid, page: materialPage, page_size: 20 }),
    enabled: !!selectedOid,
  })

  return {
    opportunities: oppData?.items ?? [],
    oppTotal: oppData?.total ?? 0,
    oppLoading,
    oppError,
    oppRefetch,

    materials: materialData?.items ?? [],
    materialTotal: materialData?.total ?? 0,
    materialLoading,
    materialError,
    materialRefetch,

    selectedOpportunity: oppData?.items?.find(o => o.id === selectedOid) ?? null,
  }
}
