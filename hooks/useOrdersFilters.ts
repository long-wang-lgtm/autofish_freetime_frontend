'use client'

import { useCallback, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * 订单列表筛选状态
 *
 * 字段与后端 /orders.list 请求体一一对应，一框一字段（禁止单框搜多字段）。
 * 匹配语义：uid / orderId / gid / buyerId 为精确匹配，title / buyerName 为包含匹配。
 */
export interface OrdersFilterState {
  uid?: string
  orderId: string
  gid: string
  title: string
  buyerId: string
  buyerName: string
}

const EMPTY_FILTERS: OrdersFilterState = {
  uid: undefined,
  orderId: '',
  gid: '',
  title: '',
  buyerId: '',
  buyerName: '',
}

/** 筛选输入防抖 —— 300ms（项目搜索框口径） */
export const ORDERS_FILTER_DEBOUNCE = 300

/**
 * 订单筛选 hook
 *
 * 维护两份状态：`filters` 是输入框里的实时值（受控），`query` 是防抖后的值（喂请求）。
 * 边打字边请求会让列表反复跳，所以停手 300ms 才把 filters 落到 query；下拉与文本共用
 * 同一条防抖，切账号也不会连跳。
 */
export function useOrdersFilters() {
  const [filters, setFilters] = useState<OrdersFilterState>(EMPTY_FILTERS)
  const query = useDebounce(filters, ORDERS_FILTER_DEBOUNCE)

  const setFilter = useCallback(
    <K extends keyof OrdersFilterState>(key: K, value: OrdersFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), [])

  /** 已填筛选的个数（移动端「筛选 N」徽章与清空按钮可用态都用它） */
  const activeCount = Object.values(filters).filter(Boolean).length

  return { filters, query, setFilter, clearFilters, activeCount }
}
