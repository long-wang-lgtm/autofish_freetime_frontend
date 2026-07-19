/**
 * 仪表盘 API 客户端
 */
import { fetchApi } from '@/lib/utils/api'

/** 后端返回的账号支付订单数 DTO */
export interface AccountOrderCountDTO {
  account: {
    uid: string
    name: string
  }
  orderCount: number
}

/** 获取今日各账号支付订单数 */
export async function getTodayOrders(): Promise<AccountOrderCountDTO[]> {
  return fetchApi<AccountOrderCountDTO[]>('/api/dashboard/orders.today')
}
