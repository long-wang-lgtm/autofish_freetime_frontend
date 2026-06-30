"use client"

import { useCallback } from "react"
import { useItemsFilters } from "@/hooks/useItemsFilters"
import { useItemsData } from "@/hooks/useItemsData"
import { useItemMutations } from "@/hooks/useItemMutations"
import { useIsMobile } from "@/hooks/useIsMobile"

/**
 * 商品管理页 — 组合 hook
 *
 * 组合三个子 hook（筛选状态 / 数据获取 / 变更操作），
 * 提供页面所需的完整接口。
 *
 * 如需按需导入单个职责层：
 * - useItemsFilters — 筛选/搜索/排序/分页状态（芯片搜索）
 * - useItemsData    — React Query 数据获取（items + accounts + keywords）
 * - useItemMutations — 变更操作（toggle + refresh）
 */
export function useItemsPage() {
  const isMobile = useIsMobile()

  // —— 筛选状态 ——
  const {
    filterState,
    onFilterChange,
    filters,
    page,
    pageSize,
    setPage,
  } = useItemsFilters()

  // —— 数据获取 ——
  const {
    accountsData,
    data, isLoading, error, refetch,
    totalItems, totalPages,
    keywordRules, keywordsLoading, keywordsError, rulesStats, itemKeywordCounts,
  } = useItemsData({ filters, page, pageSize })

  // —— 变更操作 ——
  const {
    updateMutation,
    handleToggle,
    handleRefresh: refreshFn,
    isRefreshing,
  } = useItemMutations()

  // 将当前筛选账号传入 refresh
  const handleRefresh = useCallback(() => {
    refreshFn(filterState.uid)
  }, [refreshFn, filterState.uid])

  return {
    // 状态
    filterState,
    onFilterChange,
    page,
    pageSize,
    totalPages,
    setPage,
    totalItems,
    isRefreshing,
    // 查询结果
    accountsData,
    data, isLoading, error, refetch,
    keywordsLoading, keywordsError,
    // 关键词数据
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    // 变更操作
    updateMutation,
    handleToggle,
    handleRefresh,
    // 工具
    isMobile,
  }
}
