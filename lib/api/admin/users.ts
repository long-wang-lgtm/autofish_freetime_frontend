/**
 * 管理员 — 用户管理 API
 *
 * 路由前缀: /api/administrators/user
 */
import { fetchApi, type OperationResponse } from '@/lib/utils/api'
import type { ProxyLong, UserSimple } from './types'

// ===== 类型定义 =====

/** 匹配 UserSchema（用户列表项）+ 前端填充的代理列表 */
export interface AdminUserInfo {
  userId: string | null
  username: string | null
  phone: string | null
  email: string | null
  is_active: boolean | null
  last_login: string | null
  role: string | null
  created_at: string | null
  accountCount: number | null
  proxyCount: number | null
  /** 前端填充 — 用户已绑定的代理列表（侧边栏按需加载，表格不再使用） */
  user_proxies?: ProxyLong[]
}

// ===== API =====

const PREFIX = '/api/administrators/user'

/** 获取用户列表（含账号数；后端自动展开 ListSchema.root） */
export async function getUserList(
  page = 1,
  pageSize = 20,
): Promise<AdminUserInfo[]> {
  return fetchApi<AdminUserInfo[]>(
    `${PREFIX}/list?page=${page}&page_size=${pageSize}`,
  )
}

/** 获取用户已绑定的代理列表（后端自动展开 ListSchema.root） */
export async function getUserProxies(
  userId: string,
): Promise<ProxyLong[]> {
  return fetchApi<ProxyLong[]>(
    `${PREFIX}/proxies.bound?userId=${encodeURIComponent(userId)}`,
  )
}

/** 获取可绑定给用户的代理列表（未被占用的活跃代理，后端自动展开） */
export async function getBindableProxies(): Promise<ProxyLong[]> {
  return fetchApi<ProxyLong[]>(`${PREFIX}/proxies.bindable`)
}

/** 绑定代理到用户 */
export async function bindUserProxy(
  userId: string,
  proxyId: number,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${PREFIX}/proxy.bind.user?userId=${encodeURIComponent(userId)}&proxyId=${proxyId}`,
    { method: 'PUT' },
  )
}

/** 解绑用户代理 */
export async function unbindUserProxy(
  userId: string,
  proxyId: number,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${PREFIX}/proxy.unbind.user?userId=${encodeURIComponent(userId)}&proxyId=${proxyId}`,
    { method: 'DELETE' },
  )
}
