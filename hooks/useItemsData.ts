"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { listItems, getItemStats } from "@/lib/api/items"
import { getAccountNames } from "@/lib/api/accounts"
import { useKeywords } from "@/hooks/useKeywords"
import type { ItemFilters } from "@/lib/api/items"

interface UseItemsDataParams {
  filters: ItemFilters
  page: number
  pageSize: number
  orderBy: string | null
  asc: boolean
}

/**
 * 商品管理页 — 数据获取层
 *
 * 组合 accounts、items、stats、keywords 四个查询，
 * 返回派生数据（totalItems、totalPages、stats）。
 * 不包含任何变更操作或 UI 状态。
 */
export function useItemsData({ filters, page, pageSize, orderBy, asc }: UseItemsDataParams) {
  // 账号列表（用于筛选下拉）
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountNames,
  })

  // 商品列表
  const { data: listData, isLoading, error } = useQuery({
    queryKey: ["items", filters, page, pageSize, orderBy, asc],
    queryFn: () => listItems({ ...filters, page, size: pageSize, order_by: orderBy ?? undefined, asc }),
  })

  const data = listData?.items
  const totalFromList = listData?.total ?? 0

  // 商品统计
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["itemStats", filters.uid, filters.status],
    queryFn: () => getItemStats(filters.uid, filters.status),
  })

  // 关键词规则
  const {
    rules: keywordRules,
    isLoading: keywordsLoading,
    error: keywordsError,
    stats: rulesStats,
    itemKeywordCounts,
  } = useKeywords()

  // 派生数据
  const totalItems = totalFromList
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const stats = useMemo(() => ({
    total: totalItems,
    onSale: statsData?.status[0] || 0,
    offSale: statsData?.status[-2] || 0,
    sold: statsData?.status[1] || 0,
    deliveryConfigured: Math.max(0, totalItems - (statsData?.deliveryEmpty || 0)),
  }), [statsData, totalItems])

  return {
    accountsData,
    data, isLoading, error,
    totalItems, totalPages,
    stats, statsLoading,
    keywordRules, keywordsLoading, keywordsError, rulesStats, itemKeywordCounts,
  }
}
