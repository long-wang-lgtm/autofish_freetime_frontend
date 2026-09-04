'use client'

import { useQuery } from '@tanstack/react-query'
import { listMaterials, listMonitoredItems } from '@/lib/api/batch-publish'
import { PAGE_SIZE } from '@/components/batch-publish/shared/constants'

interface UseWorkbenchDataParams {
  selectedGid: string | undefined
  overviewPage: number
  oppSearch: string
  oppPage: number
  materialPage: number
}

/**
 * 工作台数据源（去商机化）：
 * - 左侧列表 = 监控商品（原商机列表数据源，listOpportunities → listMonitoredItems）
 * - 素材工作区按选中监控商品 souItemId 拉取（listMaterials({ souItemId })）
 * - AI 上下文候选 = 当前选中的监控商品自身
 */
export function useWorkbenchData({ selectedGid, overviewPage, oppSearch, oppPage, materialPage }: UseWorkbenchDataParams) {
  // 左侧监控商品列表（queryKey 保留原 'opportunities' 前缀，避免散落的 invalidate 失效）
  const {
    data: oppData,
    isLoading: oppLoading,
    error: oppError,
    refetch: oppRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { page: oppPage, pageSize: PAGE_SIZE, search: oppSearch }],
    queryFn: () => listMonitoredItems({
      page: oppPage,
      page_size: PAGE_SIZE,
      title: oppSearch || undefined,
    }),
  })

  // 概览视图 — 跨商品获取未完成素材
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
      status: 'pending,write_success,write_failed,genimageplan_success,genimageplan_failed,genimage_success,genimage_failed,publish_failed',
    }),
    enabled: !selectedGid,
  })

  // 工作区 — 当前监控商品(gid)下的素材
  const {
    data: materialData,
    isLoading: materialLoading,
    error: materialError,
    refetch: materialRefetch,
  } = useQuery({
    queryKey: ['batch-publish', 'materials', selectedGid, { page: materialPage }],
    queryFn: () => listMaterials({ souItemId: selectedGid, page: materialPage, page_size: 20 }),
    enabled: !!selectedGid,
  })

  // 当前选中的监控商品（左栏列表中反查）
  const selectedItem = oppData?.items?.find(o => o.gid === selectedGid) ?? null

  return {
    // 左侧列表（监控商品）
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

    // AI 上下文候选 = 当前选中的监控商品自身（原「商机绑定商品」语义收敛为单商品）
    monitoredItems: selectedItem ? [selectedItem] : [],

    selectedItem,
  }
}
