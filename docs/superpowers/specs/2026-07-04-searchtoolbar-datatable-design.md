# SearchToolbar + DataTable 通用组件

> 2026-07-04 | 前端通用组件提取

## 目标

从商品管理页（ItemsTab / ItemsFilterBar）的优秀模式中提取两个通用组件：

1. **SearchToolbar** — 统一筛选栏布局壳，解决 11 个页面筛选栏视觉不一致问题
2. **DataTable** — 通用数据表格，解决 7 个页面表格四态处理、排序、斑马纹重复实现问题

## 设计原则

- 只做布局壳，不做业务约束——差异由各页面自行处理
- 与现有 UI 组件（LoadingSpinner / ErrorBanner / EmptyState / Pagination）组合使用
- 移动端适配由各页面自行处理，组件仅提供桌面端实现
- 遵循 `frontend-components.md` 规范：命名导出、PascalCase 文件名
- **所有样式同步定义日间和夜间值**，遵循 `frontend-colors.md` 第 7 节铁律

---

## 一、SearchToolbar

### 定位

纯布局壳。提供统一的卡片容器——边框、圆角、阴影、内边距。内部结构完全由 children 自由组合。

### 设计决策

COMPONENTS.md 曾规划 `variant: 'simple' | 'full'` + `fields` 声明式 API，已放弃。原因是 11 个筛选栏结构差异极大——从简单的搜索框+按钮（MerchantMonitorTab）到复杂的账号下拉+状态+芯片系统（ItemsFilterBar），任何预设的 variant 都会成为约束。children 模式把所有布局控制权交给使用者。

### Props

```ts
interface SearchToolbarProps {
  children: React.ReactNode
  className?: string
}
```

### 渲染

```
┌──────────────────────────────────────────────────────────┐
│  children（flex row，gap-3，wrap）                        │
└──────────────────────────────────────────────────────────┘
```

```tsx
<div className={cn(
  "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4",
  className
)}>
  <div className="flex items-center gap-3 flex-wrap">
    {children}
  </div>
</div>
```

### 日间/夜间色值对照

| 元素 | 日间 | 夜间 |
|------|------|------|
| 卡片背景 | `bg-white` | `dark:bg-gray-900` |
| 卡片边框 | `border-gray-200` | `dark:border-gray-700` |

### 使用场景

| 页面 | 使用方式 |
|------|----------|
| items | `<SearchToolbar><刷新/><账号下拉/><状态下拉/><芯片区/><清空/></SearchToolbar>` |
| admin/proxy | `<SearchToolbar><搜索框/><状态下拉/><刷新/><添加/></SearchToolbar>` |
| selection/product | `<SearchToolbar><搜索框/><异常筛选/></SearchToolbar>` |

### 文件

`components/ui/SearchToolbar.tsx`

---

## 二、DataTable

### 定位

列定义驱动的 CSS Grid 表格。处理：
- 四态（加载 / 错误 / 空 / 数据）
- 排序表头（三态循环：未激活 → 降序 → 升序 → 取消）
- 斑马纹行 + hover 高亮
- sticky 表头（需父级创建 `overflow-auto`，见表头吸附说明）
- 不处理：滚动条（父级创建 `overflow-auto`）、分页（外部 `<Pagination>`）、移动端（外部卡片组件）

### 滚动机制

DataTable 自身**不创建滚动条**。如需 sticky 表头，父级须创建 `overflow-auto` 容器，表头通过 CSS `position: sticky; top: 0` 吸附于该容器顶部：

```
父级 div（overflow-auto，创建滚动条）
└── <DataTable stickyHeader>
    ├── 表头行（sticky top-0 z-10）← 滚动时吸附在此
    ├── 数据行 1
    ├── 数据行 2
    └── ...
```

这与 ItemsTab 现有模式一致——父级 `<div ref={listRef} className="flex-1 overflow-auto">` 创建滚动条，翻页时 `listRef.current.scrollTo({ top: 0 })` 由父级管理。

**`stickyHeader` 默认 `false`**，因为 sticky 行为依赖父级滚动容器。不加滚动容器直接开启 sticky 会静默失效。使用者须确认父级有 `overflow-auto` 后再开启。

### 列定义

```ts
interface DataTableColumn<T> {
  key: string
  header: React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  className?: string
  render: (item: T, index: number) => React.ReactNode
}
```

### Props

```ts
interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[] | undefined
  keyExtractor: (item: T) => string
  gridTemplateColumns: string         // 如 '2fr 1fr 1fr...'

  className?: string                  // 外层包装 div 的附加 class

  // 四态
  isLoading?: boolean
  error?: unknown
  errorMessage?: string               // 默认 "加载失败: {error}"
  onRetry?: () => void
  onDismissError?: () => void         // 透传给 ErrorBanner

  emptyTitle?: string                 // 默认 "暂无数据"
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }  // 空数据时 CTA 按钮
  emptyIcon?: React.ReactNode         // 自定义空状态图标
  emptySize?: 'sm' | 'md'            // 空状态尺寸，默认 'md'

  // 排序
  orderBy?: string | null
  asc?: boolean
  onSortChange?: (field: string | null) => void   // field 为已排序列 key，null 表示取消排序

  // 行样式
  rowClassName?: string | ((item: T, index: number) => string)

  // 表头
  stickyHeader?: boolean              // 默认 false，需父级 overflow-auto
}
```

### Props 分组说明

Props 数量约 16 个，按职责分为四个领域：
- **数据**：`columns`、`data`、`keyExtractor`、`gridTemplateColumns`、`className`
- **四态**：`isLoading`、`error`、`errorMessage`、`onRetry`、`onDismissError`、`emptyTitle`、`emptyDescription`、`emptyAction`、`emptyIcon`、`emptySize`
- **排序**：`orderBy`、`asc`、`onSortChange`
- **样式**：`rowClassName`、`stickyHeader`

目前设计为扁平 props（非嵌套对象），因为各组 props 独立性高，嵌套对象会增加使用者的括号嵌套层级。如果未来 props 继续膨胀，可考虑拆分为 `SortConfig` / `EmptyConfig` / `ErrorConfig` 子类型。

### 排序行为

DataTable 内部封装三态循环逻辑——使用者只需传入当前排序状态 + 回调：

```
SortedHeader 点击 → 内部计算新状态 → onSortChange(field | null)
```

| 当前状态 | 点击后 | onSortChange 参数 |
|----------|--------|-------------------|
| 未激活（非本列） | 降序 | `onSortChange("price")` |
| 本列降序 | 升序 | `onSortChange("price")` |
| 本列升序 | 取消排序 | `onSortChange(null)` |

外部只需 `onSortChange` 一个回调，根据 `field === null` 判断是否取消排序。不再需要外部重复实现三态转换逻辑。

排序箭头用 Unicode 字符 `↕` `↓` `↑`，无额外图标依赖。

### 四态优先级

```
isLoading → ErrorBanner → EmptyState → 数据表格
```

- loading 时整个区域显示居中 LoadingSpinner（`size="lg"`）
- error 时显示 ErrorBanner（`variant="banner"`），有 `onRetry` 则显示重试按钮，有 `onDismissError` 则显示关闭按钮
- data.length === 0 时显示 EmptyState，透传 `emptyTitle`/`emptyDescription`/`emptyAction`/`emptyIcon`/`emptySize`
- data.length > 0 时渲染表头 + 数据行

### 表头样式

```tsx
// 表头行
<div className={cn(
  "grid gap-2 px-0 py-2 bg-gray-100 dark:bg-gray-800",
  "text-xs font-medium text-gray-500 dark:text-gray-400",
  stickyHeader && "sticky top-0 z-10",
  "border-b border-gray-200 dark:border-gray-700"   // 比 bg 深一级，保证可见
)}>
  {columns.map(col => (
    <div key={col.key} className={cn(
      col.align === 'center' && "text-center",
      col.align === 'right' && "text-right",
    )}>
      {col.sortable ? <SortHeaderButton ... /> : col.header}
    </div>
  ))}
</div>
```

> **设计修正**：ItemsTab 当前表头使用 `border-gray-100` 在 `bg-gray-100` 上不可见。新组件改用 `border-gray-200 dark:border-gray-700`，保证在日间和夜间模式下均可见。

### 数据行样式

```tsx
// 偶数行：bg-white dark:bg-gray-900
// 奇数行：bg-gray-50/30 dark:bg-gray-800/30
// hover：bg-gray-50 dark:bg-gray-800
<div className={cn(
  "grid gap-2 px-4 py-2 items-center text-xs leading-tight",
  "border-b border-gray-100 dark:border-gray-800 last:border-b-0",
  "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
  isEven ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-800/30",
)}>
```

### 日间/夜间色值对照

| 元素 | 日间 | 夜间 |
|------|------|------|
| 表头背景 | `bg-gray-100` | `dark:bg-gray-800` |
| 表头文字 | `text-gray-500` | `dark:text-gray-400` |
| 表头下划线 | `border-gray-200` | `dark:border-gray-700` |
| 偶数行背景 | `bg-white` | `dark:bg-gray-900` |
| 奇数行背景 | `bg-gray-50/30` | `dark:bg-gray-800/30` |
| hover 背景 | `bg-gray-50` | `dark:bg-gray-800` |
| 行分割线 | `border-gray-100` | `dark:border-gray-800` |
| 排序激活文字 | `text-blue-600` | `dark:text-blue-400` |

### 内部子组件

- **`SortHeaderButton`** — 私有组件，封装三态排序逻辑 + 箭头渲染。从 ItemsTab 的 `SortHeader` 迁移而来。
- **`StickyHeaderWrapper`** — 表头行容器，根据 `stickyHeader` 控制 `sticky top-0 z-10` 样式。

### 使用示例

```tsx
// items 页 — DataTable + 外部 Pagination
<div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
  <DataTable
    columns={[
      { key: 'title', header: '商品信息', sortable: true,
        render: (item) => <ItemTitleCell item={item} /> },
      { key: 'price', header: '价格', sortable: true,
        render: (item) => <span className="text-orange-600">¥{item.price}</span> },
      { key: 'autoReply', header: 'AI回复', render: (item) => <IconToggle ... /> },
    ]}
    data={data}
    keyExtractor={(item) => item.gid}
    gridTemplateColumns="2fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr"
    stickyHeader
    isLoading={isLoading}
    error={error}
    onRetry={onRetry}
    emptyTitle="暂无商品"
    emptyDescription="没有找到符合条件的商品"
    orderBy={orderBy}
    asc={asc}
    onSortChange={(field) => onFilterChange((prev) => {
      if (field === null) return { ...prev, orderBy: null, asc: false, page: 1 }
      if (prev.orderBy === field) {
        return { ...prev, asc: !prev.asc, page: 1 }
      }
      return { ...prev, orderBy: field, asc: false, page: 1 }
    })}
  />
</div>
<Pagination page={page} total={totalItems} pageSize={pageSize} onChange={onPageChange} />
```

### 文件

`components/ui/DataTable.tsx`

---

## 三、ItemsTab 迁移

### 容器结构

迁移后 ItemsTab 保持现有外层卡片结构不变。DataTable 只替换卡片内部的**表格区域**：

```
卡片 div (bg-white border rounded-xl shadow-sm overflow-hidden)  ← ItemsTab 不变
├── [Loading] LoadingSpinner
├── [Error] ErrorBanner
├── [Empty] EmptyState
├── [Data]
│   ├── 滚动容器 (flex-1 overflow-auto)                        ← 父级管理
│   │   └── <DataTable columns={...} stickyHeader ... />        ← 替换内联表格
│   └── 移动端卡片列表 (md:hidden)                              ← ItemsTab 不变
└── <Pagination ... />                                          ← ItemsTab 不变
```

### 变更内容

1. 删除 ItemsTab 内部 `SortHeader` 子组件（迁移到 DataTable 内部）
2. 内联表头 + itemRow 列表替换为 `<DataTable>` 调用
3. 排序状态管理简化：`onSortChange(field | null)` 替代外部三态判断
4. `ITEMS_GRID_COLS` 常量保留在 `ItemRow.tsx`（列宽是业务层职责）
5. ItemRow 组件保持不变（继续作为 `columns[].render` 的容器）

### ItemsTab 预计减少

~30 行（删除 SortHeader 子组件定义 + 内联表头 grid + 内联 `.map()` 渲染逻辑）

---

## 四、文件改动清单

| 文件 | 操作 |
|------|------|
| `components/ui/SearchToolbar.tsx` | 新增 |
| `components/ui/DataTable.tsx` | 新增 |
| `components/items/ItemsTab.tsx` | 修改：替换内联表格为 DataTable，删除 SortHeader |
| `.claude/docs/COMPONENTS.md` | 修改：添加 SearchToolbar / DataTable 条目，更新 SearchToolbar 计划 API |
| `.claude/rules/frontend-components.md` | 修改：SearchToolbar / DataTable 状态 🔴→✅ |

## 五、不在此范围

- 其他页面的迁移（accounts、admin、selection、publish）— 后续逐个迁移，按以下优先级：
  1. admin/accounts（`grid-cols-12`，sticky header，简单迁移）
  2. admin/users + admin/proxy（`grid-cols-N`，简单迁移）
  3. publish/PublishInstanceList（`fr` grid，checkbox 列，批量操作）
  4. selection/ProductMonitorTab（双行 sticky header + 分组色条 + 无限滚动，需评估是否适合 DataTable）
  5. dashboard/accounts（`grid-cols-12`，无分页无排序）
- 移动端适配 — 组件不做，各页面自行处理
- 分页 — 外部 `<Pagination>` 负责
- 虚拟滚动、无限滚动 — 不在本次范围
- ECharts 表格内嵌图表 — 列 render 函数自行处理
