# 商品管理 — 分页与排序前端适配设计

> 日期：2026-06-23  
> 状态：已确认  
> 关联：后端 `GET /api/items/list` 新增 `page`、`page_size`、`order_by`、`asc` 查询参数

---

## 1. 背景与目标

### 1.1 后端变更

后端 `GET /api/items/list` 新增 4 个查询参数（不影响现有参数）：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码，≥1 |
| `page_size` | int | 20 | 每页条数，1-100 |
| `order_by` | string | null | 排序字段，见下方 SORTABLE_FIELDS |
| `asc` | bool | true | 是否升序 |

可排序字段（`SORTABLE_FIELDS`）：`gid`, `title`, `price`, `lookCount`, `wantCount`, `collectCount`, `publishTime`, `deliveryType`

返回 `ItemSettingListSchema`（`PydanticListModel`），序列化后为裸数组 `Item[]`，不带分页元数据。

### 1.2 目标

1. 前端对接服务端分页，使用传统页码导航（非无限滚动）
2. 统计数据改用 `GET /api/items/stats` 接口，不再从客户端 `data.length` 派生
3. 排序改为服务端排序，支持全部 8 个字段
4. 移动端排序使用横向滑动字段栏（参考淘宝/闲鱼），桌面端使用 Pill 按钮组
5. 最小化改动，保留现有组件结构和数据流

---

## 2. 影响范围

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `lib/api/items.ts` | 扩展 + 新增 | ItemFilters 加 4 字段、新增 ITEM_SORT_FIELDS、ItemStats 类型、getItemStats() |
| `hooks/useItemsPage.ts` | 重构 | useQuery 加分页参数、删除客户端排序、新增 page/orderBy 状态、新增 stats 查询 |
| `components/items/FilterBar.tsx` | 重构 | 桌面端新增排序 Pill 行、移动端改为横向滑动排序栏、Props 适配 |
| `components/items/ItemsTab.tsx` | 修改 | 表头去掉排序箭头、底部增加分页导航、Props 适配 |
| `app/dashboard/items/page.tsx` | 适配 | 解构适配新 hook 返回值，传新 props |

---

## 3. API 层（`lib/api/items.ts`）

### 3.1 新增类型与常量

```typescript
/** 后端 SORTABLE_FIELDS 映射 */
export const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "price",        label: "价格" },
  { key: "lookCount",    label: "浏览" },
  { key: "wantCount",    label: "想要" },
  { key: "collectCount", label: "收藏" },
  { key: "publishTime",  label: "发布时间" },
  { key: "deliveryType", label: "发货方式" },
] as const

/** 商品统计响应 */
export interface ItemStats {
  status: Record<number, number>  // { 0: 15, 1: 3, -2: 5 }
  deliveryEmpty: number
  receiptEmpty: number
  reviewEmpty: number
}
```

### 3.2 ItemFilters 扩展

```typescript
export interface ItemFilters {
  uid?: string
  status?: number
  title?: string
  gid?: string
  // ——— 新增 ———
  page?: number
  page_size?: number
  order_by?: string
  asc?: boolean
}
```

### 3.3 listItems 修改

函数签名不变，仍返回 `Promise<Item[]>`。内部将 `page`、`page_size`、`order_by`、`asc` 拼入 query string：

```typescript
export async function listItems(filters?: ItemFilters): Promise<Item[]> {
  const params = new URLSearchParams()
  if (filters?.uid) params.append("uid", filters.uid)
  if (filters?.status !== undefined) params.append("status", String(filters.status))
  if (filters?.title) params.append("title", filters.title)
  if (filters?.gid) params.append("gid", filters.gid)
  // 新增
  if (filters?.page) params.append("page", String(filters.page))
  if (filters?.page_size) params.append("page_size", String(filters.page_size))
  if (filters?.order_by) params.append("order_by", filters.order_by)
  if (filters?.asc !== undefined) params.append("asc", String(filters.asc))

  const query = params.toString()
  return fetchApi<Item[]>(`/api/items/list${query ? `?${query}` : ""}`)
}
```

### 3.4 getItemStats 新增

```typescript
export async function getItemStats(uid?: string, status?: number): Promise<ItemStats> {
  const params = new URLSearchParams()
  if (uid) params.append("uid", uid)
  if (status !== undefined) params.append("status", String(status))
  const query = params.toString()
  return fetchApi<ItemStats>(`/api/items/stats${query ? `?${query}` : ""}`)
}
```

---

## 4. Hook 层（`hooks/useItemsPage.ts`）

### 4.1 状态变更

```diff
- sortField: "title" | "price" | "publishTime" | "status" | null
- sortDirection: "asc" | "desc" | null
+ orderBy: string | null
+ asc: boolean
+ page: number          // 当前页码，默认 1
+ pageSize: number      // 每页条数，默认 20
```

### 4.2 查询变更

```diff
- useQuery({ queryKey: ["items", filters], queryFn: () => listItems(filters) })
+ useQuery({
+   queryKey: ["items", filters, page, pageSize, orderBy, asc],
+   queryFn: () => listItems({ ...filters, page, page_size: pageSize, order_by: orderBy, asc })
+ })
```

stats 独立查询：

```typescript
const { data: statsData } = useQuery({
  queryKey: ["itemStats", filters.uid],
  queryFn: () => getItemStats(filters.uid),
})
```

### 4.3 派生数据

```diff
- sortedItems = useMemo(() => [...data].sort(...), [data, sortField, sortDirection])
- stats = useMemo(() => ({ total: data?.length || 0, ... }), [data])
+ // data 已是服务端排序+分页后的结果，直接使用
+ totalItems = statsData ? Object.values(statsData.status).reduce((a, b) => a + b, 0) : 0
+ totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
+ stats = {
+   total: totalItems,
+   onSale: statsData?.status[0] || 0,
+   offSale: statsData?.status[-2] || 0,
+   sold: statsData?.status[1] || 0,
+ }
```

### 4.4 handleSort 逻辑变更

3 态循环，但首次点击从降序开始（点击一次倒序，再点升序，再点清除）：

| 当前状态 | 点击同字段 | 点击异字段 |
|----------|-----------|-----------|
| 无排序 | → desc | → desc |
| desc | → asc | → desc |
| asc | → 清除（orderBy=null） | → desc |

```typescript
const handleSort = (fieldKey: string) => {
  if (orderBy === fieldKey) {
    if (asc === false) {
      // desc → asc
      setAsc(true)
    } else {
      // asc → 清除排序
      setOrderBy(null)
    }
  } else {
    // 异字段：默认降序
    setOrderBy(fieldKey)
    setAsc(false)
  }
  setPage(1)  // 排序变化时重置到第一页
}
```

### 4.5 filters 变更 → 重置页码

当筛选条件（uid/status/title/gid）变化时，重置到第一页。使用 `useEffect` 监听 filters 中业务字段的变化：

```typescript
useEffect(() => {
  setPage(1)
}, [filters.uid, filters.status, filters.title, filters.gid])
```

注意 `filters` 对象中新增的 `page`/`page_size`/`order_by`/`asc` 字段在此 hook 中不会被 `setFilters` 直接修改（它们由独立的 `page`/`orderBy`/`asc` state 管理，通过 `listItems` 调用时合并到 filters 参数中），因此不会触发不必要的重置。

### 4.6 返回值

```typescript
return {
  // ——— 不变 ———
  filters, setFilters,
  searchInput, setSearchInput,
  accountsData,
  data, isLoading, error,     // data 仍是 Item[]
  isRefreshing, isMobile,
  updateMutation, handleToggle, handleClearFilters, handleRefresh,
  keywordRules, rulesStats, itemKeywordCounts,
  keywordsLoading, keywordsError,

  // ——— 排序（替换 sortField/sortDirection/sortedItems/handleSort） ———
  orderBy, asc, handleSort,

  // ——— 分页（新增） ———
  page, pageSize, totalPages, setPage, totalItems,

  // ——— 统计（结构不变，来源改为 stats 接口） ———
  stats,
}
```

---

## 5. FilterBar（`components/items/FilterBar.tsx`）

### 5.1 Props 变更

```diff
interface FilterBarProps {
  // ... 不变 ...
- sortField: string | null
- sortDirection: "asc" | "desc" | null
- onSortChange: (field: "title" | "price" | "publishTime" | "status") => void
+ orderBy: string | null
+ asc: boolean
+ onSortChange: (fieldKey: string) => void
}
```

### 5.2 桌面端：新增排序 Pill 行

筛选行保持不变，在其下方增加一行排序 Pill 组：

```
[账号▾] [商品ID] [标题] [状态▾] [刷新] [清空]

排序   [价格 ↓] [发布时间 ↕] [浏览 ↕] [想要 ↕] [收藏 ↕] [发货方式 ↕] [商品ID ↕] [标题 ↕]
```

**视觉规格：**

| 属性 | 默认态 | 选中态 |
|------|--------|--------|
| 背景 | `bg-gray-100` | `bg-blue-50` |
| 文字色 | `text-gray-500` | `text-blue-700` |
| 字重 | `font-normal` | `font-medium` |
| 字号 | `text-xs` | `text-xs` |
| 内边距 | `px-2.5 py-1` | `px-2.5 py-1` |
| 圆角 | `rounded-full` | `rounded-full` |
| 箭头 | `↕`（灰色双向） | `↓` 或 `↑`（蓝色） |

- 前面加一个灰色 `排序` 标签（`text-xs text-gray-400`），作为视觉前缀
- Pill 之间间距 `gap-1.5`
- 容器 `px-4 pb-3`（与筛选行统一左右内边距，底部留白）

### 5.3 移动端：横向滑动排序栏

统计条下方新增一行排序 chip，原生横向滑动：

```
[共 125 件 | 在售 98 | 已下架 20 | 已售出 7]

← 横向滑动 →  [价格 ↓] [发布时间 ↕] [浏览 ↕] [想要 ↕] [收藏 ↕] [发货方式 ↕] [商品ID ↕] [标题 ↕]
```

**视觉规格：**

| 属性 | 值 |
|------|-----|
| 容器 | `overflow-x: auto; white-space: nowrap;` |
| 隐藏滚动条 | `scrollbar-width: none`（Firefox）；`::-webkit-scrollbar { display: none }`（Chrome/Safari） |
| Chip 样式 | 与桌面端一致（`text-xs rounded-full px-2.5 py-1`） |
| 容器内边距 | `px-3 pb-2` |
| Chip 间距 | `gap-1.5`，`flex-shrink: 0` |
| 选中态 | `bg-blue-50 text-blue-700 font-medium`，箭头 `↓`/`↑` |
| 默认态 | `bg-gray-100 text-gray-500`，箭头 `↕` |

**SortChip 组件参数扩展：**

```typescript
function SortChip({
  label: string
  field: string          // ← 改为 string（原 "title"|"price"|...）
  orderBy: string | null  // ← 替换 sortField
  asc: boolean            // ← 替换 sortDirection
  onClick: () => void
})
```

### 5.4 删除移动端旧 SortChip 代码

移除 `FilterBarMobile` 中统计条右侧的 3 个硬编码 SortChip（标题/价格/时间），替换为新的横向滑动排序栏。

保留 `SortChip` 内部组件，扩展参数后同时给桌面端和移动端复用。

---

## 6. ItemsTab（`components/items/ItemsTab.tsx`）

### 6.1 Props 变更

```diff
interface ItemsTabProps {
  // ... 不变 ...
- sortField, sortDirection
- sortedItems
+ orderBy, asc
+ data                      // data 直接使用（已是服务端排序+分页结果）
+ page, totalPages, onPageChange
+ totalItems
}
```

### 6.2 表头：去掉排序箭头

3 个可排序列（商品信息、价格、发布时间）的 `<button onClick={onSortChange}>` 改为纯文本 `<span>`：

```diff
- <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => onSortChange("title")}>
-   商品信息
-   {sortField === "title" ? <span>{sortDirection === "asc" ? "↑" : "↓"}</span> : <span>↕</span>}
- </button>
+ <span>商品信息</span>
```

同样处理 `价格` 和 `发布时间` 列。布局不变（仍用 `gridTemplateColumns: "repeat(14, minmax(0, 1fr))"`）。

### 6.3 数据渲染

```diff
- {sortedItems.map((item, index) => (...))}
+ {(data || []).map((item, index) => (...))}
```

移动端卡片列表同样改为 `data`。

### 6.4 底部分页器

在数据区下方（桌面端表格和移动端卡片列表之后）增加分页导航：

```
┌──────────────────────────────────────────────┐
│          ← 上一页    1 / 7    下一页 →        │
└──────────────────────────────────────────────┘
```

**视觉规格：**

| 属性 | 值 |
|------|-----|
| 容器 | `flex items-center justify-center gap-3 py-3 border-t border-gray-100` |
| 上一页/下一页按钮 | `text-sm px-3 py-1.5 rounded-md` |
| 按钮可用态 | `text-blue-600 hover:bg-blue-50 cursor-pointer` |
| 按钮禁用态（第1页上一页、最后页下一页） | `text-gray-300 cursor-not-allowed` |
| 页码文字 | `text-sm text-gray-500`，格式 `{page} / {totalPages}` |
| 总数提示 | 页码文字前可加 `共 {totalItems} 件` |

**交互：**
- 点击上一页/下一页调用 `onPageChange(page - 1)` / `onPageChange(page + 1)`
- 切换页面后列表区滚动到顶部（通过 ref 调用容器的 `scrollTop = 0`）
- 仅当 `totalPages > 1` 时显示分页器

---

## 7. page.tsx（`app/dashboard/items/page.tsx`）

仅解构适配，自身逻辑不变：

```diff
  const {
    filters, setFilters,
    searchInput, setSearchInput,
-   sortField, sortDirection,
+   orderBy, asc,
    isRefreshing,
    accountsData,
    data, isLoading, error,
    keywordsLoading, keywordsError,
    keywordRules, rulesStats, itemKeywordCounts,
-   sortedItems,
    stats,
+   page, totalPages, setPage, totalItems,
    updateMutation,
    handleToggle, handleClearFilters,
    handleSort, handleRefresh,
    isMobile,
  } = useItemsPage()
```

传递给 `ItemsTab` 的新 props：

```diff
  <ItemsTab
    ...
-   sortField={sortField}
-   sortDirection={sortDirection}
-   sortedItems={sortedItems}
+   orderBy={orderBy}
+   asc={asc}
+   page={page}
+   totalPages={totalPages}
+   totalItems={totalItems}
+   onPageChange={setPage}
    ...
  />
```

传递给 `FilterBar` 的新 props：

```diff
  <FilterBar
    ...
-   sortField={sortField}
-   sortDirection={sortDirection}
-   onSortChange={(field) => handleSort(field as ...)}
+   orderBy={orderBy}
+   asc={asc}
+   onSortChange={handleSort}
    ...
  />
```

---

## 8. 数据流总览

```
page.tsx
├── useItemsPage()
│   ├── useQuery(["items", filters, page, pageSize, orderBy, asc])
│   │   └── listItems({...filters, page, page_size, order_by, asc})
│   │       └── GET /api/items/list?uid=&status=&page=&page_size=&order_by=&asc=
│   │           → Item[]（裸数组，已是分页+排序结果）
│   │
│   ├── useQuery(["itemStats", uid])
│   │   └── getItemStats(uid)
│   │       └── GET /api/items/stats?uid=
│   │           → { status: {0:N, 1:M, -2:K}, deliveryEmpty, receiptEmpty, reviewEmpty }
│   │
│   └── 派生: totalItems, totalPages, stats
│
├── FilterBar ← orderBy, asc, handleSort
│   ├── 桌面: Pill 组 [价格 ↓] [发布时间 ↕] [浏览 ↕] ...
│   └── 移动: 横向滑动 [价格 ↓] [发布时间 ↕] [浏览 ↕] ...
│
└── ItemsTab ← data, page, totalPages, onPageChange
    ├── 表头: 纯文本列名
    ├── 列表: data.map(...)
    └── 底部分页器: ← 上一页  1/7  下一页 →
```

---

## 9. 边界情况

| 场景 | 处理 |
|------|------|
| filters 变更（切换账号/状态/搜索） | `page` 重置为 1 |
| 排序变更 | `page` 重置为 1 |
| stats 加载中 | stats 显示 `-` 或 0 |
| stats 加载失败 | stats 显示 0，不阻断列表渲染 |
| totalPages = 1 | 不显示分页器 |
| items 为空 | 显示"暂无商品"空状态，隐藏分页器 |
| items 加载中 | 显示 LoadingSpinner |
| items 加载失败 | 显示错误信息 |
