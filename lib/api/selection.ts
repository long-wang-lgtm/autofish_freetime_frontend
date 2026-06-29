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
  uid: string | null
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
  // ===== 新增：Performance 引擎字段 =====
  /** 三窗口性能指标（后端直传） */
  windowsMetrics: WindowsSnapshotDTO | null
  /** 趋势方向（后端直传） */
  trendDirection: TrendDirectionDTO | null
  /** 小时趋势（后端直传，供抽屉使用） */
  hourlyTrend: HourlyTrendDTO | null
  /** ===== 新增衍生字段 ===== */
  /** d7 询单率（直接取自 windowsMetrics.d7.inquiry_rate） */
  d7InquiryRate: number | null
  /** d7 收藏率 */
  d7FavoriteRate: number | null
  /** d7 询藏比 */
  d7IfRatio: number | null
  /** 日均想要数 = d7.total_dwant / 7 */
  d7DailyWant: number | null
  /** 日均浏览数 = d7.total_dlook / 7 */
  d7DailyLook: number | null
  /** 日均收藏数 = d7.total_dcollect / 7 */
  d7DailyCollect: number | null
  /** d7 流量增速 */
  d7BrowseGrowth: number | null
  /** 升温信号 = d1_inquiry_rate / d7_inquiry_rate - 1 */
  acceleration: number | null
  /** 想要稳定性 (d7) */
  wantStability: number | null
  /** 浏览稳定性 (d7) */
  lookStability: number | null
  /** 收藏稳定性 (d7) */
  collectStability: number | null
  /** 价格动向 (d7 price_trend) */
  priceTrend: string | null
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
  | 'd7InquiryRate'
  | 'd7FavoriteRate'
  | 'd7IfRatio'
  | 'd7DailyWant'
  | 'd7DailyLook'
  | 'd7BrowseGrowth'
  | 'acceleration'
  | 'wantTrend'
  | 'lookTrend'
  | 'collectTrend'

/** 将 DTO 映射为 ProductItem，一并计算所有衍生字段 */
export function dtoToProductItem(
  item: MonitoredItemDTO,
  lastFetchLog?: MonitoredItemFetchLogDTO
): ProductItem {
  const price = lastFetchLog?.price ?? item.price ?? 0
  const wantCount = lastFetchLog?.wantCount ?? item.wantCount ?? 0
  const lookCount = lastFetchLog?.lookCount ?? item.lookCount ?? 0
  const collectCount = lastFetchLog?.collectCount ?? item.collectCount ?? 0

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

  // ===== 新增：Performance 引擎衍生字段 =====
  const wm = item.windows_metrics ?? null
  const d7 = wm?.d7
  const d1 = wm?.d1

  const d7InquiryRate = d7?.inquiry_rate ?? null
  const d7FavoriteRate = d7?.favorite_rate ?? null
  const d7IfRatio = d7?.if_ratio ?? null
  const d7DailyWant = d7 != null ? d7.total_dwant / 7 : null
  const d7DailyLook = d7 != null ? d7.total_dlook / 7 : null
  const d7DailyCollect = d7 != null ? d7.total_dcollect / 7 : null
  const d7BrowseGrowth = d7?.browse_growth ?? null

  // 升温信号：d1_inquiry_rate / d7_inquiry_rate - 1
  let acceleration: number | null = null
  if (d1?.inquiry_rate != null && d7?.inquiry_rate != null && d7.inquiry_rate > 0) {
    acceleration = d1.inquiry_rate / d7.inquiry_rate - 1
  }

  const wantStability = d7?.want_stability ?? null
  const lookStability = d7?.look_stability ?? null
  const collectStability = d7?.collect_stability ?? null
  const priceTrend = d7?.price_trend ?? null

  return {
    id: item.gid,
    uid: item.uid ?? null,
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
    // 新增字段
    windowsMetrics: wm,
    trendDirection: item.trend_direction ?? null,
    hourlyTrend: item.hourly_trend ?? null,
    d7InquiryRate,
    d7FavoriteRate,
    d7IfRatio,
    d7DailyWant,
    d7DailyLook,
    d7DailyCollect,
    d7BrowseGrowth,
    acceleration,
    wantStability,
    lookStability,
    collectStability,
    priceTrend,
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
    case 'd7InquiryRate':
      return item.d7InquiryRate ?? -1
    case 'd7FavoriteRate':
      return item.d7FavoriteRate ?? -1
    case 'd7IfRatio':
      return item.d7IfRatio ?? -1
    case 'd7DailyWant':
      return item.d7DailyWant ?? -1
    case 'd7DailyLook':
      return item.d7DailyLook ?? -1
    case 'd7BrowseGrowth':
      return item.d7BrowseGrowth ?? -Infinity
    case 'acceleration':
      return item.acceleration ?? -Infinity
    case 'wantTrend': {
      const s = item.trendDirection?.want_slope
      return s === 'up' ? 2 : s === 'flat' ? 1 : s === 'down' ? 0 : -1
    }
    case 'lookTrend': {
      const s = item.trendDirection?.look_slope
      return s === 'up' ? 2 : s === 'flat' ? 1 : s === 'down' ? 0 : -1
    }
    case 'collectTrend': {
      const s = item.trendDirection?.collect_slope
      return s === 'up' ? 2 : s === 'flat' ? 1 : s === 'down' ? 0 : -1
    }
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

/** 窗口性能指标 — 对应后端 windows_metrics 单窗口数据 */
export interface WindowMetricsDTO {
  inquiry_rate: number | null
  favorite_rate: number | null
  if_ratio: number | null
  browse_growth: number | null
  total_dwant: number
  total_dlook: number
  total_dcollect: number
  price_trend: string | null
  price_lowest_ratio: number | null
  want_stability: number | null
  look_stability: number | null
  collect_stability: number | null
  fetch_count: number
  quality_label: string
}

/** 三窗口性能快照 — 对应后端 windows_metrics */
export interface WindowsSnapshotDTO {
  d1: WindowMetricsDTO
  d3: WindowMetricsDTO
  d7: WindowMetricsDTO
}

/** 趋势方向 — 对应后端 trend_direction */
export interface TrendDirectionDTO {
  want_slope: string | null
  look_slope: string | null
  collect_slope: string | null
}

/** 小时趋势 — 对应后端 hourly_trend（列式结构，ECharts dataset 可直接消费） */
export interface HourlyTrendDTO {
  ts: string[]
  hourly_want_rate: number[]
  hourly_look_rate: number[]
  hourly_collect_rate: number[]
  price: (number | null)[]
  cumulative_want: number[]
  cumulative_look: number[]
  cumulative_collect: number[]
}

/** 最新采集日志 — 对应后端 lastFetchLogs[] 单项 */
export interface MonitoredItemFetchLogDTO {
  gid: string
  price: number
  wantCount: number
  lookCount: number
  collectCount: number
  sales: number
  itemStatus: number
  created_at: string
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
  /** ===== 新增：Performance 引擎字段 ===== */
  /** 三窗口性能指标 */
  windows_metrics?: WindowsSnapshotDTO | null
  /** 趋势方向 */
  trend_direction?: TrendDirectionDTO | null
  /** 小时级趋势时序数据 */
  hourly_trend?: HourlyTrendDTO | null
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

import { fetchApi, API_BASE_URL, type OperationResponse } from '@/lib/utils/api'

const SEL_BASE = `${API_BASE_URL}/api/topic`

// ============ API 函数 ============

/** 监控商品列表响应 — 对应后端 GET /api/topic/monitor/items 实际返回 */
interface MonitorItemListResponse {
  items: MonitoredItemDTO[]
  lastFetchLogs: MonitoredItemFetchLogDTO[]
}

/** 列出监控商品 — GET /api/topic/monitor/items */
export async function listMonitorItems(page: number = 1, pageSize: number = 20): Promise<MonitorItemListResponse> {
  return fetchApi<MonitorItemListResponse>('/monitor/items', { baseUrl: SEL_BASE, credentials_: 'include', params: { page, page_size: pageSize } })
}

/** 列出监控商家 — GET /api/topic/monitor/merchants */
export async function listMonitorMerchants(): Promise<MonitoredMerchantDTO[]> {
  return fetchApi<MonitoredMerchantDTO[]>('/monitor/merchants', { baseUrl: SEL_BASE, credentials_: 'include' })
}

/** 添加监控商家 — POST /api/topic/monitor/merchant/create (JSON body) */
export async function addMonitorMerchant(uid: string, name: string = ''): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/merchant/create', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ uid, name: name || uid }),
  })
}

/** 获取选品统计 — GET /api/topic/stats */
export async function getTopicStats(): Promise<TopicStatsDTO> {
  return fetchApi<TopicStatsDTO>('/stats', { baseUrl: SEL_BASE, credentials_: 'include' })
}

/** 移除商品监控 — DELETE /api/topic/monitor/item/delete?gid= */
export async function removeMonitorItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/item/delete', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { gid },
  })
}

/** 启用监控 — GET /api/topic/monitor/item/active?gid= */
export async function activateMonitorItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/item/active', { baseUrl: SEL_BASE, credentials_: 'include', params: { gid } })
}

/** 取消监控 — GET /api/topic/monitor/item/cancel?gid= */
export async function cancelMonitorItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/item/cancel', { baseUrl: SEL_BASE, credentials_: 'include', params: { gid } })
}

/** 商品入库（商机库）— GET /monitor/item/stored?gid= */
export async function storedMonitorItem(gid: string): Promise<{ gid: string; monitorStatus: number }> {
  return fetchApi<{ gid: string; monitorStatus: number }>('/monitor/item/stored', { baseUrl: SEL_BASE, credentials_: 'include', params: { gid } })
}

/** 修改监控优先级 — POST /monitor/item/priority */
export async function updateMonitorItemPriority(gid: string, priority: number): Promise<{ gid: string; priority: number }> {
  return fetchApi<{ gid: string; priority: number }>('/monitor/item/priority', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gid, priority }),
  })
}

/** 移除商家监控 — DELETE /api/topic/monitor/merchant/delete?uid= */
export async function removeMonitorMerchant(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/merchant/delete', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { uid },
  })
}

// ============ 关键词管理 ============

/** 列出关键词 — GET /api/topic/keywords */
export async function listKeywords(): Promise<MonitoredKeywordDTO[]> {
  return fetchApi<MonitoredKeywordDTO[]>('/keywords', { baseUrl: SEL_BASE, credentials_: 'include' })
}

/** 添加关键词 — POST /api/topic/keyword/create (JSON body) */
export async function addKeyword(keyword: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/keyword/create', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ keyword }),
  })
}

/** 删除关键词 — DELETE /api/topic/keyword/delete?id= */
export async function removeKeyword(keywordId: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/keyword/delete', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { id: keywordId },
  })
}

// ============ 采集触发 ============

/** 触发采集 — POST /api/topic/collection/run（后端待实现） */
export async function triggerCollection(keywordIds: string[] = []): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/collection/run', {
    baseUrl: SEL_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ keyword_ids: keywordIds }),
  })
}

// ============ 兼容旧接口（为页面组件提供适配）============

/** 将 MonitoredKeyword 映射为前端 Category 格式 */
export async function listCategories(type?: CategoryType): Promise<Category[]> {
  const keywords = await listKeywords()

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
  const { items } = await listMonitorItems()
  const filtered = categoryId
    ? items.filter(item => item.keywords?.includes(categoryId))
    : items

  return filtered.map(item => dtoToProductItem(item))
}

export async function getCategoryReports(categoryId: string): Promise<DailyReport[]> {
  return []
}

/** 按日期统计商品数量 */
export async function getDailyProductCounts(categoryId: string): Promise<Record<string, number>> {
  const { items } = await listMonitorItems()
  const counts: Record<string, number> = {}
  for (const item of items) {
    const date = item.created_at ? item.created_at.split('T')[0] : 'unknown'
    counts[date] = (counts[date] || 0) + 1
  }
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
  return fetchApi<ProductHistoryResponse>(
    `/monitor/item/${encodeURIComponent(gid)}/history`,
    { baseUrl: SEL_BASE, credentials_: 'include', params: { days } }
  )
}
