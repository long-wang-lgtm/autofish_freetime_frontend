# 监控商品性能指标优化设计

> 日期：2026-06-21 | 状态：待审核

## 背景

后端 `Performance` 计算引擎已更新，每个监控商品携带 **三个时间窗口**（d1/d3/d7）共 15 个性能指标，以及趋势方向数据和小时级趋势时序数据。当前前端完全未消费这些数据，仅使用基础的 price/wantCount/lookCount + 简单衍生字段。

### 数据来源

后端 `GET /api/topic/monitor/items` 已全量返回（参考 `simple/monitoritem.json`）：

| 数据块 | 内容 |
|--------|------|
| `windows_metrics` | d1/d3/d7 三窗口，每窗口含 inquiry_rate、favorite_rate、if_ratio、browse_growth、total_dwant/look/collect、price_trend、price_lowest_ratio、want/look/collect_stability、fetch_count、quality_label |
| `trend_direction` | want_slope / look_slope / collect_slope（up/down/flat） |
| `hourly_trend` | ts、hourly_want/look/collect_rate、price、cumulative_want/look/collect（列式结构，ECharts dataset 可直接消费） |

### 设计原则

- **表格做减法，抽屉做加法**：表格只用 d7 窗口做筛选（~15 列），抽屉全维度深度诊断
- **洞察优于数字**：表格展示信号/标签而非裸数据，d1/d3/d7 多列对比仅放在抽屉
- **数据分层**：表格回答"哪个值得关注"，抽屉回答"为什么值得/不值得"
- **异常主动暴露**：稳定性波动、价格变动、流量异常在抽屉中主动高亮

### 核心设计决策：为什么表格不展示 d1/d3/d7 多列？

横向扫读三个窗口数字极其耗时。d7（7天窗口）数据最可靠（样本量最大），
足以满足 80% 的筛选需求。d1/d3/d7 精细化对比留给抽屉的单品诊断场景。

---

## 1. 数据层改造

### 1.1 DTO 扩展

`MonitoredItemDTO`（`lib/api/selection.ts`）需新增字段：

```typescript
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

export interface TrendDirectionDTO {
  want_slope: string | null
  look_slope: string | null
  collect_slope: string | null
}

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

// MonitoredItemDTO 新增
export interface MonitoredItemDTO {
  // ... 现有字段 ...
  windows_metrics?: {
    d1: WindowMetricsDTO
    d3: WindowMetricsDTO
    d7: WindowMetricsDTO
  } | null
  trend_direction?: TrendDirectionDTO | null
  hourly_trend?: HourlyTrendDTO | null
}
```

### 1.2 ProductItem 扩展

```typescript
export interface ProductItem {
  // ... 现有字段保持不变 ...
  /** 窗口指标（后端直传） */
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO } | null
  /** 趋势方向（后端直传） */
  trendDirection: TrendDirectionDTO | null
  /** 小时趋势（后端直传，供抽屉使用） */
  hourlyTrend: HourlyTrendDTO | null
}
```

### 1.3 API 响应适配

`listMonitorItems()` 当前返回 `MonitoredItemDTO[]`，但后端实际返回 `{ items: [...], lastFetchLogs: [...] }`。需修正为：

```typescript
interface MonitorItemListResponse {
  items: MonitoredItemDTO[]
  lastFetchLogs: MonitoredItemFetchLogDTO[]
}

export async function listMonitorItems(): Promise<MonitorItemListResponse>
```

### 1.4 映射管道

`dtoToProductItem` 需扩展以消费 `lastFetchLogs`：

```typescript
export function dtoToProductItem(
  item: MonitoredItemDTO,
  lastFetchLog?: MonitoredItemFetchLogDTO
): ProductItem
```

- `lastFetchLog` 从 `MonitorItemListResponse.lastFetchLogs` 按 gid 匹配传入
- 价格、累计浏览、累计想要、itemStatus 均取自 `lastFetchLog`，不再从 `MonitoredItemDTO` 取
- 原 `MonitoredItemDTO` 的 `price/wantCount/lookCount` 字段在映射后弃用

---

## 2. 表格列设计（~17 列）

表格的唯一目的是**横向对比、快速筛选**。只展示 d7 窗口数据（最可靠），
不展示 d1/d3/d7 多列对比——那应该留给抽屉的单品诊断。

### 2.1 列分组（6 组，~17 列）

```
┌─ 📦 商品标识 (identity) ──────────────────────────────────┐
│ 商品信息 (描述 + GID)                                       │
├─ 📊 核心快照 (core, amber) ───────────────────────────────┤
│ 价格                                                       │
│ 注意：价格取自 lastFetchLogs.price，非 hourly_trend 均价    │
├─ 📈 转化质量 (conversion, sky) ────────────────────────────┤
│ 7天询藏比 ▏ 7天询单率 ▏ 7天收藏率                          │
├─ 📐 日均量 (daily, teal) ─────────────────────────────────┤
│ 日均想要数 ▏ 日均浏览数                                     │
│ 计算：d7 total_dwant / 7、total_dlook / 7                 │
├─ 🚀 增长信号 (growth, emerald) ───────────────────────────┤
│ 7天流量增速 ▏ 升温信号                                     │
├─ 📏 稳定性 (stability, slate) ────────────────────────────┤
│ 想要稳定性 ▏ 浏览稳定性 ▏ 收藏稳定性                         │
├─ 🧭 趋势信号 (trend, rose) ───────────────────────────────┤
│ 近期趋势图 (MiniTrendChart)                                 │
├─ 🏷️ 元数据 (meta, violet) ───────────────────────────────┤
│ 关键词 ▏ 优先级 ▏ 监控状态 ▏ 价格动向                       │
└──────────────────────────────────────────────────────────┘
```

### 2.2 与当前表格的 diff

| 操作 | 列 | 原因 |
|------|----|------|
| ✂️ 删除 | 浏览数 / 想要数（累计值） | 累计值与窗口日均量冲突，移入抽屉 Part 4 |
| ✂️ 删除 | 询藏比 / 询单率 / 收藏率（旧衍生字段） | 替换为 d7 窗口指标 |
| ✂️ 删除 | 趋势值 (trendValue) | 用 MiniTrendChart + 升温信号替代 |
| ✂️ 删除 | 稳定性 (stabilityValue) | 替换为 d7 want/look/collect_stability |
| ✂️ 删除 | 日均询单 / 上架天数 / 上架时间 / 预估订单 / 预估销售额 | 从表格移除，移入抽屉 Part 4 |
| ➕ 新增 | 7天询藏比 (d7 if_ratio) | 核心转化质量信号 |
| ➕ 新增 | 7天询单率 (d7 inquiry_rate)，附带 D1→D7 升温信号 | 转化率 + 跨窗口加速检测 |
| ➕ 新增 | 7天收藏率 (d7 favorite_rate) | 辅助判断用户行为 |
| ➕ 新增 | 日均想要数 (d7 total_dwant / 7) | 7天窗口日均需求规模 |
| ➕ 新增 | 日均浏览数 (d7 total_dlook / 7) | 7天窗口日均流量规模 |
| ➕ 新增 | 7天流量增速 (d7 browse_growth) | 先行指标，流量变化早于转化 |
| ➕ 新增 | 升温信号 (d1/d7 inquiry_rate 比值) | 跨窗口加速/减速检测 |
| ➕ 新增 | 想要/浏览/收藏稳定性 (d7 *_stability) | 三维稳定性 |
| ➕ 新增 | 价格动向 (d7 price_trend 徽标) | 降价/涨价行动信号 |

### 2.3 各列业务规则

#### 7天询藏比

- 展示 `d7 if_ratio` 数值
- 值为 null 时显示 "-"，tooltip 提示"收藏数为零，无法计算"
- tooltip 显示 D1/D3/D7 三窗口 if_ratio 值

#### 7天询单率

- 展示 `d7 inquiry_rate` 数值

#### 7天收藏率

- 展示 `d7 favorite_rate` 数值

#### 日均想要数 / 日均浏览数

- `d7 total_dwant / 7` 和 `d7 total_dlook / 7`，保留 1 位小数
- 仅统计窗口期内数据，与全局上架期日均（抽屉 Part 4 中的"全局日均询单"）含义不同

#### 7天流量增速

- 展示 `d7 browse_growth`，带方向徽标（正=绿↑ / 负=红↓ / 零=灰→）
- 这是先行指标——流量变化通常早于转化变化

#### 升温信号

- 展示 `d1_inquiry_rate / d7_inquiry_rate - 1`
- > +30% → "加速" / < -30% → "降温" / 其他 → "平稳"
- 任一窗口为 null 时显示 "-"

#### 稳定性（三列：想要稳定性 + 浏览稳定性 + 收藏稳定性）

- 展示 CV 数值
- CV 阈值统一（仅用于视觉分层，不做评级文字）：
  - < 0.5 绿色 / 0.5-0.8 黄色 / 0.8-1.2 橙色 / ≥ 1.2 红色

#### 价格动向

- 展示 `d7 price_trend` 徽标：
  - `down` → 红色 "↓降价"
  - `up` → 绿色 "↑提价"
  - `flat` → 灰色 "→平稳"

#### 近期趋势图

- 保留现有 MiniTrendChart，数据源改为 `hourly_trend.cumulative_want`
- 折线颜色对应 `trend_direction.want_slope`（up=绿 / flat=灰 / down=红）

#### 已下架/已售商品

- `itemStatus` 非在售时，整行视觉置灰

### 2.4 数据来源对照

| 表格列 | 数据来源 |
|--------|---------|
| 价格 | `lastFetchLogs[gid].price`（最新采集点的瞬时价格） |
| 7天询藏比 | `windows_metrics.d7.if_ratio`（null 时显示 "-"） |
| 7天询单率 | `windows_metrics.d7.inquiry_rate` |
| 7天收藏率 | `windows_metrics.d7.favorite_rate` |
| 日均想要数 | `windows_metrics.d7.total_dwant / 7` |
| 日均浏览数 | `windows_metrics.d7.total_dlook / 7` |
| 7天流量增速 | `windows_metrics.d7.browse_growth` |
| 升温信号 | `windows_metrics.d1.inquiry_rate / windows_metrics.d7.inquiry_rate - 1`（null 时 "-"） |
| 想要稳定性 | `windows_metrics.d7.want_stability` |
| 浏览稳定性 | `windows_metrics.d7.look_stability` |
| 收藏稳定性 | `windows_metrics.d7.collect_stability` |
| 价格动向 | `windows_metrics.d7.price_trend` |
| 近期趋势图 | `hourly_trend.cumulative_want`（最近 N 点） |
| 关键词/优先级/监控状态 | 现有字段不变 |

### 2.5 排序支持

新增 `ProductSortKey` 值：
- `d7InquiryRate` — 按 d7 询单率排序
- `d7FavoriteRate` — 按 d7 收藏率排序
- `d7IfRatio` — 按 d7 询藏比排序
- `d7DailyWant` — 按日均想要数排序
- `d7DailyLook` — 按日均浏览数排序
- `d7BrowseGrowth` — 按流量增速排序
- `acceleration` — 按升温信号排序
- `wantStability` / `lookStability` / `collectStability` — 按稳定性排序
- `priceTrend` — 按价格动向排序（up=1, flat=0, down=-1）

---

## 3. 抽屉设计（做加法：全维度诊断）

抽屉定位为**单品生命周期诊断面板**。数据直接用列表接口已返回的
`hourly_trend` + `windows_metrics`，无需额外 API 请求。打开即显，零延迟。

核心分析逻辑：**沿着流量 → 转化 → 价格的因果链，诊断商品的真实健康度。**

### 3.1 整体布局

```
┌─ Sheet/BottomSheet (width: 560px) ──────────────────────────────┐
│ 商品标题                                            [×]         │
│ GID: 955244769833  |  状态: 监控中  |  优先级: 3                 │
│ [关键词A] [关键词B]                                              │
├─────────────────────────────────────────────────────────────────┤
│ ↕ 可滚动内容区                                                   │
│                                                                  │
│  ═══════════ 异常预警（条件渲染，有异常才显示）═══════════       │
│  🚨 流量剧烈波动 (CV=1.18)  ⚠️ 近期降价 13%                      │
│  ════════════════════════════════════════════════════════       │
│                                                                  │
│  📊 Part 1 — 核心指标（比率 → 规模 → 增速，三行递进）            │
│  ┌────────────┬────────────┬────────────┐                       │
│  │   D1 窗口  │   D3 窗口  │   D7 窗口  │                       │
│  │ 询单 12.4% │ 询单 10.2% │ 询单 9.8%  │  ← 转化比率           │
│  │   (持续下行)│            │            │                       │
│  │ 收藏 11.4% │ 收藏 11.4% │ 收藏 10.9% │                       │
│  │   (平稳)   │            │            │                       │
│  │ 询藏 1.08  │ 询藏 0.90  │ 询藏 0.91  │                       │
│  │   (见顶回落)│            │            │                       │
│  └────────────┴────────────┴────────────┘                       │
│  ─────────────────────────────────────────                       │
│  规模参考: 7天日均浏览 141/天  ·  日均想要 14/天                  │
│  增长信号: 流量增速 +4.2% ↗  ·  升温 +30% 🔥  ·  窗口占比 28%  ·  价格 ↓降价 │
│                                                                  │
│  📈 Part 2 — 趋势诊断三图                                        │
│  ┌────────────────────────────────────────┐                     │
│  │ 图 A：累计增长图（首要）                │                     │
│  │ 三线：cumulative_want/look/collect     │                     │
│  └────────────────────────────────────────┘                     │
│  ┌────────────────────────────────────────┐                     │
│  │ 图 B：买卖意愿图                        │                     │
│  │ 三线：收藏率 + 询单率（折线）+ 询藏比（虚线）                │
│  └────────────────────────────────────────┘                     │
│  ┌────────────────────────────────────────┐                     │
│  │ 图 C：流量转化匹配图                    │                     │
│  │ 双轴：hourly_look_rate（面积）+ hourly_want_rate（折线）     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  📐 Part 3 — 稳定性诊断                                          │
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │ 想要稳定性    │ 浏览稳定性    │ 收藏稳定性    │                 │
│  │ CV 0.63      │ CV 0.45      │ CV 0.77      │                 │
│  │ μ  2.14/h    │ μ 15.3/h     │ μ  2.01/h    │                 │
│  │ σ  1.35      │ σ  6.89      │ σ  1.55      │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
│                                                                  │
│  💰 Part 4 — 基础数据（折叠区）                                  │
│  ┌────────────────────────────────────────┐                     │
│  │ 价格 ¥2.50  累计浏览 24,608  累计想要 2,370                  │
│  │ 状态: 在售   7天浏览增速 +4.2%          │                     │
│  │ 7天询单增量 97    7天浏览增量 986       │                     │
│  │ 7天收藏增量 107   全局日均询单 7.2      │                     │
│  │ 上架 324 天      上架时间 2025-08-01    │                     │
│  │ 预估订单 1,185   预估销售额 ¥5,925     │                     │
│  │ 价格趋势 → 平稳  最低价比 1.00          │                     │
│  │ 采集 21 次       质量 [可靠]            │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 异常预警规则（Part 0 — 条件渲染）

统一稳定性阈值（三级，三维度一致）：

| 层级 | CV 范围 | 含义 |
|------|---------|------|
| 绿 | < 0.5 | 波动较小 |
| 黄 | 0.5 ~ 0.8 | 中等波动 |
| 橙 | 0.8 ~ 1.2 | 明显波动 |
| 红 | ≥ 1.2 | 剧烈波动 |

预警规则（多条可同时触发，按严重度排序）：

| 预警类型 | 触发条件 | 文案 | 严重度 |
|---------|---------|------|--------|
| 流量剧烈波动 | `look_stability d7 ≥ 1.2` | "🚨 流量剧烈波动 (CV={val})，可能存在断崖或突增" | 红 |
| 流量明显波动 | `0.8 ≤ look_stability d7 < 1.2` | "⚠️ 流量波动较大 (CV={val})" | 橙 |
| 需求剧烈波动 | `want_stability d7 ≥ 1.2` | "🚨 需求剧烈波动 (CV={val})" | 红 |
| 需求明显波动 | `0.8 ≤ want_stability d7 < 1.2` | "⚠️ 需求波动较大 (CV={val})" | 橙 |
| 收藏率悬崖 | `d1_favorite_rate < d7_favorite_rate × 0.5` | "⚠️ 近期收藏意愿骤降 (D7={d7}% → D1={d1}%)，可能竞品上架或平台调权" | 橙 |
| 浏览负增长 | `d7 browse_growth < -0.10` | "⚠️ 7天流量趋势下行 ({pct}%)" | 橙 |
| 零询单窗口 | `d1 total_dwant === 0` 且 `quality_label !== 'insufficient'` | "❕ 近24小时零询单，商品可能已无活跃度" | 灰 |
| 极端询藏比 | `d7 if_ratio > 5` | "❕ 询藏比极高 ({val})，用户大量咨询但极少收藏" | 灰 |
| 降价信号 | `price_trend === 'down'` 且降幅 > 3% | "⚠️ 近期降价 {pct}%: ¥{old} → ¥{new}，询单率如有回升则为有效降价" | 黄 |
| 提价信号 | `price_trend === 'up'` 且涨幅 > 3% | "💹 近期提价 {pct}%: ¥{old} → ¥{new}，如需求未降则卖家有定价权" | 绿 |
| 数据不足 | `quality_label === 'insufficient'` | "❓ 采集次数不足 ({n}次)，当前指标仅供参考" | 灰 |

价格变动百分比使用 `price_lowest_ratio` 和 `hourly_trend.price` 联合计算。

### 3.3 Part 1 — 核心指标（三行递进：比率 → 规模 → 增速）

抽屉为自包含诊断视图，表格中的关键信号在此处复现，打开即获完整判断。

#### 第一行：三窗口比率对比卡片

- 3 列并排：D1 / D3 / D7
- 每列展示 3 个核心比率：询单率、收藏率、询藏比
- 每个指标行末尾标注整体趋势（基于三窗口单调性）：
  - 持续上行 / 持续下行（单调递增或递减）
  - 触底反弹（D3 最低）
  - 见顶回落（D3 最高）
  - 无明显趋势（三值交错）
- 趋势标签基于三个窗口的单调性启发式判断，非统计显著结论。标签旁附 `ⓘ` icon，hover 提示"基于三窗口单调性，仅供参考"

#### 第二行：规模参考

```
7天日均浏览 141/天  ·  日均想要 14/天
```

- 数据源：`d7 total_dlook / 7`、`d7 total_dwant / 7`
- 为第一行的比率提供绝对量锚点——12% 询单率在日均 2 个想要 vs 200 个想要场景下含义完全不同

#### 第三行：增长信号

```
流量增速 +4.2% ↗  ·  升温 +30% 🔥  ·  窗口占比 28%  ·  价格 ↓降价
```

- 数据源：`d7 browse_growth`、`d1/d7 inquiry_rate 比值`、`d1_total_dwant / d7_total_dwant`、`d7 price_trend`
- 窗口占比：d1 想要数占 d7 总量的比例。>30% 说明近 24h 贡献了 7 天量的 1/3 以上，商品正在快速升温
- 四信号并列，形成「流量→转化→集中度→价格」完整动向快照
- 与表格信息一致，抽屉内无需回看表格

#### Header 补充元数据

- 标题下方显示 GID、监控状态、优先级、关键词 tags
- 关键词直接复现表格数据，便于了解商品来源

### 3.4 Part 2 — 趋势诊断三图

三个图表上下排列，使用 ECharts。数据源 `hourly_trend`。
数据需从列式结构 `{ts:[], hourly_want_rate:[], ...}` 转置为 ECharts dataset 行式格式 `{dimensions:[...], source:[[...], ...]}`。

小时级速率数据存在大量零值和空窗期。比率计算（如询单率 = want_rate / look_rate）在分母为零时跳过该数据点，不在图表上显示断点或 0%。

#### 图 A：累计增长图（首要，轨迹判断）

- 数据源：`hourly_trend.cumulative_want` + `cumulative_look` + `cumulative_collect`
- **关键处理**：`cumulative_*` 为上架至今全生命周期累计，成熟商品曲线接近水平。**Y 轴起点设为窗口起始值**（`cumulative[-1] - d7_total`），仅展示窗口期内增量累计
- 图表上方标注"窗口期内增量"
- 图表类型：三折线图
- 凹向上（加速）= 商品正在升温；线性 = 匀速增长；凹向下（饱和）= 增速放缓

#### 图 B：买卖意愿图（意图转换）

- 数据源：`hourly_trend`
- 左轴：收藏率（`hourly_collect_rate / hourly_look_rate`）+ 询单率（`hourly_want_rate / hourly_look_rate`），折线
- 右轴：询藏比（`hourly_want_rate / hourly_collect_rate`），虚线

#### 图 C：流量转化匹配图（流量 → 行动效率）

- 数据源：`hourly_trend`
- 左轴：`hourly_look_rate`（流量脉搏），面积图
- 右轴：`hourly_want_rate`（需求脉搏），折线

### 3.5 Part 3 — 稳定性诊断

- 三列并排：D7 窗口的 want_stability / look_stability / collect_stability
- 每列同时展示三个统计量，供用户自行判断：
  - **CV**（变异系数 = σ / |μ|）：衡量 per-hour 速率的相对波动程度
  - **均值**（μ）：对应维度 hourly_rate 的窗口均值（如 hourly_want_rate 的 mean）
  - **标准差**（σ）：对应维度 hourly_rate 的窗口标准差

**计算口径**：CV、μ、σ 三项统一从 `hourly_trend` 对应列前端自行计算（取最近 7 天数据点），
不使用 `windows_metrics.d7.*_stability`，确保三个数字满足 CV = σ/|μ| 的数学关系。
卡片底部标注"基于窗口内 {n} 个数据点"。

### 3.6 Part 4 — 基础数据（折叠区，默认收起）

包含从表格移除但在单品诊断中仍有参考价值的字段。
注意区分 **窗口期日均**（7天内）与 **全局日均**（上架至今）：

| 指标 | 来源 | 说明 |
|------|------|------|
| 价格 | `lastFetchLogs[gid].price` | 最新实时价格 |
| 累计浏览 | `lastFetchLogs[gid].lookCount` | 上架至今累计 |
| 累计想要 | `lastFetchLogs[gid].wantCount` | 上架至今累计 |
| 商品状态 | `lastFetchLogs[gid].itemStatus` | 0=在售 / 1=已售 / -2=已下架 |
| 7天浏览增速 | `windows_metrics.d7.browse_growth` | 窗口内浏览相对增长 |
| 7天询单增量 | `windows_metrics.d7.total_dwant` | 窗口内想要数净增 |
| 7天浏览增量 | `windows_metrics.d7.total_dlook` | 窗口内浏览净增 |
| 7天收藏增量 | `windows_metrics.d7.total_dcollect` | 窗口内收藏净增 |
| 全局日均询单 | `ProductItem.dailyWant` | 累计 wantCount / 上架天数 |
| 上架天数 | `ProductItem.daysSincePublish` | 距今上架天数 |
| 上架时间 | `ProductItem.publishedAt` | 闲鱼发布时间 |
| 预估订单 | `ProductItem.estimatedOrders` | wantCount × 0.5 |
| 预估销售额 | `ProductItem.estimatedSales` | price × wantCount × 0.5 |
| 价格趋势 | `windows_metrics.d7.price_trend` | up / down / flat |
| 最低价比 | `windows_metrics.d7.price_lowest_ratio` | <1.0 说明窗口内有过低价 |
| 采集次数 | `windows_metrics.d7.fetch_count` | 窗口内数据密度 |
| 质量标签 | `windows_metrics.d7.quality_label` | reliable / limited / insufficient |

### 3.7 边界情况处理

#### windows_metrics 为 null（新商品，Performance 引擎尚未计算）

- 表格：相关列全部显示 "-"，行尾不显示删除按钮
- 抽屉：Part 1-3 显示"该商品指标尚未生成，请等待更多采集数据"占位提示
- Part 4 仍可展示 lastFetchLogs 的基础数据

#### hourly_trend 数据点不足（< 3 个点）

- 趋势图表显示"数据点不足，至少需要 3 次采集"占位
- 稳定性卡片仍展示 CV（来自 windows_metrics，后端已处理边界）

#### if_ratio 为 null（收藏数为零，分母为零）

- 表格和抽屉均显示 "-"，tooltip 说明原因

#### itemStatus 非在售

- 表格行置灰，抽屉标题区标注状态标签（已售/已下架）

### 3.8 移动端适配

- 使用 `BottomSheet` 组件替代 `Sheet`，从底部滑入
- Part 1 三列卡片改为纵向堆叠
- Part 2 双图高度适配移动端视口
- 异常预警横幅支持横向滑动

### 3.9 与表格的职责划分

| 维度 | 表格（横向扫描） | 抽屉（纵向诊断） |
|------|-----------------|-------------------|
| 目标 | 淘汰劣品，筛选潜力品 | 理解因果，做出跟进/放弃决策 |
| 指标数量 | ~17 列，每列一义 | 全维度 20+ 指标 + 时序图表 |
| 时间精度 | 仅 d7（最可靠的均值） | d1/d3/d7 全对比 + 小时级时序 |
| 输出 | 排序列表 | 诊断报告 + 异常预警 |
| 数据源 | d7 窗口 + lastFetchLogs | 全窗口 + hourly_trend |
| 零额外请求 | ✅ 列表数据即包含 | ✅ 点击行直接渲染，无 loading |

---

## 4. 组件拆分计划

基于上述设计，前端组件结构：

```
ProductMonitorTab.tsx          ← 主容器（表格 + 工具栏 + AI报告）
  ├── MonitorTableHeader.tsx   ← 表头 + 分组色条（可提取）
  ├── MonitorTableRow.tsx      ← 单行渲染（可提取，减少主文件体积）
  ├── MiniTrendChart.tsx       ← 保留并扩展（支持 hourly_trend 数据源）
  └── ProductDiagnosticDrawer.tsx  ← 全新抽屉（替代 ProductHistoryDrawer）
        ├── AnomalyBanner.tsx       ← Part 0: 异常预警横幅（条件渲染）
        ├── WindowCompareCards.tsx  ← Part 1: 三窗口比率对比 + 规模参考 + 增长信号
        ├── CumulativeGrowthChart.tsx ← Part 2A: 累计增长图 (ECharts)
        ├── IntentConversionChart.tsx ← Part 2B: 买卖意愿图 (ECharts)
        ├── TrafficActionChart.tsx  ← Part 2C: 流量转化匹配图 (ECharts)
        ├── StabilityPanel.tsx      ← Part 3: 稳定性诊断 (CV+μ+σ)
        └── GrowthPricePanel.tsx    ← Part 4: 基础数据（折叠区）
```
