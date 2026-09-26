'use client'

import { useIsMobile } from '@/hooks/useIsMobile'
import {
  OrdersFilterBarDesktop,
  type OrdersFilterBarProps,
} from '@/components/orders/parts/OrdersFilterBarDesktop'
import { OrdersFilterBarMobile } from '@/components/orders/parts/OrdersFilterBarMobile'

export type { OrdersFilterBarProps }

/** 订单筛选栏 —— 按视口分桌面/移动两套排布（与商品管理页 ItemsFilterBar 同构） */
export function OrdersFilterBar(props: OrdersFilterBarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <OrdersFilterBarMobile {...props} />
  }
  return <OrdersFilterBarDesktop {...props} />
}
