"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listItems, Item, ItemFilters, updateItem, refreshItems, getItemStats } from "@/lib/api/items"
import { getAccountNames } from "@/lib/api/accounts"
import { useToast } from "@/components/ui/toaster"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsMobile } from "@/hooks/useIsMobile"
import { useKeywords } from "@/hooks/useKeywords"

export function useItemsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()

  // ——— 状态 ———
  const [filters, setFilters] = useState<ItemFilters>({ status: 0 })
  const [searchInput, setSearchInput] = useState({ uid: "", title: "", gid: "" })
  const [orderBy, setOrderBy] = useState<string | null>(null)
  const [asc, setAsc] = useState<boolean>(false)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ——— 查询 ———
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountNames,
  })

  const debouncedFilters = useDebounce(searchInput, 400)

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      uid: debouncedFilters.uid || undefined,
      title: debouncedFilters.title || undefined,
      gid: debouncedFilters.gid || undefined,
    }))
  }, [debouncedFilters])

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", filters, page, pageSize, orderBy, asc],
    queryFn: () => listItems({ ...filters, page, page_size: pageSize, order_by: orderBy ?? undefined, asc }),
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["itemStats", filters.uid, filters.status],
    queryFn: () => getItemStats(filters.uid, filters.status),
  })

  const { rules: keywordRules, isLoading: keywordsLoading, error: keywordsError, stats: rulesStats, itemKeywordCounts } = useKeywords()

  // ——— 变更 ———
  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Parameters<typeof updateItem>[1] }) =>
      updateItem(gid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      queryClient.invalidateQueries({ queryKey: ["itemStats"] })
    },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  // ——— 处理器 ———
  const handleToggle = useCallback((item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => {
    updateMutation.mutate({ gid: item.gid, data: { [field]: !item[field] } })
  }, [updateMutation])

  const handleClearFilters = useCallback(() => {
    setSearchInput({ uid: "", title: "", gid: "" })
    setFilters({ status: 0 })
  }, [])

  // 注意：不包裹 useCallback — handler 内部直接读取最新 state，避免闭包陷阱
  const handleSort = (fieldKey: string) => {
    if (orderBy === fieldKey) {
      if (asc === false) {
        setAsc(true)
      } else {
        setOrderBy(null)
      }
    } else {
      setOrderBy(fieldKey)
      setAsc(false)
    }
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [filters.uid, filters.status, filters.title, filters.gid])

  const handleRefresh = useCallback(async () => {
    if (!filters.uid) { addToast({ title: "刷新失败", description: "请先选择账号", variant: "error" }); return }
    setIsRefreshing(true)
    try {
      const result = await refreshItems(filters.uid)
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["items"] })
        queryClient.invalidateQueries({ queryKey: ["itemStats"] })
      }
      else { addToast({ title: "刷新失败", description: result.message, variant: "error" }) }
    } catch (e) {
      addToast({ title: "刷新失败", description: e instanceof Error ? e.message : "刷新失败", variant: "error" })
    } finally { setIsRefreshing(false) }
  }, [filters.uid, queryClient, addToast])

  // ——— 派生数据 ———
  const totalItems = statsData ? Object.values(statsData.status).reduce((a, b) => a + b, 0) : 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const stats = useMemo(() => ({
    total: totalItems,
    onSale: statsData?.status[0] || 0,
    offSale: statsData?.status[-2] || 0,
    sold: statsData?.status[1] || 0,
  }), [statsData, totalItems])

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
