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
 * 保持向后兼容的完整接口。
 *
 * 如需按需导入单个职责层：
 * - useItemsFilters — 筛选/搜索/排序/分页状态
 * - useItemsData    — React Query 数据获取（items + stats + accounts + keywords）
 * - useItemMutations — 变更操作（toggle + refresh）
 */
export function useItemsPage() {
  const isMobile = useIsMobile()

  // —— 筛选状态 ——
  const {
    filters, setFilters,
    searchInput, setSearchInput,
    orderBy, asc,
    page, pageSize, setPage,
    handleClearFilters,
    handleSort,
  } = useItemsFilters()

  // —— 数据获取 ——
  const {
    accountsData,
    data, isLoading, error,
    totalItems, totalPages,
    stats, statsLoading,
    keywordRules, keywordsLoading, keywordsError, rulesStats, itemKeywordCounts,
  } = useItemsData({ filters, page, pageSize, orderBy, asc })

  // —— 变更操作 ——
  const {
    updateMutation,
    handleToggle,
    handleRefresh: refreshFn,
    isRefreshing,
  } = useItemMutations()

  // 将当前筛选账号传入 refresh
  const handleRefresh = useCallback(() => {
    refreshFn(filters.uid)
  }, [refreshFn, filters.uid])

  return {
    // 状态
    filters, setFilters,
    searchInput, setSearchInput,
    orderBy, asc,
    page, pageSize, totalPages, setPage, totalItems,
    isRefreshing,
    // 查询结果
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    // 关键词数据
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    // 派生数据
    stats,
    statsLoading,
    // 处理器
    updateMutation,
    handleToggle,
    handleClearFilters,
    handleSort,
    handleRefresh,
    // 工具
    isMobile,
  }
}
