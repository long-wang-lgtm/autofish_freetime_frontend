/**
 * 商品管理 API 客户端
 */
import { fetchApi, OperationResponse } from "@/lib/utils/api"

export interface Item {
  gid: string
  account: {
    uid: string
    name: string
    status: number
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

/** 后端 SORTABLE_FIELDS 映射 */
export const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "price",        label: "价格" },
  { key: "lookCount",    label: "浏览" },
  { key: "wantCount",    label: "想要" },
  { key: "collectCount", label: "收藏" },
  { key: "publishTime",  label: "发布时间" },
  { key: "deliveryType", label: "发货方式" },
] as const

/** 商品统计响应 — GET /api/items/stats */
export interface ItemStats {
  status: Record<number, number>
  deliveryEmpty: number
  receiptEmpty: number
  reviewEmpty: number
}

export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
  page?: number
  page_size?: number
  order_by?: string
  asc?: boolean
}

export async function listItems(filters?: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams()
  if (filters?.uid) params.append("uid", filters.uid)
  if (filters?.status !== undefined) params.append("status", String(filters.status))
  if (filters?.title) params.append("title", filters.title)
  if (filters?.gid) params.append("gid", filters.gid)
  if (filters?.page) params.append("page", String(filters.page))
  if (filters?.page_size) params.append("page_size", String(filters.page_size))
  if (filters?.order_by) params.append("order_by", filters.order_by)
  if (filters?.asc !== undefined) params.append("asc", String(filters.asc))

  const query = params.toString()
  return fetchApi<Item[]>(`/api/items/list${query ? `?${query}` : ""}`)
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

export async function getItemStats(uid?: string, status?: number): Promise<ItemStats> {
  const params = new URLSearchParams()
  if (uid) params.append("uid", uid)
  if (status !== undefined) params.append("status", String(status))
  const query = params.toString()
  return fetchApi<ItemStats>(`/api/items/stats${query ? `?${query}` : ""}`)
}