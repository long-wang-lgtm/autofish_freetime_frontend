/**
 * 管理员 — 计费管理 API
 *
 * 路由前缀: /api/administrators/billing
 * 子路由: /membership, /features, /stones
 */
import { fetchApi, type OperationResponse } from '@/lib/utils/api'

// ===== 类型定义 =====

export interface MembershipPlan {
  id: number
  tier: number
  max_accounts: number
  price: number
  daily_bonus: number
  created_at: string
  updated_at: string
}

/** 注意：后端 FeaturePricingSchema 字段名为 description，但 create/update 请求体使用 name */
export interface FeaturePricing {
  id: number
  feature: string
  description: string
  stones: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoneSalePricing {
  id: number
  amount: number
  stones: number
  created_at?: string
  updated_at?: string
}

export interface StoneOrder {
  order_id: string
  status: string
  amount_cents: number
  amount_stones: number
  old_stones: number
  new_stones: number
  user: { username: string; userId: string } | null
  operator_user: { username: string; userId: string } | null
  created_at: string
  updated_at: string
}

export interface MembershipOrder {
  id: number
  order_id: string
  status: string
  amount_cents: number
  amount_months: number
  change_type: string
  old_expires_at: string
  new_expires_at: string
  created_at: string
  paid_at: string | null
  updated_at: string
  user: { username: string; userId: string } | null
  operator_user: { username: string; userId: string } | null
  old_plan: { tier: number } | null
  new_plan: { tier: number } | null
}

// ===== URL 前缀 =====

const M = '/api/administrators/billing/membership'
const F = '/api/administrators/billing/features'
const S = '/api/administrators/billing/stones'

// ===== 会员方案 =====

/** 获取会员方案列表 */
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  return fetchApi<MembershipPlan[]>(`${M}/list`)
}

/** 新增会员方案 */
export async function createMembershipPlan(data: {
  tier: number
  max_accounts: number
  price: number
  daily_bonus: number
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新会员方案（需要 id） */
export async function updateMembershipPlan(
  id: number,
  data: Partial<Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>>
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${M}/update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

// ===== 功能定价 =====

/** 获取功能定价列表 */
export async function getFeaturePricingList(): Promise<FeaturePricing[]> {
  return fetchApi<FeaturePricing[]>(`${F}/list`)
}

/** 新增功能定价（请求体使用 name，后端存入 description） */
export async function createFeaturePricing(data: {
  feature: string
  name: string
  stones: number
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${F}/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新功能定价 */
export async function updateFeaturePricing(
  id: number,
  data: { name?: string; stones?: number; is_active?: boolean }
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${F}/update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

/** 删除功能定价 */
export async function deleteFeaturePricing(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${F}/delete?id=${id}`, {
    method: 'DELETE',
  })
}

// ===== 风铃石定价 =====

/** 获取风铃石定价列表 */
export async function getStonePrices(): Promise<StoneSalePricing[]> {
  return fetchApi<StoneSalePricing[]>(`${S}/prices`)
}

/** 新增风铃石定价 */
export async function createStonePrice(data: {
  amount: number
  stones: number
}): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${S}/add`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新风铃石定价 */
export async function updateStonePrice(
  id: number,
  data: { amount?: number; stones?: number }
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${S}/prices.update`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...data }),
  })
}

/** 删除风铃石定价（后端 DELETE 接收 body） */
export async function deleteStonePrice(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`${S}/prices.delete`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

// ===== 订单记录 =====

/** 获取会员订单列表 */
export async function getMembershipOrders(
  page: number,
  pageSize: number,
  userId?: string,
): Promise<MembershipOrder[]> {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (userId) params.userId = userId
  return fetchApi<MembershipOrder[]>(`${M}/order.list`, { params })
}

/** 获取风铃石订单列表 */
export async function getStoneOrders(
  page: number,
  pageSize: number,
  userId?: string,
  status?: string,
  account?: string,
): Promise<StoneOrder[]> {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (userId) params.userId = userId
  if (status) params.status = status
  if (account) params.account = account
  return fetchApi<StoneOrder[]>(`${S}/order.list`, { params })
}
