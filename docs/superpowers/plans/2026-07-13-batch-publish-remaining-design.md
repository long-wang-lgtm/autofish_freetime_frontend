# 批量创作发布系统 — 待完成设计清单

> 状态：待讨论 | 2026-07-13 | 关联设计文档：`docs/superpowers/specs/2026-07-13-batch-publish-design.md`

## 一、设计覆盖度总览

回顾对话历史，讨论集中在**商机管理**和**创作台**的布局上。以下 7 个设计域尚未深入：

| # | 设计域 | 讨论程度 | 需要补充的内容 |
|---|--------|----------|---------------|
| 1 | 监控 Tab | ⚠️ 仅列了表格列名 | 指标可视化、默认排序策略、绑定交互流程、移动端卡片 |
| 2 | 商机管理 Tab | ⚠️ 仅卡片概要 | 卡片 vs 表格视图切换、表单字段+校验、点击行为细节 |
| 3 | 素材库 Tab | ❌ 未讨论 | 与创作台素材列表的职责区分、操作范围、批量发布 |
| 4 | 创作台补充细节 | ⚠️ 布局已定 | 参考面板卡片设计、编辑器表单、AI 状态机、移动端 Push/Pop 实现 |
| 5 | 跨 Tab 协作 | ❌ 未讨论 | Tab 间数据一致性、状态保留、导航捷径 |
| 6 | 批量操作交互 | ❌ 未讨论 | 多选逻辑、底部操作栏、全选策略 |
| 7 | AI 状态轮询 | ❌ 未讨论 | 轮询条件、策略、实现方式 |

---

## 二、监控 Tab — 待深入设计

### 2.1 当前状态

设计文档 §5.1 仅给出了 PC 端表格列的清单（gid / 标题 / 价格 / wantSlope / wantAvg / convertRate / itemStatus / monitorStatus / 绑定商机 / 操作）。

### 2.2 待决策项

**a) 指标的可视化权重**

运营打开监控页，目标是快速找到"值得绑定到商机"的商品。三个核心指标的视觉权重如何分配？

| 指标 | 含义 | 建议视觉处理 |
|------|------|-------------|
| wantSlope | 想要数增长斜率 | **主排序键**，fmtGrowth 带正负号颜色（绿色↑/红色↓），font-semibold |
| wantAvg | 日均想要数 | 辅助参考，fmtNumber，text-gray-700 |
| convertRate | 转化率 | 辅助参考，fmtPercent，text-gray-600 |

争议点：是否需要一个"综合评分"聚合列（wantSlope × 0.5 + convertRate × 0.3 + wantAvg_normalized × 0.2）？还是让运营自己看原始数据判断？

**b) 趋势迷你图**

`trendData.trendTime` 有 24 小时时序数据（lookCount / wantCount / collectCount）。是否在表格行中嵌入 MiniTrendChart（90×32px SVG）？

- 优点：运营无需点开详情就能看到趋势走向
- 缺点：24 个数据点的折线图在 32px 高度下辨识度有限；增加表格行高
- 现有组件：`components/selection/product/MiniTrendChart.tsx`

**c) 默认排序和筛选**

运营打开监控页时看到的第一屏数据是什么？

- 默认排序建议：`wantSlope DESC`（增长最快的排最前—运营最关心"什么在涨"）
- 默认筛选建议：`monitorStatus=MONITORING(1)`（只显示活跃监控中的）+ `oid=0`（只显示未绑定的——运营的核心任务是找未绑定好商品去绑定）

是否需要作为 URL 参数持久化这些默认值？还是硬编码？

**d) 绑定商机的完整交互流程**

```
勾选商品（支持跨页？）
  → 点击"绑定到商机"
  → 弹窗（BindOpportunityModal）：
      ├── Tab 1："选择已有商机" — 搜索框 + 商机列表（单选）
      └── Tab 2："创建新商机" — 表单（名称*、描述、AI模板下拉）
  → 确认
  → 调用 API：
      选已有 → POST /monitor.batch.bind.opportunity { gids, opportunity_id }
      新建 → POST /monitor.bind.opportunity.create { gid, name, description, ai_context_template }
         （注意：create API 只接受单个 gid，批量需循环调用或后端扩展）
  → toast "已绑定 N 个商品到商机 XXX"
  → 刷新监控列表 + 商机列表
  → 是否自动跳转？建议 toast 中附带"前往创作台"链接
```

**e) 解绑的注意事项**

解绑一个监控商品时，如果该商机已有素材引用了此商品的 AI 上下文，怎么处理？建议：
- 解绑前不检查（复杂度太高）
- 解绑后素材的 `ai_context.items` 中可能包含已不存在的商品 gid——编辑器打开时过滤掉无效 gid 即可

**f) 移动端卡片设计**

```
┌──────────────────────────────────┐
│ ☐ 📱 透明软壳 iPhone 款          │  ← 标题 line-clamp-1
│ ¥9.90                           │  ← fmtPrice
│ ┌─────────────────────────────┐ │
│ │  [MiniTrendChart 24h 90x32] │ │  ← 可选，trendData 有时序数据时展示
│ └─────────────────────────────┘ │
│ ↑ wantSlope +12%  转化率 3.2%   │  ← 核心指标行
│ 日均想要 45                      │  ← 辅助指标
│ 🔗 日系简约风手机壳   [解绑 →]   │  ← 绑定状态行（已绑定时显示）
│ 未绑定              [绑定 →]    │  ← 绑定状态行（未绑定时显示）
└──────────────────────────────────┘
```

触控目标 ≥ 44px（绑定/解绑按钮、复选框）。

**g) 参考材料**
- `components/selection/product/MiniTrendChart.tsx` — 迷你趋势图（props: hourlyData, slope, dailyAvg, cv, color）
- `components/selection/product/ProductMonitorTab.tsx` — 现有选品监控 Tab（参考表格列定义和筛选逻辑）
- `components/selection/product/columnDefs.ts` — 列定义（参考排序值计算逻辑）
- `.claude/docs/CHART_PATTERNS.md` — 图表配色规范

---

## 三、商机管理 Tab — 待细化

### 3.1 卡片 vs 表格视图切换

当前设计是"卡片网格"。但商机数量多时（>20），卡片网格的扫描效率低于表格。建议：
- 默认：卡片网格（3 列桌面，1 列移动）
- 提供 ViewToggle（卡片/表格切换），状态持久化到 localStorage
- 表格视图：名称 | 描述 | 价格 | 状态 | 监控商品数 | 素材数 | 操作
- 现有参考：`components/selection/shared/ViewToggle.tsx`

### 3.2 商机表单设计

`OpportunityForm.tsx`（在 Sheet/BottomSheet 中使用），react-hook-form + zod：

```
字段：
- 名称：text input, maxLength=100, required → zod.string().min(1).max(100)
- 描述：textarea, optional, rows=4
- 价格：number input, default=2, min=0 → zod.number().min(0)
- AI 上下文模板：select (only_opportunity / with_item), default=with_item
- 状态：仅编辑时显示，active/inactive 切换

校验：
- 名称唯一性由后端 400 返回，前端用 setError('name', { message: '名称已存在' })
- 422 字段级错误映射到对应字段
```

### 3.3 卡片点击行为分化

```
卡片主体区域 → 跳转创作台 ?tab=create&oid=123
卡片右上角编辑图标 → 打开 Sheet 编辑
卡片右上角删除图标 → ConfirmDialog → 删除
```

### 3.4 参考材料
- `.claude/rules/frontend-form.md` — react-hook-form + zod 规范
- `components/publish/OpportunityCard.tsx` — 旧商机卡片（参考信息布局）
- `components/selection/shared/ViewToggle.tsx` — 视图切换组件
- `.claude/docs/FORM_PATTERNS.md` — 422 错误映射实现

---

## 四、素材库 Tab — 待设计

### 4.1 与创作台素材列表的职责区分

| | 创作台素材列表 | 素材库 |
|---|---|---|
| 定位 | 工作台（per-opportunity） | 档案室（cross-opportunity） |
| 数据范围 | 当前选中商机的素材 | 所有商机的素材 |
| 核心操作 | 编辑、AI 改写、发布 | 发布、删除 |
| 编辑能力 | 完整编辑器（Sheet，含 AI workflow） | 简化编辑器（Sheet，仅描述/价格/类目） |
| 额外列 | — | **所属商机**（可点击跳转创作台） |

### 4.2 表格列

| 列 | 宽度 | 说明 |
|----|------|------|
| ID | 0.3fr | 素材编号 |
| 描述 | 2fr | line-clamp-2 |
| 价格 | 0.6fr | fmtPrice |
| 类目 | 0.8fr | 发布类目名称 |
| 状态 | 0.8fr | StatusBadge（9 种状态→颜色映射） |
| 所属商机 | 1fr | 商机名称，蓝色链接（点击→创作台?oid=X） |
| 发布账号 | 0.8fr | to_uid 对应的账号名称 |
| 操作 | 0.6fr | 发布、删除 |

### 4.3 操作范围

- **发布**：单行操作按钮 → `POST /material.publish` → 乐观更新状态 → toast
- **删除**：单行操作 → ConfirmDialog → `POST /material.delete` → 乐观移除行
- **编辑**：点击行 → 简化 Sheet（仅描述/价格/类目/账号，无 AI workflow）
- **批量发布**：勾选多行 → 底部操作栏 → 逐份调用 publish API，显示进度 "正在发布 2/5..."

### 4.4 参考材料
- `components/publish/PublishInstanceList.tsx` — 旧素材列表（批量操作栏、轮询参考）
- `components/publish/PublishInstanceRow.tsx` — 旧素材行（23 props 的反面教材——新实现应避免此复杂度）

---

## 五、创作台补充细节

### 5.1 参考面板（ReferencePanel）中的监控商品卡片

每个 `ReferenceCard`（横向滚动子元素）展示：

```
┌──────────────────────┐
│ 📱 透明软壳 iPhone    │  ← 标题 font-medium
│ ¥9.90               │  ← fmtPrice
│ wantSlope ↑ +12%    │  ← 带 ± 颜色
│ 日均想要 45  转化 3.2%│  ← 两列辅助指标
│ [MiniTrendChart]    │  ← 可选，数据充足时展示
└──────────────────────┘
```

卡片宽度 ~180px，高度 ~110px。`overflow-x: auto` 横向滚动。M > 5 时末尾显示 "+N 更多 →"。

编辑器中的 AI 上下文勾选区复用同样的卡片设计，增加 checkbox。

### 5.2 Sheet 编辑器的表单

MaterialEditor 需要的字段和校验：

```
- 图片：拖拽排序 + 上传按钮（复用 items 页面的图片上传逻辑）
  注意：MaterialImage 结构 { md5, filepath, flare?, url?, size? }
- 描述：textarea, flex-1, min-height 200px
- 价格：input[number]，前端展示用 fmtYuan 转换（与 items 页面一致）
- 类目：下拉选择 → 调用 POST /material.channel 获取列表
- 发布账号：下拉选择（复用 accounts 列表）
- AI 上下文勾选区：列出当前商机的 M 个监控商品卡片，每张带 checkbox
  - 从 material.ai_context.items 读取已选 gid 列表
  - 选中/取消 → 合并到 ai_context → 保存时一起提交
```

保存策略：手动保存（点击"保存"按钮）而非自动保存（避免频繁 API 调用导致 AI 改写被覆盖）。

### 5.3 AI 改写按钮的状态机

按钮状态取决于 `material.status`：

```
status              | 改写 | 封面规划 | 生图 | 发布
--------------------|------|---------|------|-----
pending             | 可用  | 禁用    | 禁用 | 禁用
writing             | 🔄   | 禁用    | 禁用 | 禁用
writing_done        | 可用  | 可用    | 禁用 | 禁用
genimageplan        | 可用  | 🔄     | 禁用 | 禁用
genimageplan_done   | 可用  | 可用    | 可用 | 禁用
genimage            | 可用  | 可用    | 🔄  | 禁用
genimage_done       | 可用  | 可用    | 可用 | 可用
publishing          | 可用  | 可用    | 可用 | 🔄
published           | 可用  | 可用    | 可用 | ✓已发布
publish_failed      | 可用  | 可用    | 可用 | 可用（重试）
```

可用 = 显示按钮，可点击；🔄 = loading spinner + disabled；禁用 = 灰色 disabled。

### 5.4 移动端 Push/Pop 实现方案

```typescript
// CreateTab.tsx 内部
type MobileView = 'opportunity-list' | 'workspace'

const [viewStack, setViewStack] = useState<MobileView[]>(['opportunity-list'])
const currentView = viewStack[viewStack.length - 1]

const pushView = (view: MobileView) => setViewStack([...viewStack, view])
const popView = () => setViewStack(viewStack.slice(0, -1))

// 选商机 → pushView('workspace')
// 返回 → popView()
```

CSS 动画：`translate-x` transition（300ms），新页面从右侧滑入。

### 5.5 参考材料
- `components/publish/EditorDrawer.tsx` — 旧编辑器抽屉（参考 Sheet 嵌套方式）
- `components/publish/EditorPanel.tsx` — 旧编辑面板（参考表单布局）
- `components/publish/CreationProgressBar.tsx` — 旧进度条（可复用 StatusPipeline 重构）
- `.claude/rules/frontend-layout.md` — 模式 C Push/Pop 规范

---

## 六、跨 Tab 协作 — 全新设计

### 6.1 Tab 间数据一致性

| 操作 | 发生 Tab | 影响哪些 Tab 的缓存 |
|------|----------|-------------------|
| 绑定商品到商机 | 监控 | `['monitor-items']` + `['opportunities']` |
| 解绑商品 | 监控 | `['monitor-items']` + `['opportunities']` |
| 创建/编辑/删除商机 | 商机管理 | `['opportunities']` + `['materials', oid]` |
| 创建素材 | 创作台 | `['materials', oid]` + `['opportunities']` + `['materials-all']` |
| 编辑/发布/删除素材 | 创作台/素材库 | `['materials', oid]` + `['materials-all']` + `['opportunities']` |

**实现策略**：
- 各 mutation 的 `onSuccess` 回调中，`invalidateQueries` 所有受影响的 query key
- React Query 的 `staleTime: 60s` 意味着切 Tab 时如果数据在 60s 内已被 invalidate，会自动 refetch
- 不做全局刷新（`invalidateQueries()` 无参数）——精确指定 key 减少不必要请求

### 6.2 Tab 切换时的状态保留

关键问题：用户从监控 Tab 切到创作台，再切回监控——筛选条件和分页还在吗？

**方案 A（推荐）：组件常驻，`display: none`**
```tsx
<div className={activeTab === 'monitor' ? '' : 'hidden'}>
  <MonitorTab />
</div>
```
优点：状态完全保留，切回来瞬间显示。缺点：4 个 Tab 同时挂载，内存占用高。

**方案 B：URL 参数持久化**
```
?tab=monitor&page=2&sort=wantSlope&monitorStatus=1
```
优点：刷新页面也能恢复。缺点：URL 复杂，筛选条件多时 URL 过长。

**建议**：混合方案。分页和排序放 URL（可分享/刷新恢复），筛选条件用方案 A（组件常驻）。

实际上，考虑到创作台的数据量可能很大（左右分栏 + 素材列表 + 参考面板），不建议 4 个 Tab 同时挂载。建议用方案 B（URL 参数）做最小状态持久化——仅保留 `page` + `oid`。

### 6.3 导航捷径

| 当前位置 | 目标 | 触发方式 |
|----------|------|----------|
| 监控 Tab → | 创作台（预选刚绑定的商机） | 绑定成功后 toast 中附带链接 |
| 商机管理 → | 创作台（预选商机） | 卡片点击 → `router.replace('?tab=create&oid=123')` |
| 素材库 → | 创作台（预选商机） | 点击"所属商机"列 → `router.replace('?tab=create&oid=X')` |
| 创作台 → | 监控（查看商品最新数据） | 参考面板中的商品标题 → `router.replace('?tab=monitor&search=XXX')` |

### 6.4 参考材料
- `.claude/rules/frontend-state.md` — React Query cache invalidation 策略
- `hooks/useItemsPage.ts` — Hook 三层拆分参考实现
- `components/publish/page.tsx` — 旧页面中的 `handleItemChange` 乐观更新模式

---

## 七、批量操作交互 — 待设计

### 7.1 通用批量操作模式

适用于监控 Tab（批量绑定）和素材库（批量发布）：

```
勾选行 → 底部批量操作栏滑入
┌──────────────────────────────────────────┐
│ ☑ 已选 3 项    [批量操作按钮]    [取消]   │
└──────────────────────────────────────────┘
```

- 复选框：表头全选框（全选当前页）、行复选框
- 不支持跨页全选（后端 API 需要显式 gid 列表）
- 取消：清空选中 + 隐藏操作栏
- 操作完成后：清空选中 + 刷新列表 + toast

### 7.2 监控 Tab：批量绑定弹窗

BindOpportunityModal 内部设计：

```
┌────────────────────────────────┐
│ 绑定到商机                  [✕] │
├────────────────────────────────┤
│ 已选 5 个监控商品               │
│                                │
│ [选择已有商机] [创建新商机]      │  ← 内部 Tab
│                                │
│ Tab 1 — 选择已有商机：          │
│ [🔍 搜索商机...]               │
│ ○ 日系简约风手机壳 (5商品)      │
│ ○ 北欧风家居摆件 (3商品)       │
│ ● 韩系ins风 (2商品)  ← 选中    │
│              [分页]            │
│                                │
│ Tab 2 — 创建新商机：            │
│ 名称*：[____________]          │
│ 描述：[____________]           │
│ AI模板：[with_item ▼]          │
│                                │
│ [取消] [确认绑定]              │
└────────────────────────────────┘
```

### 7.3 素材库：批量发布

逐份调用 `POST /material.publish`（API 不支持批量），显示进度：

```typescript
const [publishProgress, setPublishProgress] = useState({ done: 0, total: 0, failed: number[] })

const handleBatchPublish = async () => {
  setPublishProgress({ done: 0, total: selectedIds.size, failed: [] })
  for (const id of selectedIds) {
    try {
      await publishMaterial(id)
      setPublishProgress(p => ({ ...p, done: p.done + 1 }))
    } catch {
      setPublishProgress(p => ({ ...p, done: p.done + 1, failed: [...p.failed, id] }))
    }
  }
  // 完成后 toast 汇总结果
}
```

底部操作栏显示进度："正在发布 2/5..."（带 spinner）。

### 7.4 参考材料
- `components/publish/PublishInstanceList.tsx` — 旧批量操作栏实现
- `components/ui/ConfirmDialog.tsx` — 作为弹窗基础组件（BindOpportunityModal 可参考其 Portal 模式）

---

## 八、AI 处理状态轮询

### 8.1 轮询条件

仅当素材列表中存在以下中间状态时启动：
- writing, genimageplan, genimage, publishing

### 8.2 实现方式

```typescript
// 在 MaterialWorkspace.tsx 或 MaterialsTab.tsx 中
const hasActiveJobs = materials?.some(m =>
  ['writing', 'genimageplan', 'genimage', 'publishing'].includes(m.status)
)

const { data, refetch } = useQuery({
  queryKey: ['materials', oid, page],
  queryFn: () => fetchMaterials({ oid, page }),
  refetchInterval: hasActiveJobs ? 3000 : false,  // 有活跃任务时 3s 轮询
})
```

当所有素材都进入终态（pending / *_done / published / publish_failed）时，`hasActiveJobs === false`，`refetchInterval` 自动停止。

### 8.3 参考材料
- `components/publish/PublishInstanceList.tsx` — 旧轮询实现（`useEffect` + `setInterval` 模式）
- `.claude/rules/frontend-state.md` — SSE 模式（当前后端无 SSE，用轮询代替）

---

## 九、建议完成顺序

按依赖关系排列，优先解决阻塞下游的设计：

1. **监控 Tab**（最紧急）— 工作流起点，其他 Tab 依赖其数据；指标可视化策略影响后续所有展示
2. **批量操作交互**— 监控和素材库共享模式，先定标准再分别实现
3. **跨 Tab 协作**— 贯通整个工作流的数据一致性
4. **素材库 Tab**— 相对独立，可并行
5. **商机管理 Tab 细化**— 概要已有，补齐表单和视图切换
6. **创作台补充细节**— 布局已定，补齐编辑器表单和 AI 状态机
7. **AI 状态轮询**— 最后，依赖素材列表完成

---

## 十、参考文件索引

| 文件 | 用途 |
|------|------|
| `backend/models/v2/opportunities.py` | 数据模型定义（Opportunity / ItemMonitored / PublishMaterial） |
| `backend/free/user/selection.py` | 后端 API 路由和参数 |
| `backend/free/schema/selection.py` | 后端 Schema 定义 |
| `components/publish/PublishInstanceList.tsx` | 旧素材列表 — 轮询、批量操作栏参考 |
| `components/publish/PublishInstanceRow.tsx` | 旧素材行 — 反面教材（23 props） |
| `components/publish/EditorDrawer.tsx` | 旧编辑器抽屉 — Sheet 嵌套参考 |
| `components/publish/EditorPanel.tsx` | 旧编辑面板 — 表单布局参考 |
| `components/publish/OpportunityLibrary.tsx` | 旧商机库 — 左侧面板参考（需增强分页+搜索） |
| `components/publish/OpportunityCard.tsx` | 旧商机卡片 — 信息布局参考 |
| `components/publish/CreationProgressBar.tsx` | 旧进度条 — StatusPipeline 重构基础 |
| `components/selection/product/MiniTrendChart.tsx` | 迷你趋势图 — 嵌入监控商品卡片 |
| `components/selection/product/ProductMonitorTab.tsx` | 现有选品监控 Tab — 筛选+排序模式参考 |
| `components/selection/product/columnDefs.ts` | 列定义 — 排序值计算参考 |
| `components/selection/shared/ViewToggle.tsx` | 视图切换 — 商机管理卡片/表格切换 |
| `components/ui/DataTable.tsx` | 通用表格 — Loading/Error/Empty/Data 四态 |
| `hooks/useItemsPage.ts` | Hook 三层拆分参考实现 |
| `.claude/rules/frontend-form.md` | 表单规范（react-hook-form + zod + setError） |
| `.claude/rules/frontend-state.md` | 状态管理规范（React Query 配置、cache invalidation） |
| `.claude/rules/frontend-layout.md` | 布局规范（Tab 页面、Push/Pop 模式 C、安全区） |
| `.claude/rules/frontend-format.md` | 格式化规范（fmtPrice/fmtGrowth/fmtPercent/fmtNumber） |
| `.claude/rules/frontend-colors.md` | 色彩语义（语义色、图表色、灰度色阶） |
| `.claude/rules/frontend-design-tokens.md` | 设计 Token（字号、间距、圆角、Badge/Pill） |
| `.claude/docs/FORM_PATTERNS.md` | 表单模式（422 错误映射、Switch 开关） |
| `.claude/docs/CHART_PATTERNS.md` | 图表模式（配色、交互规范） |
| `.claude/docs/KNOWN_ISSUES.md` | 已知技术债（避免引入新问题） |
