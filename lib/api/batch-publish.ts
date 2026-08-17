/**
 * 批量创作发布系统 — API 模块
 *
 * 所有接口基于 /api/selection/*，通过 fetchApi 统一请求。
 * 类型与 API 函数就近定义。
 */

import { fetchApi, API_BASE_URL, type OperationResponse } from '@/lib/utils/api'

const BP_BASE = `${API_BASE_URL}/api/selection`

// ============================================================
// 类型定义
// ============================================================

/** 素材状态 — 与后端 MaterialStatus StrEnum 对齐，每步只有 success/failed */
export type MaterialStatus =
  | 'pending'
  | 'write_success'
  | 'write_failed'
  | 'genimageplan_success'
  | 'genimageplan_failed'
  | 'genimage_success'
  | 'genimage_failed'
  | 'published_success'
  | 'publish_failed'

/** AI 上下文模板类型 */
export type TemplateType = 'only_opportunity' | 'with_item'

/** 素材 AI 上下文 */
export interface MaterialAIContext {
  template?: TemplateType
  items?: string[]
  coverprompt?: string
}

/** 监控商品 */
export interface MonitoredItem {
  gid: string
  uid?: string | null
  name?: string | null
  monitorStatus?: number | null
  title?: string | null
  description?: string | null
  price?: number | null
  wantCount?: number | null
  lookCount?: number | null
  collectCount?: number | null
  wantSlope?: number | null
  wantAvg?: number | null
  convertRate?: number | null
  hideAvg?: number | null
  trendData?: unknown | null
  publishTime?: number | null
  keywords?: string[] | null
  itemStatus?: number | null
  opportunity?: OpportunityItem | null
  created_at?: string | null
  updated_at?: string | null
}

/** 商机 */
export interface OpportunityItem {
  id: number
  name: string
  description?: string | null
  price?: number
  status: string
  ai_context_template?: TemplateType
  monitoredItemCount?: number
  materialCount?: number
  userId?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** 商机创建/更新入参（不含 id、计数、时间戳） */
export interface OpportunityParams {
  name: string
  description?: string
  price?: number
  status?: string
  ai_context_template?: TemplateType
}

/** 素材 */
export interface PublishMaterial {
  id: number
  description?: string | null
  price?: number | null
  category?: string | null
  status: MaterialStatus
  images?: MaterialImage[]
  ai_context?: MaterialAIContext
  to_uid?: string | null
  to_gid?: string | null
  opportunity?: OpportunityItem | null
  userId?: string
  produceState?: { coverprompt?: string | null } | null
  souItem?: MonitoredItem | null
  created_at?: string | null
  updated_at?: string | null
}

/** 素材图片 */
export interface MaterialImage {
  md5: string
  filepath?: string | null
  flare?: string | null
  url?: string | null
  size?: number | null
}

/** 素材编辑入参 */
export interface MaterialEditInput {
  id: number
  description?: string
  price?: number
  category?: string
  to_uid?: string
  images?: MaterialImage[]
  produceState?: { coverprompt?: string | null }
}

/** AI 工作阶段 */
export type RewriteStage = 'write' | 'genimageplan' | 'genimage'

/** 发布类目项 */
export interface ChannelItemResponse {
  channelCateName: string
  channelCateId: string
}

/** 列表响应 — 监控商品 */
export interface MonitorItemListResponse {
  items: MonitoredItem[]
  total: number
}

/** 列表响应 — 商机 */
export interface OpportunityListResponse {
  items: OpportunityItem[]
  total: number
}

/** 列表响应 — 素材 */
export interface MaterialListResponse {
  items: PublishMaterial[]
  total: number
}

// ============================================================
// 监控商品 API
// ============================================================

/** 列出监控商品 — GET /api/selection/monitor.item.list */
export async function listMonitoredItems(params?: {
  page?: number
  page_size?: number
  uid?: string
  uname?: string
  gid?: string
  title?: string
  itemStatus?: number
  monitorStatus?: number
  oid?: number | null
  order_by?: string
  asc?: boolean
}): Promise<MonitorItemListResponse> {
  return fetchApi<MonitorItemListResponse>('/monitor.item.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 删除监控商品 — POST /api/selection/monitor.item.delete */
export async function deleteMonitoredItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor.item.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { gid },
  })
}

/** 切换监控状态 — POST /api/selection/monitor.item.status */
export async function updateMonitorItemStatus(gid: string, status: 0 | 1): Promise<MonitoredItem> {
  return fetchApi<MonitoredItem>('/monitor.item.status', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { gid },
    body: JSON.stringify(status),
  })
}

// ============================================================
// 商机 API
// ============================================================

/** 列出商机 — GET /api/selection/opportunity.list */
export async function listOpportunities(params?: {
  page?: number
  page_size?: number
  name?: string
  description?: string
  status?: string
  ai_context_template?: string
}): Promise<OpportunityListResponse> {
  return fetchApi<OpportunityListResponse>('/opportunity.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 创建商机 — POST /api/selection/opportunity.create */
export async function createOpportunity(opp: OpportunityParams): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify( opp ),
  })
}

/** 更新商机 — POST /api/selection/opportunity.update */
export async function updateOpportunity(oid: number, opp: Partial<OpportunityParams>): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity.update', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { oid } as Record<string, string | number>,
    body: JSON.stringify( opp ),
  })
}

/** 删除商机 — POST /api/selection/opportunity.delete */
export async function deleteOpportunity(oid: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/opportunity.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { oid } as Record<string, string | number>,
  })
}

// ============================================================
// 素材 API
// ============================================================

/** 列出素材 — GET /api/selection/material.list */
export async function listMaterials(params?: {
  page?: number
  page_size?: number
  oid?: number
  souItemId?: string
  name?: string
  description?: string
  category?: string
  status?: string
}): Promise<MaterialListResponse> {
  return fetchApi<MaterialListResponse>('/material.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 批量创建素材（按商机）— POST /api/selection/material.create.by.opp */
export async function createMaterialsByOpp(
  num: number,
  opp: OpportunityItem,
  toUid?: string,
): Promise<PublishMaterial[]> {
  const params: Record<string, string | number> = { num }
  if (toUid) params.to_uid = toUid
  return fetchApi<PublishMaterial[]>('/material.create.by.opp', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params,
    body: JSON.stringify(opp),
  })
}

/** 批量创建素材（按监控商品）— POST /api/selection/material.create.by.item */
export async function createMaterialsByItem(
  num: number,
  souItemId: string,
  toUid?: string,
): Promise<PublishMaterial[]> {
  const params: Record<string, string | number> = { num, souItemId }
  if (toUid) params.to_uid = toUid
  return fetchApi<PublishMaterial[]>('/material.create.by.item', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params,
  })
}

/** 复制素材 — POST /api/selection/material.copy */
export async function copyMaterial(id: number): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.copy', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { id },
  })
}

/** 编辑素材 — POST /api/selection/material.edit */
export async function editMaterial(input: MaterialEditInput): Promise<PublishMaterial> {
  const { id, ...edit } = input
  return fetchApi<PublishMaterial>('/material.edit', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { id },
    body: JSON.stringify(edit),
  })
}

/** 触发 AI 工作 — POST /api/selection/material.rewrite.work */
export async function triggerWork(materialId: number, stage: RewriteStage): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.rewrite.work', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { id: materialId },
    body: JSON.stringify(stage),
  })
}

/** 获取发布类目 — POST /api/selection/material.channel */
export async function getChannel(materialId: number): Promise<ChannelItemResponse[]> {
  return fetchApi<ChannelItemResponse[]>('/material.channel', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { id: materialId },
  })
}

/** 发布素材 — POST /api/selection/material.publish */
export async function publishMaterial(materialId: number): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.publish', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { id: materialId },
  })
}

/** 删除素材 — POST /api/selection/material.delete */
export async function deleteMaterial(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/material.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { id },
  })
}
