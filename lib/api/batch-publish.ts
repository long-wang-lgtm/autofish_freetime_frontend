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

/** 素材状态 — 前端可见的 6 个稳定状态 */
export type MaterialStatus =
  | 'pending'
  | 'writing_done'
  | 'genimageplan_done'
  | 'genimage_done'
  | 'published'
  | 'publish_failed'

/** AI 上下文模板类型 */
export type TemplateType = 'only_opportunity' | 'with_item'

/** 素材 AI 上下文 */
export interface MaterialAIContext {
  template?: TemplateType
  images?: string[]
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

/** 素材创建入参 */
export interface MaterialCreateParams {
  num: number
  opp: OpportunityItem
}

/** 素材编辑入参 */
export interface MaterialEditInput {
  id: number
  description?: string
  price?: number
  category?: string
  to_uid?: string
  images?: MaterialImage[]
}

/** AI 上下文更新入参 */
export interface MaterialContextInput {
  id: number
  contextTemplateType: TemplateType
  items?: string[]
  images?: string[]
  coverprompt?: string
}

/** AI 工作阶段 */
export type RewriteStage = 'write' | 'genimageplan' | 'genimage'

/** AI 工作请求 */
export interface RewriteWorkRequest {
  stage: RewriteStage
}

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

/** 列出监控商品 — GET /api/selection/monitor/items */
export async function listMonitoredItems(params?: {
  page?: number
  page_size?: number
  search?: string
  monitorStatus?: number
  opportunity_id?: number | null
  orderBy?: string
  asc?: boolean
}): Promise<MonitorItemListResponse> {
  return fetchApi<MonitorItemListResponse>('/monitor/items', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 批量绑定商品到商机 — POST /api/selection/monitor.batch.bind */
export async function batchBindOpportunity(gids: string[], opportunityId: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor.batch.bind', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gids, opportunity_id: opportunityId }),
  })
}

/** 解绑商品 — POST /api/selection/monitor.unbind.opportunity */
export async function unbindOpportunity(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor.unbind.opportunity', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gid }),
  })
}

/** 删除监控商品 — DELETE /api/selection/monitor/item/delete */
export async function deleteMonitoredItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/item/delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { gid },
  })
}

// ============================================================
// 商机 API
// ============================================================

/** 列出商机 — GET /api/selection/opportunities */
export async function listOpportunities(params?: {
  page?: number
  page_size?: number
  search?: string
  status?: string
}): Promise<OpportunityListResponse> {
  return fetchApi<OpportunityListResponse>('/opportunities', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 创建商机 — POST /api/selection/opportunity/create */
export async function createOpportunity(input: OpportunityInput): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity/create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 更新商机 — POST /api/selection/opportunity/update */
export async function updateOpportunity(id: number, input: Partial<OpportunityInput>): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity/update', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id, ...input }),
  })
}

/** 删除商机 — DELETE /api/selection/opportunity/delete */
export async function deleteOpportunity(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/opportunity/delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { id },
  })
}

// ============================================================
// 素材 API
// ============================================================

/** 列出素材 — GET /api/selection/materials */
export async function listMaterials(params?: {
  page?: number
  page_size?: number
  search?: string
  status?: MaterialStatus
  opportunity_id?: number
  dateFrom?: string
  dateTo?: string
}): Promise<MaterialListResponse> {
  return fetchApi<MaterialListResponse>('/materials', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 批量创建素材 — POST /api/selection/material.create */
export async function createMaterials(input: MaterialCreateInput): Promise<PublishMaterial[]> {
  return fetchApi<PublishMaterial[]>('/material.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 编辑素材 — POST /api/selection/material.edit */
export async function editMaterial(input: MaterialEditInput): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.edit', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 更新 AI 上下文 — POST /api/selection/material.context */
export async function updateMaterialContext(input: MaterialContextInput): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.context', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 触发 AI 改写 — POST /api/selection/material.rewrite */
export async function triggerRewrite(materialId: number): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.rewrite', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}

/** 获取发布类目 — POST /api/selection/material.channel */
export async function getChannel(materialId: number): Promise<{ category: string }> {
  return fetchApi<{ category: string }>('/material.channel', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}

/** 发布素材 — POST /api/selection/material.publish */
export async function publishMaterial(materialId: number): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.publish', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}

/** 删除素材 — DELETE /api/selection/material/delete */
export async function deleteMaterial(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/material/delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { id },
  })
}

/** 获取 AI 上下文模板 — GET /api/selection/material/context.template */
export async function getContextTemplate(materialId: number): Promise<MaterialAIContext> {
  return fetchApi<MaterialAIContext>('/material/context.template', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: { id: materialId },
  })
}
