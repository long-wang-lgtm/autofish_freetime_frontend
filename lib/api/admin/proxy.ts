/**
 * 管理员 — 代理管理 API
 *
 * 路由前缀: /api/administrators/proxy
 */
import { fetchApi, type OperationResponse } from '@/lib/utils/api'
import type { ProxyLong, AccountName } from './types'

// ===== 类型定义 =====

/** 代理来源枚举项 */
export interface ProxySourceItem {
  value: string
  label: string
}

/** 创建/编辑代理入参（匹配 ProxyLongSchema，仅传客户端字段） */
export interface ProxyFormData {
  server: string
  username?: string
  password?: string
  direction?: boolean
  source?: string
  status?: string
}

// ===== API =====

const PREFIX = '/api/administrators/proxy'

/** 获取代理列表（分页，可选按状态筛选；返回 ProxyLong[] 含嵌套 user、不含 accounts） */
export async function getProxyList(
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<ProxyLong[]> {
  let url = `${PREFIX}/list?page=${page}&page_size=${pageSize}`
  if (status) url += `&status=${encodeURIComponent(status)}`
  return fetchApi<ProxyLong[]>(url)
}

/** 获取代理绑定的店铺列表 */
export async function getProxyBindings(id: number): Promise<AccountName[]> {
  return fetchApi<AccountName[]>(`${PREFIX}/bindings?id=${id}`)
}

/** 获取代理来源枚举值列表 */
export async function getProxySources(): Promise<ProxySourceItem[]> {
  return fetchApi<ProxySourceItem[]>(`${PREFIX}/sources`)
}

/** 获取代理状态枚举值列表 */
export async function getProxyStatuses(): Promise<ProxySourceItem[]> {
  return fetchApi<ProxySourceItem[]>(`${PREFIX}/status`)
}

/** 创建代理 */
export async function createProxy(
  data: ProxyFormData,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${PREFIX}/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新代理（body 中必须包含 id） */
export async function updateProxy(
  id: number,
  data: Partial<ProxyFormData>,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${PREFIX}/update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

/** 硬删除代理 */
export async function deleteProxy(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${PREFIX}/delete?id=${id}`, {
    method: 'DELETE',
  })
}

/** 激活代理（设置状态为 ACTIVE） */
export async function activeProxy(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${PREFIX}/active?id=${id}`, {
    method: 'PUT',
  })
}

/** 关闭代理（设置状态为 CLOSED） */
export async function closeProxy(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${PREFIX}/close?id=${id}`, {
    method: 'PUT',
  })
}
