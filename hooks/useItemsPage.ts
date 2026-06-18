"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listItems, Item, ItemFilters, updateItem, refreshItems } from "@/lib/api/items"
import { getAccountNames } from "@/lib/api/accounts"
import { useToast } from "@/components/ui/toaster"
import { useDebounce } from "@/hooks/useDebounce"
import { useIsMobile } from "@/hooks/useIsMobile"
import { useKeywords } from "@/hooks/useKeywords"
import type { ConfigField } from "@/components/items/config"
import type { KeywordRule } from "@/lib/api/keywords"

export function useItemsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()

  // ——— 状态 ———
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [keywordItem, setKeywordItem] = useState<Item | null>(null)
  const [mobileConfig, setMobileConfig] = useState<{ item: Item; field: ConfigField } | null>(null)
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filters, setFilters] = useState<ItemFilters>({ status: 0 })
  const [searchInput, setSearchInput] = useState({ uid: "", title: "", gid: "" })
  const [sortField, setSortField] = useState<"title" | "price" | "publishTime" | "status" | null>(null)
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => listItems(filters),
    refetchInterval: 30000,
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

  // 注意：不包裹 useCallback — handler 内部直接读取最新 state，避免闭包陷阱
  const handleSort = (field: "title" | "price" | "publishTime" | "status") => {
    if (sortField !== field) { setSortField(field); setSortDirection("asc") }
    else if (sortDirection === "asc") { setSortDirection("desc") }
    else { setSortField(null); setSortDirection(null) }
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
  const sortedItems = useMemo(() => {
    if (!sortField || !sortDirection || !data) return data || []
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]
      if (sortField === "publishTime") { aVal = aVal ? Number(aVal) : 0; bVal = bVal ? Number(bVal) : 0 }
      else if (sortField === "price") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0 }
      else if (sortField === "status") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0 }
      else { aVal = String(aVal || ""); bVal = String(bVal || "") }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [data, sortField, sortDirection])

  const stats = useMemo(() => ({
    total: data?.length || 0,
    onSale: data?.filter(i => i.status === 0).length || 0,
    offSale: data?.filter(i => i.status === 1).length || 0,
    sold: data?.filter(i => i.status === -2).length || 0,
  }), [data])

  return {
    // 状态
    editingItem, setEditingItem,
    keywordItem, setKeywordItem,
    mobileConfig, setMobileConfig,
    editingRule, setEditingRule,
    showCreateForm, setShowCreateForm,
    filters, setFilters,
    searchInput, setSearchInput,
    sortField, sortDirection,
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
    sortedItems,
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
