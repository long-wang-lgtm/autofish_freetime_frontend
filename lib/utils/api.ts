/**
 * API 公共工具 — 项目唯一的 HTTP 请求入口
 *
 * 所有 API 模块必须通过 fetchApi 发起请求，禁止直接调用 fetch。
 */
import { getAccessToken } from './auth'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!

/** fetchApi 扩展选项 */
export interface FetchApiOptions extends Omit<RequestInit, 'credentials'> {
  /** URL 查询参数（自动编码到 query string） */
  params?: Record<string, string | number>
  /** 跳过认证头（用于登录/注册等公开接口） */
  skipAuth?: boolean
  /** credentials 选项（如 'include'），用于需要携带跨域 cookie 的场景 */
  credentials_?: RequestCredentials
  /** 覆盖基础 URL（默认 API_BASE_URL），如 selection 使用 /api/topic 前缀 */
  baseUrl?: string
}

export async function fetchApi<T>(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<T> {
  const {
    params,
    skipAuth = false,
    credentials_,
    baseUrl,
    ...restOptions
  } = options

  const apiBase = baseUrl ?? API_BASE_URL
  const query = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      ).toString()
    : ''

  const token = skipAuth ? null : getAccessToken()

  const response = await fetch(`${apiBase}${endpoint}${query}`, {
    ...restOptions,
    ...(credentials_ ? { credentials: credentials_ } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...restOptions.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}
