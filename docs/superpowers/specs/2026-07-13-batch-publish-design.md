# 批量创作发布系统 — 设计文档

> 状态：设计中 | 2026-07-13

## 1. 概述

### 1.1 背景

当前系统有 `/dashboard/publish`（商品发布）页面，其数据模型为商机与监控商品 1:1 绑定。新版后端已重构数据模型为 1:N（一个商机绑定多个监控商品），并新增素材状态流水线（PENDING → WRITING → ... → PUBLISHDONE）。

新系统需承载从"监控商品 → 商机线索 → 素材创作 → 发布"的完整运营工作流，逐步替代旧发布页面。

### 1.2 核心数据关系

```
ItemMonitored (监控商品) ──N:1──> Opportunity (商机) ──1:N──> PublishMaterial (素材)
```

- **监控商品**：从选品系统采集，携带近期表现指标（wantSlope、wantAvg、convertRate、hideAvg、trendData）
- **商机**：运营创建的"线索"，绑定多个同类型监控商品，含 AI 上下文模板
- **素材**：从商机生成的可发布实体，每份素材有独立的 AI 上下文（可独立选择注入哪些监控商品信息），经历 9 阶段状态流水线

### 1.3 运营工作流

```
① 监控商品列表 → 筛选表现好的商品
② 绑定到商机线索（同类型商品绑定到同一商机）
③ 进入创作台 → 选择商机 → 批量创建素材
④ 逐份编辑/AI改写素材（参考绑定的监控商品指标，选择注入AI上下文）
⑤ 发布素材
⑥ 素材库查看全集（已发布/未发布）
```

### 1.4 4 个功能页面

| 页面 | 用途 | 核心操作 |
|------|------|----------|
| 监控 | 查看监控商品近期表现，绑定/解绑商机 | 筛选、排序、批量绑定 |
| 商机管理 | 管理商机线索，查看关联统计 | CRUD、查看已绑定商品 |
| 创作台 | 从商机创建素材，AI 改写、编辑、发布 | 批量创建、逐份编辑、AI workflow |
| 素材库 | 跨商机查看所有素材，追溯发布状态 | 筛选、发布、删除 |

---

## 2. 数据模型

### 2.1 后端模型（已实现）

**Opportunity（商机）**：`id`, `name`, `description`, `price`, `status`(active/inactive), `ai_context_template`(only_opportunity/with_item), `userId`

**ItemMonitored（监控商品）**：`gid`(PK), `title`, `description`, `itemStatus`, `uid`, `name`, `monitorStatus`, `wantSlope`, `wantAvg`, `convertRate`, `hideAvg`, `trendData`, `opportunity_id`(FK→Opportunity, nullable)

**PublishMaterial（素材）**：`id`, `images`, `description`, `price`, `category`, `status`(9阶段), `ai_context`(MaterialAIContext), `to_uid`, `to_gid`, `opportunity_id`(FK→Opportunity)

**MaterialAIContext**：`{ template: TemplateType, images?: string[], items?: string[], coverprompt?: string }` — `items` 字段为注入上下文的监控商品 gid 列表

### 2.2 关键后端 API（已实现）

| 域 | 端点 | 方法 | 用途 |
|----|------|------|------|
| 监控 | `/api/selection/monitor.item.list` | GET | 分页列表，支持筛选和排序 |
| 监控 | `/api/selection/monitor.bind.opportunity` | POST | 绑定单个商品到商机 |
| 监控 | `/api/selection/monitor.batch.bind.opportunity` | POST | 批量绑定 |
| 监控 | `/api/selection/monitor.bind.opportunity.create` | POST | 创建商机+绑定 |
| 监控 | `/api/selection/monitor.unbind.opportunity` | POST | 解绑 |
| 监控 | `/api/selection/monitor.item.delete` | POST | 删除 |
| 商机 | `/api/selection/opportunity.list` | GET | 分页列表（含 materialCount、monitoredItemCount） |
| 商机 | `/api/selection/opportunity.create` | POST | 创建 |
| 商机 | `/api/selection/opportunity.update` | POST | 更新 |
| 商机 | `/api/selection/opportunity.delete` | POST | 删除 |
| 素材 | `/api/selection/material.list` | GET | 分页列表，支持筛选 |
| 素材 | `/api/selection/material.create?num=N` | POST | 从商机批量创建 N 份素材 |
| 素材 | `/api/selection/material.edit` | POST | 编辑素材 |
| 素材 | `/api/selection/material.rewrite.work` | POST | AI 改写（stage: write/genimageplan/genimage） |
| 素材 | `/api/selection/material.context.templateType` | GET | 获取上下文模板类型 |
| 素材 | `/api/selection/material.context` | POST | 设置 AI 上下文（待定） |
| 素材 | `/api/selection/material.channel` | POST | 获取发布渠道类目 |
| 素材 | `/api/selection/material.publish` | POST | 发布 |
| 素材 | `/api/selection/material.delete` | POST | 删除 |

---

## 3. 已确认的设计决策

### 3.1 路由组织

待定（见第 6 节）。

### 3.2 创作台布局：方案 C — 素材为主体 + 侧边抽屉参考

- 桌面端：全宽素材列表为主体，点击「编辑」打开 Sheet 抽屉（宽 500px），抽屉内含编辑器 + AI 上下文参考面板
- 移动端：素材列表 + 点击后 BottomSheet 编辑
- 参考面板：列出当前商机绑定的 M 个监控商品，每个可勾选是否注入 AI 上下文。**每份素材独立选择**——素材 A 可以注入商品 1、2，素材 B 注入商品 1、3

### 3.3 批量创作 = 一个按钮

前端只需触发 `POST /material.create?num=N`，后端完成创建。N 由运营在 UI 中指定（默认 1，建议范围 1-10）。

### 3.4 新页面与旧页面的关系

新页面逐步替代旧的 `/dashboard/publish`。开发阶段二者共存，使用不同的后端 API 路径（旧：`/api/publish/*`，新：`/api/selection/*`）。先开发完成新页面，后续再下线旧页面。

---

## 4. 页面布局设计

### 4.1 监控页（Monitor）

**布局模式**：Tab + 筛选栏 + DataTable（与现有 selection 页面模式一致）

**信息展示**：
- 表格列：gid、标题、价格、wantSlope（想要斜率）、wantAvg（日均想要）、convertRate（转化率）、itemStatus（商品状态）、monitorStatus（监控状态）、绑定商机（名称/未绑定）、操作
- 移动端卡片：每个卡片展示标题 + 3 个核心指标（wantSlope/wantAvg/convertRate）+ 绑定状态

**交互**：
- 筛选：搜索框、monitorStatus 下拉、itemStatus 下拉、绑定状态（已绑定/未绑定）
- 排序：wantSlope、wantAvg、convertRate 等可排序列
- 批量操作：勾选多行 → "绑定到商机"按钮 → 弹出商机选择器（选择已有商机 或 创建新商机）
- 单行操作：绑定/解绑、删除

**状态**：Loading → Spinner / Error → ErrorBanner / Empty → EmptyState（"暂无监控商品，请先在选品监控中添加"）

### 4.2 商机管理页（Opportunity）

**布局模式**：Tab + 筛选栏 + 网格卡片（桌面）/ 列表卡片（移动）

**信息展示**：
- 卡片字段：名称、描述（截断）、价格、状态（active/inactive）、监控商品数（monitoredItemCount）、素材数（materialCount）
- 移动端：加大触控区域（≥44px）

**交互**：
- 筛选：搜索框、status 下拉
- CRUD：创建/编辑 → Sheet（桌面）/ BottomSheet（移动）；删除 → ConfirmDialog
- 点击卡片 → 进入创作台并预选该商机（`?oid=123`）

**状态**：Loading → 骨架卡片 / Error → ErrorBanner / Empty → EmptyState（"暂无商机线索，请从监控页绑定商品创建"）

### 4.3 创作台（Creation Workbench）— 方案 C

**桌面端布局**：
```
┌────────────────────────────────────────────┐
│ 商机选择器：[日系简约风手机壳 ▼]  [切换]    │
│ 5个监控商品 · 3份未发布 · 1份已发布         │
│                          [+ 批量创建素材 ▾] │
├────────────────────────────────────────────┤
│ 素材列表（全宽 DataTable）                  │
│ ┌────────────────────────────────────────┐ │
│ │ ☐ 素材#1 │ 日系简约... │ ¥12 │ ⏳改写中 │ │ ← 点击行打开 Sheet
│ │ ☐ 素材#2 │ 清新文艺... │ ¥15 │ ✓已完成 │ │
│ │ ☐ 素材#3 │ 极简主义... │ ¥10 │ ○待处理 │ │
│ │ ☐ 素材#4 │ ...        │ ¥8  │ ✓已发布 │ │
│ └────────────────────────────────────────┘ │
│                  [分页器]                   │
└────────────────────────────────────────────┘

Sheet 抽屉（编辑素材 #1）：
┌─────────────────────┐
│ 素材 #1 编辑    [✕] │
├─────────────────────┤
│ 图片区域            │
│ [图1][图2][+上传]   │
├─────────────────────┤
│ 描述               │
│ [textarea........]  │
├─────────────────────┤
│ 价格 [¥12] 类目 […] │
├─────────────────────┤
│ AI 上下文注入        │
│ ☑ 透明软壳(+12%)   │
│ ☑ 磨砂硬壳(+8%)    │
│ ☐ 硅胶防摔(-3%)    │
│ ☐ 彩色壳(+5%)      │
│ ☐ 超薄壳(+15%)     │
├─────────────────────┤
│ 创作进度             │
│ 改写→封面→生图→发布  │
├─────────────────────┤
│ [AI改写] [发布]     │
└─────────────────────┘
```

**移动端**：商机选择器固定在顶部，素材列表为卡片视图，编辑使用 BottomSheet。

**素材列表列**：复选框、描述（截断）、价格、状态、进度条、操作（编辑/发布/删除）

**AI 改写工作流**：
- 改写（write）：调用 `POST /material.rewrite.work { stage: 'write' }`
- 封面规划（genimageplan）：调用 `POST /material.rewrite.work { stage: 'genimageplan' }`
- 生图（genimage）：调用 `POST /material.rewrite.work { stage: 'genimage' }`
- 每个阶段完成后方可进入下一阶段，进度条实时反映状态

**待定：切换商机 vs 多商机素材统一创作**（见第 6 节）

### 4.4 素材库（Materials）

**布局模式**：Tab + 筛选栏 + DataTable

**信息展示**：
- 表格列：ID、描述（截断）、价格、类目、状态、所属商机、发布账号、操作
- 移动端卡片：描述 + 价格 + 状态 + 所属商机

**交互**：
- 筛选：搜索框、商机下拉、状态下拉、类目筛选
- 快速操作：发布（调用 material.publish）、删除（ConfirmDialog）
- 点击行 → 可打开简化编辑 Sheet（仅编辑，无 AI workflow）

**状态**：Loading → Spinner / Error → ErrorBanner / Empty → EmptyState（"暂无素材，请先从创作台创建"）

---

## 5. 组件架构

### 5.1 API 模块

新建 `lib/api/batch-publish.ts`，统一管理所有 `/api/selection/*` 接口调用和类型定义。

类型（与后端 schema 对应）：
```typescript
MonitoredItem      // 监控商品
OpportunityItem    // 商机（含 materialCount, monitoredItemCount）
PublishMaterial    // 素材（含嵌套 opportunity）
```

### 5.2 组件目录结构

```
components/batch-publish/
├── monitor/
│   ├── MonitorTable.tsx          # 监控商品 DataTable 封装
│   ├── MonitorCard.tsx           # 移动端监控商品卡片
│   ├── MonitorFilterBar.tsx      # 筛选栏
│   └── BindOpportunityModal.tsx  # 绑定商机弹窗（选已有/新建）
├── opportunity/
│   ├── OpportunityGrid.tsx       # 商机卡片网格
│   ├── OpportunityCard.tsx       # 单个商机卡片
│   └── OpportunityForm.tsx       # 商机创建/编辑表单（Sheet 内用）
├── create/
│   ├── CreationWorkbench.tsx     # 创作台主组件
│   ├── OpportunitySelector.tsx   # 商机选择器
│   ├── MaterialTable.tsx         # 素材列表 DataTable
│   ├── MaterialEditor.tsx        # 素材编辑器（Sheet 内容）
│   └── AIReferencePanel.tsx      # AI 上下文注入参考面板（监控商品勾选）
├── materials/
│   ├── MaterialLibrary.tsx       # 素材库 DataTable 封装
│   └── MaterialCard.tsx          # 移动端素材卡片
└── shared/
    ├── StatusPipeline.tsx        # 素材状态进度条
    └── constants.ts              # 状态映射、列定义等常量
```

### 5.3 Hooks 设计

遵循三层拆分模式：

```
useMonitorFilters    → 筛选状态 + 分页
useMonitorData       → React Query useQuery（列表数据）
useMonitorMutations  → React Query useMutation（绑定/解绑/删除）

useOpportunityFilters → 筛选状态 + 分页
useOpportunityData    → React Query useQuery（列表数据）
useOpportunityMutations → React Query useMutation（CRUD）

useCreateData        → React Query useQuery（素材列表、监控商品）
useCreateMutations   → React Query useMutation（创建素材、编辑、AI改写、发布）

useMaterialFilters   → 筛选状态 + 分页
useMaterialData      → React Query useQuery（素材库列表）
useMaterialMutations → React Query useMutation（发布、删除）
```

---

## 6. 待定决策

### 6.1 路由组织

**用户倾向**：4 个 Tab 放在一个页面下

**需讨论**：创作台布局（方案 C：全宽素材列表 + Sheet 编辑）与其他 3 个 Tab（筛选 + DataTable）的容器结构不同。如果共用 `flex flex-col gap-5 h-full` 包装器，Tab 切换时组件内部自行管理布局差异，是否可接受？

**替代方案**：侧边栏子菜单折叠两个入口（列表管理 / 创作台）

### 6.2 创作时的商机切换模式

运营在创作台时：
- **模式 A — 切换商机**：顶栏选择器切换当前商机 → 素材列表切换为该商机的素材。一次只操作一个商机。
- **模式 B — 多商机素材统一列表**：素材列表展示所有商机（或选中的多个商机）的素材。列表新增"所属商机"列。创建素材前需先选目标商机。

**影响**：
- 模式 A 更聚焦，参考面板始终显示当前商机的监控商品
- 模式 B 更灵活，运营可同时处理多个商机的素材，但参考面板需要跟随素材动态切换

---

## 7. 技术约束

- 严禁动态路由 `[id]`——参数通过 `?oid=123` 传递
- 所有 API 通过 `fetchApi` 从 `lib/utils/api.ts`
- 类型与 API 函数就近定义在 `lib/api/batch-publish.ts`
- 命名导出 `export function ComponentName`
- 使用 `React Query` 管理服务端数据
- 页面顶级容器：Tab 页面用 `flex flex-col gap-5 h-full`
- 移动端检测：`useIsMobile()`
- 复用已有 UI 组件：TabBar、DataTable、SearchToolbar、Pagination、ConfirmDialog、EmptyState、ErrorBanner、StatusBadge、Sheet/BottomSheet、LoadingSpinner
