# 数据字典

本文档解释项目中使用的业务概念、缩写和技术术语，帮助新人快速理解代码。

---

## 业务领域实体

### Account — 闲鱼账号

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 用户在系统中绑定的闲鱼店铺账号，是其他所有功能的基础 |
| **关键字段** | `uid`（闲鱼用户ID）、`name`（店铺名）、`status`（状态）、`auto_reply`/`auto_delivery`/`ai_auto_reply` 等自动化开关 |
| **类型定义** | `lib/api/accounts.ts` — `Account` |
| **管理组件** | `app/dashboard/accounts/page.tsx` — `AccountRow`, `AccountCard` |

### Item — 闲鱼商品

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 账号下的闲鱼商品，可配置自动回复、自动发货、AI 回复等自动化功能 |
| **关键字段** | `gid`（商品ID）、`title`、`price`、`status`、`auto_delivery`、`auto_reply`、`auto_ai_reply`、`deliveryType`、`deliveryContent` |
| **类型定义** | `lib/api/items.ts` — `Item` |
| **管理组件** | `app/dashboard/items/page.tsx` — `ItemsTab`, `RulesTab` |

### Item 状态枚举

| 值 | 含义 |
|----|------|
| `1` | 在售 |
| `0` | 已下架 |
| `2` | 已售出 |

> 定义于 `lib/api/items.ts`，通过 `ItemFilters.status` 筛选。

---

### KeywordRule — 自动回复关键词规则

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 匹配买家消息并自动发送预设回复的规则，支持精确/模糊/正则匹配 |
| **关键字段** | `rule_id`、`keyword`（匹配词）、`reply_content`（回复内容）、`match_type`（`exact`/`fuzzy`/`regex`）、`reply_type`（`predefined`/`custom`）、`priority` |
| **类型定义** | `lib/api/keywords.ts` — `KeywordRule` |
| **管理组件** | `components/items/RulesTab.tsx` |

> 预定义关键词类型（`reply_type = "predefined"`）：首次回复、我已拍下待付款、我已小刀、已付款等待发货、确认收货、完成评价。

---

### Opportunity — 选品商机

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 从选品监控中发现的潜在商品机会，可转为发布素材进行 AI 辅助发布 |
| **关键字段** | `id`、`name`、`source_type`（`collection`/`manual`）、`source_item_ids`、`tags`、`price`、`status`（`active`/`archived`）、`item_count`（关联的发布素材数） |
| **类型定义** | `lib/api/opportunities.ts` — `Opportunity`, `OpportunityDetail` |
| **管理组件** | `app/dashboard/publish/page.tsx` — `OpportunityLibrary` |

---

### PublishedItem — 发布素材

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 一条商机可创建多条发布素材，通过 AI 辅助完成改写描述、封面规划、图片生成、发布的完整流水线 |
| **关键字段** | `id`、`opportunity_id`、`account_id`、`title`、`description`、`price`、`status`（流水线状态）、`images[]`、`publish_task_id`、`item_gid`（发布后的商品 ID） |
| **类型定义** | `lib/api/publish-items.ts` — `PublishedItem`, `PublishedItemStatus` |
| **管理组件** | `app/dashboard/publish/page.tsx` — `PublishWorkspace`, `EditorDrawer` |

#### PublishedItem 状态流水线

```
pending → rewriting → rewrite_done → cover_planning → cover_plan_done
       → image_generating → image_done → publishing → published
                                                    → publish_failed
```

| 状态 | 含义 |
|------|------|
| `pending` | 待处理 |
| `rewriting` | AI 改写描述中 |
| `rewrite_done` | 改写完成 |
| `cover_planning` | 封面规划中 |
| `cover_plan_done` | 封面规划完成 |
| `image_generating` | AI 生成图片中 |
| `image_done` | 图片生成完成 |
| `publishing` | 发布中 |
| `published` | 已发布 |
| `publish_failed` | 发布失败 |

---

### MonitorItem — 被监控的商品

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 选品模块中通过关键词采集发现的商品，被加入监控列表以追踪数据变化 |
| **关键字段** | `gid`、`title`、`price`、`wantCount`、`lookCount`、`monitorStatus`、`priority`、`windows_metrics`（三窗口性能）、`hourly_trend`（小时趋势） |
| **类型定义** | `lib/api/selection.ts` — `ProductItem`（前端视图）、`MonitoredItemDTO`（后端 DTO） |
| **管理组件** | `components/selection/product/ProductMonitorTab.tsx` |

#### MonitorItem 状态枚举

| 值 | 含义 |
|----|------|
| `0` | 已暂停（PAUSED） |
| `1` | 监控中（MONITORING） |
| `2` | 已分析（ANALYZED） |
| `3` | 已发布（PUBLISHED） |

---

### MonitorMerchant — 被监控的商家

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 选品模块中通过商家 ID 加入监控的闲鱼商家 |
| **关键字段** | `uid`（商家 ID）、`name`、`monitorStatus`、`merchantStatus` |
| **类型定义** | `lib/api/selection.ts` — `MonitoredMerchantDTO` |
| **管理组件** | `components/selection/merchant/MerchantMonitorTab.tsx` |

---

### Proxy — 代理服务器

| 属性 | 值 |
|------|-----|
| **类型** | 实体 |
| **定义** | 代理服务器配置，可绑定到用户和账号，用于闲鱼请求的 IP 代理 |
| **关键字段** | 代理地址、端口、协议、来源（`custom`/`tianqi`/`jiuling`）、状态（`active`/`abnormal`/`invalid`/`expired`/`closed`） |
| **类型定义** | `lib/api/admin/proxy.ts` — `ProxyLong` |
| **管理组件** | `app/admin/proxy/page.tsx` |

---

## 数据缩写

### 时间窗口指标

| 缩写 | 全称 | 含义 | 出现位置 |
|------|------|------|----------|
| **d1** | Day 1 window | 最近 1 天的指标快照 | `selection.ts` — `WindowsSnapshotDTO.d1` |
| **d3** | Day 3 window | 最近 3 天的指标快照 | `selection.ts` — `WindowsSnapshotDTO.d3` |
| **d7** | Day 7 window | 最近 7 天的指标快照 | `selection.ts` — `WindowsSnapshotDTO.d7` |
| **D1/D3/D7** | 同上（大写形式） | 概念引用时使用大写 | 文档和注释中 |

### 统计指标缩写

| 缩写 | 全称 | 含义 | 出现位置 |
|------|------|------|----------|
| **CV** | Coefficient of Variation | 变异系数 = σ/μ，衡量数据波动性。值越小越稳定 | `selection.ts` — `stabilityValue` |
| **d7InquiryRate** | D7 inquiry rate | d7 窗口内的询单率 = wantCount / lookCount | `selection.ts` — `ProductItem.d7InquiryRate` |
| **d7FavoriteRate** | D7 favorite rate | d7 窗口内的收藏率 | `selection.ts` — `ProductItem.d7FavoriteRate` |
| **d7IfRatio** | D7 inquiry/favorite ratio | d7 窗口内的询藏比 | `selection.ts` — `ProductItem.d7IfRatio` |
| **d7BrowseGrowth** | D7 browse growth | d7 窗口内的流量增速 | `selection.ts` — `ProductItem.d7BrowseGrowth` |
| **acceleration** | 升温信号 | d1 询单率 / d7 询单率 - 1，正值表示近期升温 | `selection.ts` — `ProductItem.acceleration` |

### 技术缩写

| 缩写 | 全称 | 含义 | 出现位置 |
|------|------|------|----------|
| **DTO** | Data Transfer Object | 后端直传数据结构，与前端衍生类型区分 | `selection.ts` — 多个 `*DTO` 类型 |
| **SSE** | Server-Sent Events | 服务端推送技术，用于 IM 状态实时更新和扫码登录状态推送 | `hooks/useImStatusSnapshots.ts`, `hooks/useQrLogin.ts` |
| **R2** | Cloudflare R2 | Cloudflare 对象存储服务，用于图片上传 | `lib/api/upload.ts` |
| **flare** | — | 图片上传的前置签名流程（向服务端请求 R2 签名 URL） | 上传相关组件 |

---

## 衍生字段说明

### ProductItem 的前端计算字段

`ProductItem`（`lib/api/selection.ts`）中包含两类字段：

**D1/D3/D7 窗口指标（取自 `windowsMetrics`）：**
- `d7InquiryRate`、`d7FavoriteRate`、`d7IfRatio`、`d7DailyWant`、`d7DailyLook`、`d7DailyCollect`、`d7BrowseGrowth`
- `acceleration` — 升温信号
- `wantStability`、`lookStability`、`collectStability` — 波动性（CV）
- `priceTrend` — 价格动向

**基础衍生字段（由原始数据计算）：**
- `inquiryRate` — 询单率 = wantCount / lookCount
- `wantCollectRatio` — 询藏比 = wantCount / collectCount
- `dailyWant` — 日均询单 = wantCount / 上架天数
- `estimatedSales` — 预估销售额 = price * wantCount * 0.5
- `estimatedOrders` — 预估订单数 = wantCount * 0.5
- `collectRate` — 收藏率 = collectCount / lookCount
- `daysSincePublish` — 上架天数

> 所有衍生字段可为 `null`（数据不足无法计算时）。

---

## 类型命名约定

| 后缀 | 含义 | 示例 |
|------|------|------|
| `DTO` | 后端直传数据结构 | `MonitoredItemDTO`, `WindowMetricsDTO`, `TopicStatsDTO` |
| （无后缀） | 前端视图/实体类型 | `Item`, `Account`, `ProductItem` |
| `Update` | 更新入参 | `ItemUpdate`, `AccountUpdate` |
| `Create` | 创建入参 | `KeywordRuleCreate` |
| `Response` | API 响应结构 | `LoginResponse`, `ItemListResponse` |
| `View` | 前端衍生展示类型（未在项目中严格使用） | — |

---

## 技术概念

### WindowMetrics — 时间窗口指标快照

| 属性 | 值 |
|------|-----|
| **类型** | 数据结构 |
| **定义** | 某个时间窗口（1天/3天/7天）内的商品性能指标快照，包含浏览、想要、收藏、询单率、稳定性等 |
| **包含字段** | `inquiry_rate`, `favorite_rate`, `if_ratio`, `browse_growth`, `total_dwant`, `total_dlook`, `total_dcollect`, `price_trend`, `want_stability`, `look_stability`, `collect_stability`, `quality_label` 等 |
| **类型定义** | `lib/api/selection.ts` — `WindowMetricsDTO` |

### WindowsSnapshot — 三窗口快照

| 属性 | 值 |
|------|-----|
| **类型** | 数据结构 |
| **定义** | 包含 d1/d3/d7 三个时间窗口的完整快照 |
| **类型定义** | `lib/api/selection.ts` — `WindowsSnapshotDTO` |

### hourlyTrend — 小时级趋势数据

| 属性 | 值 |
|------|-----|
| **类型** | 数据结构 |
| **定义** | 小时级列式时序数据，ECharts dataset 可直接消费 |
| **包含字段** | `ts[]`（时间戳）、`hourly_want_rate[]`、`hourly_look_rate[]`、`hourly_collect_rate[]`、`price[]`、`cumulative_want[]`、`cumulative_look[]`、`cumulative_collect[]` |
| **类型定义** | `lib/api/selection.ts` — `HourlyTrendDTO` |

### snapshot — 数据快照

| 属性 | 值 |
|------|-----|
| **类型** | 概念 |
| **定义** | 某一时刻的数据状态记录。在选品模块中，每次采集都生成一条快照，多个快照构成历史趋势 |
| **相关类型** | `MonitoredItemFetchLogDTO` (单次采集快照), `HistoryPoint` (历史采集数据点) |

### SSE — Server-Sent Events

| 属性 | 值 |
|------|-----|
| **类型** | 技术 |
| **定义** | 服务端向客户端推送事件的 HTTP 长连接技术。项目中用于：<br>1. IM 连接状态实时更新（`subscribeImStatus`）<br>2. 扫码登录状态推送（`useQrLogin` 中的 SSE 连接） |
| **相关文件** | `hooks/useImStatusSnapshots.ts`, `hooks/useQrLogin.ts`, `lib/api/admin/dashboard.ts` |

### R2 / flare

| 属性 | 值 |
|------|-----|
| **类型** | 技术 |
| **定义** | `R2` = Cloudflare R2 对象存储，用于商品图片上传。<br>`flare` = 上传前的签名请求流程 — 前端请求后端生成 R2 预签名 URL，再用该 URL 直接上传文件到 R2 |
| **相关文件** | `lib/api/upload.ts` |
