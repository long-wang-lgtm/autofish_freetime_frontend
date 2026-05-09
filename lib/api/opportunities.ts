/**
 * 商机 API 客户端
 */
import { fetchApi } from './accounts'

export interface Opportunity {
  id: number
  name: string
  source_type: 'collection' | 'manual'
  source_item_ids: string[]
  source_description: string
  images: { url: string; b64?: string }[]
  price: number
  tags: string[]
  item_group_id: string | null
  allowed_accounts: string[]
  status: 'active' | 'archived'
  rewrite_prompt_template: string | null
  item_count: number
  created_at: string
  updated_at: string
}

export interface OpportunityDetail extends Opportunity {
  items: ItemSummary[]
}

export interface ItemSummary {
  id: number
  account_uid: string
  title: string
  status: string
  item_gid: string
}

export async function listOpportunities(params: {
  search?: string
  tag?: string
  status?: string
  page?: number
  page_size?: number
}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.tag) searchParams.set('tag', params.tag)
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<{ total: number; items: Opportunity[] }>(`/api/publish/opportunities${query}`)
}

export async function createOpportunity(data: {
  name: string
  source_type?: 'collection' | 'manual'
  source_item_ids?: string[]
  source_description?: string
  images?: { url: string; b64?: string }[]
  price?: number
  tags?: string[]
  item_group_id?: string
  allowed_accounts?: string[]
  rewrite_prompt_template?: string
}) {
  return fetchApi<Opportunity>('/api/publish/opportunities', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getOpportunity(id: number) {
  return fetchApi<OpportunityDetail>(`/api/publish/opportunities/${id}`)
}

export async function updateOpportunity(id: number, data: Partial<Opportunity>) {
  return fetchApi<Opportunity>(`/api/publish/opportunities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteOpportunity(id: number) {
  return fetchApi<{ success: boolean; message: string }>(`/api/publish/opportunities/${id}`, {
    method: 'DELETE',
  })
}

export async function elevateFromCollection(itemIds: string[]) {
  return fetchApi<{ total: number; items: Opportunity[] }>('/api/publish/opportunities/elevate', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds }),
  })
}
