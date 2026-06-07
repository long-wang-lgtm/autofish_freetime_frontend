/**
 * AI配置 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface AIConfig {
  id: number
  name: string
  config_type: 'text' | 'image'
  provider: 'deepseek' | 'siliconflow' | 'volcano' | 'bailian' | 'minimax'
  api_key: string
  base_url: string
  model: string
  is_active: boolean
}

export interface AIConfigCreate {
  name: string
  config_type: 'text' | 'image'
  provider: 'deepseek' | 'siliconflow' | 'volcano' | 'bailian' | 'minimax'
  api_key: string
  base_url: string
  model: string
  is_active?: boolean
}

export interface AIConfigUpdate {
  name?: string
  config_type?: 'text' | 'image'
  provider?: 'deepseek' | 'siliconflow' | 'volcano' | 'bailian' | 'minimax'
  api_key?: string
  base_url?: string
  model?: string
  is_active?: boolean
}

export interface AIConfigListResponse {
  total: number
  configs: AIConfig[]
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export interface ProviderDefaults {
  [key: string]: string
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

export async function listAIConfigs(): Promise<AIConfig[]> {
  return fetchApi<AIConfig[]>("/api/setting/aiconfig/all")
}

// export async function getAIConfig(id: number): Promise<AIConfig> {
//   return fetchApi<AIConfig>(`/api/v2/ai-configs/${id}`)
// }

export async function createAIConfig(data: AIConfigCreate): Promise<AIConfig> {
  return fetchApi<AIConfig>("/api/setting/aiconfig/create", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateAIConfig(
  id: number,
  data: AIConfigUpdate
): Promise<AIConfig> {
  return fetchApi<AIConfig>(`/api/setting/aiconfig/update`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteAIConfig(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`/api/setting/aiconfig/delete/${id}`, {
    method: "DELETE",
  })
}

export async function setDefaultAIConfig(id: number): Promise<AIConfig> {
  return fetchApi<AIConfig>(`/api/setting/aiconfig/set-default/${id}`, {
    method: "PUT",
  })
}

export async function getProviderDefaults(): Promise<ProviderDefaults> {
  return fetchApi<ProviderDefaults>("/api/setting/aiconfig/providers/defaults")
}
