"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/useDebounce"
import {
  chipsToFilters,
  type ItemFilters,
  type ItemsFilterState,
} from "@/lib/api/items"

/**
 * 商品管理页 — 筛选/搜索/排序/分页状态
 *
 * 纯 UI 状态层：ItemsFilterState 统一管理所有筛选条件（芯片搜索 + 账号 + 状态 + 排序），
 * 400ms 防抖后派生 ItemFilters 供 useItemsData 使用。
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

  // 400ms 防抖芯片搜索（即时变化项：uid/status/page/sort 也一起走防抖，UX 可接受）
  const debouncedState = useDebounce(filterState, 400)

  // 防抖后的 ItemFilters（供 useItemsData 查询用）
  const filters: ItemFilters = useMemo(() => {
    const chipFilters = chipsToFilters(debouncedState.chips)
    return {
      uid: debouncedState.uid,
      status: debouncedState.status,
      ...chipFilters,
      order_by: debouncedState.orderBy ?? undefined,
      asc: debouncedState.asc,
    }
  }, [debouncedState])

  // 筛选条件变化时重置到第 1 页（跳过 page 自身变化触发）
  const prevFilterKey = useRef<string>("")
  const filterKey = JSON.stringify({
    uid: debouncedState.uid,
    status: debouncedState.status,
    chips: debouncedState.chips.map(c => `${c.field}:${c.value}`).sort().join(","),
    orderBy: debouncedState.orderBy,
    asc: debouncedState.asc,
  })

  useEffect(() => {
    if (prevFilterKey.current && prevFilterKey.current !== filterKey) {
      setFilterState((prev) => ({ ...prev, page: 1 }))
    }
    prevFilterKey.current = filterKey
  }, [filterKey])

  // ——— 供 ItemsFilterBar 使用的回调 ———
  const onFilterChange = (
    updater: (prev: ItemsFilterState) => ItemsFilterState,
  ) => {
    setFilterState(updater)
  }

  // 提取 page 从 filterState 中，供外部使用
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
