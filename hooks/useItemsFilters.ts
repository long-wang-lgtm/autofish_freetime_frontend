"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/useDebounce"
import type { ItemFilters } from "@/lib/api/items"

// ═══════════════════════════════════════════════════════════════
// 筛选状态（chips 字段暂留，后续 Phase 移除芯片搜索 UI）
// ═══════════════════════════════════════════════════════════════

interface SearchChipData {
  field: string
  value: string
}

export interface ItemsFilterState {
  uid?: string
  status: number
  chips: SearchChipData[]        // 暂留，后续 Phase 移除
  orderBy: string | null
  asc: boolean
  page: number
}

/**
 * 商品管理页 — 筛选/搜索/排序/分页状态
 */
export function useItemsFilters() {
  const [filterState, setFilterState] = useState<ItemsFilterState>({
    status: 0,
    chips: [],
    orderBy: null,
    asc: false,
    page: 1,
  })
  const pageSize = 20

  const debouncedState = useDebounce(filterState, 400)

  const filters: ItemFilters = useMemo(() => {
    return {
      uid: debouncedState.uid,
      status: debouncedState.status,
      order_by: debouncedState.orderBy ?? undefined,
      asc: debouncedState.asc,
    }
  }, [debouncedState])

  // 筛选变化时回到第 1 页
  const prevFilterKey = useRef<string>("")
  const filterKey = JSON.stringify({
    uid: debouncedState.uid,
    status: debouncedState.status,
    orderBy: debouncedState.orderBy,
    asc: debouncedState.asc,
  })

  useEffect(() => {
    if (prevFilterKey.current && prevFilterKey.current !== filterKey) {
      setFilterState((prev) => ({ ...prev, page: 1 }))
    }
    prevFilterKey.current = filterKey
  }, [filterKey])

  const onFilterChange = (
    updater: (prev: ItemsFilterState) => ItemsFilterState,
  ) => {
    setFilterState(updater)
  }

  const page = filterState.page
  const setPage = (p: number) => {
    setFilterState((prev) => ({ ...prev, page: p }))
  }

  return {
    filterState,
    onFilterChange,
    filters,
    page,
    pageSize,
    setPage,
  }
}
