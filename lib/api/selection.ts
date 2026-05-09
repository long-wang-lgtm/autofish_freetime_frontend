/**
 * 选品模块 API 客户端
 * Phase 6: 对接真实后端 API
 */

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
  source: string // 关键词[iPhone] 或 账号@xxx
  sourceType: 'keyword' | 'account'
  publishedAt: string
  description: string
  date?: string  // 商品所属日期，用于筛选
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

// ============ 后端 DTO 类型 ============

export interface MonitoredItemDTO {
  gid: string
  keyword: string
  status: number
  priority: number
  price: number
  want_count: number
  look_count: number
  collect_count: number
  sales: number
  last_fetch_time: string | null
  price_change_count: number
  created_at: string
}

export interface MonitoredMerchantDTO {
  uid: string
  name: string
  status: number
  item_count: number
  sales: number
  last_fetch_time: string | null
  created_at: string
}

export interface MonitoredKeywordDTO {
  id: string
  keyword: string
  status: number
  priority: number
  total_collected: number
  ai_passed: number
  last_run_time: string | null
  created_at: string
}

export interface TopicStatsDTO {
  item_count: number
  merchant_count: number
  today_fetch_count: number
}

export interface CollectionRunResponse {
  success: boolean
  message: string
  collected_count?: number
  ai_passed_count?: number
}

// ============ API 客户端 ============

const API_BASE = `${process.env.NEXT_PUBLIC_API_BASE_URL!}/topic`

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

export async function listMonitorItems(): Promise<MonitoredItemDTO[]> {
  console.debug('[SelectionAPI] listMonitorItems')
  return fetchAPI<MonitoredItemDTO[]>('/monitor/items')
}

export async function listMonitorMerchants(): Promise<MonitoredMerchantDTO[]> {
  console.debug('[SelectionAPI] listMonitorMerchants')
  return fetchAPI<MonitoredMerchantDTO[]>('/monitor/merchants')
}

export async function addMonitorMerchant(uid: string, name: string = ''): Promise<void> {
  console.debug(`[SelectionAPI] addMonitorMerchant uid=${uid}, name=${name}`)
  const params = new URLSearchParams({ uid, name: name || uid })
  await fetchAPI(`/monitor/merchant?${params}`, { method: 'POST' })
}

export async function getTopicStats(): Promise<TopicStatsDTO> {
  console.debug('[SelectionAPI] getTopicStats')
  return fetchAPI<TopicStatsDTO>('/stats')
}

export async function removeMonitorItem(gid: string): Promise<void> {
  console.debug(`[SelectionAPI] removeMonitorItem gid=${gid}`)
  await fetchAPI(`/monitor/item/${gid}`, { method: 'DELETE' })
}

export async function removeMonitorMerchant(uid: string): Promise<void> {
  console.debug(`[SelectionAPI] removeMonitorMerchant uid=${uid}`)
  await fetchAPI(`/monitor/merchant/${uid}`, { method: 'DELETE' })
}

// ============ 关键词管理 ============

export async function listKeywords(): Promise<MonitoredKeywordDTO[]> {
  console.debug('[SelectionAPI] listKeywords')
  return fetchAPI<MonitoredKeywordDTO[]>('/keywords')
}

export async function addKeyword(keyword: string): Promise<void> {
  console.debug(`[SelectionAPI] addKeyword keyword=${keyword}`)
  const params = new URLSearchParams({ keyword })
  await fetchAPI(`/keyword?${params}`, { method: 'POST' })
}

export async function removeKeyword(keywordId: string): Promise<void> {
  console.debug(`[SelectionAPI] removeKeyword keywordId=${keywordId}`)
  await fetchAPI(`/keyword/${keywordId}`, { method: 'DELETE' })
}

export async function triggerCollection(keywordIds: string[] = []): Promise<CollectionRunResponse> {
  console.debug(`[SelectionAPI] triggerCollection keywordIds=${JSON.stringify(keywordIds)}`)
  return fetchAPI<CollectionRunResponse>('/collection/run', {
    method: 'POST',
    body: JSON.stringify({ keyword_ids: keywordIds }),
  })
}

// ============ 兼容旧接口（为页面组件提供适配）============

// 将 MonitoredKeyword 映射为前端 Category 格式
export async function listCategories(type?: CategoryType): Promise<Category[]> {
  console.debug(`[SelectionAPI] listCategories type=${type}`)
  const keywords = await listKeywords()
  console.debug(`[SelectionAPI] listCategories got ${keywords.length} keywords`)

  // 将监控关键词映射为 Category 格式
  const categories: Category[] = keywords.map(k => ({
    id: k.id,
    name: k.keyword,
    type: 'scene' as const,
    keywordCount: 0,
    accountCount: 0,
    todayCollectCount: 0,
    totalCollectCount: k.total_collected,
    lastCollectTime: k.last_run_time,
  }))

  if (type === 'scene') return categories.filter(c => c.type === 'scene')
  return categories
}

export async function getCategoryProducts(categoryId: string): Promise<ProductItem[]> {
  console.debug(`[SelectionAPI] getCategoryProducts categoryId=${categoryId}`)
  const items = await listMonitorItems()
  // 过滤出属于该商家的商品，或全部商品（categoryId 为空时）
  const filtered = categoryId
    ? items.filter(item => item.gid === categoryId) // 暂时用 gid 匹配，后续可按商家筛选
    : items

  console.debug(`[SelectionAPI] getCategoryProducts filtered ${filtered.length} items`)
  return filtered.map(item => ({
    id: item.gid,
    title: item.keyword || item.gid,
    price: item.price,
    imageUrl: '/placeholder.png',
    wantCount: item.want_count,
    lookCount: item.look_count,
    ratio: item.want_count / (item.look_count || 1),
    collectCount: item.collect_count,
    shopName: '',
    source: `关键词[${item.keyword}]`,
    sourceType: 'keyword' as const,
    publishedAt: item.last_fetch_time || '',
    description: '',
    date: item.created_at ? item.created_at.split('T')[0] : undefined,
  }))
}

export async function getCategoryReports(categoryId: string): Promise<DailyReport[]> {
  console.debug(`[SelectionAPI] getCategoryReports categoryId=${categoryId}`)
  return []
}

export async function getDailyProductCounts(categoryId: string): Promise<Record<string, number>> {
  console.debug(`[SelectionAPI] getDailyProductCounts categoryId=${categoryId}`)
  const items = await listMonitorItems()
  // 按日期分组统计
  const counts: Record<string, number> = {}
  for (const item of items) {
    const date = item.created_at ? item.created_at.split('T')[0] : 'unknown'
    counts[date] = (counts[date] || 0) + 1
  }
  console.debug(`[SelectionAPI] getDailyProductCounts counts=${JSON.stringify(counts)}`)
  return counts
}
