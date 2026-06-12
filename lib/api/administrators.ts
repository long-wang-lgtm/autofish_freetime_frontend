import { getAccessToken } from '@/lib/utils/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

// ===== Dashboard =====

export interface DashboardStats {
  total_users: number
  total_accounts: number
  today_new_users: number
  normal_accounts: number
  disabled_accounts: number
  error_accounts: number
}

export interface TrendItem {
  date: string
  count: number
}

export interface AccountByUserItem {
  user_id: string
  username: string
  count: number
}

export interface DashboardData {
  stats: DashboardStats
  registration_trend: TrendItem[]
  account_by_user: AccountByUserItem[]
}

// ===== 用户列表 =====

export interface AdminUserInfo {
  userId: string
  username: string
  email: string | null
  role: string
  is_active: boolean
  last_login: string | null
  created_at: string
  account_count: number
}

// ===== 账号列表 =====

export interface AdminAccountInfo {
  uid: string
  name: string
  status: number
  user_id: string
  username: string
  onsaleitemCount: number
  auto_reply: boolean
  ai_auto_reply: boolean
  auto_delivery: boolean
}

// ===== 通用 =====

export interface AdminListResponse<T> {
  success: boolean
  message: string
  data: {
    items: T[]
    total: number
  }
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('未找到访问令牌')

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `请求失败: ${res.status}`)
  }

  return res.json()
}

export const adminApi = {
  /** 获取仪表盘聚合数据 */
  getDashboard: () =>
    authFetch<{ success: boolean; data: DashboardData }>('/api/administrators/dashboard'),

  /** 获取用户列表 */
  getUsers: (page = 1, pageSize = 20) =>
    authFetch<AdminListResponse<AdminUserInfo>>(
      `/api/administrators/users?page=${page}&page_size=${pageSize}`
    ),

  /** 获取账号列表 */
  getAccounts: (page = 1, pageSize = 20) =>
    authFetch<AdminListResponse<AdminAccountInfo>>(
      `/api/administrators/accounts?page=${page}&page_size=${pageSize}`
    ),
}
