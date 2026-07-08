/**
 * 管理员 — 用户管理 API
 *
 * 路由前缀: /api/administrators/user
 */
import { fetchApi, type OperationResponse } from '@/lib/utils/api'
import type { ProxyLong, UserSimple } from './types'

// ===== 类型定义 =====

/** 会员方案精简信息（后端 MembershipPlanSchema 直接返回，字段完整接收） */
export interface MembershipPlanSimple {
  id: number | null
  tier: number | null
  max_accounts: number | null
  price: number | null
  daily_bonus: number | null
  created_at: string | null
  updated_at: string | null
}

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
  // ---- 会员相关（后端 UserSchema 已返回） ----
  plan: MembershipPlanSimple | null
  plan_expires_at: string | null
  stones: number | null
  stones_bonus: number | null
}

// ===== API =====

const PREFIX = '/api/administrators/user'

// billing 模块操作端点（管理员操作会员/风铃石）
const BILLING_M = '/api/administrators/billing/membership'
const BILLING_S = '/api/administrators/billing/stones'

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

// ===== 会员操作 API =====

/** 管理员升级会员等级 */
export async function upgradeMembership(data: {
  userId: string
  tier: number
  amount_cents?: number
  remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${BILLING_M}/upgrade`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 管理员降级会员等级 */
export async function downgradeMembership(data: {
  userId: string
  tier: number
  amount_cents?: number
  remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${BILLING_M}/downgrade`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 管理员续费会员 */
export async function renewMembership(data: {
  userId: string
  duration_months: number
  tier: number
  amount_cents: number
  remark?: string
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${BILLING_M}/renew`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 管理员充值风铃石（后端仅接受 userId + amount 查询参数） */
export async function rechargeStones(
  userId: string,
  amount: number,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    `${BILLING_S}/recharge?userId=${encodeURIComponent(userId)}&amount=${amount}`,
    { method: 'POST' },
  )
}
