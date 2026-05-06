/**
 * 商品发布 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeader()
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...headers, ...options.headers },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// ==================== Rewrite API ====================

export interface RewriteRequest {
  source_description: string
  account_uids: string[]
}

export interface RewriteResponse {
  task_id: string
}

export interface RewriteStatus {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: Record<string, string>
  results: Array<{ uid: string; content: string | null }>
}

export async function createRewriteTask(req: RewriteRequest): Promise<RewriteResponse> {
  return fetchApi<RewriteResponse>('/api/publish/rewrite', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getRewriteStatus(taskId: string): Promise<RewriteStatus> {
  return fetchApi<RewriteStatus>(`/api/publish/rewrite/status/${taskId}`)
}

// ==================== Cover API ====================

export interface CoverRequest {
  rewrite_results: Array<{ uid: string; content: string }>
}

export interface CoverResponse {
  task_id: string
}

export interface CoverPlan {
  uid: string
  image_index: number
  plan_text: string
  html_code: string | null
}

export interface CoverStatusResponse {
  task_id: string
  status: 'planning' | 'planned' | 'generating_html' | 'completed' | 'failed'
  plans: CoverPlan[]
}

export async function createCoverTask(req: CoverRequest): Promise<CoverResponse> {
  return fetchApi<CoverResponse>('/api/publish/cover', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getCoverStatus(taskId: string): Promise<CoverStatusResponse> {
  return fetchApi<CoverStatusResponse>(`/api/publish/cover/status/${taskId}`)
}

// ==================== Cover HTML API ====================

export interface CoverHtmlRequest {
  task_id: string
  confirmed_plans: Array<{ uid: string; image_index: number; plan_text: string }>
}

export interface CoverHtmlResponse {
  task_id: string
  status: string
  plans: CoverPlan[]
}

export async function confirmCoverHtml(req: CoverHtmlRequest): Promise<CoverHtmlResponse> {
  return fetchApi<CoverHtmlResponse>('/api/publish/cover/html', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

export async function getCoverHtmlStatus(taskId: string): Promise<CoverHtmlResponse> {
  return fetchApi<CoverHtmlResponse>(`/api/publish/cover/html/${taskId}`)
}

// ==================== Publish API ====================

export interface PublishItem {
  account_uid: string
  title: string
  description: string
  price: number
  images: string[] // base64
}

export interface PublishRequest {
  items: PublishItem[]
}

export interface PublishResult {
  uid: string
  success: boolean
  message: string
}

export interface PublishResponse {
  results: PublishResult[]
}

export async function publishItems(items: PublishItem[]): Promise<PublishResponse> {
  return fetchApi<PublishResponse>('/api/publish/publish', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}
