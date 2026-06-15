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
  imageUrl: string
  wantCount: number
  lookCount: number
  ratio: number // 想要数/浏览数
  collectCount: number
  shopName: string
  source: string
  sourceType: 'keyword' | 'account'
  publishedAt: string
  description: string
  date?: string // 商品所属日期，用于筛选
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
  status?: number | null
  priority?: number | null
  price?: number | null
  wantCount?: number | null
  lookCount?: number | null
  collectCount?: number | null
  description?: string | null
  sales?: number | null
  registerDays?: number | null
  proLevel?: number | null
  publishTime?: number | null
  keywords?: string[] | null
  created_at?: string | null
  updated_at?: string | null
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

const API_BASE = `${process.env.NEXT_PUBLIC_API_BASE_URL!}/api/topic`

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const { getAccessToken } = await import('@/lib/utils/auth')
  const token = getAccessToken()
  const url = `${API_BASE}${path}`
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
  return fetchAPI<MonitoredItemDTO[]>('/monitor/items')
}

/** 列出监控商家 — GET /api/topic/monitor/merchants */
export async function listMonitorMerchants(): Promise<MonitoredMerchantDTO[]> {
  console.debug('[SelectionAPI] listMonitorMerchants')
  return fetchAPI<MonitoredMerchantDTO[]>('/monitor/merchants')
}

/** 添加监控商家 — POST /api/topic/monitor/merchant/create (JSON body) */
export async function addMonitorMerchant(uid: string, name: string = ''): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] addMonitorMerchant uid=${uid}, name=${name}`)
  return fetchAPI<OperationResponse>('/monitor/merchant/create', {
    method: 'POST',
    body: JSON.stringify({ uid, name: name || uid }),
  })
}

/** 获取选品统计 — GET /api/topic/stats */
export async function getTopicStats(): Promise<TopicStatsDTO> {
  console.debug('[SelectionAPI] getTopicStats')
  return fetchAPI<TopicStatsDTO>('/stats')
}

/** 移除商品监控 — DELETE /api/topic/monitor/item/delete?gid= */
export async function removeMonitorItem(gid: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] removeMonitorItem gid=${gid}`)
  return fetchAPI<OperationResponse>(`/monitor/item/delete?gid=${encodeURIComponent(gid)}`, {
    method: 'DELETE',
  })
}

/** 移除商家监控 — DELETE /api/topic/monitor/merchant/delete?uid= */
export async function removeMonitorMerchant(uid: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] removeMonitorMerchant uid=${uid}`)
  return fetchAPI<OperationResponse>(`/monitor/merchant/delete?uid=${encodeURIComponent(uid)}`, {
    method: 'DELETE',
  })
}

// ============ 关键词管理 ============

/** 列出关键词 — GET /api/topic/keywords */
export async function listKeywords(): Promise<MonitoredKeywordDTO[]> {
  console.debug('[SelectionAPI] listKeywords')
  return fetchAPI<MonitoredKeywordDTO[]>('/keywords')
}

/** 添加关键词 — POST /api/topic/keyword/create (JSON body) */
export async function addKeyword(keyword: string): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] addKeyword keyword=${keyword}`)
  return fetchAPI<OperationResponse>('/keyword/create', {
    method: 'POST',
    body: JSON.stringify({ keyword }),
  })
}

/** 删除关键词 — DELETE /api/topic/keyword/delete?id= */
export async function removeKeyword(keywordId: number): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] removeKeyword keywordId=${keywordId}`)
  return fetchAPI<OperationResponse>(`/keyword/delete?id=${keywordId}`, {
    method: 'DELETE',
  })
}

// ============ 采集触发 ============

/** 触发采集 — POST /api/topic/collection/run（后端待实现） */
export async function triggerCollection(keywordIds: string[] = []): Promise<OperationResponse> {
  console.debug(`[SelectionAPI] triggerCollection keywordIds=${JSON.stringify(keywordIds)}`)
  return fetchAPI<OperationResponse>('/collection/run', {
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
  return filtered.map(item => ({
    id: item.gid,
    title: item.name || item.keywords?.[0] || item.gid,
    price: item.price ?? 0,
    imageUrl: '/placeholder.png',
    wantCount: item.wantCount ?? 0,
    lookCount: item.lookCount ?? 0,
    ratio: (item.wantCount ?? 0) / ((item.lookCount ?? 0) || 1),
    collectCount: item.collectCount ?? 0,
    shopName: item.name ?? '',
    source: item.keywords?.length ? `关键词[${item.keywords[0]}]` : '未知来源',
    sourceType: 'keyword' as const,
    publishedAt: item.updated_at ?? item.created_at ?? '',
    description: item.description ?? '',
    date: item.created_at ? item.created_at.split('T')[0] : undefined,
  }))
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
