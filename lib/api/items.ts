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

export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
}

/** 后端支持的排序字段白名单 */
export const ITEM_SORTABLE_FIELDS = [
  "gid", "title", "price", "lookCount", "wantCount",
  "collectCount", "publishTime", "deliveryType",
] as const

export type ItemSortField = typeof ITEM_SORTABLE_FIELDS[number]

/** 商品列表请求参数（筛选 + 分页 + 排序） */
export interface ItemListParams extends ItemFilters {
  page?: number
  page_size?: number
  order_by?: ItemSortField
  asc?: boolean
}

/** 商品统计信息 */
export interface ItemStats {
  total: number
  onSale: number    // status === 0
  offSale: number   // status === -2
  sold: number      // status === 1
}

export async function listItems(params: ItemListParams = {}): Promise<Item[]> {
  const searchParams = new URLSearchParams()
  // 筛选
  if (params.uid) searchParams.append("uid", params.uid)
  if (params.status !== undefined) searchParams.append("status", String(params.status))
  if (params.title) searchParams.append("title", params.title)
  if (params.gid) searchParams.append("gid", params.gid)
  // 分页
  if (params.page !== undefined) searchParams.append("page", String(params.page))
  if (params.page_size !== undefined) searchParams.append("page_size", String(params.page_size))
  // 排序
  if (params.order_by) searchParams.append("order_by", params.order_by)
  if (params.asc !== undefined) searchParams.append("asc", String(params.asc))

  const query = searchParams.toString()
  return fetchApi<Item[]>(`/api/items/list${query ? `?${query}` : ""}`)
}

export async function getItemsStats(uid?: string): Promise<ItemStats> {
  const params = new URLSearchParams()
  if (uid) params.append("uid", uid)
  const query = params.toString()
  const data = await fetchApi<{ status: Record<number, number> }>(
    `/api/items/stats${query ? `?${query}` : ""}`
  )
  return {
    total: Object.values(data.status).reduce((a, b) => a + b, 0),
    onSale: data.status[0] || 0,
    offSale: data.status[-2] || 0,
    sold: data.status[1] || 0,
  }
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