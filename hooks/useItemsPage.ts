"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listItems, getItemsStats, Item, ItemFilters, updateItem, refreshItems, type ItemSortField } from "@/lib/api/items"
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
  const [sortField, setSortField] = useState<ItemSortField | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
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

  const PAGE_SIZE = 20

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["items", filters, sortField, sortDirection],
    queryFn: ({ pageParam = 1 }) =>
      listItems({
        ...filters,
        page: pageParam,
        page_size: PAGE_SIZE,
        order_by: sortField ?? undefined,
        asc: sortField ? (sortDirection === "asc") : undefined,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return allPages.length + 1
    },
    initialPageParam: 1,
  })

  const { data: statsData } = useQuery({
    queryKey: ["itemStats", filters.uid],
    queryFn: () => getItemsStats(filters.uid),
  })

  const { rules: keywordRules, isLoading: keywordsLoading, error: keywordsError, stats: rulesStats, itemKeywordCounts } = useKeywords()

  // ——— 变更 ———
  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Parameters<typeof updateItem>[1] }) =>
      updateItem(gid, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }) },
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

  const handleSort = (field: ItemSortField) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortField(null)
      setSortDirection(null)
    }
  }

  const handleRefresh = useCallback(async () => {
    if (!filters.uid) { addToast({ title: "刷新失败", description: "请先选择账号", variant: "error" }); return }
    setIsRefreshing(true)
    try {
      const result = await refreshItems(filters.uid)
      if (result.success) { queryClient.invalidateQueries({ queryKey: ["items"] }) }
      else { addToast({ title: "刷新失败", description: result.message, variant: "error" }) }
    } catch (e) {
      addToast({ title: "刷新失败", description: e instanceof Error ? e.message : "刷新失败", variant: "error" })
    } finally { setIsRefreshing(false) }
  }, [filters.uid, queryClient, addToast])

  // ——— 派生数据 ———
  const flatItems = useMemo(() => {
    if (!data) return []
    return data.pages.flat()
  }, [data])

  const stats = useMemo(() => ({
    total: statsData?.total || 0,
    onSale: statsData?.onSale || 0,
    offSale: statsData?.offSale || 0,
    sold: statsData?.sold || 0,
  }), [statsData])

  return {
    // 状态
    filters, setFilters,
    searchInput, setSearchInput,
    sortField, sortDirection,
    isRefreshing,
    // 查询结果
    accountsData,
    data: flatItems,
    isLoading, error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    keywordsLoading, keywordsError,
    // 关键词数据
    keywordRules,
    rulesStats,
    itemKeywordCounts,
    // 派生数据
    stats,
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
