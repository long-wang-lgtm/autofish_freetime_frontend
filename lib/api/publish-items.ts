/**
 * 发布实例 API 客户端
 */
import { fetchApi, API_BASE } from './accounts'
import { getAuthHeader } from './auth'

/** 素材图片 */
export interface MaterialImage {
  md5: string
  path: string
  is_uploaded?: boolean
  cdn_url?: string
}

/** 图片展示 URL：优先 CDN，无 CDN 则用本地 path */
export function imageDisplayUrl(image: MaterialImage | undefined | null): string {
  if (!image) return ''
  if (image.cdn_url) return image.cdn_url
  if (!image.path) return ''
  const filename = image.path.replace(/^data\//, '')
  return `${API_BASE}/${filename}`
}

export interface PublishedItem {
  id: number
  opportunity_id: number
  item_group_id: string | null
  account_id: string
  title: string
  description: string
  price: number
  cover_plan_prompt: string
  cover_style_id: string
  cover_style_name: string
  category: string
  status: string
  publish_task_id: string
  item_gid: string
  error_message: string
  images: MaterialImage[]
  created_at: string
  updated_at: string
}

/** 部分字段响应 — 用于合并缓存，不可覆盖整个 item */
export interface RewriteResponse {
  id: number
  description: string
}

export interface CoverPlanResponse {
  id: number
  cover_plan_prompt: string
}

export interface ImageGenResponse {
  id: number
  images: MaterialImage[]
  status: string
}

export type PublishedItemStatus =
  | 'pending'
  | 'rewriting'
  | 'rewrite_done'
  | 'cover_planning'
  | 'cover_plan_done'
  | 'image_generating'
  | 'image_done'
  | 'publishing'
  | 'published'
  | 'publish_failed'

export async function listPublishedItems(params: {
  opportunity_id?: number
  account_id?: string
  status?: string
  page?: number
  page_size?: number
}) {
  const searchParams = new URLSearchParams()
  if (params.opportunity_id) searchParams.set('opportunity_id', String(params.opportunity_id))
  if (params.account_id) searchParams.set('account_id', params.account_id)
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ total: number; items: PublishedItem[] }>(`/api/publish/items${query}`)
}

export async function createPublishedItem(opportunityId: number, accountId: string, title?: string, price?: number) {
  return fetchApi<PublishedItem>('/api/publish/items', {
    method: 'POST',
    body: JSON.stringify({
      opportunity_id: opportunityId,
      account_id: accountId,
      title: title || '',
      price: price || 0,
    }),
  })
}

export async function getPublishedItem(id: number) {
  return fetchApi<PublishedItem>(`/api/publish/items/${id}`)
}

export async function updatePublishedItem(id: number, data: Partial<PublishedItem>) {
  return fetchApi<PublishedItem>(`/api/publish/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePublishedItem(id: number) {
  return fetchApi<{ success: boolean }>(`/api/publish/items/${id}`, {
    method: 'DELETE',
  })
}

export async function triggerRewrite(itemId: number) {
  return fetchApi<RewriteResponse>(
    `/api/publish/items/${itemId}/rewrite`,
    { method: 'POST' }
  )
}

export async function triggerCoverPlan(itemId: number) {
  return fetchApi<CoverPlanResponse>(
    `/api/publish/items/${itemId}/cover-plan`,
    { method: 'POST' }
  )
}

export async function triggerImageGenerate(itemId: number) {
  return fetchApi<ImageGenResponse>(
    `/api/publish/items/${itemId}/generate-image`,
    { method: 'POST' }
  )
}

export interface PublishResultResponse {
  id: number
  success: boolean
  error?: string
}

export async function triggerPublish(itemId: number) {
  return fetchApi<PublishResultResponse>(
    `/api/publish/items/${itemId}/publish`,
    { method: 'POST' }
  )
}

export interface ChannelCategory {
  channelCateName: string
  channelCateId: string
}

export async function getChannelCategories(itemId: number) {
  return fetchApi<ChannelCategory[]>(`/api/publish/items/${itemId}/channel`, {
    method: 'POST',
  })
}

export async function retryPublishedItem(itemId: number) {
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/retry`,
    { method: 'POST' }
  )
}

export async function uploadImage(itemId: number, file: File): Promise<MaterialImage> {
  const formData = new FormData()
  formData.append('file', file)
  const authHeaders = await getAuthHeader()
  const response = await fetch(`${API_BASE}/api/publish/items/${itemId}/image/upload`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: formData,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
  const result = await response.json()
  return Array.isArray(result.data) ? result.data[0] : result.data
}

export async function sortImages(itemId: number, images: MaterialImage[]): Promise<void> {
  return fetchApi(`/api/publish/items/${itemId}/image/sort`, {
    method: 'POST',
    body: JSON.stringify({ images }),
  })
}

export async function reuploadImages(itemId: number): Promise<void> {
  return fetchApi(`/api/publish/items/${itemId}/image/reupload`, {
    method: 'POST',
  })
}
