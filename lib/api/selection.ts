export type CategoryType = 'scene' | 'industry'

export interface Category {
  id: string
  name: string
  type: CategoryType
  keywordCount: number
  accountCount: number
  todayCollectCount: number
  totalCollectCount: number
  lastCollectTime: string | null
}

export interface ProductItem {
  id: string
  title: string
  price: number
  wantCount: number
  lookCount: number
  collectCount: number
  shopName: string
  source: string
  sourceType: 'keyword' | 'account'
  publishedAt: string
  description: string
  date?: string // 商品所属日期，用于筛选
  // ===== 衍生字段（前端计算，null = 数据不足无法计算）=====
  /** 询单率 = wantCount / lookCount，0~1 之间 */
  inquiryRate: number | null
  /** 询藏比 = wantCount / collectCount */
  wantCollectRatio: number | null
  /** 日均询单 = wantCount / 上架天数 */
  dailyWant: number | null
  /** 预估销售额 = price * wantCount * 0.5 */
  estimatedSales: number | null
  /** 预估订单数 = wantCount * 0.5 */
  estimatedOrders: number | null
  /** 收藏率 = collectCount / lookCount，0~1 之间 */
  collectRate: number | null
  /** 上架天数 = (now - publishTime) / 86400 */
  daysSincePublish: number | null
  // ===== 后端直传字段 =====
  /** 监控优先级 */
  priority: number | null
  /**
   * 监控状态（对齐后端 MonitorStatus 枚举）：
   *   0 = PAUSED（已暂停）
   *   1 = MONITORING（监控中）
   *   2 = ANALYZED（已分析）
   *   3 = PUBLISHED（已发布）
   */
  monitorStatus: number | null
  /** 来源关键词列表 */
  keywords: string[]
  // ===== 历史表现字段（后端直传）=====
  /** 最近 10 次采集的询单数，按时间升序 */
  recentInquiries: number[]
  /** 近 10 次采集的询单整体趋势方向 */
  trend: 'up' | 'down' | 'flat'
  /** 趋势涨跌幅百分比（如 23.5 表示 +23.5%） */
  trendValue: number
  /** 询单数变异系数 CV（σ/μ），值越小越稳定 */
  stabilityValue: number
  /** 最近一次采集时间（ISO 8601），供迷你图 tooltip */
  lastCollectedAt: string | null
}

/** 可排序的列 key */
export type ProductSortKey =
  | 'title'
  | 'price'
  | 'wantCount'
  | 'lookCount'
  | 'collectCount'
  | 'inquiryRate'
  | 'wantCollectRatio'
  | 'dailyWant'
  | 'estimatedSales'
  | 'estimatedOrders'
  | 'collectRate'
  | 'daysSincePublish'
  | 'publishedAt'
  | 'priority'
  | 'status'
  | 'trendValue'
  | 'stabilityValue'

/** 将 DTO 映射为 ProductItem，一并计算所有衍生字段 */
export function dtoToProductItem(item: MonitoredItemDTO): ProductItem {
  const price = item.price ?? 0
  const wantCount = item.wantCount ?? 0
  const lookCount = item.lookCount ?? 0
  const collectCount = item.collectCount ?? 0

  const nowMs = Date.now()
  const daysSincePublish =
    item.publishTime && item.publishTime > 0
      ? Math.max(0, (nowMs - item.publishTime) / 86400000)
      : null

  const inquiryRate = lookCount > 0 ? wantCount / lookCount : null
  const wantCollectRatio = collectCount > 0 ? wantCount / collectCount : null
  const dailyWant = daysSincePublish !== null && daysSincePublish > 0 ? wantCount / daysSincePublish : null
  const estimatedSales = price > 0 && wantCount > 0 ? price * wantCount * 0.5 : null
  const estimatedOrders = wantCount > 0 ? wantCount * 0.5 : null
  const collectRate = lookCount > 0 ? collectCount / lookCount : null

  // 发布时间：publishTime 是商品在闲鱼上架的 Unix 时间戳（毫秒）
  const publishedAt = item.publishTime
    ? new Date(item.publishTime).toISOString()
    : ''
  const publishDate = item.publishTime
    ? new Date(item.publishTime).toISOString().split('T')[0]
    : undefined

  return {
    id: item.gid,
    title: item.title || '',
    price,
    wantCount,
    lookCount,
    collectCount,
    shopName: item.name ?? '',
    source: item.keywords?.length ? `关键词[${item.keywords[0]}]` : '未知来源',
    sourceType: 'keyword' as const,
    publishedAt,
    description: item.description ?? '',
    date: publishDate,
    inquiryRate,
    wantCollectRatio,
    dailyWant,
    estimatedSales,
    estimatedOrders,
    collectRate,
    daysSincePublish,
    priority: item.priority ?? null,
    monitorStatus: item.monitorStatus ?? null,
    keywords: item.keywords ?? [],
    recentInquiries: item.recentInquiries ?? [],
    trend: item.trend ?? 'flat',
    trendValue: item.trendValue ?? 0,
    stabilityValue: item.stabilityValue ?? 0,
    lastCollectedAt: item.lastCollectedAt ?? null,
  }
}

/** 获取排序用的数值，便于 ProductItem 按 SortKey 排序 */
export function getProductSortValue(item: ProductItem, key: ProductSortKey): number | string {
  switch (key) {
    case 'title':
      return item.title
    case 'price':
      return item.price
    case 'wantCount':
      return item.wantCount
    case 'lookCount':
      return item.lookCount
    case 'collectCount':
      return item.collectCount
    case 'inquiryRate':
      return item.inquiryRate ?? -1
    case 'wantCollectRatio':
      return item.wantCollectRatio ?? -1
    case 'dailyWant':
      return item.dailyWant ?? -1
    case 'estimatedSales':
      return item.estimatedSales ?? -1
    case 'estimatedOrders':
      return item.estimatedOrders ?? -1
    case 'collectRate':
      return item.collectRate ?? -1
    case 'daysSincePublish':
      return item.daysSincePublish ?? -1
    case 'publishedAt':
      return item.publishedAt ? new Date(item.publishedAt).getTime() : -1
    case 'priority':
      return item.priority ?? -1
    case 'status':
      return item.monitorStatus ?? -1
    case 'trendValue':
      return item.trendValue
    case 'stabilityValue':
      return item.stabilityValue
  }
}

export interface DailyReport {
  id: string
  date: string
  generatedAt: string
  title: string
  summary: string
  productCount: number
  heatLevel: number // 1-5
  actionTag: '重点跟进' | '观察' | '暂不推荐'
  products: ProductItem[]
}

// ============ 后端 DTO 类型（字段对齐 backend/free/common/schema.py）============

export interface OperationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

/** 监控商品 — 对应 MonitoredItemSchema */
export interface MonitoredItemDTO {
  gid: string
  uid?: string | null
  name?: string | null
  monitorStatus?: number | null
  priority?: number | null
  title?: string | null
  description?: string | null
  price?: number | null
  wantCount?: number | null
  lookCount?: number | null
  collectCount?: number | null
  sales?: number | null
  registerDays?: number | null
  publishTime?: number | null
  keywords?: string[] | null
  created_at?: string | null
  updated_at?: string | null
  /** 最近 10 次采集的询单数，按时间升序 */
  recentInquiries?: number[] | null
  /** 近 10 次采集的询单整体趋势方向 */
  trend?: 'up' | 'down' | 'flat' | null
  /** 趋势涨跌幅百分比（如 23.5 表示 +23.5%） */
  trendValue?: number | null
  /** 询单数变异系数 CV（σ/μ），值越小越稳定 */
  stabilityValue?: number | null
  /** 最近一次采集时间（ISO 8601） */
  lastCollectedAt?: string | null
}

/** 监控商家 — 对应 MonitoredMerchantSchema */
export interface MonitoredMerchantDTO {
  uid: string
  name?: string | null
  monitorStatus?: number | null
  merchantStatus?: number | null
  priority?: number | null
  last_fetch_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** 监控关键词 — 对应 MonitoredKeywordSchema */
export interface MonitoredKeywordDTO {
  id?: number | null
  keyword?: string | null
  status?: number | null
  priority?: number | null
  search_counts?: number | null
  search_item_counts?: number | null
  search_repeat_item_counts?: number | null
  total_pass_item_counts?: number | null
  total_eliminate_item_counts?: number | null
  total_eliminate_item_key_counts?: number | null
  total_eliminate_item_ai_counts?: number | null
  monitor_json_counts?: number | null
  opportunity_counts?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface TopicStatsDTO {
  item_count: number
  merchant_count: number
  today_fetch_count: number
}

// ============ API 客户端 ============

import { API_BASE_URL } from '@/lib/utils/api'

const SELECTION_API_BASE = `${API_BASE_URL}/api/topic`

async function selectionFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { getAccessToken } = await import('@/lib/utils/auth')
  const token = getAccessToken()
  const url = `${SELECTION_API_BASE}${path}`
  console.debug(`[SelectionAPI] ${options?.method || 'GET'} ${url}`)
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    console.error(`[SelectionAPI] Error ${res.status} for ${url}`)
    throw new Error(`API Error: ${res.status}`)
  }
  const data = await res.json()
  console.debug(`[SelectionAPI] Response ${url}:`, data)
  return data
}

// ============ API 函数 ============

/** 列出监控商品 — GET /api/topic/monitor/items */
export async function listMonitorItems(): Promise<MonitoredItemDTO[]> {
  console.debug('[SelectionAPI] listMonitorItems')
  return selectionFetch<MonitoredItemDTO[]>('/monitor/items')
}

/** 列出监控商家 — GET /api/topic/monitor/merchants */
export async function listMonitorMerchants(): Promise<MonitoredMerchantDTO[]> {
  console.debug('[SelectionAPI] listMonitorMerchants')
  return selectionFetch<MonitoredMerchantDTO[]>('/monitor/merchants')
}

/** 添加监控商家 — POST /api/topic/monitor/merchant/create (JSON body) */
export async function addMonitorMerchant(uid: string, name: string = ''): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] addMonitorMerchant uid=${uid}, name=${name}`)
  return selectionFetch<OperationResponse>('/monitor/merchant/create', {
    method: 'POST',
    body: JSON.stringify({ uid, name: name || uid }),
  })
}

/** 获取选品统计 — GET /api/topic/stats */
export async function getTopicStats(): Promise<TopicStatsDTO> {
  console.debug('[SelectionAPI] getTopicStats')
  return selectionFetch<TopicStatsDTO>('/stats')
}

/** 移除商品监控 — DELETE /api/topic/monitor/item/delete?gid= */
export async function removeMonitorItem(gid: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] removeMonitorItem gid=${gid}`)
  return selectionFetch<OperationResponse>(`/monitor/item/delete?gid=${encodeURIComponent(gid)}`, {
    method: 'DELETE',
  })
}

/** 启用监控 — GET /api/topic/monitor/item/active?gid= */
export async function activateMonitorItem(gid: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] activateMonitorItem gid=${gid}`)
  return selectionFetch<OperationResponse>(`/monitor/item/active?gid=${encodeURIComponent(gid)}`)
}

/** 取消监控 — GET /api/topic/monitor/item/cancel?gid= */
export async function cancelMonitorItem(gid: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] cancelMonitorItem gid=${gid}`)
  return selectionFetch<OperationResponse>(`/monitor/item/cancel?gid=${encodeURIComponent(gid)}`)
}

/** 移除商家监控 — DELETE /api/topic/monitor/merchant/delete?uid= */
export async function removeMonitorMerchant(uid: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] removeMonitorMerchant uid=${uid}`)
  return selectionFetch<OperationResponse>(`/monitor/merchant/delete?uid=${encodeURIComponent(uid)}`, {
    method: 'DELETE',
  })
}

// ============ 关键词管理 ============

/** 列出关键词 — GET /api/topic/keywords */
export async function listKeywords(): Promise<MonitoredKeywordDTO[]> {
  console.debug('[SelectionAPI] listKeywords')
  return selectionFetch<MonitoredKeywordDTO[]>('/keywords')
}

/** 添加关键词 — POST /api/topic/keyword/create (JSON body) */
export async function addKeyword(keyword: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] addKeyword keyword=${keyword}`)
  return selectionFetch<OperationResponse>('/keyword/create', {
    method: 'POST',
    body: JSON.stringify({ keyword }),
  })
}

/** 删除关键词 — DELETE /api/topic/keyword/delete?id= */
export async function removeKeyword(keywordId: number): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] removeKeyword keywordId=${keywordId}`)
  return selectionFetch<OperationResponse>(`/keyword/delete?id=${keywordId}`, {
    method: 'DELETE',
  })
}

// ============ 采集触发 ============

/** 触发采集 — POST /api/topic/collection/run（后端待实现） */
export async function triggerCollection(keywordIds: string[] = []): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] triggerCollection keywordIds=${JSON.stringify(keywordIds)}`)
  return selectionFetch<OperationResponse>('/collection/run', {
    method: 'POST',
    body: JSON.stringify({ keyword_ids: keywordIds }),
  })
}

// ============ 兼容旧接口（为页面组件提供适配）============

/** 将 MonitoredKeyword 映射为前端 Category 格式 */
export async function listCategories(type?: CategoryType): Promise<Category[]> {
  console.debug(`[SelectionAPI] listCategories type=${type}`)
  const keywords = await listKeywords()
  console.debug(`[SelectionAPI] listCategories got ${keywords.length} keywords`)

  const categories: Category[] = keywords.map(k => ({
    id: String(k.id ?? ''),
    name: k.keyword ?? '',
    type: 'scene' as const,
    keywordCount: 0,
    accountCount: 0,
    todayCollectCount: 0,
    totalCollectCount: k.search_item_counts ?? 0,
    lastCollectTime: k.updated_at ?? k.created_at ?? null,
  }))

  if (type === 'scene') return categories.filter(c => c.type === 'scene')
  return categories
}

/** 根据关键词 ID 获取采集商品列表 */
export async function getCategoryProducts(categoryId: string): Promise<ProductItem[]> {
  console.debug(`[SelectionAPI] getCategoryProducts categoryId=${categoryId}`)
  const items = await listMonitorItems()
  const filtered = categoryId
    ? items.filter(item => item.keywords?.includes(categoryId))
    : items

  console.debug(`[SelectionAPI] getCategoryProducts filtered ${filtered.length} items`)
  return filtered.map(dtoToProductItem)
}

export async function getCategoryReports(categoryId: string): Promise<DailyReport[]> {
  console.debug(`[SelectionAPI] getCategoryReports categoryId=${categoryId}`)
  return []
}

/** 按日期统计商品数量 */
export async function getDailyProductCounts(categoryId: string): Promise<Record<string, number>> {
  console.debug(`[SelectionAPI] getDailyProductCounts categoryId=${categoryId}`)
  const items = await listMonitorItems()
  const counts: Record<string, number> = {}
  for (const item of items) {
    const date = item.created_at ? item.created_at.split('T')[0] : 'unknown'
    counts[date] = (counts[date] || 0) + 1
  }
  console.debug(`[SelectionAPI] getDailyProductCounts counts=${JSON.stringify(counts)}`)
  return counts
}

// ============ 商品历史表现 ============

/** 历史采集数据点 */
export interface HistoryPoint {
  /** 采集时间（ISO 8601） */
  collectedAt: string
  /** 本次采集时的询单数 */
  inquiryCount: number
  /** 本次采集时的浏览数 */
  viewCount: number
  /** 本次采集时的想要数 */
  wantCount: number
  /** 本次采集时的收藏数 */
  favoriteCount: number
  /** 本次采集时的价格（如有变动） */
  price: number | null
}

/** 商品历史表现响应 */
export interface ProductHistoryResponse {
  gid: string
  items: HistoryPoint[]
}

/** 获取商品历史采集数据 — GET /api/topic/monitor/item/{gid}/history */
export async function getProductHistory(
  gid: string,
  days: 7 | 30 | 90 = 7
): Promise<ProductHistoryResponse> {
  console.debug(`[SelectionAPI] getProductHistory gid=${gid} days=${days}`)
  return selectionFetch<ProductHistoryResponse>(
    `/monitor/item/${encodeURIComponent(gid)}/history?days=${days}`
  )
}
