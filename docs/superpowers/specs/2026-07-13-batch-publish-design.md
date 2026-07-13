# 批量创作发布系统 — 设计文档

> 状态：设计完成 | 2026-07-13

## 1. 概述

### 1.1 背景

当前系统有 `/dashboard/publish`（商品发布）页面，其数据模型为商机与监控商品 1:1 绑定。新版后端已重构数据模型为 1:N（一个商机绑定多个监控商品），并新增素材状态流水线（PENDING → WRITING → ... → PUBLISHDONE）。

新系统需承载从"监控商品 → 商机线索 → 素材创作 → 发布"的完整运营工作流，逐步替代旧发布页面。

### 1.2 核心数据关系

```
ItemMonitored (监控商品) ──N:1──> Opportunity (商机) ──1:N──> PublishMaterial (素材)
```

- **监控商品**：从选品系统采集，携带近期表现指标（wantSlope、wantAvg、convertRate、hideAvg、trendData）。`opportunity_id` 为 FK→Opportunity（nullable，未绑定即为 null）
- **商机**：运营创建的"线索"，绑定多个同类型监控商品。含 `ai_context_template` 字段（only_opportunity / with_item），决定 AI 上下文注入策略
- **素材**：从商机生成的可发布实体。每份素材有**独立的** `ai_context`（MaterialAIContext），其中 `items` 字段为该素材选择的监控商品 gid 列表。素材经历 9 阶段状态流水线

### 1.3 运营工作流

```
① 监控商品列表 → 筛选表现好的商品（看 wantSlope / convertRate 等指标）
② 选中商品 → 绑定到商机线索（同类型商品绑定到同一商机，或创建新商机）
③ 进入创作台 → 左侧选商机 → 右侧查看监控商品指标 → 批量创建素材
④ 逐份编辑素材：参考绑定的监控商品近期表现 → 选择注入 AI 上下文的商品 → 触发 AI 改写 → 生图 → 发布
⑤ 素材库查看全集（跨商机聚合，追溯已发布/未发布状态）
```

### 1.4 4 个功能页面

| Tab | 用途 | 核心操作 | 布局模式 |
|-----|------|----------|----------|
| 监控 | 查看监控商品近期表现，绑定/解绑商机 | 筛选、排序、批量绑定 | Tab 内：筛选栏 + DataTable |
| 商机管理 | 管理商机线索，查看关联统计 | CRUD、查看已绑定商品 | Tab 内：筛选栏 + 卡片网格 |
| 创作台 | 从商机创建素材，AI 改写、编辑、发布 | 批量创建、逐份编辑、AI workflow | Tab 内：左右分栏（商机列表 + 素材工作区） |
| 素材库 | 跨商机查看所有素材，追溯发布状态 | 筛选、发布、删除 | Tab 内：筛选栏 + DataTable |

---

## 2. 路由与导航

### 2.1 路由设计

4 个 Tab 统一在一个页面路由下，通过 `?tab=` 切换：

```
/dashboard/batch-publish?tab=monitor|opportunity|create|materials
```

默认 Tab：`monitor`（监控——工作流起点）

创作台可通过 `?tab=create&oid=123` 深度链接，从商机管理页跳转并预选商机。

### 2.2 侧边栏

在 `Sidebar.tsx` 的 `navItems` 中新增一项：

```typescript
{
  label: '批量创作',
  path: '/dashboard/batch-publish',
  icon: <Edit3 />,  // lucide-react
}
```

不需要子菜单——4 个 Tab 在页面内部切换，侧边栏只有一个入口。进入后默认显示监控 Tab。

### 2.3 页面骨架

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
    ['monitor', 'opportunity', 'create', 'materials'],
    'monitor'
  )
  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setTab} variant="overline" />
      {activeTab === 'monitor' && <MonitorTab />}
      {activeTab === 'opportunity' && <OpportunityTab />}
      {activeTab === 'create' && <CreateTab />}
      {activeTab === 'materials' && <MaterialsTab />}
    </div>
  )
}
```

**注意**：创作台 Tab 的布局容器与其他 3 个 Tab 不同（左右分栏 vs 筛选栏+DataTable），但外层 `flex flex-col gap-5 h-full` 不变——创作台组件内部自行管理其 `flex-1 min-h-0` 的左右分栏布局。

---

## 3. 数据模型

### 3.1 后端模型（已实现，位于 `backend/models/v2/opportunities.py`）

**Opportunity（商机）**：
- `id: int` (PK), `name: str` (unique), `description: str?`, `price: float` (default 2)
- `status: OpportunityStatus` (active / inactive)
- `ai_context_template: TemplateType` (only_opportunity / with_item)
- `userId: str`
- `monitored_items: ReverseRelation[ItemMonitored]`
- `materials: ReverseRelation[PublishMaterial]`

**ItemMonitored（监控商品）**：
- `gid: str` (PK), `title: str`, `description: str?`, `itemStatus: ItemStatus`, `publishTime: int`
- `uid: str`, `name: str`, `registerTime: int`
- `userId: str`, `keywords: str`
- `intervalHours: int` (default 6), `monitorStatus: MonitorStatus` (PAUSED=0 / MONITORING=1 / ANALYZED=2 / STORED=3 / DELETED=-100)
- `wantSlope: float`, `wantAvg: float`, `convertRate: float`, `hideAvg: float`
- `trendData: TrendData` (含 trendTime + trendDays + fetchCount + windows)
- `opportunity_id: int?` (FK→Opportunity, nullable, SET_NULL on delete)

**PublishMaterial（素材）**：
- `id: int` (PK), `images: list[MaterialImage]`, `description: str`, `price: float`
- `category: str?`, `status: MaterialStatus` (9 阶段流水线)
- `ai_context: MaterialAIContext` (JSON)
- `to_uid: str?`, `to_gid: str?` (发布后写入)
- `opportunity_id: int` (FK→Opportunity)

**MaterialAIContext**：
```python
class MaterialAIContext(TypedDict):
    template: TemplateType
    images: NotRequired[list[str]]
    items: NotRequired[list[str]]      # ← 每份素材独立选择的监控商品 gid 列表
    coverprompt: NotRequired[str]
```

**MaterialStatus 流水线**：
```
PENDING → WRITING → WRITINGDONE → GENIMAGEPLAN → GENIMAGEPLANDONE
→ GENIMAGE → GENIMAGEDONE → PUBLISHING → PUBLISHDONE / PUBLISHFAILED
```

### 3.2 关键后端 API（已实现，位于 `backend/free/user/selection.py`）

| 域 | 端点 | 方法 | 用途 |
|----|------|------|------|
| 监控 | `/api/selection/monitor.item.list` | GET | 分页列表，筛选（oid/uid/uname/gid/title/itemStatus/monitorStatus），排序（wantSlope/wantAvg/convertRate 等） |
| 监控 | `/api/selection/monitor.bind.opportunity` | POST | 绑定单个商品到已有商机（body: gid, opportunity_id） |
| 监控 | `/api/selection/monitor.batch.bind.opportunity` | POST | 批量绑定（body: gids[], opportunity_id） |
| 监控 | `/api/selection/monitor.bind.opportunity.create` | POST | 创建新商机并绑定（body: gid, name, description, ai_context_template） |
| 监控 | `/api/selection/monitor.unbind.opportunity` | POST | 解绑（body: gid） |
| 监控 | `/api/selection/monitor.item.delete` | POST | 删除监控记录（body: gid） |
| 商机 | `/api/selection/opportunity.list` | GET | 分页列表，筛选（name/description/status），annotationCount: materialCount + monitoredItemCount |
| 商机 | `/api/selection/opportunity.create` | POST | 创建（body: OpportunitySchema） |
| 商机 | `/api/selection/opportunity.update` | POST | 更新（query: oid, body: OpportunitySchema） |
| 商机 | `/api/selection/opportunity.delete` | POST | 删除（body: oid） |
| 素材 | `/api/selection/material.list` | GET | 分页列表，筛选（oid/name/description/category/status） |
| 素材 | `/api/selection/material.create` | POST | 从商机批量创建 N 份素材（query: num, body: OpportunitySchema） |
| 素材 | `/api/selection/material.edit` | POST | 编辑素材（body: id, PublishMaterialSchema） |
| 素材 | `/api/selection/material.rewrite.work` | POST | AI 改写（body: id, stage: write|genimageplan|genimage） |
| 素材 | `/api/selection/material.context.templateType` | GET | 获取上下文模板类型列表 |
| 素材 | `/api/selection/material.context` | POST | 设置 AI 上下文（实现待定） |
| 素材 | `/api/selection/material.channel` | POST | 获取发布渠道类目（body: id） |
| 素材 | `/api/selection/material.publish` | POST | 发布素材（body: id） |
| 素材 | `/api/selection/material.delete` | POST | 删除素材（body: id） |

---

## 4. 已确认的设计决策

### 4.1 路由：4 个 Tab，一个页面

4 个 Tab 放在 `/dashboard/batch-publish` 下，侧边栏一个入口。从运营视角出发，4 个功能是同一工作流的不同阶段。

### 4.2 创作台：左右分栏 + 切换商机模式

- **PC 端**：左侧商机列表 + 右侧素材工作区，中间 ResizableDivider 可拖拽
- **商机选择方式**：切换商机（非多商机统一列表）。每次操作一个商机，参考面板与素材列表保持同一商机上下文
- **左侧商机列表增强**：搜索框 + 状态筛选胶囊 + **分页器**（旧版无分页，一次加载全部）
- **右侧新增参考面板**：展示当前商机的 M 个监控商品指标，可折叠（默认展开）
- **素材编辑器**：Sheet 抽屉（桌面 500px / 移动 BottomSheet），内含 AI 上下文勾选区

### 4.3 批量创作 = 一个按钮

前端触发 `POST /material.create?num=N`，后端完成创建。N 由运营在 UI 中指定（默认 1，范围 1-10）。后续 AI 处理（改写/生图）需逐份触发（当前 API 接受单素材 id）。

### 4.4 新页面与旧页面的关系

新页面逐步替代旧的 `/dashboard/publish`。开发阶段二者共存，使用不同的后端 API 路径（旧：`/api/publish/*`，新：`/api/selection/*`）。先完成新页面，后续下线旧页面。

### 4.5 AI 上下文：每份素材独立选择

每份素材的 `ai_context.items` 独立选择注入哪些监控商品。素材 A 可以勾选商品 1、2，素材 B 勾选商品 1、3。勾选在编辑器（Sheet/BottomSheet）中完成。

---

## 5. 页面布局详细设计

### 5.1 监控 Tab（Monitor）

**布局**：筛选栏（SearchToolbar）+ DataTable + Pagination

**PC 端表格列**：

| 列 | 字段 | 宽度 | 说明 |
|----|------|------|------|
| 复选框 | — | 32px | 批量选择 |
| 商品 gid | gid | 1fr | 可点击查看详情 |
| 标题 | title | 2.5fr | line-clamp-2 |
| 价格 | 通过 fetchlog 获取 | 0.8fr | fmtPrice 格式化 |
| 想要斜率 | wantSlope | 0.8fr | fmtGrowth 带正负号+颜色 |
| 日均想要 | wantAvg | 0.8fr | fmtNumber |
| 转化率 | convertRate | 0.8fr | fmtPercent |
| 商品状态 | itemStatus | 0.8fr | StatusBadge |
| 监控状态 | monitorStatus | 0.8fr | StatusBadge |
| 绑定商机 | opportunity_id | 1.2fr | 商机名称 或 "未绑定"（gray-400） |
| 操作 | — | 0.6fr | 绑定/解绑、删除 |

**筛选栏**：
- 搜索框：标题/uid/name 模糊搜索
- 监控状态下拉：全部 / 监控中(1) / 已分析(2) / 已入库(3) / 已暂停(0)
- 绑定状态下拉：全部 / 已绑定 / 未绑定
- 排序：wantSlope ↓↑ / wantAvg ↓↑ / convertRate ↓↑

**批量操作**：
- 勾选多行 → 底部批量操作栏出现 → "绑定到商机"按钮
- 点击 → BindOpportunityModal：搜索已有商机 或 "创建新商机"（表单输入名称+描述+AI模板→调用 bind.opportunity.create）

**移动端**：
- 降级为卡片列表（无限滚动）
- 每张卡片展示：标题 + 3 个核心指标色块（wantSlope / wantAvg / convertRate）+ 绑定状态 dot
- 左滑手势：绑定/解绑快捷操作
- 长按进入批量选择模式

**空状态**："暂无监控商品，请先在选品监控中添加关键词并开始采集"

---

### 5.2 商机管理 Tab（Opportunity）

**布局**：筛选栏 + 卡片网格（桌面 3 列 / 移动单列）+ Pagination

**卡片字段**：
- 名称（font-semibold, text-gray-900）
- 描述（line-clamp-2, text-gray-500, text-sm）
- 价格（fmtPrice）
- 状态 Badge（active=绿色 / inactive=灰色）
- 📦 N 个监控商品（monitoredItemCount）
- 📝 N 份素材（materialCount）
- 操作按钮：编辑、删除

**筛选栏**：搜索框 + status 下拉（全部/active/inactive）

**CRUD**：
- 创建：搜索栏右侧 "+ 新建商机"按钮 → Sheet（桌面）/ BottomSheet（移动），表单含名称、描述、价格、AI 上下文模板
- 编辑：点击卡片上的编辑按钮 → 同上 Sheet 预填数据
- 删除：点击删除 → ConfirmDialog（danger variant），确认后调用 delete API，同时乐观移除卡片

**点击卡片** → 跳转到创作台 Tab 并预选该商机（`router.replace('?tab=create&oid=123', { scroll: false })`）

**空状态**："暂无商机线索，请从监控 Tab 绑定商品创建第一个商机"

---

### 5.3 创作台 Tab（Create）

这是 4 个 Tab 中信息密度最高的页面，采用**左右分栏 + Sheet 编辑器**的三层结构。

#### 5.3.1 桌面端布局

```
┌─────────────────────┬──────────────────────────────────────┐
│ 左侧：商机列表       │ 右侧：素材工作区                       │
│ (默认宽度 320px)    │                                      │
│                     │ ┌──────────────────────────────────┐ │
│ [🔍 搜索商机...]     │ │ 商机头部：名称 | ¥价格 | 状态      │ │
│ [全部] [active]     │ │ [编辑商机]          [+ 批量创建 ▾] │ │
│                     │ ├──────────────────────────────────┤ │
│ ┌─────────────────┐ │ │ ▸ 参考信息（5个监控商品 · 可折叠）  │ │
│ │ 日系简约风  ✓   │ │ │ [📱透明软壳 +12%] [📱磨砂 +8%]... │ │
│ │ 5商品 · 3素材   │ │ ├──────────────────────────────────┤ │
│ │ ¥12 · active    │ │ │ 素材列表                         │ │
│ └─────────────────┘ │ │ ┌──────────────────────────────┐ │ │
│ ┌─────────────────┐ │ │ │ ☐ │ 描述 │ 价格 │ 状态 │ 操作 │ │ │
│ │ 北欧风摆件      │ │ │ │ ☐ │ 日系..│ ¥12  │改写中│ 编辑 │ │ │
│ │ 3商品 · 1素材   │ │ │ │ ☐ │ 清新..│ ¥15  │已完成│ 发布 │ │ │
│ └─────────────────┘ │ │ └──────────────────────────────┘ │ │
│ ┌─────────────────┐ │ │ [分页器]                         │ │
│ │ 复古胶片机      │ │ └──────────────────────────────────┘ │
│ └─────────────────┘ │                                      │
│ [分页器]            │                                      │
└─────────────────────┴──────────────────────────────────────┘

Sheet 抽屉（点击素材行的「编辑」打开，宽 500px）：
┌──────────────────────────┐
│ 素材编辑              [✕] │
├──────────────────────────┤
│ 图片区域                  │
│ [图1] [图2] [图3] [+上传] │
├──────────────────────────┤
│ 描述                      │
│ [textarea: 素材文案...]   │
├──────────────────────────┤
│ 价格 [¥12.00]  类目 [选择]│
│ 发布账号 [选择]           │
├──────────────────────────┤
│ AI 上下文注入              │
│ ☑ 📱 透明软壳(+12%)      │
│ ☑ 📱 磨砂硬壳(+8%)       │
│ ☐ 📱 硅胶防摔(-3%)       │
│ ☐ 📱 彩色壳(+5%)         │
│ ☐ 📱 超薄壳(+15%)        │
├──────────────────────────┤
│ 创作进度                   │
│ 改写 → 封面规划 → 生图 → 发布│
│ ▰▰▰▱▱                     │
├──────────────────────────┤
│ [AI改写] [封面规划] [生图] │
│ [保存] [发布]             │
└──────────────────────────┘
```

#### 5.3.2 左侧 — 商机列表

- **搜索框**：按商机名称模糊搜索（前端过滤或后端筛选）
- **状态筛选胶囊**：全部 / active / inactive（`bg-blue-50 text-blue-700` 选中态）
- **卡片**：
  - 选中态：`border-blue-600 bg-blue-50/50`（蓝色边框 + 浅蓝底）
  - 未选中态：`border-gray-200 bg-white`
  - 内容：名称（font-semibold）、描述截断、价格、monitoredItemCount + materialCount 图标计数
  - 点击切换选中（单选，点击同一卡片取消选中 → 右侧重置为空状态）
- **分页器**：底部分页控件（与后端 page/page_size 同步）
- **默认宽度**：320px，localStorage 持久化，可拖拽 ResizableDivider 调整

#### 5.3.3 右侧 — 素材工作区

分为三个子区域，从上到下：

**区域 1：商机头部**（flex-shrink-0）
- 商机名称（text-lg font-semibold）
- 价格 + monitoredItemCount 摘要
- 右侧操作按钮：「编辑商机」（打开 Sheet 编辑商机信息）+「批量创建素材」按钮（点击弹出数量选择器 N=1~10）

**区域 2：参考信息面板**（可折叠，flex-shrink-0）
- 折叠条：`▸/▾ 参考信息 — 监控商品近期表现`（点击折叠/展开）
- 折叠/展开状态持久化到 localStorage，按商机 ID 存储
- 展开时：横向滚动的监控商品指标卡片
  - 每张卡片：商品标题、wantSlope（带正负颜色）、wantAvg、convertRate、hideAvg
  - 卡片宽度 ~180px，overflow-x: auto
  - M > 5 时末尾显示 "+N 更多 →" 引导横向滚动
- 折叠时：仅显示折叠条，释放 ~120px 纵向空间给素材列表

**区域 3：素材列表**（flex-1 min-h-0 overflow-y-auto）
- DataTable 列：复选框 | 描述(2fr) | 价格(0.8fr) | 状态(1fr) | 进度条(1.2fr) | 操作(0.8fr)
- 状态列使用 StatusBadge + 状态映射
- 进度条：StatusPipeline 组件，4 节点（改写/封面/生图/发布），每节点 ○/⏳/✓/✗
- 操作按钮：编辑（打开 Sheet）、发布、删除
- 批量操作栏：勾选多行 → "批量发布"按钮
- 底部分页器
- 3 秒轮询刷新（当存在 WRITING / GENIMAGE / PUBLISHING 状态素材时）

#### 5.3.4 Sheet 编辑器（素材编辑）

点击素材行的「编辑」或点击行本身打开 Sheet（500px 宽）：

**表单字段**：
- 图片：横向滚动缩略图 + 上传按钮（复用旧 publish 的图片上传逻辑）
- 描述：textarea（flex-1, min-height 200px），聚焦时便于大量文字编辑
- 价格：input[number]，fmtYuan 显示
- 类目：下拉选择（调用 material.channel 获取类目列表）
- 发布账号：下拉选择（从 accounts 列表）

**AI 上下文注入面板**：
- 列出当前商机绑定的 M 个监控商品
- 每行：☑ checkbox + 商品标题 + 核心指标摘要（wantSlope + wantAvg）
- 从 `material.ai_context.items` 读取当前选中状态
- 变更时调用 `POST /material.edit` 更新 `ai_context.items`
- 模板类型提示：根据商机的 `ai_context_template`（only_opportunity / with_item）显示当前策略

**创作进度**：
- StatusPipeline 组件（4 节点），反映当前素材的 stage
- 每个阶段完成后自动激活下一阶段的按钮

**操作按钮**：
- AI 改写：调用 `POST /material.rewrite.work { stage: 'write' }`
- 封面规划：调用 `POST /material.rewrite.work { stage: 'genimageplan' }`
- 生图：调用 `POST /material.rewrite.work { stage: 'genimage' }`
- 保存：调用 `POST /material.edit`
- 发布：调用 `POST /material.publish`

所有操作按钮在 loading 时显示 spinner + disabled，完成后 toast 通知结果。

#### 5.3.5 移动端

采用 **Push/Pop 导航栈**（模式 C，与现有布局规范一致）：

**Step 1：全屏商机列表**
- 搜索框 + 状态筛选胶囊
- 商机卡片列表（全宽，大触控区域 ≥44px）
- 无限滚动分页（触底加载更多）
- 点击商机 → Push 进入素材工作区

**Step 2：素材工作区（Push 进入）**
- 顶部面包屑：`← 返回商机列表 | 日系简约风手机壳`
- 支持屏幕边缘右滑返回
- 参考面板默认折叠（节省移动端纵向空间），点击展开为横向滚动卡片
- 批量创建按钮
- 素材卡片列表（每张卡片含描述 + 价格 + 状态 + 进度条）
- 点击素材 → BottomSheet 编辑器
- BottomSheet 关闭后回到 Step 2

---

### 5.4 素材库 Tab（Materials）

**布局**：筛选栏 + DataTable + Pagination

**PC 端表格列**：

| 列 | 字段 | 说明 |
|----|------|------|
| ID | id | 素材编号 |
| 描述 | description | 截断（line-clamp-2） |
| 价格 | price | fmtPrice |
| 类目 | category | 发布类目 |
| 状态 | status | StatusBadge（9 种状态映射） |
| 所属商机 | opportunity.name | 可点击跳转到创作台?tab=create&oid=X |
| 发布账号 | to_uid | 绑定账号名称 |
| 操作 | — | 发布、删除 |

**筛选栏**：
- 搜索框：描述模糊搜索
- 商机下拉：按商机筛选（从 opportunity list 获取选项）
- 状态下拉：按 MaterialStatus 筛选
- 类目搜索：按 category 筛选

**操作**：
- 发布按钮：调用 `POST /material.publish`，成功后乐观更新状态
- 删除按钮：ConfirmDialog（danger），确认后调用 `POST /material.delete`
- 点击行：打开简化编辑 Sheet（仅编辑基本信息，无 AI workflow）

**空状态**："暂无素材，请先从创作台创建素材"

---

## 6. 组件架构

### 6.1 API 模块

新建 `lib/api/batch-publish.ts`，统一管理所有 `/api/selection/*` 接口调用。类型与 API 函数就近定义。

**类型**（与后端 schema 对应）：
```typescript
MonitoredItem        // 监控商品（MonitoredItemSchema）
MonitoredItemListResponse  // { total, items: MonitoredItem[] }
OpportunityItem      // 商机（OpportunitySchema，含 materialCount, monitoredItemCount）
OpportunityListResponse    // { total, items: OpportunityItem[] }
PublishMaterial      // 素材（PublishMaterialSchema，含嵌套 opportunity）
MaterialListResponse       // { total, items: PublishMaterial[] }
MaterialAIContext    // { template, images?, items?, coverprompt? }
TemplateType         // 'only_opportunity' | 'with_item'
MaterialStage        // 'write' | 'genimageplan' | 'genimage'
OperationResponse    // { success, message }
ChannelCategory      // { channelCateName, channelCateId }
```

**API 函数**：与 3.2 节后端 API 一一对应，均通过 `fetchApi` 调用。

### 6.2 组件目录结构

```
components/batch-publish/
├── monitor/
│   ├── MonitorTab.tsx             # 监控 Tab 容器（筛选+表+分页）
│   ├── MonitorTable.tsx           # 监控商品 DataTable 封装
│   ├── MonitorCard.tsx            # 移动端监控商品卡片
│   ├── MonitorFilterBar.tsx       # 筛选栏
│   └── BindOpportunityModal.tsx   # 绑定商机弹窗（选已有/新建）
├── opportunity/
│   ├── OpportunityTab.tsx         # 商机管理 Tab 容器
│   ├── OpportunityGrid.tsx        # 商机卡片网格
│   ├── OpportunityCard.tsx        # 单个商机卡片
│   └── OpportunityForm.tsx        # 商机创建/编辑表单（Sheet 内用）
├── create/
│   ├── CreateTab.tsx              # 创作台 Tab 容器（左右分栏）
│   ├── OpportunityListPanel.tsx   # 左侧：商机列表（搜索+筛选+卡片+分页）
│   ├── MaterialWorkspace.tsx      # 右侧：素材工作区（头部+参考+表+分页）
│   ├── ReferencePanel.tsx         # 参考信息面板（可折叠，监控商品指标卡片）
│   ├── ReferenceCard.tsx          # 单个监控商品指标卡片（横向滚动子元素）
│   ├── MaterialEditor.tsx         # 素材编辑器（Sheet 内容，含 AI 上下文勾选区）
│   └── CreateMaterialModal.tsx    # 批量创建素材弹窗（选择数量 N）
├── materials/
│   ├── MaterialsTab.tsx           # 素材库 Tab 容器
│   ├── MaterialTable.tsx          # 素材库 DataTable 封装
│   └── MaterialCard.tsx           # 移动端素材卡片
└── shared/
    ├── StatusPipeline.tsx         # 素材状态进度条（4 节点）
    └── constants.ts               # 状态映射、网格列定义、颜色配置
```

### 6.3 Hooks 设计（三层拆分）

```
useMonitorFilters     → 筛选状态 + 分页（useState + useDebounce）
useMonitorData        → useQuery(['monitor-items', filters])
useMonitorMutations   → useMutation（绑定/解绑/批量绑定/删除）

useOpportunityFilters → 筛选状态 + 分页
useOpportunityData    → useQuery(['opportunities', filters])
useOpportunityMutations → useMutation（CRUD）

useCreateData         → useQuery(['materials', oid, page]) + useQuery(['opportunity', oid, 'items'])
useCreateMutations    → useMutation（创建素材/编辑/AI改写/发布/删除）

useMaterialFilters    → 筛选状态 + 分页
useMaterialData       → useQuery(['materials-all', filters])
useMaterialMutations  → useMutation（发布/删除）
```

### 6.4 复用已有组件

| 组件 | 来源 | 用途 |
|------|------|------|
| TabBar | `components/ui/Tab` | 4 个 Tab 切换 |
| DataTable | `components/ui/DataTable` | 监控、素材库表格 |
| SearchToolbar | `components/ui/SearchToolbar` | 筛选栏容器 |
| Pagination | `components/ui/pagination` | 所有列表分页 |
| ConfirmDialog | `components/ui/ConfirmDialog` | 删除确认 |
| EmptyState | `components/ui/EmptyState` | 空数据占位 |
| ErrorBanner | `components/ui/ErrorBanner` | 错误提示 |
| StatusBadge | `components/ui/StatusBadge` | 状态标签 |
| Sheet / BottomSheet | `components/ui/Sheet` | 编辑器抽屉 |
| LoadingSpinner | `components/ui/LoadingSpinner` | 加载状态 |
| ResizableDivider | `components/publish/ResizableDivider` | 左右分栏拖拽线 |
| useToast | `components/ui/toaster` | 操作结果通知 |

---

## 7. 数据流

### 7.1 监控 → 商机 绑定流

```
监控 Tab 批量勾选 → BindOpportunityModal
  ├── 选择已有商机 → POST /monitor.batch.bind.opportunity
  └── 创建新商机 → POST /monitor.bind.opportunity.create
→ invalidateQueries(['monitor-items'])
→ invalidateQueries(['opportunities'])
→ toast.success('已绑定 N 个商品到商机 XXX')
```

### 7.2 创作台数据流

```
左侧选择商机（oid）
  → useQuery(['materials', oid, page]) — 加载素材列表
  → useQuery(['opportunity', oid, 'items']) — 加载监控商品列表（用于参考面板）
  → useQuery(['opportunity', oid]) — 加载商机详情（用于头部）

批量创建素材：
  → POST /material.create?num=N { OpportunitySchema }
  → invalidateQueries(['materials', oid])
  → invalidateQueries(['opportunities']) — 更新 materialCount

编辑素材（Sheet）：
  → 打开 Sheet 时从 material.ai_context.items 读取已选商品
  → 修改任何字段 → 点击保存 → POST /material.edit
  → 乐观更新 ['materials', oid] 缓存

AI 改写：
  → POST /material.rewrite.work { id, stage }
  → 轮询 ['materials', oid] 获取最新状态
  → StatusPipeline 组件实时反映进度
```

### 7.3 跨 Tab 导航

```
商机管理卡片点击 → router.replace('?tab=create&oid=123')
创作台加载时 → 读取 searchParams.oid → 自动选中对应商机
素材库 → 点击所属商机 → router.replace('?tab=create&oid=X')
```

---

## 8. 技术约束

- 严禁动态路由 `[id]`——参数通过 URL query 传递
- 所有 API 通过 `fetchApi` 从 `lib/utils/api.ts`，不自行封装 fetch
- 类型与 API 函数就近定义在 `lib/api/batch-publish.ts`
- 命名导出 `export function ComponentName`，禁止 default export
- 使用 React Query 管理所有服务端数据（staleTime: 60s, gcTime: 5min）
- 页面顶级容器：`flex flex-col gap-5 h-full`
- 移动端检测：`useIsMobile()`
- 遵循 `frontend-design-tokens.md` 卡片内边距、圆角、字号、行高规范
- 遵循 `frontend-colors.md` 语义色体系（成功=绿、警告=琥珀、错误=红、信息=灰）
- 遵循 `frontend-format.md` 使用 fmtPrice / fmtPercent / fmtGrowth / fmtNumber

---

## 9. 与旧 publish 页面的差异总结

| 维度 | 旧 `/dashboard/publish` | 新 `/dashboard/batch-publish` |
|------|------------------------|------------------------------|
| 商机:监控商品 | 1:1（一个商机对应一个来源商品） | 1:N（一个商机绑定多个监控商品） |
| 商机列表 | 无分页、无搜索，全量加载 | 分页 + 搜索 + 状态筛选胶囊 |
| 参考信息 | 仅显示商机详情（描述、图片、价格） | 商机详情 + **折叠式监控商品指标面板**（横向卡片） |
| AI 上下文 | 全局 prompt template | **每份素材独立**选择注入商品 + 模板类型 |
| 素材状态 | 5 种状态 | **9 阶段流水线** + StatusPipeline 进度条 |
| 编辑器 | EditorDrawer（全宽右侧抽屉） | MaterialEditor（Sheet, 500px），新增 AI 上下文勾选区 |
| Tab 结构 | 单页面，无 Tab | 4 Tab（监控/商机管理/创作台/素材库） |
| 后端 API | `/api/publish/*` | `/api/selection/*` |

---

## 10. 后续迭代（out of scope for initial implementation）

- AI 改写结果对比（多版本 diff）：当前 API 每次改写覆盖原内容，后续可支持版本管理
- 素材模板：将一份素材的编辑结果作为模板应用到其他素材
- 发布定时：支持素材定时发布而非立即发布
- 批量 AI 处理：并行触发多份素材的 AI 改写
- `material.context` 端点的 UI 对接（当前后端标记"待定"）
