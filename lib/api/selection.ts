/**
 * 选品模块 API 客户端（假数据版本）
 * Phase 1: 前端原型，使用假数据，不涉及真实API对接
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
  date?: string  // 新增：商品所属日期，用于筛选
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

// ============ 假数据 ============

export const MOCK_CATEGORIES: Category[] = [
  {
    id: '1',
    name: '飞书模板选品',
    type: 'scene',
    keywordCount: 8,
    accountCount: 3,
    todayCollectCount: 45,
    totalCollectCount: 325,
    lastCollectTime: '2026-04-14 08:30',
  },
  {
    id: '2',
    name: '多维表格选品',
    type: 'scene',
    keywordCount: 5,
    accountCount: 2,
    todayCollectCount: 28,
    totalCollectCount: 198,
    lastCollectTime: '2026-04-14 08:00',
  },
  {
    id: '3',
    name: '3C数码',
    type: 'industry',
    keywordCount: 12,
    accountCount: 5,
    todayCollectCount: 67,
    totalCollectCount: 512,
    lastCollectTime: '2026-04-14 09:00',
  },
  {
    id: '4',
    name: '服饰箱包',
    type: 'industry',
    keywordCount: 10,
    accountCount: 4,
    todayCollectCount: 53,
    totalCollectCount: 427,
    lastCollectTime: '2026-04-14 07:30',
  },
]

export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'p1',
    title: 'iPhone 14 准新 128G 蓝色 99新',
    price: 2999,
    imageUrl: '/placeholder.png',
    wantCount: 328,
    lookCount: 1020,
    ratio: 0.32,
    collectCount: 102,
    shopName: '某某数码3C',
    source: '关键词[iPhone]',
    sourceType: 'keyword',
    publishedAt: '2小时前',
    description: '国行正品，支持验货，爱思全绿，电池效率98%。',
    date: '2026-04-14',  // 新增
  },
  {
    id: 'p2',
    title: '小米13 Pro 12+256G 远山蓝',
    price: 3299,
    imageUrl: '/placeholder.png',
    wantCount: 156,
    lookCount: 580,
    ratio: 0.27,
    collectCount: 45,
    shopName: '小米直供店',
    source: '关键词[小米手机]',
    sourceType: 'keyword',
    publishedAt: '昨天',
    description: '官方在保到年底，无任何磕碰划痕，配件齐全。',
    date: '2026-04-13',  // 新增
  },
  {
    id: 'p3',
    title: 'AirPods Pro 2 代 全新未拆封',
    price: 1588,
    imageUrl: '/placeholder.png',
    wantCount: 89,
    lookCount: 420,
    ratio: 0.21,
    collectCount: 28,
    shopName: '二手苹果专营',
    source: '账号@二手苹果专营',
    sourceType: 'account',
    publishedAt: '3天前',
    description: '官网购买，因收到礼物重复，出售给有需要的人。',
    date: '2026-04-11',  // 新增
  },
  {
    id: 'p4',
    title: '华为 Mate 60 Pro 512G 雅丹黑',
    price: 5999,
    imageUrl: '/placeholder.png',
    wantCount: 245,
    lookCount: 890,
    ratio: 0.28,
    collectCount: 67,
    shopName: '华为官方翻新',
    source: '关键词[华为]',
    sourceType: 'keyword',
    publishedAt: '1小时前',
    description: '全新未激活，支持华为官方验货，麒麟芯片加持。',
    date: '2026-04-14',  // 新增
  },
  {
    id: 'p5',
    title: 'Switch OLED 日版 动森限定机',
    price: 1899,
    imageUrl: '/placeholder.png',
    wantCount: 412,
    lookCount: 1500,
    ratio: 0.27,
    collectCount: 130,
    shopName: '小红书同城数码',
    source: '账号@小红书同城数码',
    sourceType: 'account',
    publishedAt: '5小时前',
    description: '动森限定版，贴膜保护，配件齐全箱说全。',
    date: '2026-04-13',  // 新增
  },
  {
    id: 'p6',
    title: 'OPPO Find X7 Ultra 16+512G',
    price: 4599,
    imageUrl: '/placeholder.png',
    wantCount: 78,
    lookCount: 310,
    ratio: 0.25,
    collectCount: 22,
    shopName: 'OPPO授权店',
    source: '关键词[OPPO]',
    sourceType: 'keyword',
    publishedAt: '昨天',
    description: '官网购入，因手滑换机，出售爱惜使用的本机。',
    date: '2026-04-12',  // 新增
  },
]

export const MOCK_REPORTS: DailyReport[] = [
  {
    id: 'r1',
    date: '2026-04-14',
    generatedAt: '08:00',
    title: 'iPhone 二手市场选品分析',
    summary:
      '最近二手 iPhone 需求持续上涨，准新机溢价空间 15-20%。开学季带动换机需求，建议重点跟进 iPhone 14/15 系列。爆点：苹果官方换机政策利好二手市场。增长空间：随着 iPhone 16 发布，旧机型价格将进一步下探，迎来抄底时机。',
    productCount: 12,
    heatLevel: 5,
    actionTag: '重点跟进',
    products: MOCK_PRODUCTS.slice(0, 3),
  },
  {
    id: 'r2',
    date: '2026-04-13',
    generatedAt: '08:00',
    title: '小米手机新品抢购趋势',
    summary:
      '小米13系列在二手市场热度不减，保值率高于行业平均。爆点：小米14即将发布，13系列进入降价通道。增长空间：关注小米官翻机渠道，价格优势明显。',
    productCount: 8,
    heatLevel: 4,
    actionTag: '观察',
    products: MOCK_PRODUCTS.slice(1, 4),
  },
  {
    id: 'r3',
    date: '2026-04-12',
    generatedAt: '08:00',
    title: '蓝牙耳机爆款选品洞察',
    summary:
      'AirPods Pro 2 和 OPPO Enco 系列在学生群体中热度极高。爆点：开学采购季带动需求。增长空间：国产品牌性价比优势明显，副厂配件市场活跃。',
    productCount: 15,
    heatLevel: 3,
    actionTag: '重点跟进',
    products: MOCK_PRODUCTS.slice(2, 5),
  },
]

// ============ API 函数 ============

export async function listCategories(type?: CategoryType): Promise<Category[]> {
  await new Promise((r) => setTimeout(r, 300))
  if (type) return MOCK_CATEGORIES.filter((c) => c.type === type)
  return MOCK_CATEGORIES
}

export async function getCategoryProducts(categoryId: string): Promise<ProductItem[]> {
  await new Promise((r) => setTimeout(r, 300))
  return MOCK_PRODUCTS
}

export async function getCategoryReports(categoryId: string): Promise<DailyReport[]> {
  await new Promise((r) => setTimeout(r, 300))
  return MOCK_REPORTS
}

export async function getDailyProductCounts(categoryId: string): Promise<Record<string, number>> {
  return {
    '2026-04-14': 28,
    '2026-04-13': 15,
    '2026-04-12': 22,
    '2026-04-11': 18,
    '2026-04-10': 35,
    '2026-04-09': 12,
    '2026-04-08': 8,
    '2026-04-07': 5,
  }
}

// 辅助函数：获取商品日期
export function getProductDate(product: ProductItem): string {
  return product.date || '2026-04-14' // 默认日期，实际应从API获取
}

// 筛选函数：按日期筛选商品
export function filterProductsByDates(products: ProductItem[], dates: string[]): ProductItem[] {
  if (dates.length === 0) return products
  return products.filter(product => dates.includes(getProductDate(product)))
}
