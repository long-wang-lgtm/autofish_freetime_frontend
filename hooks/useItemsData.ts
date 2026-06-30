"use client"

import { useQuery } from "@tanstack/react-query"
import { listItems } from "@/lib/api/items"
import { getAccountNames } from "@/lib/api/accounts"
import { useKeywords } from "@/hooks/useKeywords"
import type { ItemFilters } from "@/lib/api/items"

interface UseItemsDataParams {
  filters: ItemFilters
  page: number
  pageSize: number
}

/**
 * 商品管理页 — 数据获取层
 *
 * 组合 accounts、items、keywords 三个查询，
 * 返回派生数据（totalItems、totalPages）。
 * 不包含任何变更操作或 UI 状态。
 */
export function useItemsData({ filters, page, pageSize }: UseItemsDataParams) {
  // 账号列表（用于筛选下拉）
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountNames,
  })

  // 商品列表
  const { data: listData, isLoading, error, refetch } = useQuery({
    queryKey: ["items", filters, page, pageSize],
    queryFn: () => listItems({ ...filters, page, size: pageSize }),
  })

  const data = listData?.items
  const totalItems = listData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // 关键词规则
  const {
    rules: keywordRules,
    isLoading: keywordsLoading,
    error: keywordsError,
    stats: rulesStats,
    itemKeywordCounts,
  } = useKeywords()

  return {
    accountsData,
    data,
    isLoading,
    error,
    refetch,
    totalItems,
    totalPages,
    keywordRules,
    keywordsLoading,
    keywordsError,
    rulesStats,
    itemKeywordCounts,
  }
}
