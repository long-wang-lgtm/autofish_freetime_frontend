/**
 * 批量创作发布系统 — API 模块
 *
 * 所有接口基于 /api/selection/*，通过 fetchApi 统一请求。
 * 类型与 API 函数就近定义。
 */

import { fetchApi, API_BASE_URL, type OperationResponse } from '@/lib/utils/api'
import { getAccessToken } from '@/lib/utils/auth'

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

/** 商机提炼结果 — 与后端 OpportunitySummary pydantic BaseModel 对齐 */
export interface OpportunitySummary {
  article: string
  keywords: string[]
}

/** 商机提炼草稿（opportunity_draft） */
export interface OpportunityDraft {
  draft_id: number
  source_type: 'url' | 'file' | 'text'
  source_url?: string | null
  summary: OpportunitySummary
  created_at?: string | null
}

/** 商机 */
export interface OpportunityItem {
  id: number
  name: string
  description?: string | null
  price?: number
  status: string
  ai_context_template?: TemplateType
  summary?: OpportunitySummary | null
  summary_status?: string
  summary_note?: string | null
  source_url?: string | null
  monitoredItemCount?: number
  materialCount?: number
  /** 已发布素材数（opportunity.list 聚合返回） */
  publishedCount?: number
  /** 未分配素材数（opportunity.list 聚合返回，to_uid 为空） */
  unassignedCount?: number
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
  summary?: OpportunitySummary | null
  summary_status?: string
  summary_note?: string | null
  source_url?: string | null
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
  produceState?: { coverprompt?: string | null; brief?: string | null } | null
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
  produceState?: { coverprompt?: string | null; brief?: string | null }
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
  /** 提炼状态筛选：空串=未提炼（summary 为空）；其余按 summary_status 精确匹配；不传=全部 */
  summary_status?: string
}): Promise<OpportunityListResponse> {
  return fetchApi<OpportunityListResponse>('/opportunity.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 创建商机 — POST /api/selection/opportunity.create；可选 draftId 表示确认提炼草稿（成功后后端删 draft） */
export async function createOpportunity(opp: OpportunityParams, draftId?: number): Promise<OpportunityItem> {
  const params: Record<string, string | number> = {}
  if (draftId != null) params.draft_id = draftId
  return fetchApi<OpportunityItem>('/opportunity.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params,
    body: JSON.stringify(opp),
  })
}

/** 更新商机 — POST /api/selection/opportunity.update；可选 draftId 表示确认提炼草稿（成功后后端删 draft） */
export async function updateOpportunity(oid: number, opp: Partial<OpportunityParams>, draftId?: number): Promise<OpportunityItem> {
  const params: Record<string, string | number> = { oid }
  if (draftId != null) params.draft_id = draftId
  return fetchApi<OpportunityItem>('/opportunity.update', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params,
    body: JSON.stringify(opp),
  })
}

/** 提炼质量判定 — POST /api/selection/opportunity.summary.review（oid 走 query，status 走 body，note 走 query 裸参数） */
export async function opportunitySummaryReview(
  oid: number,
  status: 'operator_verified' | 'rejected',
  note?: string,
): Promise<OpportunityItem> {
  const params: Record<string, string | number> = { oid }
  if (note) params.note = note
  return fetchApi<OpportunityItem>('/opportunity.summary.review', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params,
    body: JSON.stringify({ status }),
  })
}

// ============================================================
// 商机提炼 API
// ============================================================

/** 提炼入参 — 三种来源按 source_type 各带一个对应字段 */
export interface OpportunityExtractPayload {
  source_url?: string
  content?: string
  file?: File
}

/** 提炼草稿列表响应 — GET /api/selection/opportunity.draft.list（当前用户未确认草稿，按时间倒序） */
export interface OpportunityDraftListResponse {
  drafts: OpportunityDraft[]
}

/**
 * 提炼商机资料 — POST /api/selection/opportunity.extract（multipart/form-data）
 *
 * ⚠️ fetchApi 默认强制 Content-Type: application/json 会破坏 FormData 的 multipart boundary，
 * 因此本接口用原生 fetch，手动带 Authorization 头，让浏览器自动设置 multipart Content-Type。
 */
export async function opportunityExtract(
  sourceType: 'url' | 'file' | 'text',
  payload: OpportunityExtractPayload,
): Promise<{ draft_id: number; summary: OpportunitySummary }> {
  const formData = new FormData()
  formData.append('source_type', sourceType)
  if (sourceType === 'url') formData.append('source_url', payload.source_url ?? '')
  if (sourceType === 'file' && payload.file) formData.append('file', payload.file)
  if (sourceType === 'text') formData.append('content', payload.content ?? '')

  const token = getAccessToken()
  const response = await fetch(`${BP_BASE}/opportunity.extract`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/** 列出当前用户未确认草稿 — GET /api/selection/opportunity.draft.list */
export async function opportunityDraftList(): Promise<OpportunityDraftListResponse> {
  return fetchApi<OpportunityDraftListResponse>('/opportunity.draft.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
  })
}

/** 删除提炼草稿（放弃提炼）— POST /api/selection/opportunity.draft.delete?draft_id=N */
export async function opportunityDraftDelete(draftId: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/opportunity.draft.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { draft_id: draftId },
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
  oppName?: string
  itemTitle?: string
  toUid?: string
  description?: string
  category?: string
  status?: string
}): Promise<MaterialListResponse> {
  const { toUid, ...rest } = params ?? {}
  const query: Record<string, string | number> = { ...(rest as Record<string, string | number>) }
  if (toUid) query.to_uid = toUid
  return fetchApi<MaterialListResponse>('/material.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: query,
  })
}

/** 批量创建素材（按商机）— POST /api/selection/material.create.by.opp；brief 为现场决策的策略简报（可选），非空时后端锁定 num=1 */
export async function createMaterialsByOpp(
  num: number,
  opp: OpportunityItem,
  toUid?: string,
  brief?: string,
): Promise<PublishMaterial[]> {
  const params: Record<string, string | number> = { num }
  if (toUid) params.to_uid = toUid
  if (brief) params.brief = brief
  return fetchApi<PublishMaterial[]>('/material.create.by.opp', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params,
    body: JSON.stringify(opp),
  })
}

/** 批量创建素材（按监控商品）— POST /api/selection/material.create.by.item；brief 为现场决策的策略简报（可选），非空时后端锁定 num=1 */
export async function createMaterialsByItem(
  num: number,
  souItemId: string,
  toUid?: string,
  brief?: string,
): Promise<PublishMaterial[]> {
  const params: Record<string, string | number> = { num, souItemId }
  if (toUid) params.to_uid = toUid
  if (brief) params.brief = brief
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

// ============================================================
// 创作模板 API
// ============================================================

/** 创作模板 prompt_key 白名单 — 与后端白名单一致 */
export type CreativePromptKey = 'Rewrite' | 'CoverPlan'

/** 创作模板来源 — custom=用户自定义 / default=使用默认模板（content 为 yaml 内容） */
export type CreativePromptSource = 'custom' | 'default'

/** 创作模板 */
export interface CreativePrompt {
  prompt_key: CreativePromptKey
  content: string
  source: CreativePromptSource
}

/** 创作模板列表响应 — GET /api/selection/creative.prompt.all */
export interface CreativePromptListResponse {
  items: CreativePrompt[]
}

/** 列出创作模板 — GET /api/selection/creative.prompt.all */
export async function listCreativePrompts(): Promise<CreativePromptListResponse> {
  return fetchApi<CreativePromptListResponse>('/creative.prompt.all', {
    baseUrl: BP_BASE,
    credentials_: 'include',
  })
}

/** 保存创作模板 — POST /api/selection/creative.prompt.save */
export async function saveCreativePrompt(
  promptKey: CreativePromptKey,
  content: string,
): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/creative.prompt.save', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ prompt_key: promptKey, content }),
  })
}

/** 恢复默认创作模板 — POST /api/selection/creative.prompt.reset（未配置自定义时 404） */
export async function resetCreativePrompt(promptKey: CreativePromptKey): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/creative.prompt.reset', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ prompt_key: promptKey }),
  })
}
