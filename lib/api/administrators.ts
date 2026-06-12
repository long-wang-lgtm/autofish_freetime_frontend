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
  users: string[]
}

export interface AccountByUserItem {
  user_id: string
  username: string
  count: number
}

export interface DashboardData {
  stats: DashboardStats
  registration_trend: TrendItem[]
  account_registration_trend: TrendItem[]
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

// ===== IM 状态监控 SSE =====

export interface ImStatusSnapshot {
  timestamp: number        // Unix时间戳（秒）
  total_accounts: number   // 总账号数
  active_accounts: number  // 正常状态的账号数 (status == 1)
  running_accounts: number // 正常运行的账号数 (im.is_connected)
  running_tasks: number    // 任务正常数 (im task not done)
}

/**
 * 订阅 IM 服务运行状态 SSE 推送
 * @returns abort 函数，调用后取消连接
 */
export function subscribeImStatus(
  onSnapshot: (snapshot: ImStatusSnapshot) => void,
  onError?: (err: Error) => void,
): () => void {
  const token = getAccessToken()
  if (!token) {
    onError?.(new Error('未找到访问令牌'))
    return () => {}
  }

  const controller = new AbortController()

  fetch(`${API_BASE_URL}/api/administrators/im-status-stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        // 404 等静默忽略，不报错
        if (res.status !== 404) {
          onError?.(new Error(`SSE 连接失败: ${res.status}`))
        }
        return
      }
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE 格式: "data: {...}\n\n"
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const dataLine = line.trim()
          if (!dataLine.startsWith('data: ')) continue
          try {
            const json = JSON.parse(dataLine.slice(6))
            onSnapshot(json as ImStatusSnapshot)
          } catch {
            // 跳过解析失败的行
          }
        }
      }
    })
    .catch((err) => {
      if ((err as Error).name !== 'AbortError') {
        onError?.(err as Error)
      }
    })

  return () => controller.abort()
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
