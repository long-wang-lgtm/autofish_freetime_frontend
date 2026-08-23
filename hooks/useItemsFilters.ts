"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useDebounce } from "@/hooks/useDebounce"
import type { ItemFilters } from "@/lib/api/items"

export interface ItemsFilterState {
  uid?: string
  status: number | undefined
  title: string
  gid: string
  orderBy: string | null
  asc: boolean
  page: number
}

/** 从 URL searchParams 读取初始筛选状态 */
function readFilterFromParams(params: URLSearchParams): ItemsFilterState {
  return {
    uid: params.get('uid') || undefined,
    status: params.has('status') ? Number(params.get('status')) : 0,
    title: params.get('title') || '',
    gid: params.get('gid') || '',
    orderBy: params.get('orderBy') || null,
    asc: params.get('asc') === 'true',
    page: params.has('page') ? Number(params.get('page')) : 1,
  }
}

/** 将筛选状态写入 URLSearchParams（基于 base 参数保留 tab 等其他参数，仅写入非默认值，保持 URL 简洁） */
function writeFilterToParams(state: ItemsFilterState, base?: URLSearchParams): URLSearchParams {
  const params = base ? new URLSearchParams(base.toString()) : new URLSearchParams()
  // 先清掉本 hook 管理的筛选字段，再写当前值（避免旧值残留）
  for (const key of ['uid', 'status', 'title', 'gid', 'orderBy', 'asc', 'page']) params.delete(key)
  if (state.uid) params.set('uid', state.uid)
  if (state.status !== undefined) params.set('status', String(state.status))
  if (state.title) params.set('title', state.title)
  if (state.gid) params.set('gid', state.gid)
  if (state.orderBy) params.set('orderBy', state.orderBy)
  if (state.asc) params.set('asc', 'true')
  if (state.page > 1) params.set('page', String(state.page))
  return params
}

/**
 * 商品管理页 — 筛选/搜索/排序/分页状态
 *
 * 筛选条件同步到 URL searchParams，刷新页面后筛选条件保留。
 */
export function useItemsFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [filterState, setFilterState] = useState<ItemsFilterState>(() =>
    readFilterFromParams(searchParams),
  )
  const pageSize = 20

  const debouncedState = useDebounce(filterState, 400)
  // 上次写入的完整 URL（防 searchParams 变化触发 effect 重跑时重复 replace / 参数顺序抖动）
  const lastUrlRef = useRef<string | null>(null)

  // 筛选条件 → URL（debounced，避免输入时频繁更新；基于当前 searchParams 保留 tab 等其他参数）
  useEffect(() => {
    const params = writeFilterToParams(debouncedState, searchParams)
    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    if (url === lastUrlRef.current) return
    lastUrlRef.current = url
    router.replace(url, { scroll: false })
  }, [debouncedState, router, pathname, searchParams])

  const filters: ItemFilters = useMemo(() => {
    return {
      uid: debouncedState.uid,
      status: debouncedState.status,
      title: debouncedState.title || undefined,
      gid: debouncedState.gid || undefined,
      order_by: debouncedState.orderBy ?? undefined,
      asc: debouncedState.asc,
    }
  }, [debouncedState])

  // 筛选变化时回到第 1 页
  const prevFilterKey = useRef<string>("")
  const filterKey = JSON.stringify({
    uid: debouncedState.uid,
    status: debouncedState.status,
    title: debouncedState.title,
    gid: debouncedState.gid,
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
