'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { fetchWaitingOrderCount } from '@/lib/api/items'

/** 顶栏提示的三个档位（与后端 /orders.waiting.count 的 key 一致） */
export interface OrderCounts {
  notpay: number
  notship: number
  refunding: number
}

/**
 * 顶栏订单待办计数（待付款 / 待发货 / 退款中）
 *
 * 挂载时查一次；路由变化时静默 refetch（不触发 loading 态），
 * 不做 refetchInterval 轮询（用户拍板）。
 */
export function useOrderCounts(): OrderCounts {
  const pathname = usePathname()
  const { data, refetch } = useQuery({
    queryKey: ['orderCounts'],
    queryFn: fetchWaitingOrderCount,
  })

  // 跳过首次渲染（useQuery 挂载时已请求），仅在路由变化后静默刷新
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    refetch()
  }, [pathname, refetch])

  // 后端只返回有单的状态，缺 key 即 0
  return {
    notpay: data?.['待付款'] ?? 0,
    notship: data?.['待发货'] ?? 0,
    refunding: data?.['退款中'] ?? 0,
  }
}
