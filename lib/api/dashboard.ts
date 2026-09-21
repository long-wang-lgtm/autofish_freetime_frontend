/**
 * 仪表盘 API 客户端
 *
 * 三个接口都只返回「有订单」的行——某账号某天没出单就没有这一行。
 * 补零由 hooks/useDashboardMetrics 统一处理，图表组件只接规整数组。
 */
import { fetchApi } from '@/lib/utils/api'

/** 账号 × 日 订单聚合行（近 31 天） */
export interface AccountDayOrderDTO {
  uid: string
  name: string
  /** 'YYYY-MM-DD' */
  date: string
  /** 订单数 */
  count: number
  /** 销售额（元） */
  payamt: number
}

/** 账号 × 日 × 小时 订单聚合行（近 3 天） */
export interface AccountHourOrderDTO extends AccountDayOrderDTO {
  /** 左补零的两位小时，'00' ~ '23' */
  hour: string
}

/** 商品 × 日 订单聚合行（近 3 天，按订单数取 Top20） */
export interface ItemDayOrderDTO {
  uid: string
  name: string
  gid: number
  title: string
  date: string
  count: number
  payamt: number
}

/** 各账号每日订单量与销售额（近 31 天） */
export async function getAccountDayOrders(): Promise<AccountDayOrderDTO[]> {
  return fetchApi<AccountDayOrderDTO[]>('/api/dashboard/orders.by.account.day.list')
}

/** 各账号逐小时订单量与销售额（近 3 天） */
export async function getAccountHourOrders(): Promise<AccountHourOrderDTO[]> {
  return fetchApi<AccountHourOrderDTO[]>('/api/dashboard/orders.diff.day.list')
}

/** Top20 商品每日订单量与销售额（近 3 天） */
export async function getItemDayOrders(): Promise<ItemDayOrderDTO[]> {
  return fetchApi<ItemDayOrderDTO[]>('/api/dashboard/orders.by.item.day.list')
}
