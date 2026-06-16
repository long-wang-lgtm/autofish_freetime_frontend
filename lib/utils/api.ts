/**
 * API 公共工具
 */
import { getAuthHeader } from './auth'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = getAuthHeader()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '请求失败' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}