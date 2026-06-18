/**
 * 管理员 Dashboard API
 *
 * 路由前缀: /api/administrators/dashboard
 */
import { fetchApi, API_BASE_URL } from '@/lib/utils/api'
import { getAccessToken } from '@/lib/utils/auth'
import type { UserSimple } from './types'

// ===== 类型定义 =====

/** 匹配 DashboardStats */
export interface DashboardStats {
  total_users: number
  total_accounts: number
  today_new_users: number
  normal_accounts: number
  disabled_accounts: number
  error_accounts: number
}

/** 匹配 TrendItem */
export interface TrendItem {
  date: string
  count: number
  users: string[]
}

/** 匹配 UserSchema（account_by_user 列表项，含 accountCount） */
export interface AccountByUserItem {
  userId: string | null
  username: string | null
  is_active: boolean | null
  last_login: string | null
  email: string | null
  role: string | null
  created_at: string | null
  accountCount: number | null
}

/** 匹配 DashboardResponse（data 字段内部结构；List 的 root 由后端自动展开） */
export interface DashboardData {
  stats: DashboardStats
  registration_trend: TrendItem[]
  account_registration_trend: TrendItem[]
  account_by_user: AccountByUserItem[]
}

/** 匹配 ImStatusSnapshot */
export interface ImStatusSnapshot {
  timestamp: number
  total_accounts: number
  active_accounts: number
  running_accounts: number
  running_tasks: number
}

// ===== API =====

const PREFIX = '/api/administrators/dashboard'

/** 获取仪表盘聚合数据 */
export async function getDashboard(): Promise<{
  success: boolean
  message: string
  data: DashboardData
}> {
  return fetchApi(PREFIX)
}


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

  fetch(`${API_BASE_URL}${PREFIX}/im-status-stream`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
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
