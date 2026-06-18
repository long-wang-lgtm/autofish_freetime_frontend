# 选品监控独立页 & 商品历史表现 — 设计文档

> 状态：待评审 | 日期：2026-06-18

## 概述

将选品监控从商品发布页的二级 Tab 拆分为独立页面，重组 `components/selection/` 目录结构，并为商品监控 Tab 增加商品历史表现展示（迷你趋势图 + 历史详情面板）。

## 核心约束

**所有现有功能只允许扩展，不允许破坏。** 如果新设计与现有行为存在冲突，先记录冲突，不做破坏性改动。

具体红线：
- `ProductMonitorTab` 现有 15 列表格字段、排序、操作按钮不做任何删除/替换/重排
- 现有的 API 函数签名保持不变
- 现有的组件 props 接口保持不变
- 关键词采集 Tab 和商户监控 Tab 的功能不受影响

---

## 一、页面拆分

### 1.1 当前状态

`app/dashboard/publish/page.tsx` 是一个 PublishTab 页面，包含两个一级 Tab：

| Tab Key | 标签 | 内容 |
|---------|------|------|
| `publish` | 商品发布 | OpportunityLibrary + PublishWorkspace + EditorDrawer |
| `selection` | 选品监控 | SelectionTabBar → keyword / product / merchant |

### 1.2 目标状态

| 页面 | 路由 | 说明 |
|------|------|------|
| 商品发布 | `app/dashboard/publish/page.tsx` | 移除 `selection` Tab，恢复为纯发布页 |
| 选品监控 | `app/dashboard/selection/page.tsx` | 🆕 新建独立页，顶层三 Tab + 配置入口 |

**`app/dashboard/publish/page.tsx` 变更：**
- 删除 `selection` Tab 的导入和渲染
- 删除 `SelectionTabBar`、`KeywordCollectionTab`、`ProductMonitorTab`、`MerchantMonitorTab` 的导入
- 删除 `PUBLISH_TABS` 中 `selection` 条目
- 删除 `activePublishTab` 状态（不再需要，只有一个 Tab）
- 保留完整的商品发布功能不变

**`app/dashboard/selection/page.tsx`（新建）：**
- 顶层 `SelectionTabBar` 切换 keyword / product / merchant
- 右侧工具栏放设置入口（弹出 config 面板）
- 从 `publish/page.tsx` 迁出逻辑，无功能变更

### 1.3 导航

左侧导航栏（`components/layout/Sidebar.tsx`）新增独立一级项：

```typescript
// 在 navItems 数组中，"商品发布"之后、"设置"之前插入
{
  label: '选品监控',
  path: '/dashboard/selection',
  icon: (/* 图标待定，实现阶段选择 */),
},
```

Sidebar 已内置 `NavItem` + `isItemActive` 逻辑，新增项无需改动组件代码，只加配置即可。

当前 `navItems` 顺序（4 → 5 项）：账号管理 → 商品管理 → 商品发布 → **选品监控（新增）** → 设置

### 1.4 冲突记录

（无）

---

## 二、目录重组

### 2.1 当前结构

`components/selection/` 共 19 个文件，其中 6 个被 `publish/page.tsx` 或同目录文件引用，12 个 orphaned（未被任何页面导入）。

### 2.2 目标结构

```
components/selection/
├── shared/                        # 跨 Tab 公用组件
│   ├── TabBar.tsx                 # 顶层三 Tab 路由（keyword/product/merchant）
│   ├── ViewToggle.tsx             # 网格/列表视图切换
│   ├── DateListSidebar.tsx        # 日期列表侧栏
│   └── HeatmapCalendar.tsx        # 日历热力图
│
├── keyword/                       # 关键词采集 Tab
│   ├── KeywordCollectionTab.tsx   # Tab 主面板
│   ├── NewKeywordModal.tsx        # 新建关键词弹窗
│   ├── VerticalTimeline.tsx       # 时间线侧栏
│   ├── CategoryCard.tsx           # 分类卡片
│   ├── CategoryCardGrid.tsx       # 分类卡片网格
│   ├── CategoryTypeTabs.tsx       # 场景/行业分类切换
│   ├── KeywordsConfig.tsx         # 对标关键词配置
│   ├── ReportCard.tsx             # 日报卡片
│   ├── ReportControlBar.tsx       # 报告生成控制栏
│   └── ReportSubTabs.tsx          # 日报/汇总子 Tab
│
├── product/                       # 商品监控 Tab
│   ├── ProductMonitorTab.tsx      # Tab 主面板（商品列表，现有功能不变）
│   ├── MiniTrendChart.tsx         # 🆕 列表行内迷你趋势图（新增列）
│   ├── ProductHistoryDrawer.tsx   # 🆕 历史详情抽屉（基于 Sheet 组件）
│   └── TrendChart.tsx             # 🆕 可交互完整趋势图（抽屉内用）
│
├── merchant/                      # 商户监控 Tab
│   └── MerchantMonitorTab.tsx     # Tab 主面板
│
└── config/                        # 页面级配置
    ├── AccountsConfig.tsx         # 对标账号配置
    ├── AIConfig.tsx               # AI 分析配置
    └── CollectionConfig.tsx       # 采集频率/时间/留存配置
```

### 2.3 文件归类逻辑

| 归入 | 文件 | 理由 |
|------|------|------|
| `shared/` | TabBar, ViewToggle, DateListSidebar, HeatmapCalendar | 被多个 Tab 或页面级使用，无业务耦合 |
| `keyword/` | CategoryCard, CategoryCardGrid, CategoryTypeTabs, KeywordsConfig | 分类浏览和关键词配置，属于关键词采集流程 |
| `keyword/` | ReportCard, ReportControlBar, ReportSubTabs | 日报和选品汇总是关键词采集链路的输出产物 |
| `product/` | ProductMonitorTab + 3 个新组件 | 商品监控，自成一域 |
| `merchant/` | MerchantMonitorTab | 商户监控，自成一域 |
| `config/` | AccountsConfig, AIConfig, CollectionConfig | 页面级配置面板，不属于任一 Tab |

### 2.4 导入路径变更

所有现有组件移动后，需更新其导入路径。影响范围：
- `publish/page.tsx` — 移除 `selection/` 相关导入
- `selection/page.tsx`（新建）— 从新路径导入
- 同目录交叉引用（`CategoryCardGrid` → `CategoryCard`，`KeywordCollectionTab` → `NewKeywordModal` / `VerticalTimeline`）— 更新为相对路径
- 12 个 orphaned 组件的内部导入（如果有引用 `@/stores/selection.store` 或 `@/lib/api/selection`）— 路径不变，仅组件自身的 `@/components/selection/` 交叉引用需更新

---

## 三、商品历史表现

### 3.1 功能概述

在 `ProductMonitorTab` 的商品列表中，为每行增加迷你趋势图概览，点击行可在右侧面板查看该商品的详细历史表现（询单趋势、转化率趋势、稳定性指标）。

### 3.2 列表行交互

**现有交互保持：**
- 监控状态 badge 点击 → 切换监控启用/暂停（不变）
- 行尾操作按钮（取消监控/删除）→ 执行对应操作（不变）
- 列排序、搜索过滤 → 全部保留

**新增交互：**
- 点击行内**非操作区域**（即不命中 badge 和操作按钮）→ 选中该行，右侧展开历史详情面板
- 选中行高亮显示（背景色区分）
- 再次点击同一行或点击面板关闭按钮 → 取消选中、收起面板

### 3.3 新增列

在现有 15 列之后追加 2 列：

#### 列 16：趋势指标（可排序）

- 内容：箭头 + 涨跌幅百分比，如 `↑ 23.5%` / `↓ 12.0%` / `→ 0%`
- 数值 = `(latestInquiry - earliestInquiry) / earliestInquiry × 100%`
- 颜色：正值 → green-600，负值 → red-600，零/接近零 → gray-400
- 排序：按 `trendValue` 数值排序（`ProductSortKey` 新增 `trendValue`）
- 宽度：约 90px

#### 列 17：近期趋势（不可排序）

- 内容：`MiniTrendChart` 组件
- 纯折线 sparkline，无坐标轴、无刻度标签、无网格线
- 数据源：`recentInquiries: number[]`（最近 10 次采集的询单数）
- 颜色：由 `trend` 字段决定 — up → green-600，down → red-600，flat → gray-400
- 尺寸：宽约 100px，高约 28px，适配表格行高
- hover 时显示最后一次采集的询单数 tooltip
- 不可排序（视觉辅助列）

### 3.4 历史详情抽屉

**触发：** 点击商品行

**展示形式：** 复用 `@/components/ui/Sheet` 组件，右侧 overlay 抽屉滑入，不挤压表格。默认宽度 500px。

```
┌──────────────────────────────────────────────────┐
│  [搜索] [排序] [筛选]                  [⚙ 设置]   │
│                                                  │
│   商品列表（表格，宽度不变）                        │
│                                                  │
│   ★ 高亮选中行                                    │
│                                                  │
│                                      ┌─ Sheet ──┤
│                                      │ 商品 / GID│
│                                      │ [7天]     │
│                                      │           │
│                                      │ 询单趋势   │
│                                      │           │
│                                      │ 转化率趋势 │
│                                      │           │
│                                      │ 稳定性     │
│                                      │           │
│                                      │ 汇总      │
│                                      └───────────┤
└──────────────────────────────────────────────────┘
```

### 3.5 面板内容规格

#### 头部
- 商品描述 + GID（复用列表中的显示逻辑），通过 Sheet 的 `title` prop 传入
- 时间范围快捷切换按钮组：近 7 天 / 近 30 天 / 近 90 天（默认近 7 天）
- 关闭按钮由 Sheet 组件自带（右上角 ✕）

#### 图表 1：询单趋势
- 类型：双折线图
- 线 1（实线，品牌色）：每次采集的询单数
- 线 2（虚线，gray-400）：7 日移动平均（当选择 < 14 天时不显示）
- X 轴：采集时间点（`MM-DD HH:mm` 格式）
- Y 轴：询单数
- Tooltip：hover 显示具体时间和数值

#### 图表 2：转化率趋势
- 类型：双折线图（双 Y 轴或同轴不同色）
- 线 1（实线，blue-500）：浏览 → 询单转化率（%）
- 线 2（实线，purple-500）：询单 → 收藏转化率（%）
- X 轴：采集时间点（与图表 1 对齐）
- Tooltip：hover 显示两个转化率的具体值

#### 稳定性指标
两列并排卡片，各显示：
- 指标名 + 数值（CV 值，如 `0.23`）
- 等级标签：稳定（CV ≤ 0.3）/ 一般（0.3 < CV ≤ 0.6）/ 波动（CV > 0.6）
- 标签颜色：绿色 / 黄色 / 红色

#### 汇总区
| 指标 | 格式 | 推算 |
|------|------|------|
| 时间段总询单 | 整数 | sum(recentInquiries) |
| 日均询单 | 一位小数 | 总询单 / 天数 |
| 询单→收藏转化率均值 | 百分比一位小数 | avg(转化率序列) |
| 询单趋势方向 | 箭头 + 涨跌幅% | (最新 - 最早) / 最早 × 100 |

### 3.6 空态

| 场景 | 展示 |
|------|------|
| 未选中任何商品 | 面板显示占位文案"选择商品查看历史表现"，灰色居中 |
| 选中商品但无历史数据 | 面板显示"该商品暂无历史采集数据" |
| 数据加载中 | 面板内各区块显示骨架屏 |

### 3.7 冲突记录

| # | 冲突 | 处理方式 |
|---|------|---------|
| 1 | 新增 2 列使表格总列数变为 17，可能影响横向滚动和列宽分配 | 不删改现有列，新列各给固定宽度（趋势指标 90px + 近期趋势 100px），表格自然增加横向滚动 |
| 2 | 行点击选中与监控状态 badge 点击事件可能冒泡冲突 | badge 的 onClick 使用 `e.stopPropagation()` 阻止冒泡；操作按钮同样处理 |

---

## 四、配置入口

`config/` 下的三个配置组件（AccountsConfig / AIConfig / CollectionConfig）当前 orphaned，需在选品监控页面提供入口。

**方案：** 页面工具栏右侧"⚙ 设置"按钮，点击弹出配置抽屉 / 弹出面板，内含三个配置组件的 Tab 或垂直排列。

具体布局留到实现阶段根据三个组件的实际内容量决定，不在此设计阶段展开。

---

## 五、新增 API 字段

> 以下为前端期望的数据字段说明，具体后端实现不在本次设计范围。

### 5.1 列表接口扩展

在现有商品监控列表接口返回的每行数据中，新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| `recentInquiries` | `number[]` | 最近 10 次采集的询单数，按时间升序，供迷你图渲染 |
| `trend` | `'up' \| 'down' \| 'flat'` | 近 10 次采集的询单整体趋势方向，决定迷你图颜色 |
| `trendValue` | `number` | 趋势涨跌幅百分比（如 23.5 表示 +23.5%），供趋势指标列展示和排序 |
| `lastCollectedAt` | `string \| null` | 最近一次采集时间（ISO 8601），供迷你图 tooltip |

### 5.2 历史详情接口（新端点）

| 项目 | 说明 |
|------|------|
| 方法 | `GET` |
| 路径 | `/api/monitor/item/{gid}/history` |
| 参数 | `days: 7 \| 30 \| 90`（默认 7） |
| 返回 | `{ gid, items: HistoryPoint[] }` |

`HistoryPoint` 结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `collectedAt` | `string` | 采集时间（ISO 8601） |
| `inquiryCount` | `number` | 本次采集时的询单数 |
| `viewCount` | `number` | 本次采集时的浏览数 |
| `wantCount` | `number` | 本次采集时的想要数 |
| `favoriteCount` | `number` | 本次采集时的收藏数 |
| `price` | `number \| null` | 本次采集时的价格（如有变动） |

前端根据原始数据自行计算：
- 浏览→询单转化率 = `inquiryCount / viewCount`
- 询单→收藏转化率 = `favoriteCount / inquiryCount`
- 询单稳定性 CV = `stddev(inquiryCounts) / mean(inquiryCounts)`
- 转化稳定性 CV = `stddev(conversionRates) / mean(conversionRates)`

---

## 六、组件树总览

```
app/dashboard/publish/page.tsx           # 纯发布页（移除 selection Tab）
app/dashboard/selection/page.tsx         # 🆕 独立选品监控页
  ├── SelectionTabBar (shared/)
  ├── KeywordCollectionTab (keyword/)     # Tab: 关键词采集
  ├── ProductMonitorTab (product/)        # Tab: 商品监控
  │   ├── MiniTrendChart (product/)       # 🆕 第 17 列（迷你趋势图）
  │   └── ProductHistoryDrawer (product/) # 🆕 历史详情抽屉（内嵌 Sheet）
  │       └── TrendChart (product/)       # 🆕 折线图
  ├── MerchantMonitorTab (merchant/)      # Tab: 商户监控
  └── SettingsDrawer                      # 设置入口（容纳 config/ 组件）
      ├── AccountsConfig (config/)
      ├── AIConfig (config/)
      └── CollectionConfig (config/)
```

---

## 七、不在此次范围内的内容

- 商品监控页表格字段的重排/增加/删除（除"近期趋势"列外）
- merchant Tab 的历史表现
- 关键词采集 Tab 的重构
- 后端历史数据采集与存储的实现
- 图表的响应式适配细节（移动端）
- 历史数据的导出功能
