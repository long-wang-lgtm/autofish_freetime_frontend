/**
 * 发布实例 API 客户端
 */
import { fetchApi } from './accounts'

export interface PublishedItem {
  id: number
  opportunity_id: number
  item_group_id: string | null
  account_uid: string
  title: string
  description: string
  price: number
  cover_image: string
  cover_plan_prompt: string
  cover_style_id: string
  cover_style_name: string
  status: string
  publish_task_id: string
  item_gid: string
  error_message: string
  created_at: string
  updated_at: string
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
  account_uid?: string
  status?: string
  page?: number
  page_size?: number
}) {
  const searchParams = new URLSearchParams()
  if (params.opportunity_id) searchParams.set('opportunity_id', String(params.opportunity_id))
  if (params.account_uid) searchParams.set('account_uid', params.account_uid)
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ total: number; items: PublishedItem[] }>(`/api/publish/items${query}`)
}

export async function createPublishedItem(opportunityId: number, accountUid: string, title?: string, price?: number) {
  return fetchApi<PublishedItem>('/api/publish/items', {
    method: 'POST',
    body: JSON.stringify({
      opportunity_id: opportunityId,
      account_uid: accountUid,
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
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/rewrite`,
    { method: 'POST' }
  )
}

export async function triggerCoverPlan(itemId: number) {
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/cover-plan`,
    { method: 'POST' }
  )
}

export async function triggerImageGenerate(itemId: number) {
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/generate-image`,
    { method: 'POST' }
  )
}

export async function triggerPublish(itemId: number) {
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/publish`,
    { method: 'POST' }
  )
}

export async function retryPublishedItem(itemId: number) {
  return fetchApi<{ success: boolean; message: string; status: string }>(
    `/api/publish/items/${itemId}/retry`,
    { method: 'POST' }
  )
}
