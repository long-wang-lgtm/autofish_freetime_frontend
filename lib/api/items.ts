/**
 * 商品管理 API 客户端
 */
import { fetchApi, OperationResponse } from "@/lib/utils/api"

export interface Item {
  gid: string
  account: {
    uid: string
    name: string
    isPro: boolean
  }
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
  sendCode: string | null
  auto_restock: boolean
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
  sendCode?: string
}

export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
}

export async function listItems(filters?: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams()
  if (filters?.uid) params.append("uid", filters.uid)
  if (filters?.status !== undefined) params.append("status", String(filters.status))
  if (filters?.title) params.append("title", filters.title)
  if (filters?.gid) params.append("gid", filters.gid)

  const query = params.toString()
  return fetchApi<Item[]>(`/api/items${query ? `?${query}` : ""}`)
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