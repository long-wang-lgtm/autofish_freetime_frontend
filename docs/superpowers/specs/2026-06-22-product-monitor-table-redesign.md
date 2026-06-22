# 商品监控表格与抽屉重构设计

> 日期：2026-06-22 | 状态：已确认
> 范围：ProductMonitorTab 表格、ProductDiagnosticDrawer 抽屉、MiniTrendChart、新增 API

---

## 问题总览

| # | 需求 | 当前状态 | 目标 |
|---|------|---------|------|
| 1 | 表头冻结 | 表头随内容滚动 | `position:sticky;top:0` 始终可见 |
| 2 | 稳定性→趋势 | CV变异系数无业务语义 | 斜率方向 + 迷你图背景 + 指标数值 |
| 3 | 关键词移出表格 | 表格内独立列 | 移到抽屉顶部元数据区 |
| 4 | 抽屉加价格 | 抽屉无价格信息 | 抽屉顶部展示价格+动向 |
| 5 | 近期趋势不好看 | 纯SVG折线 | 迷你图背景 + 数据指标叠加（三列趋势统一此风格） |
| 6 | 状态/优先级移入商品信息列 | 独立列占用宽度 | 并入商品信息列，状态可点击，优先级原地编辑 |
| 7 | 价格动向合并 | 独立列 | 与价格列合并（¥价格 + ↓↑→） |
| 8 | GID取消复制改链接 | 点击复制到剪贴板 | 点击跳转 `https://www.goofish.com/item?id={gid}` |
| 9 | 入库按钮 | PUBLISHED(3) 发布状态 | STORED(4) 入库状态 + 入库按钮 |

---

## 1. 表格列重组

### 1.1 列定义（12 列 + 1 操作列）

| # | key | label | 宽度 | 分组 | 变更 |
|---|-----|-------|------|------|------|
| 1 | `title` | 商品信息 | flex-1 min-w-[180px] max-w-[240px] | identity | 🆕 含状态/优先级/入库 |
| 2 | `price` | 价格 | w-[80px] shrink-0 | core | 🆕 合并 priceTrend |
| 3 | `d7IfRatio` | 7天询藏比 | w-[68px] shrink-0 | conversion | 不变 |
| 4 | `d7InquiryRate` | 7天询单率 | w-[68px] shrink-0 | conversion | 不变 |
| 5 | `d7FavoriteRate` | 7天收藏率 | w-[68px] shrink-0 | conversion | 不变 |
| 6 | `d7DailyWant` | 日均想要 | w-[68px] shrink-0 | daily | 不变 |
| 7 | `d7DailyLook` | 日均浏览 | w-[68px] shrink-0 | daily | 不变 |
| 8 | `d7BrowseGrowth` | 流量增速 | w-[80px] shrink-0 | growth | 不变 |
| 9 | `acceleration` | 升温信号 | w-[72px] shrink-0 | growth | 不变 |
| 10 | `wantTrend` | 想要趋势 | w-[90px] shrink-0 | trend | 🆕 迷你图+指标 |
| 11 | `lookTrend` | 浏览趋势 | w-[90px] shrink-0 | trend | 🆕 迷你图+指标 |
| 12 | `collectTrend` | 收藏趋势 | w-[90px] shrink-0 | trend | 🆕 迷你图+指标 |

**删除的列：**
- `keywords` — 移到抽屉顶部元数据
- `priority` — 并入商品信息列
- `monitorStatus` — 并入商品信息列
- `priceTrend` — 并入价格列
- `wantStability` / `lookStability` / `collectStability` — 改为趋势列（CV 作为指标之一保留）
- `trendChart` — 三列趋势各自含迷你图，不再需要独立列

### 1.2 列分组

```
identity (灰) → core (琥珀) → conversion (天蓝) → daily (青) → growth (翠绿) → trend (玫红)
```

分组色条仅保留 identity 外的 5 组。

---

## 2. 表头冻结

### 2.1 实现方式

表格容器 `max-h-[calc(100vh-280px)] overflow-y-auto`，表头行 `position:sticky;top:0;z-index:10;bg-white`。

表头不参与内容区滚动，始终可见。

### 2.2 注意事项

- 需要给表头行加 `bg-white`（或 `bg-gray-50`）防止内容透过
- 分组色条随表头一起 sticky

---

## 3. 趋势列（迷你图+指标）

### 3.1 数据源

| 指标 | 想要趋势 | 浏览趋势 | 收藏趋势 |
|------|---------|---------|---------|
| 折线 | `hourly_want_rate` (最近N点) | `hourly_look_rate` | `hourly_collect_rate` |
| 方向 | `trend_direction.want_slope` | `trend_direction.look_slope` | `trend_direction.collect_slope` |
| 日均 | `d7DailyWant` (d7.total_dwant/7) | `d7DailyLook` (d7.total_dlook/7) | `d7DailyCollect` (d7.total_dcollect/7) |
| CV | `want_stability` | `look_stability` | `collect_stability` |

### 3.2 方向映射

| slope 值 | 显示 | 颜色 |
|-----------|------|------|
| `"up"` | ↗ | `#d97706`(琥珀)/`#2563eb`(蓝)/`#7c3aed`(紫) 按系列 |
| `"down"` | ↘ | `#ef4444`(红) |
| `"flat"` | → | `#9ca3af`(灰) |
| `null` | - | `#9ca3af` |

### 3.3 折线颜色

- 想要趋势：`#d97706` (amber-600)
- 浏览趋势：`#2563eb` (blue-600)
- 收藏趋势：`#7c3aed` (violet-600)

### 3.4 像素级视觉规格

每列尺寸：**90px × 32px**，容器结构：

```
┌─ 外层容器 position:relative; w-[90px]; h-[32px]; rounded; overflow-hidden ─┐
│                                                                             │
│  第1层：背景渐变 (absolute, inset-0, z-0)                                    │
│    linear-gradient(180deg, rgba(SERIES_RGB,0.10), rgba(SERIES_RGB,0.02))   │
│                                                                             │
│  第2层：SVG折线 (absolute, left:0, top:0, z-0)                              │
│    100×32 viewBox · polyline fill:none · stroke-width:1.2                  │
│    opacity: 有数据→0.28-0.35 / flat→0.20                                    │
│    · 取 hourly_*_rate 最近 ~21 个点，Y轴映射到 32px 高度                      │
│    · 不需要末点圆，不需要坐标轴                                                │
│                                                                             │
│  第3层：指标数字 (relative, z-1, flex, justify-around, items-center, h-full) │
│    font-size: 8.5px (约 text-[9px])                                         │
│    · 左侧: 日均值     color: #6b7280 (gray-500)                             │
│    · 中间: 方向箭头   color: 按系列色 / 红 / 灰, font-weight: 600            │
│    · 右侧: CV值       color: #6b7280                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**三层叠加示意（以想要趋势-上升为例）：**

```
┌──────────────────────┐
│  ╱╲   ╱╲    ╱╲      │  ← 背景渐变(琥珀 0.10→0.02) + SVG折线(opacity 0.30)
│ ╱  ╲_╱  ╲__╱  ╲     │
│                      │
│ 日13.9   ↗   CV0.63 │  ← 三个指标数字 (z-1, 叠在SVG上方)
└──────────────────────┘
```

**颜色方案：**

| 列 | 背景渐变 rgba | SVG stroke | 方向箭头(up)色 |
|----|-------------|-----------|---------------|
| 想要趋势 | `rgba(217,119,6,0.10)` → `rgba(217,119,6,0.02)` | `#d97706` | `#d97706` |
| 浏览趋势 | `rgba(37,99,235,0.08)` → `rgba(37,99,235,0.01)` | `#2563eb` | `#2563eb` |
| 收藏趋势 | `rgba(124,58,237,0.08)` → `rgba(124,58,237,0.02)` | `#7c3aed` | `#7c3aed` |

`down` 方向箭头统一用 `#ef4444`(red-500)，`flat` 统一用 `#9ca3af`(gray-400)。

### 3.5 组件改造

修改 `MiniTrendChart` 组件，从纯 SVG 变为上述三层容器。或新建 `TrendCell` 组件承接此逻辑。Props：

| prop | 类型 | 说明 |
|------|------|------|
| `hourlyData` | `number[]` | 小时级时序数据（如 hourly_want_rate） |
| `slope` | `'up' \| 'down' \| 'flat' \| null` | 趋势方向 |
| `dailyAvg` | `number \| null` | 日均值 |
| `cv` | `number \| null` | 变异系数（stability） |
| `color` | `'amber' \| 'blue' \| 'violet'` | 颜色主题 |

---

## 4. 商品信息列

### 4.1 像素级布局

```
┌─ 商品信息列 (flex-1, text-left) ──────────────────────────────┐
│                                                                │
│  第1行：描述文本                                                │
│    text-[13px] text-gray-800 leading-snug line-clamp-2         │
│    无描述时：text-gray-400 italic "无描述"                       │
│                                                                │
│  第2行：元数据行                                                │
│    display:flex; align-items:center; gap:4px; flex-wrap:wrap   │
│    margin-top: 1-2px                                           │
│                                                                │
│    [GID链接] [状态badge] [优先级pill] [入库按钮]                 │
│                                                                │
│    GID链接:                                                    │
│      <a> text-[9px] text-gray-500 font-mono                    │
│      border-bottom: 1px dotted #9ca3af                         │
│      href="https://www.goofish.com/item?id={gid}"              │
│      target="_blank" rel="noopener noreferrer"                 │
│      末尾带 " ↗" 后缀                                           │
│                                                                │
│    状态badge:                                                  │
│      text-[9px] px-1.5 py-0.5 rounded-full                    │
│      可交互时 cursor-pointer hover:opacity-80                  │
│                                                                │
│    优先级pill:                                                 │
│      text-[9px] px-1 py-0.5 rounded                           │
│      bg-amber-50 text-amber-700 cursor-text                    │
│      显示 "⚡3" (点击展开select)                                 │
│      null 时不显示此pill                                        │
│                                                                │
│    入库按钮:                                                   │
│      text-[9px] px-1.5 py-0.5 rounded                         │
│      bg-indigo-50 text-indigo-600                              │
│      border border-indigo-200 cursor-pointer                   │
│      显示 "+入库"                                               │
│      monitorStatus===4 时不显示                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 GID 链接

- 当前：`<button>` 点击复制 GID 到剪贴板，`copiedGid` 状态管理
- 改为：`<a>` 链接，href=`https://www.goofish.com/item?id={gid}`，`target="_blank" rel="noopener noreferrer"`
- 字体：`text-[9px] text-gray-500 font-mono`，底部虚线下划线
- 移除 `copiedGid` 状态、`handleCopyGid` 函数、`Check` 图标引用

### 4.3 监控状态 badge

- 可点击，仅在 `monitorStatus === 1` 或 `monitorStatus === 0` 时可交互
- 点击：
  - 监控中(1) → 调用 `cancelMonitorItem(gid)` → 变为已暂停(0)
  - 已暂停(0) → 调用 `activateMonitorItem(gid)` → 变为监控中(1)
- 已分析(2) / 已入库(4)：不可点击，纯展示
- 状态映射（更新 STATUS_MAP）：

```typescript
const STATUS_MAP = {
  0: { label: '已暂停', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500' },
  1: { label: '监控中', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  2: { label: '已分析', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  4: { label: '已入库', dot: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700' },
}
```

移除状态 3 (PUBLISHED/已发布)。

### 4.4 优先级原地编辑

- 显示：数字 1-10，黄色背景 pill（`bg-amber-50 text-amber-700`），带 ⚡ 前缀
- 点击：展开为 `<select>` 下拉（1-10），自动聚焦
- onChange / onBlur：调用 `POST /monitor/item/priority` → 乐观更新本地状态
- `priority === null` 时显示 `-`

### 4.5 入库按钮

- 显示条件：`monitorStatus !== 4`（未入库时才显示）
- 样式：`bg-indigo-50 text-indigo-600 border border-indigo-200 rounded text-[9px] px-1.5 py-0.5`
- 点击：调用 `GET /monitor/item/stored?gid={gid}` → 成功后 badge 变为"已入库"(4)、按钮消失
- 乐观更新 + queryClient.invalidateQueries

---

## 5. 价格列（合并价格动向）

### 5.1 像素级布局

```
┌─ 价格列 (w-[80px], text-center) ──────────────┐
│                                                 │
│  第1行：¥价格                                    │
│    text-[13px] font-semibold text-gray-900      │
│    tabular-nums                                  │
│    例: "¥2.50"                                  │
│                                                 │
│  第2行：价格动向                                  │
│    text-[9px] font-semibold (有动向时)           │
│    "up"   → "↑提价" text-green-600              │
│    "down" → "↓降价" text-red-600                │
│    "flat" → "→平稳" text-gray-400               │
│    null   → 不显示                               │
│                                                 │
│  数据条（保留）:                                  │
│    absolute left-0 top-0 bottom-0               │
│    bg-gradient-to-r from-amber-200/50            │
│    width由getBarPct计算                          │
│    z-0（数字在z-1上层）                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 6. 抽屉顶部元数据重构

### 6.1 像素级布局

完整替换当前 ProductDiagnosticDrawer 的 Header 元数据区（第 50-93 行）。

```
┌─ 抽屉顶部元数据区 (space-y-1.5 → 改为结构化网格) ──────────────────────┐
│                                                                        │
│  第1行：标题 + 价格（flex, justify-between, items-start）                │
│    左：标题                                                             │
│      text-sm font-semibold text-gray-900 leading-snug                  │
│      取 product.description || product.title                           │
│    右：价格区块（text-right, ml-3, shrink-0）                            │
│      第1行：¥价格  text-[15px] font-bold text-gray-900                 │
│      第2行：动向   text-[10px]                                          │
│        "up"→"↑提价" text-green-600                                     │
│        "down"→"↓降价" text-red-600                                     │
│        "flat"→"→平稳" text-gray-400                                    │
│        null→"价格未知" text-gray-400                                    │
│                                                                        │
│  第2行：GID + 状态 + 优先级 + 入库（flex, gap-2, flex-wrap）             │
│    GID链接: 与表格 4.1 完全一致的 <a> 标签                                │
│    状态badge: 与表格 4.1 完全一致的交互逻辑                                │
│    优先级pill: 与表格 4.1 完全一致的原地编辑                               │
│    入库按钮: 与表格 4.1 完全一致                                         │
│                                                                        │
│  第3行：采集 + 上架 + 商家（flex, gap-3, text-[11px] text-gray-500）      │
│    采集: "采集: {可靠/有限/不足} ({N}次)"                                │
│    上架: "上架 {N} 天"                                                   │
│    商家: product.shopName                                               │
│        · 当前 `shopName` 来自 `MonitoredItemDTO.name`                   │
│        · 抽屉内共享此逻辑                                                │
│                                                                        │
│  第4行：关键词 pills（flex, flex-wrap, gap-1）                           │
│    text-[11px] bg-gray-100 text-gray-700 rounded-full px-2 py-0.5      │
│    (与当前抽屉内关键词样式保持一致)                                        │
│                                                                        │
│  保留：非活跃状态警告条（当前第87-91行红色提示），逻辑不变                    │
│  保留：触发信号 Hero Metric（当前第95-122行），逻辑不变                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**与表格共享原则：** 表格行和抽屉顶部的 GID链接、状态badge、优先级pill、入库按钮 四个元素使用完全相同的渲染逻辑和样式。如果提取共享子组件（`MonitorStatusBadge` / `PriorityEditor` / `StoredButton`），抽屉和表格共同引用。

### 6.2 变更明细

| 项目 | 当前 | 改为 |
|------|------|------|
| 标题 | 无（仅 Sheet title） | 抽屉内容区顶部显示描述 |
| 价格 | 无 | 🆕 ¥价格 + 动向 |
| GID | 纯文本 `GID: xxx` | `<a>` 链接跳转 |
| 监控状态 | 文本 `状态: xxx` | 可点击 badge（与表格一致） |
| 优先级 | 文本 `优先级: x` | 可原地编辑（与表格一致） |
| 入库按钮 | 无 | 🆕 与表格一致 |
| 关键词 | 已存在 | 保留（从表格移入） |
| 采集质量 | 已存在 | 保留 |
| 上架天数 | 已存在 | 保留 |
| 商家名 | 无 | 🆕 添加 `product.shopName` |
| 非活跃警告 | 已存在（红色条） | 保留 |

### 6.3 与表格共享逻辑

表格行和抽屉顶部共用同一套交互组件和 API 调用。考虑提取：
- `MonitorStatusBadge` — 状态 badge（可点击 toggle）
- `PriorityEditor` — 优先级原地编辑
- `StoredButton` — 入库按钮

---

## 7. 新增 API

### 7.1 前端 API 函数

```typescript
// 在 lib/api/selection.ts 新增

/** 商品入库 — GET /monitor/item/stored?gid= */
export async function storedMonitorItem(gid: string): Promise<{ gid: string; monitorStatus: number }> {
  return selectionFetch(`/monitor/item/stored?gid=${encodeURIComponent(gid)}`)
}

/** 修改优先级 — POST /monitor/item/priority */
export async function updateMonitorItemPriority(gid: string, priority: number): Promise<{ gid: string; priority: number }> {
  return selectionFetch('/monitor/item/priority', {
    method: 'POST',
    body: JSON.stringify({ gid, priority }),
  })
}
```

### 7.2 后端接口

| 端点 | 方法 | 请求参数 | 返回 |
|------|------|---------|------|
| `/monitor/item/stored` | GET | `gid: str` | `{gid, monitorStatus}` |
| `/monitor/item/priority` | POST | `{gid, priority}` | `{gid, priority}` |

`/monitor/item/stored` 后端将商品加入商机库，更新 `monitorStatus=4`，并刷新相关缓存。

---

## 8. monitorStatus 枚举变更

| 值 | 名称 | 含义 | 交互 |
|----|------|------|------|
| 0 | PAUSED | 已暂停 | 可点击→激活 |
| 1 | MONITORING | 监控中 | 可点击→暂停 |
| 2 | ANALYZED | 已分析 | 纯展示 |
| 4 | STORED | 已入库 | 纯展示 |

**移除 3 (PUBLISHED/已发布)。** 商品入库后不再有"发布"概念，统一为 STORED。

---

## 9. 改动范围汇总

| 文件 | 改动量 | 要点 |
|------|--------|------|
| `components/selection/product/ProductMonitorTab.tsx` | ~150 行 | 列重组、表头 sticky、商品信息列扩展、趋势列重写、交互逻辑新增 |
| `components/selection/product/MiniTrendChart.tsx` | ~50 行 | 重构：纯SVG → 背景折线+指标叠加 |
| `components/selection/product/ProductDiagnosticDrawer.tsx` | ~60 行 | 元数据区重构、新增价格/链接/入库/共享组件 |
| `lib/api/selection.ts` | ~20 行 | 新增 `storedMonitorItem`、`updateMonitorItemPriority` |
| `components/selection/product/ProductItem.ts` | 0 行 | `d7DailyCollect` 需在 dtoToProductItem 中新增计算 |

### 新增文件（可选提取）

| 文件 | 说明 |
|------|------|
| `components/selection/product/MonitorStatusBadge.tsx` | 状态 badge 共享组件 |
| `components/selection/product/PriorityEditor.tsx` | 优先级原地编辑共享组件 |

---

## 10. 不改的部分

- `WindowCompareCards` / `CumulativeGrowthChart` / `IntentConversionChart` / `TrafficActionChart` — 图表不变
- `StabilityPanel` / `GrowthPricePanel` — 面板不变
- `AnomalyBanner` — 异常预警不变
- `HourlyTrendDTO` / `WindowsSnapshotDTO` / `TrendDirectionDTO` — DTO 结构不变
- `ProductItem` 接口 — 新增 `d7DailyCollect` 衍生字段，其余不变
- 工具栏（搜索 + 统计）— 不变
- AI 分析报告折叠区 — 不变
- `ProductSortKey` 类型 — 移除 `wantStability/lookStability/collectStability/priceTrend`，新增 `wantTrend/lookTrend/collectTrend`

---

## 11. 接受标准

- [ ] 表格表头行冻结，滚动时始终可见
- [ ] 12 列布局正确，分组色条匹配新分组
- [ ] 商品信息列：描述 + GID链接(新标签页) + 状态badge(可点击) + 优先级(原地编辑) + 入库按钮
- [ ] GID 点击跳转 `https://www.goofish.com/item?id={gid}`（表格 + 抽屉一致）
- [ ] 价格列显示 ¥价格 + 动向箭头
- [ ] 三列趋势各自显示迷你图背景 + 日均 + 方向 + CV
- [ ] 抽屉顶部展示：标题、价格、GID链接、状态badge、优先级编辑、入库按钮、关键词pills、采集质量、上架天数、商家名
- [ ] 监控状态 badge 点击切换监控中↔已暂停（表格 + 抽屉一致）
- [ ] 优先级点击展开下拉 1-10，确认后调用 API（表格 + 抽屉一致）
- [ ] 入库按钮点击后 badge 变为"已入库"，按钮消失
- [ ] monitorStatus=3(PUBLISHED) 不再存在，替换为 4(STORED)
- [ ] `POST /monitor/item/priority` 可正常调用
- [ ] `GET /monitor/item/stored` 可正常调用
- [ ] 空状态/加载态不受影响
- [ ] `npx tsc --noEmit` 零错误
