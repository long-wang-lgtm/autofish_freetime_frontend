'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { fetchPendingOrderCount } from '@/lib/api/items'

/**
 * Header 待发货订单数量
 *
 * 挂载时查一次；路由变化时静默 refetch（不触发 loading 态），
 * 不做 refetchInterval 轮询（用户拍板）。
 */
export function usePendingOrderCount() {
  const pathname = usePathname()
  const { data, refetch } = useQuery({
    queryKey: ['pendingOrderCount'],
    queryFn: fetchPendingOrderCount,
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

  return { total: data?.total ?? 0 }
}
