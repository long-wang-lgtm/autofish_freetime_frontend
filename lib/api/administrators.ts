import { getAccessToken } from '@/lib/utils/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface AdminStats {
  total_users: number
  active_users: number
  total_accounts: number
  total_items: number
}

export interface AdminUserInfo {
  username: string
  email: string | null
  role: 'user' | 'administrators'
  is_active: boolean
  last_login: string
  created_at: string
}

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
  /** 获取管理面板统计数据 */
  getStats: () => authFetch<{ success: boolean; data: AdminStats }>('/api/administrators/stats'),

  /** 获取用户列表 */
  getUsers: (page = 1, pageSize = 20) =>
    authFetch<AdminListResponse<AdminUserInfo>>(`/api/administrators/users?page=${page}&page_size=${pageSize}`),
}
