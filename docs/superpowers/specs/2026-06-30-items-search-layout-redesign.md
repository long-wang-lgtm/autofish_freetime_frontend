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
| frontend-components.md | 使用 ErrorBanner/EmptyState/Pagination 统一组件（本设计覆盖） |
| frontend-colors.md | 芯片激活态 bg-blue-50 text-blue-700 ✅ |

---

## 九、组件规范

### 9.1 组件树（重构后）

```
app/dashboard/items/page.tsx
├── TabBar                          ← 已有，不变
├── ItemsFilterBar                  ← 重写（原 FilterBar），筛选卡片
│   ├── AccountSelect               ← 内联：账号下拉
│   ├── StatusSelect                ← 内联：状态下拉
│   ├── RefreshButton               ← 内联：刷新按钮（需选中账号）
│   ├── ClearFiltersButton          ← 内联：清空筛选按钮
│   ├── SearchFieldDropdown         ← 新增："+添加条件" 下拉菜单
│   ├── SearchChip[]                ← 新增：已确认的搜索芯片列表
│   │   └── SearchChipInput         ← 新增：芯片内联编辑输入框
│   └── SortChipRow                 ← 内联：排序胶囊条（复用已有 SortChip）
├── ItemsTab                        ← 简化：退化为纯内容卡片
│   ├── ErrorBanner                 ← 替换内联错误 div
│   ├── EmptyState                  ← 替换内联空状态 div
│   ├── [桌面端] RowHeader + ItemRow[]
│   ├── [移动端] MobileProductCard[]
│   └── Pagination                  ← 替换内联分页器
└── RulesTab                        ← 不变
```

**层级关系**（符合 `frontend-layout.md`）：

```
<div class="flex flex-col gap-5 h-full">    ← 页面顶级
  <TabBar />                                 ← 第1层：卡片外
  <ItemsFilterBar />                         ← 第2层：卡片外（筛选卡片）
  <ItemsTab />                               ← 第3层：内容卡片
</div>
```

---

### 9.2 新增组件：SearchChip

**文件路径**：`components/items/parts/SearchChip.tsx`

**用途**：展示一个已确认的搜索条件。包含字段标签、当前值、删除按钮。点击值可进入编辑模式。

```typescript
interface SearchChipProps {
  field: SearchField
  value: string
  /** 字段显示名称（来自 FIELD_LABELS） */
  label: string
  /** 点击 ✕ 删除该芯片 */
  onRemove: () => void
  /** 修改值后确认，传入新值 */
  onChange: (newValue: string) => void
}
```

**视觉设计**：

```
┌──────────────────────────┐
│ 标题: 手机壳          ✕  │
└──────────────────────────┘
  ←   编辑模式   →
┌──────────────────────────┐
│ [手机壳______________] ✓ │
└──────────────────────────┘
```

- 默认态：`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200`
- 字段名 (`label`)：`font-medium`
- 值文本：`max-w-[120px] truncate`，超长省略
- 删除按钮 (`✕`)：`ml-0.5 p-0.5 rounded-full hover:bg-blue-100`，点击即刻触发 `onRemove`
- 编辑模式（点击值触发）：chip 替换为内联 `<input>` + 确认按钮 (`✓`)，回车或失焦提交 `onChange`
- 同一字段只允许一个 chip（在 `SearchFieldDropdown` 中控制）

**行为规范**：
- `onRemove`：立即从 chips 列表移除 → 触发父组件重新搜索（走 400ms 防抖）
- `onChange`：确认后更新 chip 值 → 触发父组件重新搜索（走 400ms 防抖）
- 编辑模式下按 Escape 取消编辑，恢复原值

---

### 9.3 新增组件：SearchFieldDropdown

**文件路径**：内联于 `ItemsFilterBar.tsx`（不单独文件，< 50 行）

**用途**："+添加条件" 按钮 + 下拉菜单，选择搜索字段后通知父组件。

**下拉菜单交互**：

```
点击 [+添加条件▼]
  ↓
┌─────────────────────┐
│ 商品标题            │  ← 已添加的字段置灰不可选
│ 商品ID (GID)        │
│ 发货配置内容         │
│ 收货后赠送配置       │
│ 评价后赠送配置       │
│ AI 提示词           │
│ 指令码              │
└─────────────────────┘
  ↓ 选中字段
菜单关闭 → 触发父组件 `onAddField(field)` → 父组件创建空值 chip → 自动进入编辑模式
```

**Props（内部组件）**：

```typescript
interface SearchFieldDropdownProps {
  /** 已添加的字段列表（这些字段在下拉中置灰） */
  usedFields: SearchField[]
  /** 选中字段后回调 */
  onAddField: (field: SearchField) => void
}
```

- 下拉使用绝对定位，`absolute top-full left-0 mt-1 z-20`
- 点击外部区域关闭（`useEffect` + `mousedown` 监听）
- 选项 hover 态 `bg-gray-50`
- 已用字段添加 `text-gray-300 cursor-not-allowed` 并拦截点击

---

### 9.4 重写组件：ItemsFilterBar

**文件路径**：`components/items/ItemsFilterBar.tsx`（从 `FilterBar.tsx` 重命名）

**重构范围**：全面重写。桌面端和移动端布局差异较大，内部各拆分为独立子组件文件（如果任一超过 200 行）。

#### 9.4.1 顶级 Props

```typescript
interface ItemsFilterBarProps {
  accounts: AccountName[]

  // — 筛选状态（统一替代旧 searchInput + filters）—
  filterState: ItemsFilterState
  onFilterChange: (updater: (prev: ItemsFilterState) => ItemsFilterState) => void

  // — 操作回调 —
  onRefresh: () => void
  isRefreshing: boolean
}
```

**注意**：
- 不再接收 `stats`（统计信息已删除）
- 不再接收 `onClear` / `onSearchChange` / `onStatusChange`（统一为 `onFilterChange`）
- 排序状态内聚到 `ItemsFilterState.orderBy` / `ItemsFilterState.asc`

#### 9.4.2 内部分支

```typescript
export function ItemsFilterBar(props: ItemsFilterBarProps) {
  const isMobile = useIsMobile()
  if (isMobile) return <ItemsFilterBarMobile {...props} />
  return <ItemsFilterBarDesktop {...props} />
}
```

#### 9.4.3 ItemsFilterBarDesktop

**文件路径**：`components/items/parts/ItemsFilterBarDesktop.tsx`（如果 ≥200 行）

**布局**（对应设计文档 三）：

```
┌─ 筛选卡片 bg-white border rounded-xl shadow-sm p-4 ──────────┐
│ Row 1: [账号▼] [状态▼]              [清空筛选] │ [🔄 刷新商品] │
│ Row 2: [+添加条件▼] [标题:手机壳 ✕] [发货:激活码 ✕] ...      │
│ Row 3: [排序: ID 价格 浏览 想要 收藏 时间 发货方式]           │
└──────────────────────────────────────────────────────────────┘
```

**Row 1**（`flex items-end gap-3`）：
- 账号下拉：`flex-1 min-w-0`，`<select>`，`h-10 px-3 py-2 text-sm border-gray-200 rounded-lg`
- 状态下拉：`w-32`，`<select>`，同上样式
- 右侧按钮组（`ml-auto flex items-center gap-2`）：
  - "清空筛选" 按钮：`h-10 px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700`，当无筛选条件时隐藏
  - 竖线分隔：`w-px h-5 bg-gray-200`
  - "刷新商品" 按钮：`h-10 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white`，需选中账号才可点击，刷新中显示 `LoadingSpinner size="sm"` + "刷新中..."

**Row 2**（`flex items-center gap-2 flex-wrap`，当 chips.length > 0 时 `mt-3`）：
- `SearchFieldDropdown`（"+添加条件" 按钮 + 下拉）
- `SearchChip[]`（循环渲染已确认的芯片）

**Row 3**（`flex items-center gap-1.5 mt-3`，排序标签行）：
- 标签 `text-xs text-gray-400 shrink-0`："排序"
- 排序胶囊列表（复用已有 `SortChip` 内部组件）
- `ITEM_SORT_FIELDS` 已有的 8 个字段不变

**内部状态**：
- `editingField?: SearchField`：当前正在编辑的芯片字段（控制 SearchChip 的编辑模式）

**Props（内部）**：与 `ItemsFilterBarProps` 完全相同。

#### 9.4.4 ItemsFilterBarMobile

**文件路径**：`components/items/parts/ItemsFilterBarMobile.tsx`（如果 ≥200 行）

**布局**（对应设计文档 四）：

```
┌─ 筛选栏（非卡片，无背景/border）──────────────────────────────┐
│ Row 1: [账号▼] [状态▼]      [🔍] [🔄]                        │
│ Row 2: [搜索字段▼] [____输入____] [搜索]                      │  ← 搜索字段选择器+输入+按钮
│ Row 3: [排序: 横向滚动胶囊]                                   │
└──────────────────────────────────────────────────────────────┘
```

**Row 1**（`flex items-center gap-2 px-3 py-2 border-b border-gray-100`）：
- 账号下拉：`flex-1 min-w-0`，`<select>`
- 状态下拉：`w-20`，`<select>`
- 筛选展开按钮（`SlidersHorizontal` 图标）：已选芯片数量 badge，点击展开已添加芯片的编辑面板
- 刷新按钮：`p-3`，需选中账号才可点击

**Row 2**（`flex items-center gap-2 px-3 py-2 border-b border-gray-100`）：

搜索字段选择器 + 输入框 + 搜索按钮，模仿大厂 App：

```
[搜索字段▼] [____输入关键词____] [搜索]
```

- 搜索字段下拉（`w-20 flex-shrink-0`）：可选字段列表，默认选中第一个可用字段
- 搜索输入框（`flex-1 min-w-0`）：`h-10 px-3 py-2`，placeholder 随字段变化（如选"标题"="搜索标题..."）
- 搜索按钮（`flex-shrink-0`）：`h-10 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm`
  - 点击后：创建/更新对应字段的 chip → 触发搜索
  - 搜索后不清空输入框（保留便于调整）
- 输入框与搜索按钮之间 `gap-2`

**Row 3**（排序胶囊，不变）：`overflow-x-auto` 横向滚动，隐藏滚动条

**筛选展开面板**（`expanded` 状态，`border-t border-gray-100`）：
- 显示已添加的所有 `SearchChip` 列表（可删除、可编辑）
- "清空全部筛选" 按钮（有芯片时显示）

**内部状态**：
- `expanded: boolean`：筛选面板展开/折叠
- `searchField: SearchField`：Row 2 中当前选中的搜索字段
- `searchValue: string`：Row 2 中的输入值

---

### 9.5 简化组件：ItemsTab

**文件路径**：`components/items/ItemsTab.tsx`

**变更**：删除统计卡片、简化 props。

**Props（变更后）**：

```typescript
interface ItemsTabProps {
  isMobile: boolean
  data: Item[] | undefined
  isLoading: boolean
  error: unknown
  itemKeywordCounts: Record<string, number>
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  onToggle: (item: Item, field: string) => void
  updateMutation: { mutate: (args: { gid: string; data: Record<string, unknown> }) => void }
}
```

**移除的 props**（已上移到 `ItemsFilterBar`）：
- ~~`accountsData`~~
- ~~`searchInput`~~
- ~~`filters`~~
- ~~`stats`~~
- ~~`orderBy` / `asc`~~
- ~~`isRefreshing`~~
- ~~`onSearchChange` / `onStatusChange` / `onRefresh` / `onClearFilters` / `onSortChange`~~

**渲染结构（变更后）**：

```tsx
<div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
  {/* 加载/错误/空状态 — 使用统一组件 */}
  {isLoading && (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
  )}
  {!!error && <ErrorBanner message={`加载商品列表失败: ${String(error)}`} variant="banner" onRetry={...} />}
  {!isLoading && !error && data && data.length === 0 && (
    <EmptyState icon="📦" title="暂无商品" description="没有找到符合条件的商品" />
  )}

  {/* 数据列表（不变） */}
  {!isLoading && !error && data && data.length > 0 && (
    <>
      {/* 桌面端表格（不变） */}
      <div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
        {/* sticky 表头 */}
        {data.map((item, index) => <ItemRow ... />)}
      </div>
      {/* 移动端卡片列表（不变） */}
      <div className="flex-1 overflow-auto md:hidden px-1 pb-3 space-y-2 min-h-[200px]">
        {data.map((item) => <MobileProductCard ... />)}
      </div>
    </>
  )}

  {/* 分页器 — 使用统一 Pagination 组件 */}
  <Pagination
    page={page}
    totalPages={totalPages}
    totalItems={totalItems}
    onPageChange={onPageChange}
  />
</div>
```

**drawer 状态保持不变**（`editingItem` / `keywordItem` / `mobileConfig`），三个抽屉组件不变。

---

### 9.6 数据模型定义位置

所有新类型定义在 `lib/api/items.ts`（遵循 API 就近定义原则）：

```typescript
// ——— 搜索字段枚举 ———
export type SearchField =
  | 'title'
  | 'gid'
  | 'deliveryContent'
  | 'receiptAfter'
  | 'positiveReviewAfter'
  | 'aiReplyItemPrompt'
  | 'sendCode'

// ——— 搜索字段显示标签 ———
export const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  title: '商品标题',
  gid: '商品ID',
  deliveryContent: '发货配置内容',
  receiptAfter: '收货后赠送配置',
  positiveReviewAfter: '评价后赠送配置',
  aiReplyItemPrompt: 'AI 提示词',
  sendCode: '指令码',
}

// ——— 搜索芯片 ———
export interface SearchChip {
  field: SearchField
  value: string
}

// ——— 筛选状态（替代旧 searchInput + filters）———
export interface ItemsFilterState {
  uid?: string
  status?: number
  chips: SearchChip[]
  orderBy: string | null
  asc: boolean
  page: number
}

// ——— ItemFilters 扩展（已有，新增字段）———
export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
  // 新增 ↓
  deliveryContent?: string
  receiptAfter?: string
  positiveReviewAfter?: string
  aiReplyItemPrompt?: string
  defaultReplyContent?: string
  sendCode?: string
  // 已有 ↓
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}
```

---

### 9.7 统一组件使用清单

当前 ItemsTab 中内联的错误/空状态/分页器全部替换为统一组件：

| 位置 | 旧实现 | 新组件 | 说明 |
|------|--------|--------|------|
| 错误展示 | 内联 `div.bg-red-50`（ItemsTab:123-125） | `<ErrorBanner variant="banner">` | 组件已存在：`components/ui/error-banner.tsx` |
| 空数据 | 内联 `div.bg-gray-50`（ItemsTab:127-131） | `<EmptyState>` | 组件已存在：`components/ui/empty-state.tsx` |
| 分页器 | 内联 `<button>` 组（ItemsTab:200-228） | `<Pagination>` | 组件已存在：`components/ui/pagination.tsx` |
| 加载中 | 已是 `<LoadingSpinner>` ✅ | — | 无需变更 |

**ErrorBanner Props 确认**：

```typescript
interface ErrorBannerProps {
  message: string
  variant?: 'banner' | 'inline'       // 内容卡片内用 banner
  onRetry?: () => void
  onDismiss?: () => void
}
```

**EmptyState Props 确认**：

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode               // 图标或 emoji
  title: string
  description?: string
  action?: { label: string; onClick: () => void }  // 可选 CTA 按钮
  size?: 'sm' | 'md'                   // md=默认
}
```

**Pagination Props 确认**：

```typescript
interface PaginationProps {
  page: number
  totalPages: number
  totalItems?: number                  // 用于显示"共N件"
  onPageChange: (page: number) => void
}
```

---

### 9.8 文件清单（新增 + 变更）

| 文件 | 操作 | 说明 |
|------|------|------|
| `components/items/parts/SearchChip.tsx` | **新建** | 搜索芯片组件（~60行） |
| `components/items/ItemsFilterBar.tsx` | **新建** | 筛选卡片入口（~30行，isMobile 分支） |
| `components/items/parts/ItemsFilterBarDesktop.tsx` | **新建** | 桌面端筛选卡片（~120行） |
| `components/items/parts/ItemsFilterBarMobile.tsx` | **新建** | 移动端筛选栏（~150行） |
| `components/items/FilterBar.tsx` | **删除** | 替换为 ItemsFilterBar |
| `components/items/ItemsTab.tsx` | **重写** | 删除统计卡片、简化 props、使用统一组件 |
| `app/dashboard/items/page.tsx` | **修改** | ItemsFilterBar 插入 Tab 下方、删除 stats 传递 |
| `lib/api/items.ts` | **修改** | 新增类型、扩展 ItemFilters |
| `hooks/useItemsFilters.ts` | **重写** | 芯片状态管理 |
| `hooks/useItemsData.ts` | **修改** | 删除 getItemStats |
| `hooks/useItemsPage.ts` | **修改** | 移除 stats 传递 |
