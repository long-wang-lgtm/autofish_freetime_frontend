# 监控商品性能指标优化 — 实施计划

> **对于 agentic workers:** 建议使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 来按任务逐步实施。步骤使用 checkbox (`- [ ]`) 语法进行跟踪。

**目标:** 消费后端 Performance 引擎的 d1/d3/d7 三窗口指标 + hourly_trend，重构监控表格（~17 列漏斗式布局）并新建全维度诊断抽屉（零额外请求）。

**架构:** 数据层先扩展 DTO/ProductItem/sortKey，然后是表格列改造，最后是抽屉组件（自上而下：异常预警 → 窗口对比 → 三图 → 稳定性 → 折叠基础数据）。每一层完成即可独立验证。

**技术栈:** Next.js + React + TypeScript + Tailwind CSS v3 + ECharts + TanStack Query

---

## 文件结构总览

| 文件 | 操作 | 职责 |
|------|------|------|
| `lib/api/selection.ts` | 修改 | 新增 DTO 类型、扩展 ProductItem、修正 API 响应、扩展 sortKey |
| `components/selection/product/ProductMonitorTab.tsx` | 修改 | 重构 COLUMNS（~17 列）、重写 renderCell |
| `components/selection/product/MiniTrendChart.tsx` | 修改 | 数据源改为 `hourly_trend.cumulative_want` |
| `components/selection/product/ProductHistoryDrawer.tsx` | 删除/替换 | 被 ProductDiagnosticDrawer 替代 |
| `components/selection/product/ProductDiagnosticDrawer.tsx` | **新建** | 抽屉主容器 |
| `components/selection/product/AnomalyBanner.tsx` | **新建** | Part 0: 异常预警横幅 |
| `components/selection/product/WindowCompareCards.tsx` | **新建** | Part 1: 三窗口比率对比 + 规模参考 + 增长信号 |
| `components/selection/product/CumulativeGrowthChart.tsx` | **新建** | Part 2A: 累计增长图 (ECharts) |
| `components/selection/product/IntentConversionChart.tsx` | **新建** | Part 2B: 买卖意愿图 (ECharts) |
| `components/selection/product/TrafficActionChart.tsx` | **新建** | Part 2C: 流量转化匹配图 (ECharts) |
| `components/selection/product/StabilityPanel.tsx` | **新建** | Part 3: 稳定性诊断 (CV + μ + σ) |
| `components/selection/product/GrowthPricePanel.tsx` | **新建** | Part 4: 基础数据折叠区 |
| `components/selection/product/hourlyTrendUtils.ts` | **新建** | 工具函数：列式→行式转置、CV/μ/σ 计算、异常检测 |

---

## 阶段一：数据层改造

### Task 1: 新增 DTO 类型

**文件:**
- 修改: `lib/api/selection.ts`（在 `MonitoredItemDTO` 定义前插入新类型）

- [ ] **Step 1: 在 selection.ts 中新增 WindowMetricsDTO、TrendDirectionDTO、HourlyTrendDTO、MonitoredItemFetchLogDTO**

在 `MonitoredItemDTO` 接口定义之前（约第 206 行前），插入以下代码：

```typescript
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
```

- [ ] **Step 2: 扩展 MonitoredItemDTO，新增 windows_metrics、trend_direction、hourly_trend**

将现有 `MonitoredItemDTO` 接口（约第 208-236 行）修改为：

```typescript
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
  windows_metrics?: {
    d1: WindowMetricsDTO
    d3: WindowMetricsDTO
    d7: WindowMetricsDTO
  } | null
  /** 趋势方向 */
  trend_direction?: TrendDirectionDTO | null
  /** 小时级趋势时序数据 */
  hourly_trend?: HourlyTrendDTO | null
}
```

- [ ] **Step 3: 修正 API 响应类型 — listMonitorItems 返回 `{ items, lastFetchLogs }`**

修改 `MonitorItemListResponse` 接口和 `listMonitorItems` 函数签名：

```typescript
/** 监控商品列表响应 — 对应后端 GET /api/topic/monitor/items 实际返回 */
interface MonitorItemListResponse {
  items: MonitoredItemDTO[]
  lastFetchLogs: MonitoredItemFetchLogDTO[]
}

/** 列出监控商品 — GET /api/topic/monitor/items */
export async function listMonitorItems(): Promise<MonitorItemListResponse> {
  console.debug('[SelectionAPI] listMonitorItems')
  return selectionFetch<MonitorItemListResponse>('/monitor/items')
}
```

- [ ] **Step 4: 验证编译通过**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

---

### Task 2: 扩展 ProductItem + dtoToProductItem + sortKey

**文件:**
- 修改: `lib/api/selection.ts`（ProductItem 接口、dtoToProductItem 函数、ProductSortKey 类型、getProductSortValue 函数）

- [ ] **Step 1: 扩展 ProductItem 接口，新增 windowsMetrics、trendDirection、hourlyTrend 及衍生字段**

修改 `ProductItem` 接口（约第 14-66 行），在现有字段之后追加：

```typescript
  // ===== 新增：Performance 引擎字段 =====
  /** 三窗口性能指标（后端直传） */
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO } | null
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
```

- [ ] **Step 2: 重写 dtoToProductItem，接受 lastFetchLog 参数**

将 `dtoToProductItem` 函数签名和实现改为：

```typescript
/** 将 DTO 映射为 ProductItem，一并计算所有衍生字段 */
export function dtoToProductItem(
  item: MonitoredItemDTO,
  lastFetchLog?: MonitoredItemFetchLogDTO
): ProductItem {
  // 价格优先从 lastFetchLog 取（最新采集瞬时价），fallback 到 DTO
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
  const d7DailyWant = d7 != null && d7.total_dwant > 0 ? d7.total_dwant / 7 : null
  const d7DailyLook = d7 != null && d7.total_dlook > 0 ? d7.total_dlook / 7 : null
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
    d7BrowseGrowth,
    acceleration,
    wantStability,
    lookStability,
    collectStability,
    priceTrend,
  }
}
```

- [ ] **Step 3: 扩展 ProductSortKey，新增 d7 系列和 stability 排序键**

修改 `ProductSortKey` 类型（约第 69-86 行）：

```typescript
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
  // 新增
  | 'd7InquiryRate'
  | 'd7FavoriteRate'
  | 'd7IfRatio'
  | 'd7DailyWant'
  | 'd7DailyLook'
  | 'd7BrowseGrowth'
  | 'acceleration'
  | 'wantStability'
  | 'lookStability'
  | 'collectStability'
  | 'priceTrend'
```

- [ ] **Step 4: 扩展 getProductSortValue，处理新 sortKey**

在 `getProductSortValue` 函数的 switch 末尾（`case 'stabilityValue'` 之后，`}` 之前）追加：

```typescript
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
    case 'wantStability':
      return item.wantStability ?? -1
    case 'lookStability':
      return item.lookStability ?? -1
    case 'collectStability':
      return item.collectStability ?? -1
    case 'priceTrend': {
      // up=1, flat=0, down=-1
      if (item.priceTrend === 'up') return 1
      if (item.priceTrend === 'flat') return 0
      if (item.priceTrend === 'down') return -1
      return -1
    }
```

- [ ] **Step 5: 验证编译通过**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 6: 提交**

```bash
git add lib/api/selection.ts
git commit -m "feat: extend data layer with window metrics DTOs, ProductItem fields, and sort keys

- Add WindowMetricsDTO, TrendDirectionDTO, HourlyTrendDTO, MonitoredItemFetchLogDTO
- Extend MonitoredItemDTO with windows_metrics, trend_direction, hourly_trend
- Fix listMonitorItems return type to {items, lastFetchLogs}
- Extend ProductItem with d7 derivative fields and raw performance data
- Update dtoToProductItem to accept lastFetchLog and compute new fields
- Add 11 new ProductSortKey values for window metrics sorting"
```

---

## 阶段二：表格列改造

### Task 3: 重构 ProductMonitorTab 表格列定义 + 单元格渲染

**文件:**
- 修改: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 更新列分组类型和配色**

修改 `ColumnGroup` 类型（约第 70 行）——新增 `daily`、`growth`、`stability`，移除 `time`、`value`：

```typescript
type ColumnGroup = 'identity' | 'core' | 'conversion' | 'daily' | 'growth' | 'stability' | 'trend' | 'meta'

const GROUP_STYLE: Record<ColumnGroup, { bar: string }> = {
  identity:   { bar: '' },
  core:       { bar: 'bg-gradient-to-r from-amber-300 to-amber-400' },
  conversion: { bar: 'bg-gradient-to-r from-sky-300 to-sky-400' },
  daily:      { bar: 'bg-gradient-to-r from-teal-300 to-teal-400' },
  growth:     { bar: 'bg-gradient-to-r from-emerald-300 to-emerald-400' },
  stability:  { bar: 'bg-gradient-to-r from-slate-300 to-slate-400' },
  trend:      { bar: 'bg-gradient-to-r from-rose-300 to-rose-400' },
  meta:       { bar: 'bg-gradient-to-r from-violet-300 to-violet-400' },
}
```

- [ ] **Step 2: 重写 COLUMNS 数组（~17 列，6 组）**

替换现有 `COLUMNS` 数组（约第 93-119 行）：

```typescript
const COLUMNS: ColumnDef[] = [
  // ── 📦 商品标识 (identity) ──
  { key: 'title',             label: '商品信息',       width: 'flex-1 min-w-[160px] max-w-[220px]', group: 'identity',   groupStart: true },
  // ── 📊 核心快照 (core, amber) ──
  { key: 'price',             label: '价格',           width: 'w-[72px] shrink-0',  group: 'core',       groupStart: true,  dataBar: true },
  // ── 📈 转化质量 (conversion, sky) ──
  { key: 'd7IfRatio' as ProductSortKey,       label: '7天询藏比',     width: 'w-[72px] shrink-0',  group: 'conversion', groupStart: true },
  { key: 'd7InquiryRate' as ProductSortKey,   label: '7天询单率',     width: 'w-[72px] shrink-0',  group: 'conversion', groupStart: false },
  { key: 'd7FavoriteRate' as ProductSortKey,  label: '7天收藏率',     width: 'w-[72px] shrink-0',  group: 'conversion', groupStart: false },
  // ── 📐 日均量 (daily, teal) ──
  { key: 'd7DailyWant' as ProductSortKey,     label: '日均想要',      width: 'w-[72px] shrink-0',  group: 'daily',      groupStart: true },
  { key: 'd7DailyLook' as ProductSortKey,     label: '日均浏览',      width: 'w-[72px] shrink-0',  group: 'daily',      groupStart: false },
  // ── 🚀 增长信号 (growth, emerald) ──
  { key: 'd7BrowseGrowth' as ProductSortKey,  label: '7天流量增速',   width: 'w-[84px] shrink-0',  group: 'growth',     groupStart: true },
  { key: 'acceleration' as ProductSortKey,    label: '升温信号',      width: 'w-[72px] shrink-0',  group: 'growth',     groupStart: false },
  // ── 📏 稳定性 (stability, slate) ──
  { key: 'wantStability' as ProductSortKey,   label: '想要稳定性',    width: 'w-[78px] shrink-0',  group: 'stability',  groupStart: true },
  { key: 'lookStability' as ProductSortKey,   label: '浏览稳定性',    width: 'w-[78px] shrink-0',  group: 'stability',  groupStart: false },
  { key: 'collectStability' as ProductSortKey, label: '收藏稳定性',   width: 'w-[78px] shrink-0',  group: 'stability',  groupStart: false },
  // ── 🧭 趋势信号 (trend, rose) ──
  { key: 'trendChart' as any,                 label: '近期趋势',      width: 'w-[100px] shrink-0', group: 'trend',      groupStart: true },
  // ── 🏷️ 元数据 (meta, violet) ──
  { key: 'keywords',          label: '关键词',         width: 'w-[110px] shrink-0', group: 'meta',       groupStart: true },
  { key: 'priority',          label: '优先级',         width: 'w-[56px] shrink-0',  group: 'meta',       groupStart: false },
  { key: 'monitorStatus',     label: '监控状态',       width: 'w-[72px] shrink-0',  group: 'meta',       groupStart: false },
  { key: 'priceTrend' as ProductSortKey,     label: '价格动向',      width: 'w-[72px] shrink-0',  group: 'meta',       groupStart: false },
]
```

- [ ] **Step 3: 更新 format 工具函数**

替换 `fmtRatio` 函数，改为接收 `number | null` 且 null 时返回 "-"，并新增 `fmtGrowth`、`fmtAcceleration`：

```typescript
function fmtRatio(ratio: number | null): string {
  if (ratio === null) return '-'
  return ratio.toFixed(2)
}

function fmtGrowth(growth: number | null): string {
  if (growth === null) return '-'
  const pct = (growth * 100).toFixed(1)
  return growth > 0 ? `+${pct}%` : growth < 0 ? `${pct}%` : '0%'
}

function fmtAcceleration(acc: number | null): string {
  if (acc === null) return '-'
  const pct = (acc * 100).toFixed(0)
  if (acc > 0.3) return `加速 +${pct}%`
  if (acc < -0.3) return `降温 ${pct}%`
  return '平稳'
}

function fmtCV(cv: number | null): string {
  if (cv === null) return '-'
  return cv.toFixed(2)
}
```

- [ ] **Step 4: 重写 dtoToProductItem 调用点 — 传入 lastFetchLog**

修改 `products` memo（约第 171 行），以及所有兼容旧接口的调用（`getCategoryProducts` 约第 421-429 行）：

在 `ProductMonitorTab` 中：

```typescript
const products = useMemo(() => {
  if (Array.isArray(items)) {
    // 旧格式兼容：如果 items 是数组（MonitoredItemDTO[]），直接映射
    return items.map(item => dtoToProductItem(item))
  }
  // 新格式：{ items, lastFetchLogs }
  const { items: itemList, lastFetchLogs } = items as MonitorItemListResponse
  const logMap = new Map(lastFetchLogs?.map(l => [l.gid, l]) ?? [])
  return itemList.map(item => dtoToProductItem(item, logMap.get(item.gid)))
}, [items])
```

同时需要导入 `MonitorItemListResponse`：
```typescript
import {
  listMonitorItems,
  removeMonitorItem,
  activateMonitorItem,
  cancelMonitorItem,
  dtoToProductItem,
  getProductSortValue,
  type ProductSortKey,
  type MonitorItemListResponse,
} from '@/lib/api/selection'
```

- [ ] **Step 5: 更新 renderCell — 替换旧列渲染，新增新列渲染**

替换 `renderCell` 函数内的 case 分支。

移除的 case（删除整个 case 块）：`lookCount`、`wantCount`、`wantCollectRatio`（旧询藏比）、`inquiryRate`（旧询单率）、`collectRate`（旧收藏率）、`dailyWant`（旧日均询单）、`daysSincePublish`、`publishedAt`、`estimatedOrders`、`estimatedSales`、`trendValue`（旧趋势指标）、`stabilityValue`（旧稳定性）。

新增的 case（插入到 switch 中）：

```typescript
      // ── 核心快照：价格（保留，但改为从 lastFetchLogs 取）──
      case 'price': {
        const pct = getBarPct(p.price, dataBarMax.price)
        return (
          <span className="relative block w-full text-center px-1">
            <span className="absolute left-0 top-0 bottom-0 rounded-sm bg-gradient-to-r from-amber-200/50 to-amber-100/20" style={{ width: pct }} />
            <span className="relative text-[13px] font-semibold text-gray-900 tabular-nums">{fmtPrice(p.price)}</span>
          </span>
        )
      }

      // ── 转化质量 ──
      case 'd7IfRatio': {
        const val = p.d7IfRatio
        const wm = p.windowsMetrics
        const d1v = wm?.d1?.if_ratio
        const d3v = wm?.d3?.if_ratio
        return (
          <span
            className="text-xs text-gray-700 tabular-nums cursor-help"
            title={val != null && (d1v != null || d3v != null)
              ? `D1: ${d1v?.toFixed(2) ?? '-'}  |  D3: ${d3v?.toFixed(2) ?? '-'}  |  D7: ${val.toFixed(2)}`
              : (val == null ? '收藏数为零，无法计算' : undefined)
            }
          >
            {fmtRatio(val)}
          </span>
        )
      }
      case 'd7InquiryRate':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtPercent(p.d7InquiryRate)}</span>
      case 'd7FavoriteRate':
        return <span className="text-xs text-gray-700 tabular-nums">{fmtPercent(p.d7FavoriteRate)}</span>

      // ── 日均量 ──
      case 'd7DailyWant':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDaily(p.d7DailyWant)}</span>
      case 'd7DailyLook':
        return <span className="text-xs text-gray-600 tabular-nums">{fmtDaily(p.d7DailyLook)}</span>

      // ── 增长信号 ──
      case 'd7BrowseGrowth': {
        const v = p.d7BrowseGrowth
        const color = v == null ? 'text-gray-400' : v > 0 ? 'text-green-600' : v < 0 ? 'text-red-600' : 'text-gray-400'
        return (
          <span className={`text-xs font-semibold tabular-nums ${color}`}>
            {fmtGrowth(v)}
          </span>
        )
      }
      case 'acceleration': {
        const v = p.acceleration
        const color = v == null ? 'text-gray-400'
          : v > 0.3 ? 'text-red-500'
          : v < -0.3 ? 'text-blue-500'
          : 'text-gray-500'
        return (
          <span className={`text-xs font-semibold tabular-nums ${color}`}>
            {fmtAcceleration(v)}
          </span>
        )
      }

      // ── 稳定性（三列）──
      case 'wantStability': {
        const cv = p.wantStability
        return <span className={`text-xs font-semibold tabular-nums ${cvColor(cv)}`}>{fmtCV(cv)}</span>
      }
      case 'lookStability': {
        const cv = p.lookStability
        return <span className={`text-xs font-semibold tabular-nums ${cvColor(cv)}`}>{fmtCV(cv)}</span>
      }
      case 'collectStability': {
        const cv = p.collectStability
        return <span className={`text-xs font-semibold tabular-nums ${cvColor(cv)}`}>{fmtCV(cv)}</span>
      }

      // ── 价格动向 ──
      case 'priceTrend': {
        const pt = p.priceTrend
        if (!pt || pt === 'flat') return <span className="text-xs text-gray-400">→平稳</span>
        if (pt === 'down') return <span className="text-xs font-semibold text-red-600">↓降价</span>
        if (pt === 'up') return <span className="text-xs font-semibold text-green-600">↑提价</span>
        return <span className="text-xs text-gray-400">-</span>
      }
```

在 renderCell 外部（与 getBarPct 同一层级）添加 `cvColor` 工具函数：

```typescript
const cvColor = (cv: number | null): string => {
  if (cv === null) return 'text-gray-400'
  if (cv < 0.5) return 'text-green-600'
  if (cv < 0.8) return 'text-yellow-600'
  if (cv < 1.2) return 'text-orange-600'
  return 'text-red-600'
}
```

- [ ] **Step 6: 更新 dataBarMax — 仅保留 price（移除 lookCount/wantCount）**

```typescript
const dataBarMax = useMemo(() => ({
  price: Math.max(...filtered.map(p => p.price), 1),
}), [filtered])
```

- [ ] **Step 7: 更新默认排序键**

将 `sortKey` 初始值从 `'estimatedSales'` 改为 `'d7DailyWant'`（第 125 行）：

```typescript
const [sortKey, setSortKey] = useState<ProductSortKey>('d7DailyWant')
```

- [ ] **Step 8: 在行渲染中为非在售商品添加置灰样式**

在数据行的 className 中（约第 513-516 行），添加 `itemStatus` 非在售的判断：

```typescript
className={`group flex px-5 py-[12px] items-center transition-all duration-200 cursor-pointer ${
  selectedProductId === p.id
    ? 'bg-blue-50/60 hover:bg-blue-50/70'
    : 'hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent'
} ${p.monitorStatus != null && p.monitorStatus !== 1 ? 'opacity-60' : ''}`}
```

- [ ] **Step 9: 验证编译通过**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 10: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "feat: refactor monitor table columns to ~17-col funnel layout

- Replace 18 old columns with 6-group ~17 column funnel layout
- Add d7 window metric columns: if_ratio, inquiry_rate, favorite_rate
- Add daily average columns: d7DailyWant, d7DailyLook
- Add growth signals: d7BrowseGrowth, acceleration (heating signal)
- Add three-dimensional stability: want/look/collect_stability
- Add priceTrend badge, keyword/metadata columns
- Remove old cumulative value columns, old derived fields
- Grey out non-active item rows"
```

---

### Task 4: 更新 MiniTrendChart 数据源

**文件:**
- 修改: `components/selection/product/MiniTrendChart.tsx`

- [ ] **Step 1: 扩展 Props 接口**

```typescript
interface MiniTrendChartProps {
  /** 折线数据点（cumulative_want 最近 N 点或其他数值数组） */
  data: number[]
  /** 趋势方向，决定折线颜色 */
  trend: 'up' | 'down' | 'flat'
  /** 最近一次采集时间（ISO 8601），供 tooltip */
  lastCollectedAt: string | null
}
```

（接口保持不变，因为 `data` 已经是 `number[]`，数据源切换在 `ProductMonitorTab.tsx` 调用侧完成。）

- [ ] **Step 2: 在 ProductMonitorTab 中更新 MiniTrendChart 调用**

修改 `trendChart` case（在 Task 3 Step 5 的 renderCell 中）：

```typescript
case 'trendChart': {
  const trendData = p.hourlyTrend?.cumulative_want?.slice(-10) ?? p.recentInquiries
  const trendDir = p.trendDirection?.want_slope as 'up' | 'down' | 'flat' | undefined
    ?? p.trend
  return (
    <MiniTrendChart
      data={trendData}
      trend={trendDir}
      lastCollectedAt={p.lastCollectedAt}
    />
  )
}
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
git add components/selection/product/MiniTrendChart.tsx components/selection/product/ProductMonitorTab.tsx
git commit -m "feat: switch MiniTrendChart data source to hourly_trend.cumulative_want"
```

---

## 阶段三：工具函数

### Task 5: 新建 hourlyTrendUtils.ts 工具模块

**文件:**
- 新建: `components/selection/product/hourlyTrendUtils.ts`

- [ ] **Step 1: 创建文件并实现全部工具函数**

```typescript
import type { HourlyTrendDTO, WindowMetricsDTO } from '@/lib/api/selection'

// ===== 数据格式转换 =====

/** ECharts dataset 行式格式 */
export interface EChartsDataset {
  dimensions: string[]
  source: (number | string | null)[][]
}

/**
 * 将后端列式 hourly_trend 转置为 ECharts dataset 行式格式。
 * 输入: { ts:[t1,t2,...], hourly_want_rate:[v1,v2,...], ... }
 * 输出: { dimensions: ['ts','hourly_want_rate',...], source: [[t1,v1,...], [t2,v2,...], ...] }
 */
export function transposeHourlyTrendToDataset(
  ht: HourlyTrendDTO,
  fields: string[]
): EChartsDataset {
  const keys = Object.keys(ht) as (keyof HourlyTrendDTO)[]
  const includedFields = fields.filter(f => keys.includes(f) && Array.isArray((ht as any)[f]))

  const source = (ht.ts || []).map((ts, i) => {
    return [ts, ...includedFields.map(f => (ht as any)[f]?.[i] ?? null)]
  })

  return {
    dimensions: ['ts', ...includedFields],
    source,
  }
}

// ===== 稳定性计算 =====

export interface StabilityStats {
  cv: number | null
  mean: number | null
  stddev: number | null
  n: number
}

/**
 * 从数组计算 CV（变异系数）、均值、标准差。
 * 非零均值时 CV = σ / |μ|，零均值或无数据时返回 null。
 */
export function computeStability(values: number[]): StabilityStats {
  const n = values.length
  if (n === 0) return { cv: null, mean: null, stddev: null, n: 0 }

  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
  const stddev = Math.sqrt(variance)
  const cv = mean !== 0 ? stddev / Math.abs(mean) : null

  return { cv, mean, stddev, n }
}

/**
 * 从 hourly_trend 指定字段取最近 N 个数据点计算稳定性。
 * 确保 CV = σ/|μ| 数学一致性（三项均在同一个数组上计算）。
 */
export function computeStabilityFromTrend(
  ht: HourlyTrendDTO | null | undefined,
  field: 'hourly_want_rate' | 'hourly_look_rate' | 'hourly_collect_rate',
  windowPoints: number = 168 // 默认近 7 天 = 168 小时
): StabilityStats {
  if (!ht) return { cv: null, mean: null, stddev: null, n: 0 }
  const arr = ht[field]
  if (!arr || arr.length === 0) return { cv: null, mean: null, stddev: null, n: 0 }

  const recent = arr.slice(-windowPoints)
  return computeStability(recent)
}

// ===== 异常检测 =====

export interface AnomalyAlert {
  type: string
  severity: 'red' | 'orange' | 'yellow' | 'green' | 'gray'
  message: string
}

/**
 * 根据设计文档 3.2 节规则，生成异常预警列表。
 * 多条可同时触发，按严重度排序。
 */
export function detectAnomalies(
  wm: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO } | null,
  hourlyTrend: HourlyTrendDTO | null
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = []
  if (!wm) return alerts

  const { d1, d7 } = wm

  // 1. 流量剧烈波动 (look_stability d7 ≥ 1.2)
  if (d7.look_stability != null && d7.look_stability >= 1.2) {
    alerts.push({
      type: 'look_volatile',
      severity: 'red',
      message: `🚨 流量剧烈波动 (CV=${d7.look_stability.toFixed(2)})，可能存在断崖或突增`,
    })
  }
  // 2. 流量明显波动 (0.8 ≤ look_stability < 1.2)
  else if (d7.look_stability != null && d7.look_stability >= 0.8) {
    alerts.push({
      type: 'look_unstable',
      severity: 'orange',
      message: `⚠️ 流量波动较大 (CV=${d7.look_stability.toFixed(2)})`,
    })
  }

  // 3. 需求剧烈波动 (want_stability d7 ≥ 1.2)
  if (d7.want_stability != null && d7.want_stability >= 1.2) {
    alerts.push({
      type: 'want_volatile',
      severity: 'red',
      message: `🚨 需求剧烈波动 (CV=${d7.want_stability.toFixed(2)})`,
    })
  }
  // 4. 需求明显波动 (0.8 ≤ want_stability < 1.2)
  else if (d7.want_stability != null && d7.want_stability >= 0.8) {
    alerts.push({
      type: 'want_unstable',
      severity: 'orange',
      message: `⚠️ 需求波动较大 (CV=${d7.want_stability.toFixed(2)})`,
    })
  }

  // 5. 收藏率悬崖 (d1_favorite_rate < d7_favorite_rate × 0.5)
  if (
    d1.favorite_rate != null &&
    d7.favorite_rate != null &&
    d7.favorite_rate > 0 &&
    d1.favorite_rate < d7.favorite_rate * 0.5
  ) {
    alerts.push({
      type: 'favorite_cliff',
      severity: 'orange',
      message: `⚠️ 近期收藏意愿骤降 (D7=${(d7.favorite_rate * 100).toFixed(1)}% → D1=${(d1.favorite_rate * 100).toFixed(1)}%)，可能竞品上架或平台调权`,
    })
  }

  // 6. 浏览负增长 (d7 browse_growth < -0.10)
  if (d7.browse_growth != null && d7.browse_growth < -0.10) {
    alerts.push({
      type: 'browse_decline',
      severity: 'orange',
      message: `⚠️ 7天流量趋势下行 (${(d7.browse_growth * 100).toFixed(1)}%)`,
    })
  }

  // 7. 零询单窗口 (d1 total_dwant === 0 且 quality_label !== 'insufficient')
  if (d1.total_dwant === 0 && d7.quality_label !== 'insufficient') {
    alerts.push({
      type: 'zero_inquiry',
      severity: 'gray',
      message: '❕ 近24小时零询单，商品可能已无活跃度',
    })
  }

  // 8. 极端询藏比 (d7 if_ratio > 5)
  if (d7.if_ratio != null && d7.if_ratio > 5) {
    alerts.push({
      type: 'extreme_if_ratio',
      severity: 'gray',
      message: `❕ 询藏比极高 (${d7.if_ratio.toFixed(1)})，用户大量咨询但极少收藏`,
    })
  }

  // 9. 降价信号 (price_trend === 'down' 且降幅 > 3%)
  if (d7.price_trend === 'down' && d7.price_lowest_ratio != null && d7.price_lowest_ratio < 0.97) {
    const pct = ((1 - d7.price_lowest_ratio) * 100).toFixed(1)
    alerts.push({
      type: 'price_drop',
      severity: 'yellow',
      message: `⚠️ 近期降价 ${pct}%，询单率如有回升则为有效降价`,
    })
  }

  // 10. 提价信号 (price_trend === 'up' 且涨幅 > 3%)
  if (d7.price_trend === 'up' && d7.price_lowest_ratio != null && d7.price_lowest_ratio > 1.03) {
    const pct = ((d7.price_lowest_ratio - 1) * 100).toFixed(1)
    alerts.push({
      type: 'price_rise',
      severity: 'green',
      message: `💹 近期提价 ${pct}%，如需求未降则卖家有定价权`,
    })
  }

  // 11. 数据不足 (quality_label === 'insufficient')
  if (d7.quality_label === 'insufficient') {
    alerts.push({
      type: 'insufficient_data',
      severity: 'gray',
      message: `❓ 采集次数不足 (${d7.fetch_count}次)，当前指标仅供参考`,
    })
  }

  return alerts
}

// ===== 趋势判断 =====

/**
 * 三值趋势标签（启发式，非统计显著）。
 * 基于 D1/D3/D7 三窗口单调性，返回趋势类型和说明。
 */
export function judgeThreeWindowTrend(
  d1: number | null,
  d3: number | null,
  d7: number | null
): { label: string; direction: 'up' | 'down' | 'v' | 'peak' | 'mixed' } {
  if (d1 == null || d3 == null || d7 == null) {
    return { label: '数据不足', direction: 'mixed' }
  }
  if (d1 > d3 && d3 > d7) return { label: '持续下行', direction: 'down' }
  if (d1 < d3 && d3 < d7) return { label: '持续上行', direction: 'up' }
  if (d3 < d1 && d3 < d7) return { label: '触底反弹', direction: 'v' }
  if (d3 > d1 && d3 > d7) return { label: '见顶回落', direction: 'peak' }
  return { label: '无明显趋势', direction: 'mixed' }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/selection/product/hourlyTrendUtils.ts
git commit -m "feat: add hourlyTrendUtils — transpose, stability, anomaly detection, trend judgment"
```

---

## 阶段四：抽屉组件

### Task 6: 新建 AnomalyBanner 组件

**文件:**
- 新建: `components/selection/product/AnomalyBanner.tsx`

- [ ] **Step 1: 创建组件**

```typescript
'use client'

import type { AnomalyAlert } from '@/components/selection/product/hourlyTrendUtils'
import { AlertTriangle, AlertCircle, TrendingDown, TrendingUp, Info } from 'lucide-react'

interface AnomalyBannerProps {
  alerts: AnomalyAlert[]
}

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  red:    { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-600' },
}

export function AnomalyBanner({ alerts }: AnomalyBannerProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
        异常预警
      </div>
      {alerts.map((a, i) => {
        const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.gray
        return (
          <div
            key={`${a.type}-${i}`}
            className={`${style.bg} ${style.border} border rounded-lg px-3 py-2 ${style.text} text-xs`}
          >
            {a.message}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -10
```

---

### Task 7: 新建 WindowCompareCards 组件（Part 1）

**文件:**
- 新建: `components/selection/product/WindowCompareCards.tsx`

- [ ] **Step 1: 创建组件**

```typescript
'use client'

import type { WindowMetricsDTO } from '@/lib/api/selection'
import { judgeThreeWindowTrend } from '@/components/selection/product/hourlyTrendUtils'
import { Info } from 'lucide-react'

interface WindowCompareCardsProps {
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO }
  /** d7 日均浏览 */
  d7DailyLook: number | null
  /** d7 日均想要 */
  d7DailyWant: number | null
  /** d7 流量增速 */
  d7BrowseGrowth: number | null
  /** 升温信号 (d1/d7 inquiry_rate - 1) */
  acceleration: number | null
  /** 窗口占比 (d1_total_dwant / d7_total_dwant) */
  windowShare: number | null
  /** d7 价格动向 */
  priceTrend: string | null
}

function pct(v: number | null): string {
  if (v == null) return '-'
  return `${(v * 100).toFixed(1)}%`
}

function fmtNum(v: number | null): string {
  if (v == null) return '-'
  return v.toFixed(2)
}

export function WindowCompareCards({
  windowsMetrics: wm,
  d7DailyLook,
  d7DailyWant,
  d7BrowseGrowth,
  acceleration,
  windowShare,
  priceTrend,
}: WindowCompareCardsProps) {
  const { d1, d3, d7 } = wm

  const inquiryTrend = judgeThreeWindowTrend(d1.inquiry_rate, d3.inquiry_rate, d7.inquiry_rate)
  const favoriteTrend = judgeThreeWindowTrend(d1.favorite_rate, d3.favorite_rate, d7.favorite_rate)
  const ifTrend = judgeThreeWindowTrend(d1.if_ratio, d3.if_ratio, d7.if_ratio)

  const trendColor = (d: string) =>
    d === 'up' ? 'text-green-600' :
    d === 'down' ? 'text-red-600' :
    d === 'peak' ? 'text-orange-600' :
    d === 'v' ? 'text-blue-600' : 'text-gray-400'

  return (
    <div className="space-y-3">
      {/* 第一行：三窗口比率对比卡片 */}
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
        核心指标
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['d1', 'd3', 'd7'] as const).map(win => {
          const w = wm[win]
          return (
            <div key={win} className="bg-gray-50 rounded-lg p-2.5 text-center space-y-1">
              <div className="text-[10px] font-semibold text-gray-500 uppercase">
                {win === 'd1' ? 'D1 窗口' : win === 'd3' ? 'D3 窗口' : 'D7 窗口'}
              </div>
              <div className="text-[11px] text-gray-700 space-y-0.5">
                <div>询单 <span className="font-semibold">{pct(w.inquiry_rate)}</span></div>
                <div>收藏 <span className="font-semibold">{pct(w.favorite_rate)}</span></div>
                <div>询藏 <span className="font-semibold">{fmtNum(w.if_ratio)}</span></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 趋势标签行 */}
      <div className="flex gap-2 text-[10px]">
        <span className={trendColor(inquiryTrend.direction)}>
          询单率 · {inquiryTrend.label}
        </span>
        <span className={trendColor(favoriteTrend.direction)}>
          收藏率 · {favoriteTrend.label}
        </span>
        <span className={trendColor(ifTrend.direction)}>
          询藏比 · {ifTrend.label}
        </span>
        <span className="text-gray-300 inline-flex items-center cursor-help" title="基于三窗口单调性，仅供参考">
          <Info className="w-2.5 h-2.5" />
        </span>
      </div>

      {/* 第二行：规模参考 */}
      <div className="text-[10px] text-gray-500 px-1">
        规模参考: 7天日均浏览 <span className="font-semibold text-gray-700">{d7DailyLook?.toFixed(0) ?? '-'}/天</span>
        {' · '}
        日均想要 <span className="font-semibold text-gray-700">{d7DailyWant?.toFixed(0) ?? '-'}/天</span>
      </div>

      {/* 第三行：增长信号 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 px-1">
        <span>
          流量增速{' '}
          <span className={`font-semibold ${
            d7BrowseGrowth == null ? 'text-gray-400' :
            d7BrowseGrowth > 0 ? 'text-green-600' : d7BrowseGrowth < 0 ? 'text-red-600' : 'text-gray-400'
          }`}>
            {d7BrowseGrowth != null ? `${(d7BrowseGrowth * 100).toFixed(1)}%` : '-'}
            {d7BrowseGrowth != null && d7BrowseGrowth > 0 ? ' ↗' : d7BrowseGrowth != null && d7BrowseGrowth < 0 ? ' ↘' : ''}
          </span>
        </span>
        <span>
          升温{' '}
          <span className={`font-semibold ${
            acceleration == null ? 'text-gray-400' :
            acceleration > 0.3 ? 'text-red-500' : acceleration < -0.3 ? 'text-blue-500' : 'text-gray-500'
          }`}>
            {acceleration != null ? `${(acceleration * 100).toFixed(0)}%` : '-'}
            {acceleration != null && acceleration > 0.3 ? ' 🔥' : ''}
          </span>
        </span>
        <span>
          窗口占比{' '}
          <span className="font-semibold text-gray-700">
            {windowShare != null ? `${(windowShare * 100).toFixed(0)}%` : '-'}
          </span>
        </span>
        <span>
          价格{' '}
          <span className={`font-semibold ${
            priceTrend === 'down' ? 'text-red-600' :
            priceTrend === 'up' ? 'text-green-600' : 'text-gray-400'
          }`}>
            {priceTrend === 'down' ? '↓降价' :
             priceTrend === 'up' ? '↑提价' : '→平稳'}
          </span>
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -10
```

---

### Task 8: 新建三个 ECharts 图表组件（Part 2A/2B/2C）

**文件:**
- 新建: `components/selection/product/CumulativeGrowthChart.tsx`
- 新建: `components/selection/product/IntentConversionChart.tsx`
- 新建: `components/selection/product/TrafficActionChart.tsx`

- [ ] **Step 1: 创建 CumulativeGrowthChart（累计增长图）**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'
import { transposeHourlyTrendToDataset } from '@/components/selection/product/hourlyTrendUtils'

interface CumulativeGrowthChartProps {
  hourlyTrend: HourlyTrendDTO
  /** d7 窗口总增量，用于计算 Y 轴基线 */
  d7TotalWant: number
  d7TotalLook: number
  d7TotalCollect: number
}

export function CumulativeGrowthChart({
  hourlyTrend: ht,
  d7TotalWant,
  d7TotalLook,
  d7TotalCollect,
}: CumulativeGrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }

    // Y 轴基线设为窗口起始值 = cumulative[-1] - d7_total
    const baseWant = (ht.cumulative_want[ht.cumulative_want.length - 1] ?? 0) - d7TotalWant
    const baseLook = (ht.cumulative_look[ht.cumulative_look.length - 1] ?? 0) - d7TotalLook
    const baseCollect = (ht.cumulative_collect[ht.cumulative_collect.length - 1] ?? 0) - d7TotalCollect

    const incrementalWant = ht.cumulative_want.map(v => v - baseWant)
    const incrementalLook = ht.cumulative_look.map(v => v - baseLook)
    const incrementalCollect = ht.cumulative_collect.map(v => v - baseCollect)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const time = params[0].axisValue
          let html = `<div class="text-xs">${time}</div>`
          params.forEach((p: any) => {
            if (p.value != null) {
              html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${p.value}</b></div>`
            }
          })
          return html
        },
      },
      legend: {
        data: ['累计想要', '累计浏览', '累计收藏'],
        bottom: 0,
        textStyle: { fontSize: 10, color: '#6b7280' },
      },
      grid: { left: 48, right: 16, top: 20, bottom: 32 },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '窗口期内增量',
        nameTextStyle: { fontSize: 10, color: '#9ca3af' },
        axisLabel: { fontSize: 10, color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        {
          name: '累计想要',
          type: 'line',
          data: incrementalWant,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
        },
        {
          name: '累计浏览',
          type: 'line',
          data: incrementalLook,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#059669', width: 1.5 },
        },
        {
          name: '累计收藏',
          type: 'line',
          data: incrementalCollect,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#d97706', width: 1.5 },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [ht, d7TotalWant, d7TotalLook, d7TotalCollect])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        暂无数据
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-56" />
}
```

- [ ] **Step 2: 创建 IntentConversionChart（买卖意愿图）**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface IntentConversionChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function IntentConversionChart({ hourlyTrend: ht }: IntentConversionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
    })

    // 收藏率 = hourly_collect_rate / hourly_look_rate（分母为零跳过）
    const collectRates = ht.hourly_collect_rate.map((v, i) =>
      ht.hourly_look_rate[i] > 0 ? v / ht.hourly_look_rate[i] : null
    )
    // 询单率 = hourly_want_rate / hourly_look_rate
    const inquiryRates = ht.hourly_want_rate.map((v, i) =>
      ht.hourly_look_rate[i] > 0 ? v / ht.hourly_look_rate[i] : null
    )
    // 询藏比 = hourly_want_rate / hourly_collect_rate
    const ifRatios = ht.hourly_want_rate.map((v, i) =>
      ht.hourly_collect_rate[i] > 0 ? v / ht.hourly_collect_rate[i] : null
    )

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const time = params[0].axisValue
          let html = `<div class="text-xs">${time}</div>`
          params.forEach((p: any) => {
            if (p.value != null) {
              const label = p.seriesName.includes('询藏比') ? '' : '%'
              html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${typeof p.value === 'number' ? p.value.toFixed(1) + label : p.value}</b></div>`
            }
          })
          return html
        },
      },
      legend: {
        data: ['收藏率', '询单率', '询藏比'],
        bottom: 0,
        textStyle: { fontSize: 10, color: '#6b7280' },
      },
      grid: { left: 48, right: 56, top: 20, bottom: 32 },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '%',
          axisLabel: { fontSize: 10, color: '#6b7280', formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '比值',
          axisLabel: { fontSize: 10, color: '#6b7280' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '收藏率',
          type: 'line',
          yAxisIndex: 0,
          data: collectRates.map(v => v != null ? v * 100 : null),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#a855f7', width: 2 },
        },
        {
          name: '询单率',
          type: 'line',
          yAxisIndex: 0,
          data: inquiryRates.map(v => v != null ? v * 100 : null),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
        },
        {
          name: '询藏比',
          type: 'line',
          yAxisIndex: 1,
          data: ifRatios,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', width: 1.5, type: 'dashed' },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [ht])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        暂无数据
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-56" />
}
```

- [ ] **Step 3: 创建 TrafficActionChart（流量转化匹配图）**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface TrafficActionChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function TrafficActionChart({ hourlyTrend: ht }: TrafficActionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
    })

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const time = params[0].axisValue
          let html = `<div class="text-xs">${time}</div>`
          params.forEach((p: any) => {
            if (p.value != null) {
              html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</b></div>`
            }
          })
          return html
        },
      },
      legend: {
        data: ['浏览流量', '想要需求'],
        bottom: 0,
        textStyle: { fontSize: 10, color: '#6b7280' },
      },
      grid: { left: 48, right: 56, top: 20, bottom: 32 },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '浏览/小时',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '想要/小时',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '浏览流量',
          type: 'line',
          yAxisIndex: 0,
          data: ht.hourly_look_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', width: 0 },
          areaStyle: { color: 'rgba(156, 163, 175, 0.15)' },
        },
        {
          name: '想要需求',
          type: 'line',
          yAxisIndex: 1,
          data: ht.hourly_want_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [ht])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        暂无数据
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-56" />
}
```

- [ ] **Step 4: 验证三个图表组件编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: 提交**

```bash
git add components/selection/product/CumulativeGrowthChart.tsx components/selection/product/IntentConversionChart.tsx components/selection/product/TrafficActionChart.tsx
git commit -m "feat: add three ECharts diagnostic charts for drawer

- CumulativeGrowthChart: incremental cumulative want/look/collect with baseline offset
- IntentConversionChart: dual-axis collect_rate + inquiry_rate (line) + if_ratio (dashed)
- TrafficActionChart: look_rate area + want_rate line, flow-to-action matching"
```

---

### Task 9: 新建 StabilityPanel 组件（Part 3）

**文件:**
- 新建: `components/selection/product/StabilityPanel.tsx`

- [ ] **Step 1: 创建组件**

```typescript
'use client'

import type { HourlyTrendDTO } from '@/lib/api/selection'
import { computeStabilityFromTrend } from '@/components/selection/product/hourlyTrendUtils'

interface StabilityPanelProps {
  hourlyTrend: HourlyTrendDTO | null
}

function cvColor(cv: number | null): string {
  if (cv === null) return 'text-gray-400'
  if (cv < 0.5) return 'text-green-600'
  if (cv < 0.8) return 'text-yellow-600'
  if (cv < 1.2) return 'text-orange-600'
  return 'text-red-600'
}

export function StabilityPanel({ hourlyTrend }: StabilityPanelProps) {
  const wantStats = computeStabilityFromTrend(hourlyTrend, 'hourly_want_rate')
  const lookStats = computeStabilityFromTrend(hourlyTrend, 'hourly_look_rate')
  const collectStats = computeStabilityFromTrend(hourlyTrend, 'hourly_collect_rate')

  const items = [
    { label: '想要稳定性', stats: wantStats, field: 'hourly_want_rate' as const },
    { label: '浏览稳定性', stats: lookStats, field: 'hourly_look_rate' as const },
    { label: '收藏稳定性', stats: collectStats, field: 'hourly_collect_rate' as const },
  ]

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
        稳定性诊断
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ label, stats }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3 text-center space-y-1">
            <div className="text-[10px] text-gray-500">{label}</div>
            <div className={`text-lg font-bold tabular-nums ${cvColor(stats.cv)}`}>
              {stats.cv != null ? stats.cv.toFixed(2) : '-'}
            </div>
            <div className="text-[10px] text-gray-400 space-y-0.5">
              <div>μ {stats.mean?.toFixed(2) ?? '-'}/h</div>
              <div>σ {stats.stddev?.toFixed(2) ?? '-'}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-gray-400 text-right">
        基于窗口内 {wantStats.n} 个数据点
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -10
```

---

### Task 10: 新建 GrowthPricePanel 组件（Part 4 — 折叠区）

**文件:**
- 新建: `components/selection/product/GrowthPricePanel.tsx`

- [ ] **Step 1: 创建组件**

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ProductItem } from '@/lib/api/selection'

interface GrowthPricePanelProps {
  product: ProductItem | null
}

function fmtPrice(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

function fmtCount(v: number): string {
  return v.toLocaleString('zh-CN')
}

export function GrowthPricePanel({ product }: GrowthPricePanelProps) {
  const [open, setOpen] = useState(false)

  if (!product) return null

  const wm = product.windowsMetrics
  const d7 = wm?.d7

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span>基础数据</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronRight className="w-3.5 h-3.5" />
        }
      </button>

      {open && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <Row label="价格" value={fmtPrice(product.price)} />
          <Row label="累计浏览" value={fmtCount(product.lookCount)} />
          <Row label="累计想要" value={fmtCount(product.wantCount)} />
          <Row label="商品状态" value={
            product.monitorStatus != null
              ? { 0: '在售', 1: '在售', 2: '已售', 3: '已发布' }[product.monitorStatus] ?? '-'
              : '-'
          } />
          <Row label="7天浏览增速" value={
            d7?.browse_growth != null ? `${(d7.browse_growth * 100).toFixed(1)}%` : '-'
          } />
          <Row label="7天询单增量" value={d7?.total_dwant != null ? String(d7.total_dwant) : '-'} />
          <Row label="7天浏览增量" value={d7?.total_dlook != null ? String(d7.total_dlook) : '-'} />
          <Row label="7天收藏增量" value={d7?.total_dcollect != null ? String(d7.total_dcollect) : '-'} />
          <Row label="全局日均询单" value={product.dailyWant?.toFixed(1) ?? '-'} />
          <Row label="上架天数" value={product.daysSincePublish?.toFixed(0) ?? '-'} />
          <Row label="上架时间" value={
            product.publishedAt
              ? new Date(product.publishedAt).toISOString().split('T')[0]
              : '-'
          } />
          <Row label="预估订单" value={product.estimatedOrders?.toFixed(0) ?? '-'} />
          <Row label="预估销售额" value={product.estimatedSales != null ? fmtPrice(product.estimatedSales) : '-'} />
          <Row label="价格趋势" value={
            d7?.price_trend === 'up' ? '↑ 提价' :
            d7?.price_trend === 'down' ? '↓ 降价' :
            d7?.price_trend === 'flat' ? '→ 平稳' : '-'
          } />
          <Row label="最低价比" value={d7?.price_lowest_ratio?.toFixed(2) ?? '-'} />
          <Row label="采集次数" value={d7?.fetch_count?.toString() ?? '-'} />
          <Row label="质量" value={
            d7?.quality_label === 'reliable' ? '可靠' :
            d7?.quality_label === 'limited' ? '有限' :
            d7?.quality_label === 'insufficient' ? '不足' : '-'
          } />
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 tabular-nums">{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -10
```

---

### Task 11: 新建 ProductDiagnosticDrawer 主容器

**文件:**
- 新建: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: 创建主抽屉组件**

```typescript
'use client'

import { useMemo } from 'react'
import { Sheet, BottomSheet } from '@/components/ui/Sheet'
import type { ProductItem } from '@/lib/api/selection'
import { detectAnomalies } from '@/components/selection/product/hourlyTrendUtils'
import { AnomalyBanner } from '@/components/selection/product/AnomalyBanner'
import { WindowCompareCards } from '@/components/selection/product/WindowCompareCards'
import { CumulativeGrowthChart } from '@/components/selection/product/CumulativeGrowthChart'
import { IntentConversionChart } from '@/components/selection/product/IntentConversionChart'
import { TrafficActionChart } from '@/components/selection/product/TrafficActionChart'
import { StabilityPanel } from '@/components/selection/product/StabilityPanel'
import { GrowthPricePanel } from '@/components/selection/product/GrowthPricePanel'

interface ProductDiagnosticDrawerProps {
  product: ProductItem | null
  onClose: () => void
}

export function ProductDiagnosticDrawer({ product, onClose }: ProductDiagnosticDrawerProps) {
  const open = !!product

  const alerts = useMemo(() => {
    if (!product) return []
    return detectAnomalies(product.windowsMetrics, product.hourlyTrend)
  }, [product])

  const wm = product?.windowsMetrics
  const ht = product?.hourlyTrend
  const hasData = wm != null
  const hasEnoughTrendPoints = ht && ht.ts && ht.ts.length >= 3

  // 窗口占比：d1_total_dwant / d7_total_dwant
  const windowShare = wm && wm.d7.total_dwant > 0
    ? wm.d1.total_dwant / wm.d7.total_dwant
    : null

  // 升温信号
  let acceleration: number | null = null
  if (wm?.d1?.inquiry_rate != null && wm?.d7?.inquiry_rate != null && wm.d7.inquiry_rate > 0) {
    acceleration = wm.d1.inquiry_rate / wm.d7.inquiry_rate - 1
  }

  const title = product ? `${product.description || product.title || '商品'} / ${product.id}` : ''

  const content = (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header 元数据 */}
      {product && (
        <div className="space-y-1.5">
          <div className="text-xs text-gray-500 font-mono">
            GID: {product.id}
            {' · '}
            状态: {product.monitorStatus != null
              ? { 0: '已暂停', 1: '监控中', 2: '已分析', 3: '已发布' }[product.monitorStatus] ?? '-'
              : '-'}
            {' · '}
            优先级: {product.priority ?? '-'}
          </div>
          {product.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.keywords.map(kw => (
                <span key={kw} className="text-[10px] text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                  {kw}
                </span>
              ))}
            </div>
          )}
          {product.monitorStatus != null && product.monitorStatus !== 1 && (
            <span className="inline-block text-[10px] font-medium text-red-600 bg-red-50 rounded px-2 py-0.5">
              {product.monitorStatus === 2 ? '已售' : product.monitorStatus === 0 ? '已暂停' : '非在售'}
            </span>
          )}
        </div>
      )}

      {/* Part 0: 异常预警 */}
      <AnomalyBanner alerts={alerts} />

      {!hasData ? (
        /* windows_metrics 为 null：占位提示 */
        <div className="flex items-center justify-center py-16 text-sm text-gray-400 text-center">
          该商品指标尚未生成<br />请等待更多采集数据
        </div>
      ) : (
        <>
          {/* Part 1: 核心指标 */}
          <WindowCompareCards
            windowsMetrics={wm}
            d7DailyLook={product.d7DailyLook}
            d7DailyWant={product.d7DailyWant}
            d7BrowseGrowth={product.d7BrowseGrowth}
            acceleration={acceleration}
            windowShare={windowShare}
            priceTrend={product.priceTrend}
          />

          {/* Part 2: 趋势诊断三图 */}
          {hasEnoughTrendPoints && ht ? (
            <div className="space-y-3">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
                趋势诊断
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1 ml-1">累计增长图 · 窗口期内增量</div>
                <CumulativeGrowthChart
                  hourlyTrend={ht}
                  d7TotalWant={wm.d7.total_dwant}
                  d7TotalLook={wm.d7.total_dlook}
                  d7TotalCollect={wm.d7.total_dcollect}
                />
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1 ml-1">买卖意愿图</div>
                <IntentConversionChart hourlyTrend={ht} />
              </div>

              <div>
                <div className="text-[10px] text-gray-500 mb-1 ml-1">流量转化匹配图</div>
                <TrafficActionChart hourlyTrend={ht} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              数据点不足，至少需要 3 次采集
            </div>
          )}

          {/* Part 3: 稳定性诊断 */}
          <StabilityPanel hourlyTrend={ht ?? null} />

          {/* Part 4: 基础数据（折叠区） */}
          <GrowthPricePanel product={product} />
        </>
      )}
    </div>
  )

  // 移动端使用 BottomSheet，桌面端使用 Sheet
  // 通过 CSS 媒体查询或 JS 检测来判断，此处用简化方案：始终渲染 Sheet + BottomSheet 二选一
  // 实际项目中可用 useMediaQuery hook，这里先用 Sheet（500px 宽）
  return (
    <>
      {/* 桌面端 Sheet（md 及以上） */}
      <div className="hidden md:block">
        <Sheet
          open={open}
          onClose={onClose}
          title={title}
          width="520px"
        >
          {content}
        </Sheet>
      </div>
      {/* 移动端 BottomSheet（md 以下） */}
      <div className="block md:hidden">
        <BottomSheet
          open={open}
          onClose={onClose}
          title={product?.description || product?.title || '商品'}
          subtitle={product ? `GID: ${product.id}` : undefined}
          heightRatio={0.92}
        >
          {content}
        </BottomSheet>
      </div>
    </>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
git add components/selection/product/ProductDiagnosticDrawer.tsx components/selection/product/AnomalyBanner.tsx components/selection/product/WindowCompareCards.tsx components/selection/product/StabilityPanel.tsx components/selection/product/GrowthPricePanel.tsx
git commit -m "feat: add ProductDiagnosticDrawer with full diagnostic view

- Main drawer with Sheet (desktop) + BottomSheet (mobile) responsive layout
- AnomalyBanner: 11 anomaly detection rules with 5 severity levels
- WindowCompareCards: d1/d3/d7 3-window ratio comparison + scale + growth signals
- StabilityPanel: CV + μ + σ from hourly_trend with mathematical consistency
- GrowthPricePanel: collapsible base data section with all legacy table fields"
```

---

## 阶段五：集成替换

### Task 12: 在 ProductMonitorTab 中替换旧抽屉

**文件:**
- 修改: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 替换 import**

将旧 import：
```typescript
import { ProductHistoryDrawer } from '@/components/selection/product/ProductHistoryDrawer'
```
改为：
```typescript
import { ProductDiagnosticDrawer } from '@/components/selection/product/ProductDiagnosticDrawer'
```

- [ ] **Step 2: 替换抽屉渲染**

将 JSX 底部（约第 574-578 行）：
```typescript
<ProductHistoryDrawer
  gid={selectedProductId}
  product={selectedProductId ? filtered.find(p => p.id === selectedProductId) ?? null : null}
  onClose={() => setSelectedProductId(null)}
/>
```
改为：
```typescript
<ProductDiagnosticDrawer
  product={selectedProductId ? filtered.find(p => p.id === selectedProductId) ?? null : null}
  onClose={() => setSelectedProductId(null)}
/>
```

- [ ] **Step 3: 移除 `selectedProductId` 状态中不再需要的代码**（状态本身保留，逻辑不变）

- [ ] **Step 4: 验证编译并启动开发服务器测试**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "feat: replace ProductHistoryDrawer with ProductDiagnosticDrawer"
```

---

## 阶段六：边界处理与验证

### Task 13: 边界情况处理审查

**文件:**
- 审查: 所有新建/修改的文件

逐一检查以下边界情况是否已覆盖：

1. **windows_metrics 为 null**（新商品）
   - ✅ `ProductDiagnosticDrawer` 中 `hasData` 检查 → 显示占位提示
   - ✅ 表格列中，`d7InquiryRate` 等衍生字段为 null → `fmtPercent(null)` 返回 `-`
   - ✅ 行尾删除按钮：现有代码已有 `handleRemove` 在每行

2. **hourly_trend 数据点不足（< 3）**
   - ✅ `ProductDiagnosticDrawer` 中 `hasEnoughTrendPoints` 检查 → 显示占位
   - ✅ `MiniTrendChart` 现有逻辑：`data` 为空时 SVG 不渲染折线

3. **if_ratio 为 null（收藏数为零）**
   - ✅ 表格: `fmtRatio(null)` → `-` + tooltip "收藏数为零，无法计算"
   - ✅ 抽屉: `WindowCompareCards` 中 `fmtNum(null)` → `-`

4. **itemStatus 非在售**
   - ✅ 表格行：Task 3 Step 8 已添加 `opacity-60` 样式
   - ✅ 抽屉：`ProductDiagnosticDrawer` Header 区有状态标签

- [ ] **Step 1: 提交审查通过**

```bash
git add -A
git diff --cached --stat
git commit -m "chore: final boundary case review — all edge cases handled"
```

---

## 自检清单

### 1. Spec 覆盖

| Spec 章节 | 覆盖任务 |
|-----------|---------|
| 1.1 DTO 扩展 | Task 1 Step 1-2 |
| 1.2 ProductItem 扩展 | Task 2 Step 1 |
| 1.3 API 响应适配 | Task 1 Step 3 |
| 1.4 映射管道 | Task 2 Step 2 |
| 2.1 列分组 | Task 3 Step 1-2 |
| 2.2 diff | Task 3 Step 5 |
| 2.3 各列业务规则 | Task 3 Step 5 |
| 2.4 数据来源对照 | Task 3 Step 5（列渲染匹配数据源）|
| 2.5 排序支持 | Task 2 Step 3-4 |
| 3.1 整体布局 | Task 11 |
| 3.2 异常预警 | Task 5（工具函数）+ Task 6（组件）|
| 3.3 Part 1 核心指标 | Task 7 |
| 3.4 Part 2 三图 | Task 8 |
| 3.5 Part 3 稳定性 | Task 9 |
| 3.6 Part 4 基础数据 | Task 10 |
| 3.7 边界情况 | Task 13 |
| 3.8 移动端适配 | Task 11（Sheet + BottomSheet 双组件）|
| 3.9 职责划分 | 整体架构 |
| 4 组件拆分 | Task 6-11 全部覆盖 |

### 2. 占位符扫描
无 TBD/TODO/placeholder。所有函数均有完整实现代码。

### 3. 类型一致性
- `WindowMetricsDTO` / `HourlyTrendDTO` / `TrendDirectionDTO` 在 DTO 层和组件层均统一引用
- `ProductSortKey` 新增值与 `getProductSortValue` 新增 case 一一对应
- `ProductDiagnosticDrawer` props 与 `ProductItem` 字段一致
- `computeStabilityFromTrend` 的 `field` 参数与 `HourlyTrendDTO` 字段名一致
