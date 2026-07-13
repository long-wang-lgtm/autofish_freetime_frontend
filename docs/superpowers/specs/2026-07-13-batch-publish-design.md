# 批量创作发布系统 — 设计规格

> 2026-07-13 | 替代旧 `/dashboard/publish`（1:1 模型 → 1:N 模型 + 后端同步返回 + 4 节点进度）
> 层级说明：第一章（战略）→ 第二章（数据）→ 第三/四章（页面）→ 第五/六章（执行）
> **2026-07-13 更新**：附录 C 全部 23 项 API 差异已修复，§5.1 已更新为对齐后的接口，附录 C 已删除。修复详情见 `2026-07-13-batch-publish-api-alignment-fix.md`。

---

## 一、战略层：目标与边界

### 1.1 核心 JTBD

旧系统的根本缺陷：商机与素材是 **1:1 刚性绑定**。一个商机只能关联一个来源商品，运营看到一个品类下 10 个热度上升的商品时，需要创建 10 个重复的商机、写 10 份类似的文案。

新系统的核心任务：**用一个商机聚合多个同类监控商品**，运营创建一次商机就能批量生成 N 份素材，每份素材独立选择注入哪些商品数据给 AI 做改写参考。

这不是"把单次发布变成多次"的量变，而是从"单个素材手工打造"到**"数据驱动的批量创作工厂"**的质变。

### 1.2 成功标准

| # | 标准 | 衡量方式 |
|---|------|----------|
| 1 | 商机聚合减少重复操作 | 从"发现趋势商品"到"第一份素材"的操作步数（预期 6-7 → 3-4 步） |
| 2 | 批量操作的"批量感"成立 | 多行同时触发 AI 改写，不等前一个完成就能点下一个 |
| 3 | 跨 Tab 信息流连贯 | 绑定后商机 counting 实时反映；切 Tab 不出现数据不一致 |
| 4 | 4 节点进度清晰可见 | StatusPipeline（改写/封面/生图/发布）一眼看出完成度，按钮状态机自动提示下一步 |
| 5 | 移动端可完成核心流程 | 绑定 → 创作 → 发布在移动端可闭环，非"只能看不能做" |

### 1.3 不可逆/高代价决策

| 决策 | 选择 | 代价 |
|------|------|------|
| 路由结构 | **1 页 4 Tab**（`/dashboard/batch-publish?tab=`） | 拆成独立路由需重构 Sidebar + 跨页面缓存传递 |
| 创作台布局 | **左右分栏** + Sheet 编辑器 | 改成上下堆叠需重构 CSS 结构 + 移动端降级 |
| API 隔离 | **新旧 API 完全隔离**（新用 `/api/selection/*`，旧用 `/api/publish/*`） | 合并需重写所有 query key |

### 1.4 明确不在首版范围

- 自动商机发现（推荐算法）
- 跨商机批量发布
- 素材版本管理（V1→V2→V3）
- 多人协作编辑
- 监控数据历史对比（环比分析）
- 定时发布
- 跨页批量选择
- 监控综合评分算法

---

## 二、数据层：实体关系与数据流

### 2.1 三条核心数据关系

```
ItemMonitored (监控商品) ──N:1──> Opportunity (商机) ──1:N──> PublishMaterial (素材)
     │                                                              │
     │ opportunity_id (FK, nullable, SET_NULL on delete)            │ ai_context.items (gid[] 逻辑引用)
     └──────────────────────────────────────────────────────────────┘
```

**关系 A：ItemMonitored N:1 Opportunity** — FK `opportunity_id`，nullable。运营勾选 N 个同类型商品批量绑定到一个商机，作为素材创作的"参考商品集合"。

**关系 B：Opportunity 1:N PublishMaterial** — FK `opportunity_id`，NOT NULL。一个商机生成 N 份素材，每份独立演化。

**关系 C：PublishMaterial.ai_context.items → ItemMonitored.gid** — 逻辑引用（非 FK）。每份素材可独立选择商机下的商品子集注入 AI 上下文。这是 1:N 模型的灵魂：素材 A 选商品 1、2，素材 B 选商品 1、3——互不影响。

### 2.2 实体详细定义

**Opportunity（商机）**：`id`, `name`(unique, max 100), `description`, `price`(default 2), `status`(active/inactive), `ai_context_template`(only_opportunity/with_item), `userId`, `monitored_items`(ReverseRelation), `materials`(ReverseRelation)

**ItemMonitored（监控商品）**：`gid`(PK), `title`, `description`, `itemStatus`, `publishTime`, `uid`, `name`, `keywords`, `intervalHours`, `monitorStatus`(0=paused/1=monitoring/2=analyzed/3=stored/-100=deleted), `wantSlope`, `wantAvg`, `convertRate`, `hideAvg`, `trendData`(JSON: trendTime+trendDays+fetchCount+windows), `opportunity_id`(FK nullable)

**PublishMaterial（素材）**：`id`(PK), `images`(list[MaterialImage]), `description`, `price`, `category`, `status`(9-stage enum), `ai_context`(JSON: template+images?+items?+coverprompt?), `to_uid`, `to_gid`, `opportunity_id`(FK NOT NULL)

#### 2.2.1 TrendData 类型定义

`ItemMonitored.trendData` 字段存储为 JSON，前端类型定义如下：

```typescript
/** 趋势数据 — 时序（按采集时间点） */
interface TrendTime {
  timestamp: number[]       // Unix 时间戳（秒），按采集时间升序
  lookCount: number[]       // 累计浏览量
  wantCount: number[]       // 累计想要数
  collectCount: number[]    // 累计收藏数
}

/** 趋势数据 — 日维度 */
interface TrendDays {
  date: number[]            // 零点 Unix 时间戳，按日期升序
  lookIncrement: number[]   // 日浏览增量
  wantIncrement: number[]   // 日想要增量
  collectIncrement: number[]// 日收藏增量
  convertRate: number[]     // 转化率（小数，如 0.085 = 8.5%）
  hideAvg: number[]         // 询藏比（小数）
}

/** 趋势数据 */
interface TrendData {
  trendTime: TrendTime      // 趋势数据（采集时间点）
  trendDays: TrendDays      // 趋势数据（按天汇总）
  fetchCount: number        // 窗口内采集次数——决定指标置信度
  windows: number           // 实际窗口天数——决定数据时效范围
}
```

**置信度规则**：`fetchCount < 6` 时视为低置信度，前端 UI 给予警告样式（italic + amber-600 色），提示运营审慎参考该商品的趋势指标。

### 2.3 素材状态模型

后端模型定义了 10 个 `MaterialStatus` 枚举值（含 4 个中间态），但由于后端 **同步返回结果**（API 调用期间处于中间态，返回时已是终态），前端实际只处理 **6 个稳定状态**：

| 前端可见状态 | 含义 | 后端对应 |
|-------------|------|---------|
| pending | 初始草稿 | `PENDING` |
| writing_done | 改写完成 | `WRITINGDONE` |
| genimageplan_done | 封面规划完成 | `GENIMAGEPLANDONE` |
| genimage_done | 生图完成 | `GENIMAGEDONE` |
| published | 发布成功 | `PUBLISHDONE` |
| publish_failed | 发布失败 | `PUBLISHFAILED` |

中间态（writing/genimageplan/genimage/publishing）仅存在于 API 调用期间，前端按钮显示 loading spinner 即可，**不轮询、不展示中间态**。

4 节点进度条：
```
改写 ○/●/✕  →  封面规划 ○/●/✕  →  生图 ○/●/✕  →  发布 ○/●/✕
```
- ○ = 未开始
- ● = 已完成（对应 *_done 状态）
- ✕ = 失败（仅发布阶段可能出现 publish_failed）

### 2.4 React Query 缓存边界

**按自然数据所有权划分**：

```
第 0 层（全局共享）：
  ['batch-publish', 'opportunities']     — 商机列表（监控 Tab 绑定弹窗 + 创作台共用）

第 1 层（按商机隔离——核心边界）：
  ['batch-publish', 'monitored-items']   — 监控商品列表（筛选页专用）
  ['batch-publish', 'materials', oid]    — 该商机下的素材列表
  ['batch-publish', 'materials', 'all']  — 跨商机素材全集（发布记录）

第 2 层（纯 UI 状态，不缓存）：
  selectedOpportunityId                  — 创作台当前选中商机
  editingMaterialId                      — 当前编辑的素材
```

**缓存失效矩阵**：

| 操作 | 需失效的 Query Keys |
|------|-------------------|
| 绑定商品到商机 | `['batch-publish', 'monitored-items']`, `['batch-publish', 'opportunities']` |
| 解绑商品 | 同上 |
| 删除监控商品 | `['batch-publish', 'monitored-items']` |
| 创建/编辑/删除商机 | `['batch-publish', 'opportunities']` |
| 创建素材 | `['batch-publish', 'materials', oid]`, `['batch-publish', 'materials', 'all']`, `['batch-publish', 'opportunities']` |
| 编辑素材 | 乐观更新 |
| AI 改写/生图 | `['batch-publish', 'materials', oid]`, `['batch-publish', 'materials', 'all']` |
| 发布素材 | 同上 + `['batch-publish', 'monitored-items']` |

### 2.5 数据一致性风险与降级策略

**风险 1：商品解绑后素材 ai_context.items 仍引用它**
- 素材已完成的内容不受影响
- 重新改写时后端 AI Agent 查不到该 gid：**跳过而非抛错**
- 前端编辑器打开时：过滤 ai_context.items 中不在当前商机下的 gid

**风险 2：删除商机级联删除素材**
- PublishMaterial FK 可能 CASCADE——删除商机前检查 materialCount > 0，ConfirmDialog 提示 "该商机下有 N 份素材将被一并删除"

### 2.6 页面间数据传递

```
监控 Tab ──(绑定 gids→oid)──> 商机管理 Tab ──(点击卡片)──> 创作台 Tab ──(发布完成)──> 发布记录 Tab
```

| 路径 | 传递方式 | 数据 |
|------|---------|------|
| 监控 → 商机管理 | API `POST /monitor.batch.bind` | gids + opportunity_id |
| 商机管理 → 创作台 | **URL 参数** `?tab=workbench&oid=123` | oid |
| 创作台 → 发布记录 | **URL 参数** `?tab=materials&oid=123`（可选预筛选） | oid |

---

## 三、页面层：架构与关系

### 3.1 路由与页面骨架

```
/dashboard/batch-publish?tab=monitor|opportunity|workbench|materials
```

默认 Tab：`monitor`（工作流起点）。深度链接：`?tab=workbench&oid=123`。

```tsx
// app/dashboard/batch-publish/page.tsx
'use client'
export default function Page() {
  return <Suspense><PageContent /></Suspense>
}
function PageContent() {
  const [activeTab, setTab] = useTabRouting<TabName>(
    ['monitor', 'opportunity', 'workbench', 'materials'], 'monitor'
  )
  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setTab} variant="overline" />
      {activeTab === 'monitor' && <MonitorTab />}
      {activeTab === 'opportunity' && <OpportunityTab />}
      {activeTab === 'workbench' && <WorkbenchTab />}
      {activeTab === 'materials' && <MaterialsTab />}
    </div>
  )
}
```

侧边栏：`{ label: '批量创作', path: '/dashboard/batch-publish' }`

### 3.2 四 Tab 概览

| Tab | Key | 信息密度 | 核心操作 | PC 布局 | 移动端降级 |
|-----|-----|---------|----------|---------|-----------|
| 商品监控 | monitor | 中高（10 列数据 + 3 核心指标） | 筛选排序、批量绑定/解绑 | SearchToolbar + DataTable | 卡片列表 |
| 商机管理 | opportunity | 中（卡片/表格双视图） | CRUD、跳转创作台 | SearchToolbar + 卡片网格 | 单列卡片 |
| 创作台 | workbench | **最高**（7 层信息同时可见） | 选商机、批量创建、AI 改写、发布 | 左右分栏 + Sheet | Push/Pop 导航 |
| 发布记录 | materials | 低（只读档案） | 查看已发布/失败记录、筛选 | SearchToolbar + DataTable | 卡片列表 |

### 3.3 信息密度分析——创作台

创作台是所有页面中唯一需要**同时展示参考数据 + 操作目标 + 动作选项 + 进度状态**的页面：

```
层 1: 左侧商机列表（卡片：名称+商品数+素材数+状态）     ← 上下文导航
层 2: 右侧商机头部（名称+价格+统计摘要+操作按钮）        ← 当前目标
层 3: ReferencePanel（N 张监控商品指标卡片，横向滚动）   ← 决策依据
层 4: 素材表格（描述+价格+状态+AI 按钮+进度+微调入口）    ← 核心操作区
层 5: AI 按钮状态机（改写/封面/生图/发布 四按钮组合）     ← 动作选项
层 6: StatusPipeline（改写●/封面○/生图○/发布○）          ← 进度可视化
层 7: Sheet 编辑器（图片+描述+价格+类目+AI 上下文配置）   ← 细节编辑
```

设计后果：左右分栏是刚需（非可选）。ReferencePanel 必须可折叠。AI 操作在表格行内完成（不能让运营先选中行再打开编辑面板点 AI 按钮——那又退回 1:1 模式）。

### 3.4 跨 Tab 导航捷径

| 当前位置 | 目标 | 触发方式 | URL |
|----------|------|----------|-----|
| 监控 Tab | 创作台（预选刚绑定的商机） | 绑定成功 toast 中的"去创作台"链接 | `?tab=workbench&oid=X` |
| 商机管理 Tab | 创作台（预选商机） | 卡片点击 | `?tab=workbench&oid=X` |
| 发布记录 Tab | 创作台（预选商机） | "所属商机"列链接 | `?tab=workbench&oid=X` |
| 创作台（概览） | 发布记录（已发布） | 顶栏"查看已发布记录" | `?tab=materials` |

### 3.5 新旧系统对比

| 维度 | 旧 `/dashboard/publish` | 新 `/dashboard/batch-publish` |
|------|------------------------|------------------------------|
| 商机:监控商品 | 1:1 | **1:N** |
| 商机列表 | 无分页、无搜索 | 分页 + 搜索 + 状态筛选 |
| 参考信息 | 仅商机详情 | 商机详情 + **可折叠监控商品指标面板**（横向卡片） |
| AI 上下文 | 全局 prompt template | **每份素材独立选择**注入商品 |
| 素材状态 | 5 种 | **9 阶段流水线** + 进度条 |
| 批量操作 | 无 | 多选 + 逐行独立触发 AI |
| 后端 API | `/api/publish/*` | `/api/selection/*` |

---

## 四、Tab 详细设计

### 4.1 商品监控 Tab

#### 4.1.1 布局结构

**PC 端**：SearchToolbar + DataTable + Pagination（默认纯表格视图）。点击表格行后，右侧滑出 **趋势图侧边栏**（~420px 宽），覆盖在内容区上方，点击遮罩或关闭按钮收起。侧边栏内显示 3 张 ECharts 趋势图（三等分高度）。

```
┌───────────────────────────────────────┬────────────────────────┐
│ SearchToolbar（搜索+监控状态+绑定状态）   │                        │
├───────────────────────────────────────┤  侧边栏 (420px)         │
│ DataTable                             │  ┌───────────────────┐ │
│ ┌───────────────────────────────────┐ │  │ 商品摘要           │ │
│ │☐│gid│标题│价格│斜率    │日均│转化│  │ │  │ 标题/价格/状态     │ │
│ │☐│..│... │...│+12.5%  │342│8.5%│  │ │  │ 采集5次·窗口7天   │ │
│ │ │  │    │   │采集3次  │   │    │  │ │  ├───────────────────┤ │
│ │ │  │    │   │·窗口7天 │   │    │  │ │  │ 📈 累计趋势       │ │
│ │☐│..│... │...│-3.2%   │128│2.1%│  │ │  │ 折线图（三等分）   │ │
│ │ │  │    │   │采集1次  │   │    │  │ │  │ lookCount 琥珀    │ │
│ │ │  │    │   │·窗口2天 │   │    │  │ │  │ wantCount 蓝      │ │
│ └───────────────────────────────────┘ │  │ collectCount 紫     │ │
│ Pagination                           │  ├───────────────────┤ │
│                                      │  │ 📊 日增量          │ │
│                                      │  │ 面积折线图 双Y轴   │ │
│                                      │  │ 左: lookIncrement  │ │
│                                      │  │ 右: want+collect   │ │
│                                      │  ├───────────────────┤ │
│                                      │  │ 📉 转化率&询藏比   │ │
│                                      │  │ 双Y轴折线          │ │
│                                      │  │ convertRate 蓝     │ │
│                                      │  │ hideAvg 紫罗兰     │ │
│                                      │  └───────────────────┘ │
└───────────────────────────────────────┴────────────────────────┘
```

**移动端**：卡片列表降级（dataTable 的 11 列降为关键字段卡片）。点击卡片 → BottomSheet（heightRatio=0.85）弹出，3 张趋势图纵向滚动。长按进入批量选择。

#### 4.1.2 筛选栏

- 搜索框：标题/uid/gid 模糊搜索
- 监控状态下拉：全部 / 监控中 / 已分析 / 已入库 / 已暂停
- 绑定状态：全部 / 已绑定 / 未绑定

**默认策略**（硬编码）：排序 wantSlope DESC（增长最快排前）+ 筛选 monitorStatus=1（监控中）+ opportunity_id=0（未绑定）——运营核心任务是找"活跃且未绑定"的好商品。

#### 4.1.3 表格列

| 列 | 宽度 | 字段 | 说明 |
|----|------|------|------|
| 复选框 | 32px | — | 批量选择 |
| 商品 gid | 0.8fr | gid | 文本，可复制 |
| 标题 | 2fr | title | line-clamp-2 |
| 价格 | 0.7fr | price | fmtPrice |
| 想要斜率 | 0.9fr | wantSlope | **主排序键**，fmtGrowth 带正负颜色，下方副标题"采集N次·窗口M天"（text-xs text-gray-400）。数据窗口信息帮助运营评估指标可信度 |
| 日均想要 | 0.8fr | wantAvg | fmtNumber |
| 转化率 | 0.7fr | convertRate | fmtPercent |
| 商品状态 | 0.7fr | itemStatus | StatusBadge |
| 监控状态 | 0.7fr | monitorStatus | StatusBadge（0=暂停/灰, 1=监控中/绿, 2=已分析/蓝, 3=已入库/紫） |
| 绑定商机 | 1fr | opportunity | 商机名称 或 "未绑定"（text-gray-400） |
| 操作 | 0.6fr | — | 详情(点击→侧边栏)、绑定/解绑、删除 |

GRID_COLS: `32px 0.8fr 2fr 0.7fr 0.9fr 0.8fr 0.7fr 0.7fr 0.7fr 1fr 0.6fr`

wantSlope 列副标题逻辑：读取 `trendData.fetchCount` 和 `trendData.windows`，无 trendData 时显示"无数据"。低采集次数（<6）时副标题用 italic + text-amber-600 警告色，提示运营该指标置信度低。

**排序**：wantSlope / wantAvg / convertRate（三列可排序）

#### 4.1.4 侧边栏趋势图

侧边栏仅在 PC 端出现（移动端用 BottomSheet）。顶部显示商品摘要（标题 + 价格 + 状态 Badge + 采集窗口元信息），下方 3 张 ECharts 图表三等分剩余高度（每张约 30%）。

数据来源：`MonitoredItem.trendData` 字段（`TrendData` 类型，详见 §2.2 数据模型）。

**图表配色常量**（遵循 frontend-charts.md，图表色与 UI 交互色独立）：

| 常量 | 色值 | 用途 |
|------|------|------|
| `TREND_WANT` | `#2563eb`（蓝） | 想要 / 转化率 — 核心转化指标 |
| `TREND_LOOK` | `#d97706`（琥珀） | 浏览 — 流量指标 |
| `TREND_COLLECT` | `#7c3aed`（紫罗兰） | 收藏 / 询藏比 — 兴趣指标 |

**图1 — 累计趋势（折线图）**：

- 数据源：`trendData.trendTime`
- 三条折线：lookCount（琥珀）、wantCount（蓝）、collectCount（紫罗兰）
- X 轴：timestamp → `MM-DD HH:mm` 格式
- 单 Y 轴（三个指标量级相近）
- dataZoom：bottom slider (height: 16, bottom: 8) + inside
- legend：bottom 12px，ECharts 内置
- grid: `{ left: 48, right: 16, top: 12, bottom: 48 }`
- lineStyle.width: 1.5

**图2 — 日增量（面积折线图 / 双Y轴）**：

- 数据源：`trendData.trendDays`
- 面积折线：`areaStyle` 填充 15% 透明度 + `smooth: true`
- 左 Y 轴：lookIncrement（蓝色面积）
- 右 Y 轴：wantIncrement（紫色面积）+ collectIncrement（琥珀面积）
- 双 Y 轴原因：lookIncrement 量级通常远大于 wantIncrement/collectIncrement，混合单轴会压扁小量级曲线
- X 轴：date（零点时间戳）→ `MM-DD` 格式
- 其余配置同图1

**图3 — 转化率 & 询藏比（双Y轴折线）**：

- 数据源：`trendData.trendDays`
- 左 Y 轴：convertRate（蓝），格式化为百分比
- 右 Y 轴：hideAvg（紫罗兰），格式化为百分比
- 双 Y 轴原因：两个指标量级和含义完全不同（转化率 vs 询藏比），需要独立刻度
- X 轴：同图2
- 其余配置同图1

**低置信度警告**：当 `trendData.fetchCount < 6` 时，在侧边栏摘要区显示 amber 警告："采集次数较少（N次），数据置信度较低"，提示运营审慎参考趋势。

#### 4.1.5 批量操作

勾选商品（仅当前页）→ 底部 BatchActionBar 出现

- "绑定到商机" → BindOpportunityModal：
  - Tab "选择已有商机"：搜索框 + 商机列表（单选）+ 分页
  - Tab "创建新商机"：表单（名称*、描述、AI模板下拉）
- 确认 → API → toast + 刷新

**解绑**：ConfirmDialog → `POST /monitor.unbind.opportunity`

#### 4.1.6 移动端

卡片列表降级（`useIsMobile` 检测）。每张卡片展示：

- 标题 (text-sm font-medium line-clamp-2)
- 价格 (fmtPrice) + 商品状态 StatusBadge
- 三色块指标行：wantSlope（fmtGrowth，正=绿/负=红）+ wantAvg（fmtNumber）+ convertRate（fmtPercent）
- 采集窗口信息（text-xs text-gray-400）
- 绑定状态 dot（绿=已绑定，灰=未绑定）
- 触摸目标 ≥ 44px

点击卡片 → BottomSheet（heightRatio=0.85），纵向滚动显示 3 张趋势图。

长按进入批量选择模式（同 PC 端 BatchActionBar）。

### 4.2 商机管理 Tab

**布局**：SearchToolbar + 卡片网格（桌面 3 列） / 表格视图 + Pagination

**卡片设计**：
```
┌──────────────────────┐
│ 日系简约风手机壳  ✏️ 🗑│
│ 适合夏季搭配的简约...  │
│ ¥12.00  active       │
│ 📦 5 监控商品        │
│ 📝 3 份素材          │
└──────────────────────┘
```

**点击行为分化**：卡片主体 → 跳转创作台 `?tab=workbench&oid=X`。编辑图标 → Sheet。删除图标 → ConfirmDialog(danger)。

**CRUD**：Sheet（桌面）/ BottomSheet（移动），表单字段：名称(required, max 100)、描述(textarea)、价格(number, min 0)、AI 上下文模板(select: only_opportunity/with_item)。

**视图切换**：复用 ViewToggle，卡片/表格切换，状态持久化到 localStorage。

### 4.3 创作台 Tab（Workbench）

**创作台有两种状态**，取决于是否选中了商机：

#### 4.3.0 概览视图（未选商机时）

运营中断后回来、或首次打开创作台时，未选中任何商机，此时展示**待发布素材概览**——跨商机列出所有未完成的素材，作为待办清单：

```
┌──────────────────────────────────────────────────────────────────┐
│ 待发布素材（3 个商机，共 7 份素材未完成）                           │
│                                                                  │
│ ▸ 日系简约风手机壳（3 份待处理）                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 素材 #12 │ 日系简约透明壳... │ genimage_done │ 2h前编辑  │ → │   │
│   │ 素材 #15 │ 清新文艺风...    │ pending       │ 昨天     │ → │   │
│   │ 素材 #18 │ 极简设计...      │ publish_failed│ 3h前    │ → │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ▸ 北欧风家居摆件（2 份待处理）                                     │
│   ...                                                            │
│                                                                  │
│ ▸ 韩系ins风（2 份待处理）                                         │
│   ...                                                            │
│                                                                  │
│                      [分页器 1/3]                                 │
└──────────────────────────────────────────────────────────────────┘
```

- 按商机分组，每组可折叠
- 只显示未完成的素材（pending / *_done / publish_failed），不显示 published
- 每组标题：商机名称 + 待处理数量
- 每行：素材描述、当前状态、最后编辑时间
- 点击行 → 自动选中该商机并加载工作区视图（§4.3.1）
- 排序：有 publish_failed 的商机置顶 → 最近编辑的在前
- **分页器**：整体分页（所有商机组的素材合并分页），位于容器底部

**数据来源**：直接调用 `GET /api/selection/materials`（`listMaterials` 函数），传入 `status` 参数过滤排除 `published`。后端 `material.list` 接口支持以下查询参数，前端透传：

| 参数 | 类型 | 用途 |
|------|------|------|
| `page` | int | 页码（默认 1） |
| `page_size` | int | 每页条数（10-100） |
| `oid` | int? | 按商机 ID 筛选 |
| `name` | string? | 按名称模糊搜索 |
| `description` | string? | 按描述模糊搜索 |
| `category` | string? | 按类目筛选 |
| `status` | string? | 按状态筛选（此处排除 published） |

概览视图传入 `status` 为 `pending,writing_done,genimageplan_done,genimage_done,publish_failed`（排除 published），前端不做二次过滤。

#### 4.3.1 工作区视图（选中商机时）

选中商机后，进入左右分栏布局：

```
┌───────────────────────┬──────────────────────────────────────────────────┐
│ 左侧：商机列表          │ 右侧：素材工作区                                  │
│ (默认 320px, 可拖拽)   │                                                  │
│                       │ 商机：日系简约风手机壳 | ¥12 | 5商品 · 3素材        │
│ [🔍 搜索商机...]       │ [编辑商机]                    [+ 批量创建 ▾]      │
│ [全部] [active]       │                                                  │
│                       │ ▸ 参考信息（5个监控商品 · 可折叠）                  │
│ ┌───────────────────┐ │ [📱透明软壳+12%][📱磨砂+8%][📱硅胶-3%]...          │
│ │ 日系简约风  ✓     │ │                                                  │
│ │ 5商品 · 3素材     │ │ 素材表格（AI 操作在行内）                           │
│ │ ¥12 · active      │ │ ┌──────────────────────────────────────────────┐ │
│ └───────────────────┘ │ │☐│描述    │价 │状态│AI操作              │进度│✏️│ │
│ ┌───────────────────┐ │ │☐│日系简约│¥12│待处理│[改写]              │○○○○│✏️│ │
│ │ 北欧风摆件        │ │ │☐│清新文艺│¥15│改写完│[重写][封面]        │●○○○│✏️│ │
│ │ 3商品 · 1素材     │ │ │☐│极简设计│¥10│生图完│[重写][封面][生图]   │●●●○│✏️│ │
│ └───────────────────┘ │ └──────────────────────────────────────────────┘ │
│ [分页器]              │ [分页器]                                          │
└───────────────────────┴──────────────────────────────────────────────────┘
```

#### 4.3.2 区域详解

**区域 1 — 左侧商机列表**：搜索框 + 状态筛选胶囊。卡片选中态 `border-blue-600 bg-blue-50/50`。单击选中→右侧加载。底部分页器。

**区域 2 — 右侧商机头部**（flex-shrink-0）：名称 + 价格 + 统计摘要 + "编辑商机"按钮 + "批量创建素材"按钮（弹出数量选择 N=1~10）。

**区域 3 — ReferencePanel**（可折叠，flex-shrink-0）：
- 折叠状态持久化到 localStorage，按 oid 存储
- 展开：横向滚动监控商品指标卡片（~180×110px/张）
- 每张卡片：标题、wantSlope（带±色）、wantAvg、convertRate、MiniTrendChart（可选）
- M > 5 时末尾显示 "+N 更多 →"

**区域 4 — 素材 DataTable**（flex-1 min-h-0 overflow-y-auto）：

| 列 | 宽度 | 说明 |
|----|------|------|
| 复选框 | 32px | 批量选择 |
| 描述 | 2fr | line-clamp-2 |
| 价格 | 0.7fr | fmtPrice |
| 状态 | 0.8fr | StatusBadge（9 阶段状态） |
| AI 操作 | 1.5fr | 行内按钮组，状态驱动 |
| 进度 | 0.8fr | StatusPipeline（4 节点：改写/封面/生图/发布） |
| 微调 | 0.4fr | ✏️ 按钮 → Sheet |

**AI 操作按钮状态机**（后端同步返回，不轮询。按钮 loading 仅持续 API 调用期间）

三阶段 AI 操作（改写/封面规划/生图）统一通过 `triggerWork(materialId, stage)` 调用 `POST /material.rewrite.work`，其中 `stage` 取 `'write'` / `'genimageplan'` / `'genimage'`。发布独立使用 `publishMaterial`。

| 素材状态 | 改写 | 封面规划 | 生图 | 发布 |
|---------|------|---------|------|------|
| pending | **[改写]** | ❌ | ❌ | ❌ |
| writing_done | [重写] | **[封面]** | ❌ | ❌ |
| genimageplan_done | [重写] | [重做] | **[生图]** | ❌ |
| genimage_done | [重写] | [重做] | [重生] | **[发布]** |
| published | — | — | — | ✓已发布 |
| publish_failed | [重写] | [重做] | [重生] | [重试] |

> **[粗体]** = 推荐下一步（primary），普通 = 可重做（secondary），❌ = 前置未满足，— = 无需操作
> 所有按钮点击后：调用 `triggerWork(id, stage)` 或 `publishMaterial(id)` → 按钮显示 loading spinner → API 返回 → 行数据即时更新为新的稳定态

**批量创作核心交互**：运营可以依次点击多行的 **[改写]**，每行独立触发 API。不等前一个返回就能点下一个——后端各自处理，前端各自等待。

#### 4.3.3 Sheet 微调编辑器

点击 ✏️ 打开 Sheet（500px 宽），**仅用于手动微调**，不含 AI 流程：

- 图片：缩略图拖拽排序 + 上传按钮
- 描述：textarea（min-height 200px）
- 价格：input[number]，fmtYuan 显示
- 类目：下拉（调用 `POST /material.channel`）
- 发布账号：下拉（复用 accounts 列表）
- **AI 上下文配置**（素材级，调用 `POST /material.context`，独立保存）：
  - 模板下拉：`仅商机信息`（only_opportunity）/ `商机+监控商品`（with_item），默认继承 `opportunity.ai_context_template`
  - 当模板为 `with_item`：展示当前商机绑定的所有监控商品，每行带 checkbox + 核心指标摘要（wantSlope/wantAvg）
     - 从 `material.ai_context.items[]` 读取已选 gid 列表，匹配勾选状态
     - 用户修改勾选后点击"保存 AI 上下文"→ `POST /material.context { id, contextTemplateType, items: [...] }`
     - 响应返回更新后的完整素材对象，前端更新缓存
  - 配置摘要：一行文字说明当前注入策略，如"将注入：商机信息 + 3 个监控商品（透明软壳、磨砂硬壳、硅胶防摔）"
- 素材字段保存：手动保存（`POST /material.edit`），非自动保存
- AI 上下文保存：独立的"保存 AI 上下文"按钮（`POST /material.context`），与素材字段保存解耦

#### 4.3.4 移动端 Push/Pop

- Step 1：全屏商机列表（搜索+筛选+卡片）
- Step 2：素材工作区（面包屑 ← 返回 | 商机名称，右滑返回）
- Step 3：BottomSheet 编辑器（点击 ✏️ → 打开，关闭回到 Step 2）

```typescript
type MobileView = 'opportunity-list' | 'workspace'
const [viewStack, setViewStack] = useState<MobileView[]>(['opportunity-list'])
```

### 4.4 发布记录 Tab

**定位**：只读档案——查看已发布和发布失败的素材记录。**无编辑功能、无 AI 操作**。所有编辑和发布操作都在创作台完成。

**数据范围**：`status = published | publish_failed`（已完成和失败的素材）。进行中的素材只在创作台可见。

**布局**：SearchToolbar + DataTable + Pagination

| 列 | 宽度 | 说明 |
|----|------|------|
| 发布时间 | 0.8fr | updated_at（fmtDateTime） |
| 描述 | 2fr | line-clamp-2 |
| 价格 | 0.6fr | fmtPrice |
| 类目 | 0.8fr | 发布类目 |
| 状态 | 0.6fr | StatusBadge（published=绿, publish_failed=红） |
| 所属商机 | 1fr | 商机名称链接 → `?tab=workbench&oid=X` |
| 发布账号 | 0.7fr | to_uid 对应账号名 |
| 发布商品 | 0.7fr | to_gid（发布成功时显示，可复制） |

**筛选器**：
- 搜索框：描述模糊搜索
- 状态下拉：已发布 / 发布失败
- 商机下拉：按商机筛选
- 时间范围：按发布时间筛选

**与创作台的区别**：

| | 创作台（概览视图） | 创作台（工作区） | 发布记录 |
|---|---|---|---|
| 定位 | 待办清单 | 工作台 | 档案 |
| 数据范围 | 所有未完成素材 | 当前商机全部素材 | 已发布 + 发布失败 |
| 可编辑 | ❌ | ✅（Sheet + AI） | ❌ |
| 核心操作 | 点击跳转工作区 | AI 改写/生图/发布 | 查看、筛选 |
| 默认排序 | 有失败置顶 → 最近编辑 | 按状态/创建时间 | 发布时间倒序 |

---

## 五、组件架构

### 5.1 API 模块：`lib/api/batch-publish.ts`

> ✅ **2026-07-13 已对齐**：全部 23 项前后端差异已修复（详见 `2026-07-13-batch-publish-api-alignment-fix.md`）。类型、路径、参数、HTTP 方法均与后端 `selection.py` 一致。

统一管理所有 `/api/selection/*` 接口。类型与 API 函数就近定义。

**核心类型**：`MonitoredItem`, `OpportunityItem`, `OpportunityParams`, `PublishMaterial`, `MaterialStatus`（6 稳定态联合类型）, `MaterialAIContext`, `MaterialImage`, `TemplateType`, `RewriteStage`, `ChannelItemResponse`, `OperationResponse`, `TrendData`, `TrendTime`, `TrendDays`

**API 函数分组**：
- 监控：`listMonitoredItems`, `bindOpportunity`, `batchBindOpportunity`, `bindOpportunityAndCreate`, `unbindOpportunity`, `deleteMonitoredItem`
- 商机：`listOpportunities`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`
- 素材：`listMaterials`, `createMaterials`, `editMaterial`, `updateMaterialContext`, `triggerWork`, `getChannel`, `publishMaterial`, `deleteMaterial`, `getContextTemplate`

**`listMaterials` 接口对齐**：后端 `GET /material.list` 支持以下查询参数，前端 `listMaterials` 函数同步更新参数签名以对齐：

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | int | 页码（默认 1） |
| `page_size` | int | 每页条数（10-100） |
| `oid` | int? | 按商机 ID 筛选 |
| `name` | string? | 按名称模糊搜索 |
| `description` | string? | 按描述模糊搜索 |
| `category` | string? | 按类目筛选 |
| `status` | string? | 按状态筛选 |

**`updateMaterialContext` 契约**（前端定义，待后端实现）：

```
POST /api/selection/material.context

Request (body):
  id: int                              — 素材 ID
  contextTemplateType: string          — "only_opportunity" | "with_item"
  items?: string[]                     — 注入的监控商品 gid 列表（仅 with_item 时有效）
  images?: string[]                    — 参考图 URL 列表（可选）
  coverprompt?: string                 — 封面规划 prompt（可选）

Response: PublishMaterialSchema       — 更新后的素材完整对象
```

**前端调用时机**：在 MaterialEditSheet 中，用户修改 AI 上下文配置后点击保存时调用。该端点仅更新 `ai_context` 字段，不触碰素材的其他字段（description/price/images/category 等仍由 `material.edit` 负责）。

### 5.2 Hook 分层

遵循三层拆分：`use*Filters` → `use*Data` → `use*Mutations` → `use*Page`

| Tab | Filters | Data | Mutations | Page（组合层） |
|-----|---------|------|-----------|---------------|
| monitor | useMonitorFilters | useMonitorData | useMonitorMutations | useMonitorPage |
| opportunity | useOpportunityFilters | useOpportunityData | useOpportunityMutations | useOpportunityPage |
| workbench | useWorkbenchFilters | useWorkbenchData | useWorkbenchMutations | useWorkbenchPage |
| materials | useMaterialsFilters | useMaterialsData | useMaterialsMutations | useMaterialsPage |

### 5.3 组件目录

```
components/batch-publish/
├── monitor/
│   ├── MonitorTab.tsx              # 主容器（表格+侧边栏容器）
│   ├── MonitorTable.tsx            # DataTable + 列定义 + 列内副标题
│   ├── MonitorDetailPanel.tsx      # 侧边栏面板（摘要+趋势图容器）~420px
│   ├── MonitorTrendCharts.tsx      # 3 张 ECharts 趋势图组件
│   ├── MonitorCard.tsx             # 移动端卡片
│   ├── MonitorFilterBar.tsx        # 筛选栏
│   └── BindOpportunityModal.tsx
├── opportunity/
│   ├── OpportunityTab.tsx
│   ├── OpportunityGrid.tsx
│   ├── OpportunityCard.tsx
│   └── OpportunityForm.tsx       # Sheet 内用，react-hook-form + zod
├── workbench/
│   ├── WorkbenchTab.tsx           # 左右分栏容器
│   ├── OpportunityListPanel.tsx   # 左侧商机列表
│   ├── MaterialWorkspace.tsx      # 右侧素材工作区（头部+参考+表格）
│   ├── ReferencePanel.tsx         # 可折叠监控商品指标面板
│   ├── ReferenceCard.tsx          # 单张监控商品指标卡片
│   ├── MaterialRow.tsx            # 素材表格行（自包含：≤5 props）
│   ├── MaterialEditSheet.tsx      # 微调 Sheet
│   └── CreateMaterialModal.tsx    # 批量创建数量选择
├── materials/
│   ├── MaterialsTab.tsx
│   ├── MaterialTable.tsx
│   └── MaterialCard.tsx           # 移动端
└── shared/
    ├── StatusPipeline.tsx         # 素材状态进度条（4 节点）
    ├── BatchActionBar.tsx         # 共享批量操作栏
    └── constants.ts               # 状态映射、网格列、颜色配置
```

### 5.4 MaterialRow 设计原则

**旧 PublishInstanceRow 的反模式**：23 个 props，父组件通过 props 管道传递所有 mutation 回调。

**新 MaterialRow 的自包含模式**（≤5 props）：
```typescript
interface MaterialRowProps {
  materialId: number;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenEditor: (id: number) => void;
}
```
行组件内部通过 React Query `getQueryData` 自取缓存数据、自调 mutation。只有"跨行协调"的状态（批量选中）通过父组件传递。

### 5.5 复用已有组件

| 组件 | 来源 | 用途 |
|------|------|------|
| TabBar | `components/ui/Tab` | 4 Tab 切换 |
| DataTable | `components/ui/DataTable` | 监控/发布记录表格 |
| SearchToolbar | `components/ui/SearchToolbar` | 筛选栏容器 |
| Pagination | `components/ui/pagination` | 所有列表分页 |
| ConfirmDialog | `components/ui/ConfirmDialog` | 删除确认 |
| EmptyState | `components/ui/EmptyState` | 空数据占位 |
| ErrorBanner | `components/ui/ErrorBanner` | 错误提示 |
| StatusBadge | `components/ui/StatusBadge` | 状态标签 |
| Sheet / BottomSheet | `components/ui/Sheet` | 编辑器抽屉 |
| LoadingSpinner | `components/ui/LoadingSpinner` | 加载状态 |
| ResizableDivider | `components/publish/ResizableDivider` | 创作台左右分栏拖拽 |
| ViewToggle | `components/selection/shared/ViewToggle` | 商机管理卡片/表格切换 |
| MiniTrendChart | `components/selection/product/MiniTrendChart` | 监控商品趋势迷你图 |
| useToast | `components/ui/toaster` | 操作结果通知 |
| useTabRouting | `hooks/useTabRouting` | URL Tab 持久化 |
| useIsMobile | `hooks/useIsMobile` | 移动端检测 |

---

## 六、执行计划

### 6.1 构建顺序

```
Phase 0: 骨架 — page.tsx + TabBar + 路由 + Sidebar 导航项 - 已完成
Phase 1: API 模块 — lib/api/batch-publish.ts（所有类型和函数） - 已完成
Phase 1.5: API 前后端对齐 — 23 项差异修复，类型/路径/参数/方法全面对齐 - ✅ 已完成 (2026-07-13)
Phase 2: 共享组件 — BatchActionBar + StatusPipeline + constants - 已完成
Phase 3: 监控 Tab + 商机管理 Tab（可并行） - 已完成
Phase 4: 发布记录 Tab（相对独立） - 已完成
Phase 5: 创作台（最复杂，依赖 Phase 3 商机列表 + Phase 2 共享组件）
Phase 6: 移动端降级
```

### 6.2 可并行构建

| 并行组 | 内容 | 理由 |
|--------|------|------|
| Group A | MonitorTab + 监控 hooks | 独立闭环，不依赖其他 Tab |
| Group B | MaterialsTab + 发布记录 hooks | 只读聚合视图 |
| Group C | OpportunityTab + CRUD hooks | 创作台的数据来源，先完成 |
| Group D | API 模块 | 纯函数，无 UI 依赖 |

### 6.3 文件清单

**新建文件**（~30 个）：
- `app/dashboard/batch-publish/page.tsx`
- `lib/api/batch-publish.ts`
- `hooks/batch-publish/*.ts`（~16 个 hook 文件）
- `components/batch-publish/monitor/*.tsx`（5 个）
- `components/batch-publish/opportunity/*.tsx`（4 个）
- `components/batch-publish/workbench/*.tsx`（7 个）
- `components/batch-publish/materials/*.tsx`（3 个）
- `components/batch-publish/shared/*.tsx`（3 个）

**修改文件**（1 个）：
- `components/layout/Sidebar.tsx` — 添加 `{ label: '批量创作', path: '/dashboard/batch-publish' }`

### 6.4 技术约束

- 严禁动态路由 `[id]` — 参数通过 URL query 传递
- 所有 API 调用通过 `fetchApi` 从 `lib/utils/api.ts`
- 命名导出 `export function`，禁止 default export
- React Query 管理所有服务端数据（staleTime: 60s, gcTime: 5min）
- 页面顶级容器：`flex flex-col gap-5 h-full`
- 所有 query key 使用 `['batch-publish', ...]` 前缀

### 6.5 复杂度评估

| Tab | 复杂度 | 理由 |
|-----|--------|------|
| monitor | 低 | 纯数据展示，DataTable + StatusBadge |
| opportunity | 低 | 复用 ViewToggle + 卡片/CRUD |
| workbench | **高** | 7 层信息 + AI 状态机 + 左右分栏 + Sheet + 批量操作 |
| materials | 低 | 只读档案，展示已发布/失败记录 |

---

## 附录 A：已确认的设计决策

| 决策 | 结论 | 理由 |
|------|------|------|
| 路由结构 | 1 页 4 Tab（`?tab=`） | 工作流紧密，共享 React Query cache，URL 深度链接 |
| 创作台布局 | 左右分栏 + Sheet 编辑器 | 参考信息（左）+ 操作区（右）各得其所 |
| 批量创建 | 后端完成创建，前端仅指定 N | "批量创建就一个按钮的事" |
| AI 上下文 | 每份素材独立配置，默认继承商机模板 | 素材级 `ai_context.items[]` |
| 新旧页面 | 共存开发，不同 API 路径 | 旧 `/api/publish/*`，新 `/api/selection/*` |
| AI 操作方式 | 表格行内按钮，后端同步返回，不轮询 | 支持真正的批量——多行同时触发 |
| 监控默认排序 | wantSlope DESC + 仅显示监控中+未绑定 | 运营首要任务是找值得绑定的商品 |
| Tab Key | `workbench` 而非 `create` | 与 API 端点 `material.create` 语义区分 |

## 附录 B：参考文件索引

| 文件 | 用途 |
|------|------|
| `backend/models/v2/opportunities.py` | 数据模型定义 |
| `backend/free/user/selection.py` | 后端 API 路由 |
| `backend/free/schema/selection.py` | 后端 Schema |
| `app/dashboard/selection/page.tsx` | Tab 路由参考 |
| `app/dashboard/publish/page.tsx` | 左右分栏参考 |
| `components/publish/ResizableDivider.tsx` | 拖拽分栏组件 |
| `components/selection/product/MiniTrendChart.tsx` | 迷你趋势图 |
| `components/selection/shared/ViewToggle.tsx` | 视图切换 |
| `components/ui/DataTable.tsx` | 通用表格 |
| `hooks/useItemsPage.ts` | Hook 三层拆分参考 |
| `.claude/rules/frontend-*.md` | 各类规范文档 |
