"use client"

import { useState, useCallback, useEffect } from "react"
import type { ItemFilters } from "@/lib/api/items"
import { useDebounce } from "@/hooks/useDebounce"

/**
 * 商品管理页 — 筛选/搜索/排序/分页状态
 *
 * 纯 UI 状态层，不包含任何数据获取逻辑。
 */
export function useItemsFilters() {
  const [filters, setFilters] = useState<ItemFilters>({ status: 0 })
  const [searchInput, setSearchInput] = useState({ uid: "", title: "", gid: "" })
  const [orderBy, setOrderBy] = useState<string | null>(null)
  const [asc, setAsc] = useState<boolean>(false)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const debouncedFilters = useDebounce(searchInput, 400)

  // 将防抖后的搜索输入同步到 filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      uid: debouncedFilters.uid || undefined,
      title: debouncedFilters.title || undefined,
      gid: debouncedFilters.gid || undefined,
    }))
  }, [debouncedFilters])

  // 筛选条件变化时重置到第 1 页
  useEffect(() => {
    setPage(1)
  }, [filters.uid, filters.status, filters.title, filters.gid])

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

  return {
    filters, setFilters,
    searchInput, setSearchInput,
    orderBy, asc,
    page, pageSize, setPage,
    handleClearFilters,
    handleSort,
  }
}
