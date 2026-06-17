/**
 * 管理员 — 店铺管理 API
 *
 * 路由前缀: /api/administrators/accounts
 */
import { fetchApi, type OperationResponse } from '@/lib/utils/api'
import type { AccountStatusListResponse } from './types'

const PREFIX = '/api/administrators/accounts'

// ===== API =====

/** 获取店铺完整列表（含 IM 运行状态） */
export async function getAccountList(
  page = 1,
  pageSize = 20,
): Promise<AccountStatusListResponse> {
  return fetchApi<AccountStatusListResponse>(
    `${PREFIX}/list?page=${page}&page_size=${pageSize}`,
  )
}

/** 启动账号 IM 服务 */
export async function startIm(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${PREFIX}/im/start?uid=${encodeURIComponent(uid)}`,
  )
}

/** 停止账号 IM 服务 */
export async function stopIm(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${PREFIX}/im/stop?uid=${encodeURIComponent(uid)}`,
  )
}

/** 店铺绑定代理（只能从所属用户已绑定的代理中选择；如已绑定则自动替换） */
export async function bindAccountProxy(
  uid: string,
  proxyId: number,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${PREFIX}/proxy.bind?uid=${encodeURIComponent(uid)}&proxy_id=${proxyId}`,
    { method: 'PUT' },
  )
}
