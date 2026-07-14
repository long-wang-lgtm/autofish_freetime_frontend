'use client'

import { useQuery } from '@tanstack/react-query'
import { listOpportunities, listMaterials, listMonitoredItems } from '@/lib/api/batch-publish'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'

interface UseWorkbenchDataParams {
  selectedOid: number | undefined
  overviewPage: number
  oppSearch: string
  oppStatus: string
  oppPage: number
  materialPage: number
}

export function useWorkbenchData({ selectedOid, overviewPage, oppSearch, oppStatus, oppPage, materialPage }: UseWorkbenchDataParams) {
  // 左侧商机列表
  const {
    data: oppData,
    isLoading: oppLoading,
    error: oppError,
    refetch: oppRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { page: oppPage, pageSize: PAGE_SIZE, search: oppSearch, status: oppStatus }],
    queryFn: () => listOpportunities({
      page: oppPage,
      page_size: PAGE_SIZE,
      name: oppSearch || undefined,
      status: oppStatus || undefined,
    }),
  })

  // 概览视图 — 跨商机获取未完成素材
  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: overviewRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'materials', 'overview', { page: overviewPage }],
    queryFn: () => listMaterials({
      page: overviewPage,
      page_size: 20,
      status: 'pending,writing_done,genimageplan_done,genimage_done,publish_failed',
    }),
    enabled: !selectedOid,
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

  // 工作区 — 当前商机绑定的监控商品
  const {
    data: monitoredData,
    isLoading: monitoredLoading,
    error: monitoredError,
    refetch: monitoredRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', 'workbench', selectedOid],
    queryFn: () => listMonitoredItems({ oid: selectedOid, page_size: 10 }),
    enabled: !!selectedOid,
  })

  return {
    opportunities: oppData?.items ?? [],
    oppTotal: oppData?.total ?? 0,
    oppLoading,
    oppError,
    oppRefetch,

    overviewMaterials: overviewData?.items ?? [],
    overviewTotal: overviewData?.total ?? 0,
    overviewLoading,
    overviewError,
    overviewRefetch,

    materials: materialData?.items ?? [],
    materialTotal: materialData?.total ?? 0,
    materialLoading,
    materialError,
    materialRefetch,

    monitoredItems: monitoredData?.items ?? [],
    monitoredLoading,
    monitoredError,
    monitoredRefetch,

    selectedOpportunity: oppData?.items?.find(o => o.id === selectedOid) ?? null,
  }
}
