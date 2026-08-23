/**
 * 商品管理 API 客户端
 *
 * 对齐后端 ShopItem 新模型（旧 ItemList 模型已弃用）。
 * 所有查询参数统一走 fetchApi 的 params 选项。
 */
import { fetchApi, OperationResponse } from "@/lib/utils/api"

// ═══════════════════════════════════════════════════════════════
// 排序字段
// ═══════════════════════════════════════════════════════════════

export const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "reservePrice", label: "价格" },
  { key: "publishTime",  label: "发布时间" },
  { key: "created_at",   label: "创建时间" },
  { key: "updated_at",   label: "更新时间" },
] as const

// ═══════════════════════════════════════════════════════════════
// 筛选参数
// ═══════════════════════════════════════════════════════════════

export interface ItemFilters {
  uid?: string
  status?: number
  gid?: string
  title?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}

// ═══════════════════════════════════════════════════════════════
// 核心数据模型（对齐后端 ShopItemSchema）
// ═══════════════════════════════════════════════════════════════

/** 账号精简信息（AccountNameSchema） */
export interface AccountName {
  uid: string
  name: string
  status: number
  isPro: boolean
}

/** SKU 规格项 */
export interface ItemSKU {
  skuid: number
  price: number                        // 单位：分
  quantity: number
  values: { name: string; value: string }[]
}

/** 发货方式（DIRECT=直发 VOUCHER=卡密） */
export interface ShipByVoucher {
  kind: 'DIRECT' | 'VOUCHER'
  skuid: number | null
  voucherkindid: number | null         // 卡种 ID
  useinstructions: string | null       // 使用说明
}

/** 发货/收货后赠送/评价后赠送 — 三家共用 */
export interface ShipConfig {
  byEntirety: boolean | null           // true=按商品 false=按 SKU
  entirety: ShipByVoucher | null
  skus: Record<number, ShipByVoucher>
}

/** 商品配置（一对一关联 ItemConfig 表） */
export interface ShopItemConfig {
  gid: number
  sendCode: string | null
  reply_default_content: string | null
  ai_prompt: string | null
  shipment: ShipConfig                 // 发货配置
  shipconfirm: ShipConfig              // 收货后赠送
  evaluation: ShipConfig               // 评价后赠送
}

/** 商品主模型（ShopItemSchema） */
export interface ShopItem {
  gid: number
  title: string
  picurl: string
  status: number
  reservePrice: string                 // 价格字符串（多 SKU 时为 "min~max"）
  publishTime: string | null           // ISO 8601 datetime
  auto_ship: boolean
  auto_reply: boolean
  auto_ai_reply: boolean
  auto_restock: boolean
  skus: ItemSKU[] | null
  created_at: string                   // ISO 8601 datetime
  updated_at: string                   // ISO 8601 datetime
  account: AccountName
  config: ShopItemConfig | null
  rulesCount: number | null
}

/** 商品列表分页响应 */
export interface ShopItemListResponse {
  total: number
  page: number
  size: number
  items: ShopItem[]
}

// ═══════════════════════════════════════════════════════════════
// 更新专用类型
// ═══════════════════════════════════════════════════════════════

/** PUT /update.item body — 排除 config / account */
export type ShopItemUpdate = Partial<Omit<ShopItem, 'config' | 'account'>>

/** PUT /update.item.config body — 排除 shipment / shipconfirm / evaluation */
export type ShopItemConfigUpdate = Partial<Omit<ShopItemConfig, 'shipment' | 'shipconfirm' | 'evaluation'>>

/** PUT /update.item.ship.config body */
export interface ShipConfigUpdate {
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  byEntirety: boolean
  voucher: ShipByVoucher
}

// ═══════════════════════════════════════════════════════════════
// 卡种
// ═══════════════════════════════════════════════════════════════

/** 卡种（VoucherKindSchema） */
export interface VoucherKind {
  id: number
  name: string
  desc: string | null
  prefix_credit: string | null
  prefix_secret: string | null
  secretsCount: number | null
}

// ═══════════════════════════════════════════════════════════════
// 待发货订单
// ═══════════════════════════════════════════════════════════════

/** 待发货订单（ItemOrder 模型，orderStatus='待发货'，字段 snake_case 对齐后端） */
export interface PendingOrder {
  orderId: string
  orderStatus: string
  buyerId: string
  buyername: string | null
  buyNum: number
  totalPrice: number
  sku: ItemSKU[] | null
  payment_at: string | null       // 可能为 null，展示用 created_at 兜底
  created_at: string
  account: AccountName
  item: ShopItem                  // 完整商品对象，直接喂 ShipConfigModal
}

/** 待发货订单分页响应 */
export interface PendingOrdersResponse {
  total: number
  page: number
  size: number
  items: PendingOrder[]
}

// ═══════════════════════════════════════════════════════════════
// API 函数
// ═══════════════════════════════════════════════════════════════

/** 商品列表 — GET /api/items/list */
export async function listItems(filters?: ItemFilters): Promise<ShopItemListResponse> {
  return fetchApi<ShopItemListResponse>("/api/items/list", { params: filters as Record<string, string | number> })
}

/** 上架商品 — POST /api/items/shelves?gid=&uid= */
export async function shelvesItem(gid: number, uid: string): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/shelves", {
    method: "POST",
    params: { gid, uid },
  })
}

/** 下架商品 — POST /api/items/offline?gid=&uid= */
export async function offlineItem(gid: number, uid: string): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/offline", {
    method: "POST",
    params: { gid, uid },
  })
}

/** 更新商品基础字段 — PUT /api/items/update.item?gid= */
export async function updateItem(gid: number, data: ShopItemUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 更新商品配置 — PUT /api/items/update.item.config?gid= */
export async function updateItemConfig(gid: number, data: ShopItemConfigUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item.config", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 更新发货/收货/评价配置 — PUT /api/items/update.item.ship.config?gid= */
export async function updateItemShipConfig(gid: number, data: ShipConfigUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item.ship.config", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 刷新账号商品 — POST /api/items/refresh?uid= */
export async function refreshItems(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>("/api/items/refresh", {
    method: "POST",
    params: { uid },
  })
}

/** 获取卡种列表 — GET /api/items/voucher.list */
export async function getVoucherKinds(): Promise<VoucherKind[]> {
  return fetchApi<VoucherKind[]>("/api/items/voucher.list")
}

/** 待发货订单数量 — GET /api/items/orders.pending.count */
export async function fetchPendingOrderCount(): Promise<{ total: number }> {
  return fetchApi<{ total: number }>("/api/items/orders.pending.count")
}

/** 待发货订单列表 — GET /api/items/orders.pending.list */
export async function fetchPendingOrders(params: {
  uid?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}): Promise<PendingOrdersResponse> {
  return fetchApi<PendingOrdersResponse>("/api/items/orders.pending.list", {
    params: params as Record<string, string | number>,
  })
}
