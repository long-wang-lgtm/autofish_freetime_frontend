/**
 * 商品管理 API 客户端
 */
import { getAuthHeader } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export interface Item {
  gid: string
  uid: string
  account_name: string
  title: string
  description: string
  remark: string
  auto_delivery: boolean
  auto_reply: boolean
  auto_ai_reply: boolean
  deliveryType: string
  deliveryContent: string
  receiptAfter: string
  positiveReviewAfter: string
  default_reply_content: string
  ai_reply_item_prompt: string
  price: number
  status: number
  lookCount: number
  wantCount: number
  collectCount: number
  itemType: string
  createTime: string | null
  publishTime: string | null
}

export interface ItemListResponse {
  total: number
  items: Item[]
}

export interface ItemGroup {
  groupId: string
  groupName: string
  auto_reply: boolean
  auto_delivery: boolean
  default_reply_content: string
}

export interface ItemGroupListResponse {
  total: number
  groups: ItemGroup[]
}

export interface ItemUpdate {
  title?: string
  description?: string
  remark?: string
  auto_delivery?: boolean
  auto_reply?: boolean
  auto_ai_reply?: boolean
  deliveryType?: string
  deliveryContent?: string
  receiptAfter?: string
  positiveReviewAfter?: string
  default_reply_content?: string
  ai_reply_item_prompt?: string
}

export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
}

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
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

export async function listItems(filters?: ItemFilters): Promise<ItemListResponse> {
  const params = new URLSearchParams()
  if (filters?.uid) params.append("uid", filters.uid)
  if (filters?.status !== undefined) params.append("status", String(filters.status))
  if (filters?.title) params.append("title", filters.title)
  if (filters?.gid) params.append("gid", filters.gid)

  const query = params.toString()
  return fetchApi<ItemListResponse>(`/api/items${query ? `?${query}` : ""}`)
}

export async function getItem(gid: string): Promise<Item> {
  return fetchApi<Item>(`/api/items/${gid}`)
}

export async function updateItem(gid: string, data: ItemUpdate): Promise<Item> {
  return fetchApi<Item>(`/api/items/${gid}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function listItemGroups(): Promise<ItemGroupListResponse> {
  return fetchApi<ItemGroupListResponse>("/api/items/groups")
}

export async function refreshItems(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>(`/api/items/refresh/${uid}`, {
    method: "POST",
  })
}