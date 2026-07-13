# 批量创作发布系统 — 设计规格

> 状态：设计推进中 | 2026-07-13
> 替代：旧 `/dashboard/publish`（1:1 模型）→ 本系统（1:N 模型 + 9 阶段流水线）

---

## 一、概述

### 1.1 功能目标

承载从"监控商品 → 商机线索 → 素材创作 → 发布"的完整运营工作流，逐步替代旧的 `/dashboard/publish` 页面。

核心升级：
- **1:1 → 1:N**：一个商机绑定多个监控商品，运营可以为同类型商品批量创建素材
- **9 阶段素材流水线**：PENDING → WRITING → … → PUBLISHDONE，每阶段可独立操作和追踪
- **每份素材独立 AI 上下文**：素材 A 勾选商品 1、2 注入 AI，素材 B 勾选商品 1、3——互不影响
- **监控流直达创作流**：在同一个页面内完成"选品 → 绑定商机 → 创作 → 发布"，不跨页面

### 1.2 解决的核心问题

| 旧系统问题 | 新系统方案 |
|-----------|-----------|
| 1:1 绑定：每个商机只能关联一个来源商品，同类型商品需重复创建商机 | 1:N 绑定：一个商机聚合多个监控商品，同类型一次创建 |
| AI 上下文全局化：所有素材共享同一 prompt template | 每份素材独立 `ai_context.items[]`，精确选择注入商品 |
| 素材状态不可见：5 种状态，无中间态进度 | 9 阶段流水线 + StatusPipeline 进度条 + 3s 自动轮询 |
| 监控→发布流程断裂：选品页和发布页独立，需切换页面 | 同一页面 4 Tab，跨 Tab 导航 + 数据一致性保证 |

### 1.3 术语定义

| 术语 | Tab Key | 对应实体 | 说明 |
|------|---------|---------|------|
| 监控商品 | monitor | ItemMonitored | 从选品系统采集，携带 wantSlope / convertRate 等近期表现指标 |
| 商机 | opportunity | Opportunity | 运营创建的"线索"，绑定多个同类型监控商品，含 ai_context_template |
| 素材 | materials | PublishMaterial | 从商机生成的可发布实体，含独立的 ai_context.items 选择 |
| 创作台 | workbench | — | 素材创作工作区。注：Tab key 为 `workbench`，与 POST /material.create API 端点名称不同 |

### 1.4 与旧页面对比

| 维度 | 旧 `/dashboard/publish` | 新 `/dashboard/batch-publish` |
|------|------------------------|------------------------------|
| 商机:监控商品 | 1:1 | **1:N** |
| 商机列表 | 无分页、无搜索，全量加载 | 分页 + 搜索 + 状态筛选 |
| 参考信息 | 仅商机详情 | 商机详情 + **可折叠监控商品指标面板**（横向卡片） |
| AI 上下文 | 全局 prompt template | **每份素材独立选择**注入商品 |
| 素材状态 | 5 种 | **9 阶段流水线** + 进度条 |
| 编辑器 | EditorDrawer（全宽右侧抽屉） | Sheet（500px），新增 AI 上下文勾选区 |
| Tab 结构 | 单页面 | **4 Tab**（监控/商机管理/创作台/素材库） |
| 后端 API | `/api/publish/*` | `/api/selection/*` |

---

## 二、数据模型与关联

### 2.1 实体关系图

```
ItemMonitored (监控商品) ──N:1──> Opportunity (商机) ──1:N──> PublishMaterial (素材)
     │                                                              │
     │ opportunity_id (FK, nullable, SET_NULL on delete)            │ ai_context.items (gid[])
     └──────────────────────────────────────────────────────────────┘
              素材的 ai_context.items 引用监控商品的 gid（逻辑关联，非 FK 约束）
```

### 2.2 实体详细定义

**Opportunity（商机）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int (PK) | 自增主键 |
| name | str(100), unique | 商机名称 |
| description | str?, nullable | 描述 |
| price | float, default=2 | 参考价格 |
| status | enum: active / inactive | 状态 |
| ai_context_template | enum: only_opportunity / with_item | AI 上下文模板策略 |
| userId | str | 归属用户 |
| monitored_items | ReverseRelation | 绑定的监控商品（1:N） |
| materials | ReverseRelation | 生成的素材（1:N） |

**ItemMonitored（监控商品）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| gid | str(50, PK) | 商品全局 ID |
| title | str(100) | 商品标题 |
| description | str?, nullable | 商品描述 |
| itemStatus | int enum | 商品状态（在售/下架等） |
| publishTime | int | 发布时间戳 |
| uid | str(50) | 卖家 ID |
| name | str(50) | 卖家名称 |
| keywords | str | 关联关键词 |
| intervalHours | int, default=6 | 采集间隔（小时） |
| monitorStatus | int enum | 监控状态：0=暂停, 1=监控中, 2=已分析, 3=已入库, -100=已删除 |
| wantSlope | float | 想要数增长斜率（7 日窗口） |
| wantAvg | float | 日均想要数 |
| convertRate | float | 转化率 |
| hideAvg | float | 日均询藏比 |
| trendData | JSON | 趋势数据（trendTime + trendDays + fetchCount + windows） |
| opportunity_id | int?, nullable | FK→Opportunity（SET_NULL on delete） |

**PublishMaterial（素材）**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int (PK) | 自增主键 |
| images | list[MaterialImage] | 封面图列表 |
| description | str | 素材描述文案 |
| price | float | 价格 |
| category | str?, nullable | 发布类目 |
| status | enum | 9 阶段流水线状态 |
| ai_context | JSON (MaterialAIContext) | AI 上下文（含 items[] 选择注入的商品 gid） |
| to_uid | str?, nullable | 发布目标账号 UID |
| to_gid | str?, nullable | 发布成功后写入的商品 GID |
| opportunity_id | int (FK) | 所属商机 |

**MaterialAIContext**：`{ template: TemplateType, images?: str[], items?: str[], coverprompt?: str }`

### 2.3 素材状态流水线

```
PENDING → WRITING → WRITINGDONE → GENIMAGEPLAN → GENIMAGEPLANDONE
→ GENIMAGE → GENIMAGEDONE → PUBLISHING → PUBLISHDONE / PUBLISHFAILED
```

| 阶段 | 含义 | 前端可操作 |
|------|------|-----------|
| pending | 初始草稿，未开始任何处理 | 编辑、触发改写 |
| writing | AI 改写进行中 | 等待（轮询），不可编辑 |
| writing_done | 改写完成 | 编辑、重新改写、触发封面规划 |
| genimageplan | 封面规划进行中 | 等待（轮询） |
| genimageplan_done | 封面规划完成 | 编辑封面 prompt、触发生图 |
| genimage | 生图进行中 | 等待（轮询） |
| genimage_done | 生图完成 | 编辑、重新生图、发布 |
| publishing | 发布进行中 | 等待（轮询） |
| published | 发布成功 | 查看已发布商品 |
| publish_failed | 发布失败 | 查看错误信息、重试发布 |

### 2.4 数据关联映射

| 实体 | 监控 Tab | 商机管理 Tab | 创作台 Tab | 素材库 Tab |
|------|---------|-------------|-----------|-----------|
| ItemMonitored | 展示、筛选、排序、绑定/解绑 | 计数（monitoredItemCount） | 参考面板（只读） | 不可见 |
| Opportunity | 绑定目标（下拉/弹窗选择） | CRUD、卡片/表格展示 | 下拉选择 + 头部信息 | 筛选 + 链接跳转 |
| PublishMaterial | 不可见 | 计数（materialCount） | 列表 + 编辑 + AI workflow | 列表 + 筛选 + 操作 |

---

## 三、页面架构

### 3.1 路由设计

```
/dashboard/batch-publish?tab=monitor|opportunity|workbench|materials
```

- 默认 Tab：`monitor`（工作流起点）
- 深度链接：`?tab=workbench&oid=123`（从商机管理/素材库跳转预选商机）
- 侧边栏：一个入口 `{ label: '批量创作', path: '/dashboard/batch-publish' }`，Tab 切换在页面内部完成

### 3.2 页面骨架

```tsx
// app/dashboard/batch-publish/page.tsx
'use client'
export default function Page() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  )
}
function PageContent() {
  const [activeTab, setTab] = useTabRouting<TabName>(
    ['monitor', 'opportunity', 'workbench', 'materials'],
    'monitor'
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

### 3.3 四 Tab 概览

| Tab | Key | 用途 | 核心操作 | PC 布局 | 移动端降级 |
|-----|-----|------|----------|---------|-----------|
| 商品监控 | monitor | 查看商品近期表现，筛选绑定商机 | 筛选排序、批量绑定/解绑 | 筛选栏 + DataTable | 卡片列表 |
| 商机管理 | opportunity | 管理商机线索，查看关联统计 | CRUD、跳转创作台 | 筛选栏 + 卡片网格 | 单列卡片 |
| 创作台 | workbench | 素材创作工作区（per-opportunity） | 选商机、批量创建、编辑、AI改写、发布 | 左右分栏 + Sheet | Push/Pop 导航 |
| 素材库 | materials | 跨商机素材全集 | 筛选、发布、删除 | 筛选栏 + DataTable | 卡片列表 |

### 3.4 Tab 间关系与数据流

```
监控 Tab ──(绑定商品到商机)──> 商机管理 Tab ──(点击卡片)──> 创作台 Tab ──(发布素材)──> 素材库 Tab
    ↑                              ↑                         │                      │
    │                              └── materialCount ────────┘                      │
    └── 解绑后重置 monitoredItemCount ──────────────────────────────────────────────┘
```

**典型流程**：
1. 监控 Tab：筛选商品 → 勾选 N 个 → "绑定到商机" → 选已有或创建新商机
2. 商机管理 Tab：查看商机列表 → 点击卡片 → 跳转创作台 `?tab=workbench&oid=X`
3. 创作台：选商机 → 查看监控商品指标 → 批量创建素材 → 逐份编辑/AI改写 → 发布
4. 素材库：查看全部素材 → 筛选 → 批量发布 → 发布完成

### 3.5 跨 Tab 导航捷径

| 当前位置 | 目标 | 触发方式 | URL |
|----------|------|----------|-----|
| 监控 Tab | 创作台（预选刚绑定的商机） | 绑定成功 toast 中的"去创作台"链接 | `?tab=workbench&oid=X` |
| 商机管理 Tab | 创作台（预选商机） | 卡片点击 | `?tab=workbench&oid=X` |
| 素材库 Tab | 创作台（预选商机） | "所属商机"列链接 | `?tab=workbench&oid=X` |
| 创作台 | 素材库（全部素材） | 顶栏"查看全部素材" | `?tab=materials` |

---

## 四、缓存失效矩阵

所有 React Query key 统一使用 `['batch-publish', ...]` 前缀，与旧 publish 页面的 `['published-items', ...]` 隔离。

| 操作 | 需失效的 Query Keys |
|------|-------------------|
| 绑定商品到商机 | `['batch-publish', 'monitored-items']`, `['batch-publish', 'opportunities']` |
| 批量绑定 | 同上 |
| 解绑商品 | 同上 |
| 删除监控商品 | `['batch-publish', 'monitored-items']` |
| 创建/编辑/删除商机 | `['batch-publish', 'opportunities']`（删除时额外失效 `['batch-publish', 'monitored-items']`） |
| 创建素材 | `['batch-publish', 'materials', oid]`, `['batch-publish', 'materials', 'all']`, `['batch-publish', 'opportunities']` |
| 编辑素材 | 乐观更新 + invalidate `['batch-publish', 'materials', oid]`, `['batch-publish', 'materials', 'all']` |
| AI 改写/生图 | 乐观更新 + invalidate `['batch-publish', 'materials', oid]`, `['batch-publish', 'materials', 'all']`（后端同步返回结果，直接更新缓存） |
| 发布素材 | 同上 + `['batch-publish', 'monitored-items']`（商品状态可能变） |
| 删除素材 | `['batch-publish', 'materials', oid]`, `['batch-publish', 'materials', 'all']`, `['batch-publish', 'opportunities']` |

**策略**：精确指定 key 前缀（如 `['batch-publish', 'opportunities']`）使用 fuzzy matching 覆盖子 key。变更商机名称时额外 invalidate `['batch-publish', 'materials', oid]`。

---

## 五、Tab 详细设计

### 5.1 监控 Tab

**布局**：SearchToolbar（筛选栏）+ DataTable + Pagination

#### 5.1.1 表格列定义

| 列 | 宽度 | 字段 | 说明 |
|----|------|------|------|
| 复选框 | 32px | — | 批量选择 |
| 商品 gid | 0.8fr | gid | 文本，可复制 |
| 标题 | 2fr | title | line-clamp-2 |
| 价格 | 0.7fr | 最新 fetchlog.price | fmtPrice |
| 想要斜率 | 0.8fr | wantSlope | **主排序键**，fmtGrowth 带正负颜色，font-semibold |
| 日均想要 | 0.8fr | wantAvg | fmtNumber |
| 转化率 | 0.7fr | convertRate | fmtPercent |
| 商品状态 | 0.7fr | itemStatus | StatusBadge |
| 监控状态 | 0.7fr | monitorStatus | StatusBadge（0=暂停/灰, 1=监控中/绿, 2=已分析/蓝, 3=已入库/紫） |
| 绑定商机 | 1fr | opportunity_id | 商机名称 或 "未绑定"（text-gray-400） |
| 操作 | 0.6fr | — | 绑定/解绑、删除 |

**排序**：wantSlope / wantAvg / convertRate（三列可排序，默认 wantSlope DESC）

**筛选栏**：
- 搜索框：标题/uid/gid 模糊搜索
- 监控状态下拉：全部 / 监控中 / 已分析 / 已入库 / 已暂停
- 绑定状态：全部 / 已绑定 / 未绑定

**默认策略**（硬编码）：
- 默认排序：wantSlope DESC（增长最快的排最前）
- 默认筛选：monitorStatus=1（监控中）, oid=0（未绑定）——运营的核心任务是找"活跃且未绑定"的好商品

#### 5.1.2 绑定交互流

```
勾选商品（仅当前页）→ 底部操作栏出现
  → "绑定到商机" → BindOpportunityModal：
      ├── Tab "选择已有商机"：搜索框 + 商机列表（单选）+ 分页
      └── Tab "创建新商机"：表单（名称*、描述、AI模板下拉）
  → 确认 → API 调用 → toast + 刷新列表
```

**解绑**：点击已绑定行的"解绑" → ConfirmDialog → `POST /monitor.unbind.opportunity`

#### 5.1.3 移动端

- 卡片列表（无限滚动）
- 每张卡片：标题 + 3 个核心指标色块（wantSlope / wantAvg / convertRate）+ 绑定状态 dot
- 长按进入批量选择模式

### 5.2 商机管理 Tab

**布局**：SearchToolbar + 卡片网格（桌面 3 列）/ DataTable + Pagination

#### 5.2.1 卡片设计

```
┌──────────────────────┐
│ 日系简约风手机壳  ✏️ 🗑│  ← 名称 font-semibold + 编辑/删除按钮
│ 适合夏季搭配的简约...  │  ← 描述 line-clamp-2 text-gray-500
│ ¥12.00  active       │  ← fmtPrice + StatusBadge
│ 📦 5 监控商品        │  ← monitoredItemCount（蓝色）
│ 📝 3 份素材          │  ← materialCount（灰色）
└──────────────────────┘
```

点击卡片主体 → 跳转创作台 `?tab=workbench&oid=X`

#### 5.2.2 CRUD

- **创建**：SearchToolbar 右侧 "+ 新建商机" → Sheet（桌面）/ BottomSheet（移动）
- **编辑**：卡片右上角编辑图标 → 同上 Sheet 预填数据
- **删除**：删除图标 → ConfirmDialog（danger variant）

表单字段（react-hook-form + zod）：名称（required, maxLength=100）、描述（textarea）、价格（number, min=0）、AI 上下文模板（select: only_opportunity / with_item）

#### 5.2.3 视图切换

复用 `ViewToggle` 组件，卡片/表格切换，状态持久化到 localStorage。

### 5.3 创作台 Tab

信息密度最高的页面。采用"左右分栏"布局。**核心原则：AI 操作流程在表格行内完成，Sheet 仅做微调编辑。**

#### 5.3.1 桌面端布局

```
┌─────────────────────────┬──────────────────────────────────────────────────┐
│ 左侧：商机列表           │ 右侧：素材工作区                                   │
│ (默认 320px, 可拖拽)    │                                                  │
│                         │ ┌──────────────────────────────────────────────┐ │
│ [🔍 搜索商机...]         │ │ 商机：日系简约风手机壳 | ¥12 | 5商品 · 3素材   │ │
│ [全部] [active]         │ │ [编辑商机]                  [+ 批量创建 ▾]   │ │
│                         │ ├──────────────────────────────────────────────┤ │
│ ┌─────────────────────┐ │ │ ▸ 参考信息（5个监控商品 · 可折叠）             │ │
│ │ 日系简约风  ✓       │ │ │ [📱透明软壳+12%][📱磨砂+8%][📱硅胶-3%]...     │ │
│ │ 5商品 · 3素材       │ │ ├──────────────────────────────────────────────┤ │
│ │ ¥12 · active        │ │ │ 素材表格（AI 操作在行内）                      │ │
│ └─────────────────────┘ │ │ ┌──────────────────────────────────────────┐ │ │
│ ┌─────────────────────┐ │ │ │☐│描述    │价 │状态│AI操作           │进度│✏️│ │ │
│ │ 北欧风摆件          │ │ │ │☐│日系简约│¥12│待处理│[改写]           │○○○○│✏️│ │ │
│ │ 3商品 · 1素材       │ │ │ │☐│清新文艺│¥15│改写完│[重写][封面]     │●○○○│✏️│ │ │
│ └─────────────────────┘ │ │ │☐│极简设计│¥10│生图完│[重写][封面][生图]│●●●○│✏️│ │ │
│ [分页器]                │ │ └──────────────────────────────────────────┘ │ │
│                         │ │ [分页器]                                     │ │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

#### 5.3.2 左侧商机列表

- 搜索框 + 状态筛选胶囊（全部/active/inactive）
- 卡片选中态：border-blue-600 bg-blue-50/50
- 单击卡片选中 → 右侧加载该商机的素材和监控商品
- 再次单击同一卡片取消选中 → 右侧重置为空状态
- 底部分页器（与后端 page/page_size 同步）

#### 5.3.3 右侧素材工作区

**区域 1：商机头部**（flex-shrink-0）
- 名称（text-lg font-semibold）+ 价格 + monitoredItemCount + materialCount 摘要
- "编辑商机"按钮 + "批量创建素材"按钮（弹出数量选择 N=1~10）

**区域 2：ReferencePanel**（可折叠，flex-shrink-0）
- 折叠/展开状态持久化到 localStorage，按 oid 存储
- 展开：横向滚动监控商品指标卡片（~180×110px/张）
- 每张卡片：标题、wantSlope（带±色）、wantAvg、convertRate、MiniTrendChart（可选）
- M > 5 时末尾显示 "+N 更多 →"
- 运营展开参考面板查看商品指标，然后直接在下方表格中操作素材——参考和操作在同一视口内

**区域 3：素材 DataTable**（flex-1 min-h-0 overflow-y-auto）

这是批量创作的**核心交互区**，AI 操作在此完成：

| 列 | 宽度 | 说明 |
|----|------|------|
| 复选框 | 32px | 批量选择 |
| 描述 | 2fr | line-clamp-2，素材描述文案 |
| 价格 | 0.7fr | fmtPrice |
| 状态 | 0.8fr | StatusBadge（9 阶段状态映射） |
| AI 操作 | 1.5fr | 行内按钮组，状态驱动（见下方状态机） |
| 进度 | 0.8fr | StatusPipeline（4 节点：改写/封面/生图/发布） |
| 微调 | 0.4fr | ✏️ 按钮 → 打开 Sheet 微调编辑器 |

**AI 操作列按钮状态机**（后端同步返回结果，无需轮询）：

| 素材状态 | 改写 | 封面规划 | 生图 | 发布 |
|---------|------|---------|------|------|
| pending | **[改写]** | ❌ | ❌ | ❌ |
| writing | ⏳等待中… | ❌ | ❌ | ❌ |
| writing_done | [重写] | **[封面]** | ❌ | ❌ |
| genimageplan | [重写] | ⏳等待中… | ❌ | ❌ |
| genimageplan_done | [重写] | [重做] | **[生图]** | ❌ |
| genimage | [重写] | [重做] | ⏳等待中… | ❌ |
| genimage_done | [重写] | [重做] | [重生] | **[发布]** |
| publishing | [重写] | [重做] | [重生] | ⏳等待中… |
| published | — | — | — | ✓已发布 |
| publish_failed | [重写] | [重做] | [重生] | [重试] |

> **[粗体]** = 推荐下一步操作（primary），普通按钮 = 可重做（secondary），⏳ = loading+disabled，❌ = 前置条件未满足，— = 无需操作

**批量创作流程**：运营可以依次点击多行的 **[改写]**，每行独立触发 API、独立返回结果、独立更新状态。这才是真正的"批量"——不是等一个完成再做下一个，而是同时触发多个。

#### 5.3.4 Sheet 微调编辑器

点击 ✏️ 按钮打开 Sheet（500px 宽），**仅用于手动微调**，不含 AI 流程：

- 图片：缩略图拖拽排序 + 上传按钮
- 描述：textarea（min-height 200px）
- 价格：input[number]，fmtYuan 显示
- 类目：下拉选择（调用 `POST /material.channel`）
- 发布账号：下拉选择（复用 accounts 列表）
- **AI 上下文配置**（素材级配置，默认继承商机模板，单素材可独立覆盖）：
  - 模板类型：下拉选择（`仅商机信息` / `商机+监控商品`），默认值继承 `opportunity.ai_context_template`
  - 配置摘要：一行文字说明当前注入策略，如"将注入：商机名称+描述 + 3 个绑定监控商品的信息"
  - 当模板为 `商机+监控商品` 时，可管理注入的商品范围（弹出简洁的勾选列表）
- 保存按钮：手动保存（调用 `POST /material.edit`）

#### 5.3.5 移动端 Push/Pop

- Step 1：全屏商机列表（搜索+筛选胶囊+卡片）
- Step 2：素材工作区（面包屑 ← 返回 | 商机名称，支持右滑返回）
- 素材卡片：每张卡片展示描述 + 价格 + 状态 + AI 操作按钮行 + 进度条
- Step 3：BottomSheet 微调编辑器（点击 ✏️ → 打开，关闭回到 Step 2）

### 5.4 素材库 Tab

**布局**：SearchToolbar + DataTable + Pagination

#### 5.4.1 表格列

| 列 | 宽度 | 说明 |
|----|------|------|
| ID | 0.3fr | 素材编号 |
| 描述 | 2fr | line-clamp-2 |
| 价格 | 0.6fr | fmtPrice |
| 类目 | 0.8fr | 发布类目 |
| 状态 | 0.8fr | StatusBadge（9 种状态映射） |
| 所属商机 | 1fr | 商机名称链接 → `?tab=workbench&oid=X` |
| 发布账号 | 0.8fr | to_uid 对应账号名 |
| 操作 | 0.6fr | 发布、删除 |

#### 5.4.2 与创作台素材列表的区别

| | 创作台素材列表 | 素材库 |
|---|---|---|
| 定位 | 工作台（per-opportunity） | 档案室（cross-opportunity） |
| 数据范围 | 当前选中商机的素材 | 所有商机的素材 |
| 核心操作 | AI 改写/封面/生图/发布（行内按钮） | 发布、删除 |
| 编辑能力 | 微调 Sheet（描述/价格/类目/账号/AI上下文配置） | 简化编辑器（仅描述/价格/类目/账号） |
| 额外列 | AI 操作按钮 + StatusPipeline 进度条 | **所属商机**（可点击跳转） |

#### 5.4.3 筛选器

- 搜索框：描述模糊搜索
- 商机下拉：按商机筛选
- 状态下拉：按 MaterialStatus 筛选
- 类目搜索：按 category 筛选

---

## 六、批量操作

### 6.1 通用模式

```
勾选行 → 底部操作栏滑入
┌────────────────────────────────────────────┐
│ ☑ 已选 N 项    [批量操作按钮]    [取消选择]  │
└────────────────────────────────────────────┘
```

- 行复选框 + 表头全选（仅当前页，不支持跨页）
- 操作完成后：清空选中 + 刷新列表 + toast
- 监控 Tab：批量绑定到商机（BindOpportunityModal）
- 素材库：逐份批量发布（API 不支持批量），底部操作栏显示进度

---

## 七、组件架构

### 7.1 API 模块：`lib/api/batch-publish.ts`

统一管理所有 `/api/selection/*` 接口。类型与 API 函数就近定义。

**核心类型**：`MonitoredItem`, `OpportunityItem`, `PublishMaterial`, `MaterialStatus`（9 阶段联合类型）, `MaterialAIContext`, `OperationResponse`

**API 函数分组**：
- 监控：`listMonitoredItems`, `bindOpportunity`, `batchBindOpportunity`, `unbindOpportunity`, `deleteMonitoredItem`
- 商机：`listOpportunities`, `createOpportunity`, `updateOpportunity`, `deleteOpportunity`
- 素材：`listMaterials`, `createMaterials`, `editMaterial`, `triggerRewrite`, `getChannel`, `publishMaterial`, `deleteMaterial`, `getContextTemplate`

### 7.2 Hook 分层

遵循三层拆分：`use*Filters` → `use*Data` → `use*Mutations` → 组合为 `use*Page`

| Tab | Filters | Data | Mutations | Page（组合层） |
|-----|---------|------|-----------|---------------|
| monitor | useMonitorFilters | useMonitorData | useMonitorMutations | useMonitorPage |
| opportunity | useOpportunityFilters | useOpportunityData | useOpportunityMutations | useOpportunityPage |
| workbench | useWorkbenchFilters | useWorkbenchData | useWorkbenchMutations | useWorkbenchPage |
| materials | useMaterialsFilters | useMaterialsData | useMaterialsMutations | useMaterialsPage |

### 7.3 组件目录

```
components/batch-publish/
├── monitor/
│   ├── MonitorTab.tsx
│   ├── MonitorTable.tsx
│   ├── MonitorCard.tsx            # 移动端
│   ├── MonitorFilterBar.tsx
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
│   ├── MaterialRow.tsx            # 素材表格行（含 AI 操作按钮 + StatusPipeline）
│   ├── MaterialEditSheet.tsx      # 微调 Sheet（描述/价格/图片/AI上下文配置，无 AI 流程）
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

### 7.4 复用已有组件

| 组件 | 来源 | 用途 |
|------|------|------|
| TabBar | `components/ui/Tab` | 4 Tab 切换 |
| DataTable | `components/ui/DataTable` | 监控/素材库表格 |
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

---

## 八、实现计划

### 8.1 开发顺序

```
Phase 0: 骨架 — page.tsx + TabBar + 路由 + Sidebar 导航项
Phase 1: API 模块 — lib/api/batch-publish.ts（所有类型和函数）
Phase 2: 监控 Tab + 商机管理 Tab（可并行，工作流起点）
Phase 3: 批量操作共享组件（BatchActionBar + StatusPipeline）
Phase 4: 创作台（最复杂，依赖 Phase 2 商机列表 + Phase 3 共享组件）
Phase 5: 素材库（相对独立，可与 Phase 4 并行）
Phase 6: 移动端降级（所有 PC 布局确认后统一适配）
```

### 8.2 文件清单

**新建文件**：
- `app/dashboard/batch-publish/page.tsx`
- `lib/api/batch-publish.ts`
- `hooks/batch-publish/useMonitor*.ts`（4 文件）
- `hooks/batch-publish/useOpportunity*.ts`（4 文件）
- `hooks/batch-publish/useWorkbench*.ts`（4 文件）
- `hooks/batch-publish/useMaterials*.ts`（4 文件）
- `components/batch-publish/monitor/*.tsx`（5 文件）
- `components/batch-publish/opportunity/*.tsx`（4 文件）
- `components/batch-publish/workbench/*.tsx`（7 文件）
- `components/batch-publish/materials/*.tsx`（3 文件）
- `components/batch-publish/shared/*.tsx`（3 文件）

**修改文件**：
- `components/layout/Sidebar.tsx` — 添加 `{ label: '批量创作', path: '/dashboard/batch-publish' }`

### 8.3 技术约束

- 严禁动态路由 `[id]` — 参数通过 URL query 传递
- 所有 API 调用通过 `fetchApi` 从 `lib/utils/api.ts`
- 命名导出 `export function`，禁止 default export
- React Query 管理所有服务端数据（staleTime: 60s, gcTime: 5min）
- 页面顶级容器：`flex flex-col gap-5 h-full`
- 遵循 frontend-design-tokens.md / frontend-colors.md / frontend-format.md 规范

---

## 九、附录

### 9.1 后续迭代（Out of Scope）

- 素材模板：将一份素材作为模板批量应用到其他素材
- 发布定时：支持素材定时发布
- 批量 AI 处理：并行触发多份素材的 AI 改写
- `material.context` 端点 UI 对接（后端标记"待定"）

### 9.2 参考文件索引

| 文件 | 用途 |
|------|------|
| `backend/models/v2/opportunities.py` | 数据模型定义 |
| `backend/free/user/selection.py` | 后端 API 路由和参数 |
| `backend/free/schema/selection.py` | 后端 Schema 定义 |
| `app/dashboard/selection/page.tsx` | Tab 路由参考实现 |
| `app/dashboard/publish/page.tsx` | 左右分栏参考实现 |
| `components/publish/ResizableDivider.tsx` | 拖拽分栏组件 |
| `components/selection/product/MiniTrendChart.tsx` | 迷你趋势图 |
| `components/selection/shared/ViewToggle.tsx` | 视图切换控件 |
| `hooks/useItemsPage.ts` | Hook 三层拆分参考 |
| `.claude/rules/frontend-*.md` | 各类规范文档 |

### 9.3 已确认的设计决策

| 决策 | 结论 | 理由 |
|------|------|------|
| 路由结构 | 一个页面 4 Tab（`?tab=`） | 工作流紧密，共享 React Query cache，URL 深度链接 |
| 创作台布局 | 左右分栏 + Sheet 编辑器 | 参考信息（左侧）和编辑区（右侧+抽屉）各得其所 |
| 批量创建 | 后端完成创建，前端仅指定 N | 用户说的——"批量创建就一个按钮的事" |
| 新旧页面 | 共存开发，不同 API 路径 | 旧 `/api/publish/*`，新 `/api/selection/*` |
| AI 上下文 | 每份素材独立配置，默认继承商机模板，单素材可覆盖 | `ai_context.template` 素材级，配置好一次，行内 AI 按钮自动引用 |
| Tab Key 命名 | `workbench` 而非 `create` | `create` 太通用，与 API 端点 `material.create` 语义冲突 |
| 监控默认排序/筛选 | wantSlope DESC + 仅显示监控中+未绑定 | 运营首要任务是找值得绑定的商品 |
| AI 操作方式 | 表格行内按钮，后端同步返回，不轮询 | 支持真正的批量创作——多行同时触发 AI 操作 |
