/**
 * 链接登录 API 客户端
 */
import { getAuthHeader } from "./auth"
import { API_BASE_URL } from "@/lib/utils/api"

export interface LinkToken {
  token: string
  created_at: string
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeader()

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

/** 获取当前用户的所有链接登录 token */
export async function listLinkTokens(): Promise<LinkToken[]> {
  return apiFetch<LinkToken[]>("/api/login/link/tokens")
}

/** 创建链接登录 token */
export async function createLinkToken(): Promise<LinkToken> {
  return apiFetch<LinkToken>("/api/login/link/create", { method: "POST" })
}

/** 删除链接登录 token */
export async function deleteLinkToken(token: string): Promise<OperationResponse> {
  return apiFetch<OperationResponse>(
    `/api/login/link?token=${encodeURIComponent(token)}`,
    { method: "DELETE" }
  )
}

/** 拼接完整登录链接 */
export function buildLinkUrl(token: string): string {
  return `${window.location.origin}/login/link?token=${encodeURIComponent(token)}`
}
