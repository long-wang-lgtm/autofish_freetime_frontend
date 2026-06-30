# 商品管理页搜索/筛选/布局重构 — 设计说明书

**日期**: 2026-06-30
**状态**: 已确认

---

## 一、目标

从布局设计出发，重构商品管理页 (ItemsTab) 的搜索/筛选/统计信息布局，反推前端数据结构调整，后端 API 后续跟进。

## 二、核心决策

| 决策 | 结论 |
|------|------|
| 统计信息 | PC/移动端全部删除，分页器已提供总数 |
| 搜索模式 | 搜索芯片（SaaS 搜索标签），字段选择器 + 值 = chip |
| 桌面端布局 | 筛选卡片 + 内容卡片，双层独立 |
| 移动端搜索 | 左侧字段下拉 → 搜索输入 → 搜索按钮 |
| 搜索触发 | 芯片确认/删除即触发（走现有 400ms 防抖） |
| 刷新按钮 | Row 1 最右，竖线分隔，保持选中账号后才能点击 |
| 清空筛选 | Row 1 右侧，"刷新"左边，竖线分隔 |

## 三、桌面端布局结构

```
TabBar（页面级，已有）
  ↓ gap-5
┌─ 筛选卡片（bg-white border rounded-xl shadow-sm p-4）────┐
│ Row 1: [账号▼] [状态▼]           [清空筛选] │ [🔄 刷新商品] │
│ Row 2: [+添加条件▼] [标题:手机壳 ✕] [发货:激活码 ✕] ...  │
│ Row 3: [排序: ID 价格 浏览 想要 收藏 时间 发货方式]       │
└──────────────────────────────────────────────────────────┘
  ↓ gap-5
┌─ 内容卡片（bg-white border rounded-xl shadow-sm）────────┐
│ [表头 sticky]                                             │
│ [数据行...]                                               │
│ [分页器]                                                  │
└──────────────────────────────────────────────────────────┘
```

**变动点：**

1. ItemsTab 的大卡片拆分：筛选独立卡片 + 内容独立卡片
2. 删除桌面端 4 张统计卡片（在售/仓库/售出/自动发货）
3. 内容卡片仅含表格 + 分页器

## 四、移动端布局结构

```
Header（固定）
TabBar（固定）
↓
┌─ 筛选栏 ────────────────────────────────┐
│ [账号▼] [状态▼]  [🔍筛选展开]  [🔄刷新] │
│ [搜索字段▼] [____输入____] [搜索]       │  ← 字段选择器+输入+按钮
│ [排序: 横向滚动胶囊]                     │
└──────────────────────────────────────────┘
↓
┌─ 内容卡片 ──────────────────────┐
│ [MobileProductCard 列表]        │
│ [分页器]                        │
└─────────────────────────────────┘
```

**变动点：**

1. 删除移动端统计条（共N件 | 在售N | 已下架N | 已售出N）
2. 搜索改为字段选择器 + 输入 + 按钮模式
3. 筛选展开面板改为选中搜索字段后出现的输入区

## 五、搜索芯片交互设计

### 添加条件

点击 `[+添加条件▼]` → 下拉菜单：

```
┌──────────────────┐
│ 商品标题         │
│ 商品ID (GID)     │
│ 发货配置内容      │
│ 收货后赠送配置    │
│ 评价后赠送配置    │
│ AI 提示词        │
│ AI 回复内容       │
│ 指令码           │
└──────────────────┘
```

选中字段后，下拉关闭，出现内联输入框，回车或失焦确认生成 chip。

### 已确认的芯片

```
[+添加条件▼] [标题: 手机壳 ✕] [发货: 激活码 ✕] [提示词: 全新未拆 ✕]
```

- 点击 `✕` 删除该条件，立即重新搜索
- 点击 chip 标签可修改值（变回输入框），确认后重新搜索
- 同一字段只允许一个 chip（已选字段在下拉中置灰）
- 确认/删除/修改均触发搜索（走现有 400ms 防抖）

## 六、前端数据模型

### 搜索字段枚举

```typescript
type SearchField =
  | 'title'                  // 商品标题
  | 'gid'                    // 商品ID
  | 'deliveryContent'        // 发货配置内容
  | 'receiptAfter'           // 收货后赠送配置
  | 'positiveReviewAfter'    // 评价后赠送配置
  | 'aiReplyItemPrompt'      // AI 提示词
  | 'sendCode'               // 指令码
```

### 搜索芯片

```typescript
interface SearchChip {
  field: SearchField
  value: string
}
```

### 筛选卡片完整状态（替代旧 searchInput + filters）

```typescript
interface ItemsFilterState {
  uid?: string           // 账号 UID
  status?: number        // 0=在售 1=已售  -2=已下架 -9=审核中 -100=已删除
  chips: SearchChip[]    // 最多 8 个（每个字段一个）
  orderBy: string | null
  asc: boolean
  page: number
}
```

### Chip → API 参数映射

```typescript
function chipValue(chips: SearchChip[], field: SearchField): string | undefined {
  return chips.find(c => c.field === field)?.value
}
```

### ItemFilters 扩展

`lib/api/items.ts` 的 `ItemFilters` 需新增字段：

```typescript
export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
  deliveryContent?: string
  receiptAfter?: string
  positiveReviewAfter?: string
  aiReplyItemPrompt?: string
  defaultReplyContent?: string
  sendCode?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}
```

> 后端 `/api/items/list` 对应新增可选查询参数，后续优化。

### 移除项

- 删除 `getItemStats()` 调用及相关 React Query
- 删除 `stats` 对象（`{ total, onSale, offSale, sold, deliveryConfigured }`）
- 删除 `statsLoading` 状态
- 分页器所需 `total` 直接从 `listData.total` 获取
- `SearchField` 常量数组 + 显示标签映射 (FIELD_LABELS) 定义在 `lib/api/items.ts`

## 七、影响范围

### 修改文件

| 文件 | 变更 |
|------|------|
| `app/dashboard/items/page.tsx` | 移除 stats 传递，调整子组件 props |
| `components/items/ItemsTab.tsx` | 删除统计卡片、退化为纯内容卡片 |
| `components/items/FilterBar.tsx` | 全面重写：芯片搜索 + 新布局 |
| `lib/api/items.ts` | 扩展 ItemFilters 新增 6 字段 |
| `hooks/useItemsFilters.ts` | 重写：chip 状态管理替代 searchInput |
| `hooks/useItemsData.ts` | 删除 getItemStats 调用、stats 计算 |
| `hooks/useItemsPage.ts` | 移除 stats/statsLoading 传递 |
| `components/items/RulesTab.tsx` | 不影响（规则页独立） |

### 不修改

- `components/ui/Tab/index.tsx` — 不变
- `components/items/views/ItemRow.tsx` — 不变
- `components/items/views/MobileProductCard.tsx` — 不变
- `components/items/drawers/*` — 不变
- 后端 API（后续优化）

## 八、规范合规

| 规范 | 修复点 |
|------|--------|
| frontend-layout.md | FilterBar 移到内容卡片外部 ✅ |
| frontend-layout.md | 双层卡片 gap-5 间距 ✅ |
| frontend-tabs.md | Tab 在卡片外部，不变 ✅ |
| frontend-design-tokens.md | 卡片使用 rounded-xl shadow-sm border ✅ |
| frontend-design-tokens.md | 芯片使用 rounded-full ✅ |
| frontend-components.md | 使用 ErrorBanner/EmptyState/Pagination 统一组件（另行修复） |
| frontend-colors.md | 芯片激活态 bg-blue-50 text-blue-700 ✅ |
