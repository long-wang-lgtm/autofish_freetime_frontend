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
  { key: "title",        label: "标题" },
  { key: "price",        label: "价格" },
  { key: "publishTime",  label: "发布时间" },
] as const

// ——— 搜索芯片 ———

/** 可搜索的商品字段 */
export type SearchField =
  | 'title'
  | 'gid'
  | 'deliveryContent'
  | 'receiptAfter'
  | 'positiveReviewAfter'
  | 'aiReplyItemPrompt'
  | 'sendCode'

/** 搜索字段显示标签 */
export const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  title: '商品标题',
  gid: '商品ID',
  deliveryContent: '发货配置内容',
  receiptAfter: '收货后赠送配置',
  positiveReviewAfter: '评价后赠送配置',
  aiReplyItemPrompt: 'AI 提示词',
  sendCode: '指令码',
}

/** 一个已确认的搜索条件 */
export interface SearchChipData {
  field: SearchField
  value: string
}

/** 筛选卡片完整状态（替代旧 searchInput + filters 碎片） */
export interface ItemsFilterState {
  uid?: string
  status?: number
  chips: SearchChipData[]
  orderBy: string | null
  asc: boolean
  page: number
}

/** 商品统计响应 — GET /api/items/stats */
export interface ItemStats {
  status: Record<number, number>
  deliveryEmpty: number
  receiptEmpty: number
  reviewEmpty: number
}

/** 商品列表分页响应 — GET /api/items/list */
export interface ItemListResponse {
  total: number
  page: number
  size: number
  items: Item[]
}

export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
  deliveryContent?: string
  receiptAfter?: string
  positiveReviewAfter?: string
  aiReplyItemPrompt?: string
  defaultReplyContent?: string
  sendCode?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}

/** chip field → API query param mapping */
const CHIP_FIELD_PARAM: Record<string, string> = {
  title: 'title',
  gid: 'gid',
  deliveryContent: 'deliveryContent',
  receiptAfter: 'receiptAfter',
  positiveReviewAfter: 'positiveReviewAfter',
  aiReplyItemPrompt: 'aiReplyItemPrompt',
  sendCode: 'sendCode',
}

/** chips → ItemFilters 额外字段 */
export function chipsToFilters(chips: SearchChipData[]): Partial<ItemFilters> {
  const extra: Record<string, string> = {}
  for (const c of chips) {
    const param = CHIP_FIELD_PARAM[c.field]
    if (param && c.value) extra[param] = c.value  // 空值芯片不生成查询参数（用户尚未输入）
  }
  return extra
}

export async function listItems(filters?: ItemFilters): Promise<ItemListResponse> {
  const params = new URLSearchParams()
  if (filters?.uid) params.append("uid", filters.uid)
  if (filters?.status !== undefined) params.append("status", String(filters.status))
  if (filters?.title) params.append("title", filters.title)
  if (filters?.gid) params.append("gid", filters.gid)
  if (filters?.deliveryContent) params.append("deliveryContent", filters.deliveryContent)
  if (filters?.receiptAfter) params.append("receiptAfter", filters.receiptAfter)
  if (filters?.positiveReviewAfter) params.append("positiveReviewAfter", filters.positiveReviewAfter)
  if (filters?.aiReplyItemPrompt) params.append("aiReplyItemPrompt", filters.aiReplyItemPrompt)
  if (filters?.defaultReplyContent) params.append("defaultReplyContent", filters.defaultReplyContent)
  if (filters?.sendCode) params.append("sendCode", filters.sendCode)
  if (filters?.page) params.append("page", String(filters.page))
  if (filters?.size) params.append("size", String(filters.size))
  if (filters?.order_by) params.append("order_by", filters.order_by)
  if (filters?.asc !== undefined) params.append("asc", String(filters.asc))

  const query = params.toString()
  return fetchApi<ItemListResponse>(`/api/items/list${query ? `?${query}` : ""}`)
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