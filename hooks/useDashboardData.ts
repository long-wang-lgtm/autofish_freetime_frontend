'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getAccountDayOrders,
  getAccountHourOrders,
  getItemDayOrders,
} from '@/lib/api/dashboard'

/**
 * 仪表盘原始数据（数据层）
 *
 * 三个接口各自独立查询，queryKey 固定、不随账号筛选变化——
 * 筛选在派生层做客户端过滤，切账号不会重新请求。
 */
export function useDashboardData() {
  const accountDay = useQuery({
    queryKey: ['dashboard', 'account-day'],
    queryFn: getAccountDayOrders,
  })
  const accountHour = useQuery({
    queryKey: ['dashboard', 'account-hour'],
    queryFn: getAccountHourOrders,
  })
  const itemDay = useQuery({
    queryKey: ['dashboard', 'item-day'],
    queryFn: getItemDayOrders,
  })

  return {
    accountDay: accountDay.data ?? [],
    accountHour: accountHour.data ?? [],
    itemDay: itemDay.data ?? [],
    isLoading: accountDay.isLoading || accountHour.isLoading || itemDay.isLoading,
    error: accountDay.error ?? accountHour.error ?? itemDay.error,
    refetch: () => {
      accountDay.refetch()
      accountHour.refetch()
      itemDay.refetch()
    },
  }
}
