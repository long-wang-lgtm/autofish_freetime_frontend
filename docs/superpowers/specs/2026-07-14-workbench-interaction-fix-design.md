# 创作台商机列表与素材列表交互修复

> 2026-07-14 | 修复 PendingOverviewPanel 职责错位、选中态无法取消、分页器数据不一致
> 依赖：2026-07-14-batch-publish-workbench-fix-design.md（Phase 1-4 已完成）

---

## 一、问题诊断

### 1.1 PendingOverviewPanel 职责错位

PendingOverviewPanel 当前通过 `groupByOpportunity()` 按商机名分组素材，生成折叠/展开交互。这犯了两个错误：

**错误一：商机导航重复实现。** 左侧 OpportunityListPanel 已经是商机列表（搜索、筛选、选中、CRUD、分页）。PendingOverviewPanel 的商机分组头是第二个商机导航入口，违反了"相同交互模式必须使用同一组件"原则。用户面对两个不同的"浏览商机"心智模型——左侧卡片选中 vs 右侧分组折叠。

**错误二：分组头点击语义歧义。** 点击分组标题只折叠/展开，不导航。但用户看到商机名称时，心理预期可能是"进入该商机的工作区"。一个点击目标承载了两个可能行为，却没有明确的 affordance 区分。

### 1.2 选中态无法取消

`WorkbenchTab.handleSelectOid` 永远执行 `params.set('oid', ...)`，没有判断"点击已选中项 → 取消选中"的逻辑。取消选中的唯一路径是 MaterialWorkspace 顶部的 ← 返回按钮（调用 `handleBackToOverview`）。

OpportunityListPanel 内点击已选中的商机卡片 = 无效操作。

### 1.3 素材工作区分页器失效

`useWorkbenchData.ts` 中素材查询：

```ts
queryKey: ['batch-publish', 'materials', selectedOid],           // 没有 page
queryFn: () => listMaterials({ oid: selectedOid, page_size: 100 }), // 写死 100
```

`materialPage` 状态存在但未接入 queryKey，翻页只改 state 不触发 API 请求。UI 显示 pageSize=20，实际 API 一次拉 100 条，分页器是装饰。

### 1.4 分页大小不统一

| 位置 | pageSize | 状态 |
|------|----------|------|
| OpportunityListPanel | 20 | 正常 |
| PendingOverviewPanel | 50 | 不一致 |
| MaterialWorkspace | 100（API）/ 20（UI 显示） | 不一致且数据错配 |

统一为 **20 条/页**。

---

## 二、修复方案

### 2.1 PendingOverviewPanel：分组 → 平铺

**职责定义**：PendingOverviewPanel = 跨商机待办素材的平铺列表。它不承担商机导航职责——商机导航的唯一入口是 OpportunityListPanel（PC 左侧面板 / 移动端商机列表视图）。

删除：
- `groupByOpportunity()` 函数
- `collapsedGroups` 状态和 `toggleGroup` 回调
- 分组折叠 JSX 结构

改为平铺表格，每行字段：

| 列 | 内容 | 说明 |
|----|------|------|
| 素材标识 | `素材 #{id} · {description 前 30 字}` | 和现在一样 |
| 所属商机 | 只读 inline 标签，`text-xs text-gray-400` | **不可点击**，纯粹的信息标注 |
| 状态 | StatusBadge，使用 `MATERIAL_STATUS_CONFIG` | 和现在一样 |
| 更新时间 | `fmtRelative(updated_at)` | 和现在一样 |
| 入口 | `→` | 点击行进入工作区 |

排序规则：
1. `publish_failed` 状态的素材置顶
2. 同状态按 `updated_at` 倒序

点击行 → `onSelectMaterial(m)` → 选中该素材所属商机 + 右侧切换到 MaterialWorkspace。

**分页**：pageSize = 20。

### 2.2 OpportunityListPanel：Toggle 取消选中

`WorkbenchTab.handleSelectOid` 增加 toggle 逻辑：

```
如果 oid === 当前 selectedOid → 调用 handleBackToOverview() 清空选中
否则 → 设置 oid
```

OpportunityListPanel 无需改动——它只负责调用 `onSelectOid(item.id)`，toggle 逻辑由 WorkbenchTab 集中处理。

### 2.3 素材工作区分页修复

`useWorkbenchData` 新增 `materialPage` 参数，接入 queryKey 和 queryFn：

```ts
// 改前
queryKey: ['batch-publish', 'materials', selectedOid],
queryFn: () => listMaterials({ oid: selectedOid, page_size: 100 }),

// 改后
queryKey: ['batch-publish', 'materials', selectedOid, { page: materialPage }],
queryFn: () => listMaterials({ oid: selectedOid, page: materialPage, page_size: 20 }),
```

`MaterialWorkspace` 内 Pagination 的 `pageSize` 改为引用常量而非写死。

### 2.4 移动端：双视图切换 + 完整商机列表

**核心原则**：移动端和 PC 端的逻辑完全一致，差异仅在于布局。

PC 端左面板 + 右面板的左右分栏结构在移动端无法并行展示，改为两个顶层视图通过切换按钮切换：

```
┌──────────────────────────────┐
│ ◉待办概览    ○商机列表        │  ← 两个切换按钮（不是胶囊条）
├──────────────────────────────┤
│                              │
│  当前视图内容                  │
│                              │
└──────────────────────────────┘
```

**视图 "待办概览"（默认）**：
- 渲染 `PendingOverviewPanel`——和 PC 端右侧概览态**完全相同的组件**
- 平铺素材列表，商机名为只读标签，20 条/页
- 点击素材行 → Push 进入工作区（选中该素材所属商机）

**视图 "商机列表"**：
- 渲染 `OpportunityListPanel`——和 PC 端左侧面板**完全相同的组件**
- 完整的搜索、筛选、分页（20 条/页）、CRUD（新建/编辑/删除）
- 点击商机 → Push 进入工作区
- 点击已选中的商机 → 取消选中 + 自动切回待办概览视图

**工作区层（Push）**：
- 和现在一样：← 返回 + 商机名 + MaterialWorkspace
- 返回 → Pop 回上一视图

**为什么不用胶囊条**：
- 商机列表有分页（20 条/页），胶囊条只能展示 `slice(0, 6)`，翻到第 2 页的商机不可达
- 20 个胶囊横向排列需要 ~1200px 宽度，横向滑动体验差
- 胶囊条缺少搜索、筛选、CRUD——它阉割了 OpportunityListPanel 的能力
- 切换按钮 + 完整组件复用的方案，移动端获得和 PC 端完全相同的商机管理能力

**PC 与移动端逻辑对照**：

| 职责 | PC 端 | 移动端 | 逻辑 |
|------|-------|--------|------|
| 商机列表 | 左侧 OpportunityListPanel | "商机列表"视图（同一组件） | **相同** |
| 概览 | 右侧 PendingOverviewPanel | "待办概览"视图（同一组件） | **相同** |
| 工作区 | 右侧 MaterialWorkspace | Push 工作区层（同一组件） | **相同** |
| 素材编辑 | Sheet 抽屉 | BottomSheet（Sheet 组件内置 useIsMobile 切换） | **相同** |

**移动端独有的状态**：`mobileView: 'overview' | 'opportunities'`——仅控制当前显示哪个顶层视图，不影响任何业务逻辑。Workspace 态由 `selectedOid` 驱动（和 PC 端一致）。

### 2.5 商机名标签：跨设备一致

商机名在概览列表中是一个**只读 inline 标签**，PC 和移动端使用相同的渲染：

```
<span class="text-xs text-gray-400">[商机名称]</span>
```

- 不可点击
- 不可交互
- 纯信息标注，回答"这个素材属于哪个商机"

### 2.6 MaterialRow 缓存未命中时使用 LoadingSpinner

当前 MaterialRow 在缓存中找不到 material 时（第 54-57 行）显示纯文字 `加载中...`，违反 `frontend-error.md`："加载状态统一使用 LoadingSpinner"。

改为使用 `LoadingSpinner size="sm"`，和项目中其他列表行内加载保持一致。

### 2.7 MaterialsTab / MonitorTab 提取共享错误守卫

`MaterialsTab.tsx` 和 `MonitorTab.tsx` 各自包含一段完全相同的 ErrorBanner 守卫代码（8 行）：

```tsx
if (error && !isLoading && data.length === 0) {
  return (
    <ErrorBanner
      variant="banner"
      message={`加载失败：${(error as Error)?.message || '未知错误'}`}
      onRetry={() => refetch()}
    />
  )
}
```

提取为独立组件或 hook，消除复制粘贴。放在 `components/batch-publish/shared/` 下，两个 Tab 各自引用。

---

## 三、变更清单

### 修改文件

| 文件 | 变更 |
|------|------|
| `PendingOverviewPanel.tsx` | 删除 groupByOpportunity、collapsedGroups、折叠 JSX；改为平铺表格 + 只读商机名标签；排序改为 flat sort；pageSize 改为 20 |
| `WorkbenchTab.tsx` | handleSelectOid 增加 toggle（oid === selectedOid → 取消）；移动端改为双视图切换（待办概览 / 商机列表）+ Push 工作区，删除胶囊条和 `mobileView === 'opportunity-list'` 相关代码；向 MaterialWorkspace 和 MaterialRow 透传 materialPage |
| `useWorkbenchData.ts` | 接口增加 materialPage 参数；素材 query 的 queryKey 和 queryFn 接入 materialPage；page_size 100 → 20；概览 page_size 50 → 20 |
| `useWorkbenchPage.ts` | 透传 materialPage 给 useWorkbenchData；mobileView 类型改为 `'overview' \| 'opportunities'`（移除 `'opportunity-list'` 和 `'workspace'`） |
| `MaterialWorkspace.tsx` | Pagination pageSize 引用常量替代写死值；将 materialPage 透传给 MaterialRow |
| `MaterialRow.tsx` | 新增 materialPage prop；`getQueryData` / `setQueryData` 的 key 从 `[..., selectedOid]` 改为 `[..., selectedOid, { page: materialPage }]`；缓存未命中时用 `LoadingSpinner` 替代纯文字"加载中..." |
| `MaterialsTab.tsx` | 删除内联 ErrorBanner 守卫，改用共享组件 |
| `MonitorTab.tsx` | 删除内联 ErrorBanner 守卫，改用共享组件 |
| `constants.ts` | queryKeys.materials.byOid 增加 page 参数；新增 PAGE_SIZE 常量导出 |

### 新增文件

| 文件 | 说明 |
|------|------|
| `components/batch-publish/shared/ErrorGuard.tsx` | 提取 MaterialsTab / MonitorTab 共享的 ErrorBanner 守卫逻辑；接收 `error`、`isLoading`、`dataLength`、`refetch` 四个 prop，当 error 且 data 为空时渲染 `ErrorBanner variant="banner"` |

### MaterialRow 的关联变更

MaterialRow 内部通过 `queryClient.getQueryData` 读取缓存（第 32 行）和 `queryClient.setQueryData` 乐观更新（第 63 行），两者使用精确 key `['batch-publish', 'materials', selectedOid]`。

分页修复后，素材查询 key 变为 `['batch-publish', 'materials', selectedOid, { page: materialPage }]`——缺少 page 参数会导致 getQueryData 返回 undefined（material 找不到）以及 setQueryData 写入错误的缓存条目。

因此 MaterialRow 需要新增 `materialPage` prop，用于构造完整 key。其余行内编辑、图片管理、进度操作逻辑不变。

### 不受影响

- `OpportunityListPanel.tsx` — 只调用 onSelectOid，不感知 toggle 逻辑
- `MaterialEditSheet.tsx` — 不变
- `ProgressActionCell.tsx` / `MaterialImageCell.tsx` / `InlineEditCell.tsx` — 不变
- `ReferencePanel.tsx` — 不变
- `constants.ts` — 页大小常量提取（如需要）在此文件
- `BatchActionBar.tsx` — 不变
- `CreateMaterialModal.tsx` — 不变

### 删除的代码

PendingOverviewPanel 中删除：
- `groupByOpportunity()` 函数（~20 行）
- `collapsedGroups` state + `toggleGroup`（~8 行）
- `grouped` useMemo（~2 行）
- 折叠分组 JSX 结构（~40 行）

---

## 四、数据流

### useWorkbenchPage 移动端状态变更

```ts
// 改前
type MobileView = 'overview' | 'opportunity-list' | 'workspace'

// 改后
type MobileView = 'overview' | 'opportunities'
```

`mobileView` 现在只控制移动端顶层显示"待办概览"还是"商机列表"。Workspace 态的进入/退出由 `selectedOid` 是否为空驱动（和 PC 端一致）——不再作为独立的 mobileView 值。

### useWorkbenchData 接口变更

```ts
interface UseWorkbenchDataParams {
  selectedOid: number | undefined
  overviewPage: number
  oppSearch: string
  oppStatus: string
  oppPage: number
  materialPage: number  // 新增：素材工作区分页
}
```

### 概览素材查询

```ts
// 改前
queryKey: ['batch-publish', 'materials', 'overview', { page: overviewPage }],
queryFn: () => listMaterials({ page: overviewPage, page_size: 50, status: 'pending,...' }),

// 改后
queryKey: ['batch-publish', 'materials', 'overview', { page: overviewPage }],
queryFn: () => listMaterials({ page: overviewPage, page_size: 20, status: 'pending,...' }),
```

### 工作区素材查询

```ts
// 改前
queryKey: ['batch-publish', 'materials', selectedOid],
queryFn: () => listMaterials({ oid: selectedOid, page_size: 100 }),

// 改后
queryKey: ['batch-publish', 'materials', selectedOid, { page: materialPage }],
queryFn: () => listMaterials({ oid: selectedOid, page: materialPage, page_size: 20 }),
```

### React Query 缓存 Key 更新

`constants.ts` 中 `queryKeys` 更新：

```ts
materials: {
  byOid: (oid: number | undefined, page: number) =>
    ['batch-publish', 'materials', oid, { page }] as const,
  overview: (page: number) =>
    ['batch-publish', 'materials', 'overview', { page }] as const,
},
```

同时新增：

```ts
export const PAGE_SIZE = 20
```

### useWorkbenchMutations 不受影响

`invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })` 使用 React Query 的模糊匹配——前缀 `['batch-publish', 'materials', 123]` 会匹配所有 `['batch-publish', 'materials', 123, { page: N }]`，即 mutation 后所有分页同时失效。这是正确行为，无需修改。

---

## 五、验证要点

1. PC 端：点击左侧商机 → 右侧切换工作区；再次点击同一商机 → 右侧回到概览
2. PC 端：概览列表为平铺，无折叠分组，每行显示只读商机名标签
3. PC 端：点击概览列表中的素材行 → 选中对应商机 + 进入工作区
4. PC 端：素材工作区分页器翻页 → 触发新 API 请求，数据正确更新
5. 移动端："待办概览"和"商机列表"两个切换按钮功能正常，默认显示待办概览
6. 移动端："商机列表"视图渲染完整的 OpportunityListPanel（搜索、筛选、分页、CRUD 均可操作）
7. 移动端："商机列表"中点商机 → Push 工作区；工作区返回 → 回到进入前的视图
8. 移动端："商机列表"中点已选中的商机 → 取消选中 + 自动切回待办概览
9. 移动端："待办概览"中平铺列表和 PC 端渲染逻辑相同（商机名为只读标签）
10. 全设备：所有分页器的 pageSize 均为 20
11. MaterialRow 缓存未命中时显示 LoadingSpinner 而非纯文字"加载中..."
12. MaterialsTab 和 MonitorTab 使用共享 ErrorGuard，不再各自内联 ErrorBanner 守卫
