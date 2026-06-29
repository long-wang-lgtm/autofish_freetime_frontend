/**
 * 链接登录 API 客户端
 */
import { fetchApi, type OperationResponse } from "@/lib/utils/api"

export interface LinkToken {
  token: string
  created_at: string
}


/** 获取当前用户的所有链接登录 token */
export async function listLinkTokens(): Promise<LinkToken[]> {
  return fetchApi<LinkToken[]>("/api/login/link/tokens")
}

/** 创建链接登录 token */
export async function createLinkToken(): Promise<LinkToken> {
  return fetchApi<LinkToken>("/api/login/link/create", { method: "POST" })
}

/** 删除链接登录 token */
export async function deleteLinkToken(token: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(
    "/api/login/link",
    { method: "DELETE", params: { token } }
  )
}

/** 拼接完整登录链接 */
export function buildLinkUrl(token: string): string {
  return `${window.location.origin}/login/link?token=${encodeURIComponent(token)}`
}
