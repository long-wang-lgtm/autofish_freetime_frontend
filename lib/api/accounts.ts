/**
 * 账号管理 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface Account {
  uid: string
  name: string
  remark: string
  auto_reply: boolean
  ai_auto_reply: boolean
  auto_delivery: boolean
  auto_free: boolean              // 是否自动免拼
  auto_positive_review: boolean   // 是否自动评价
  reply_pause_seconds: number
  full_deliveryContent: string
  full_receiptAfter: string
  full_positiveReviewAfter: string
  full_default_reply_content: string
  full_ai_reply_system_prompt: string  // 账号级AI提示词
  status: number
  itemtotalCounts: number
  onsaleitemCount: number
  cookie_last_update_time: string | null
  access_token_last_update_time: string | null
  user_id: string
  im_connected: boolean
  im_running: boolean
}

export interface AccountListResponse {
  total: number
  accounts: Account[]
}

export interface AccountCreate {
  uid: string
  name: string
  cookie: string
  remark?: string
  auto_reply?: boolean
  ai_auto_reply?: boolean
  auto_delivery?: boolean
  auto_free?: boolean
  auto_positive_review?: boolean
  reply_pause_seconds?: number
  full_deliveryContent?: string
  full_receiptAfter?: string
  full_positiveReviewAfter?: string
  full_default_reply_content?: string
}

export interface AccountUpdate {
  name?: string
  cookie?: string
  remark?: string
  auto_reply?: boolean
  ai_auto_reply?: boolean
  auto_delivery?: boolean
  auto_free?: boolean
  auto_positive_review?: boolean
  reply_pause_seconds?: number
  full_deliveryContent?: string
  full_receiptAfter?: string
  full_positiveReviewAfter?: string
  full_default_reply_content?: string
  status?: number
}

export interface AccountStatusResponse {
  uid: string
  im_connected: boolean
  im_running: boolean
  message: string
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export async function fetchApi<T>(
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

export async function listAccounts(): Promise<AccountListResponse> {
  return fetchApi<AccountListResponse>("/api/accounts")
}

export async function getAccount(uid: string): Promise<Account> {
  return fetchApi<Account>(`/api/accounts/${uid}`)
}

export async function createAccount(data: AccountCreate): Promise<Account> {
  return fetchApi<Account>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateAccount(
  uid: string,
  data: AccountUpdate
): Promise<Account> {
  return fetchApi<Account>(`/api/accounts/${uid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteAccount(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`/api/accounts/${uid}`, {
    method: "DELETE",
  })
}

export async function startAccountIm(uid: string): Promise<AccountStatusResponse> {
  return fetchApi<AccountStatusResponse>(`/api/accounts/${uid}/start`, {
    method: "POST",
  })
}

export async function stopAccountIm(uid: string): Promise<AccountStatusResponse> {
  return fetchApi<AccountStatusResponse>(`/api/accounts/${uid}/stop`, {
    method: "POST",
  })
}

export async function getAccountStatus(uid: string): Promise<AccountStatusResponse> {
  return fetchApi<AccountStatusResponse>(`/api/accounts/${uid}/status`)
}

export async function refreshAccountToken(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`/api/accounts/${uid}/refresh-token`, {
    method: "POST",
  })
}

// 扫码登录 API
export async function startQrLogin(uid?: string): Promise<{ session_id: string; sse_url: string }> {
  const params = uid ? `?uid=${encodeURIComponent(uid)}` : ""
  return fetchApi<{ session_id: string; sse_url: string }>(`/api/login/qr/start${params}`, {
    method: "POST",
  })
}

export async function cancelQrLogin(sessionId: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`/api/login/qr/${sessionId}`, {
    method: "DELETE",
  })
}

export async function refreshCookie(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`/api/login/cookie/refresh/${uid}`, {
    method: "POST",
  })
}