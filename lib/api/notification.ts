/**
 * 通知渠道 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface NotificationConfig {
  id: number
  provider: 'lark'
  webhook: string
  is_active: boolean
  created_at: string | null
}

export interface NotificationConfigCreate {
  webhook: string
  provider?: 'lark'
  is_active?: boolean
}

export interface NotificationConfigUpdate {
  id: number
  webhook?: string
  provider?: 'lark'
  is_active?: boolean
}

export interface NotificationConfigListResponse {
  total: number
  configs: NotificationConfig[]
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeader()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "请求失败" }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function listNotificationConfigs(): Promise<NotificationConfigListResponse> {
  return fetchApi<NotificationConfigListResponse>("/api/setting/notify/get")
}

export async function getNotificationConfig(id: number): Promise<NotificationConfig> {
  return fetchApi<NotificationConfig>(`/api/setting/notify/get/${id}`)
}

export async function createNotificationConfig(data: NotificationConfigCreate): Promise<NotificationConfig> {
  return fetchApi<NotificationConfig>("/api/setting/notify/create", {
    method: "POST",
    body: JSON.stringify({ ...data, provider: data.provider || 'lark' }),
  })
}

export async function updateNotificationConfig(data: NotificationConfigUpdate): Promise<NotificationConfig> {
  return fetchApi<NotificationConfig>("/api/setting/notify/update", {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteNotificationConfig(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>("/api/setting/notify/delete", {
    method: "DELETE",
  })
}