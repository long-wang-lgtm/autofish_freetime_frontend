/**
 * 通知渠道 API 客户端
 */
import { fetchApi, OperationResponse } from "@/lib/utils/api"

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

export async function listNotificationConfigs(): Promise<NotificationConfig[]> {
  return fetchApi<NotificationConfig[]>("/api/setting/notify/all")
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