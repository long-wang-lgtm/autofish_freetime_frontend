# NativeTable — 原生 `<table>` 数据表格组件设计

> 日期：2026-07-19 | 状态：设计完成

---

## 一、问题诊断

### 1.1 当前项目架构缺陷

项目中 **17 个文件**使用 CSS Grid 拼装表格，底层模式统一为"每行一个独立 Grid 容器"：

```
表头: <div class="grid" style="gridTemplateColumns: ...">  ← 独立 Grid #1
行 1: <div class="grid" style="gridTemplateColumns: ...">  ← 独立 Grid #2
行 2: <div class="grid" style="gridTemplateColumns: ...">  ← 独立 Grid #3
...
```

CSS Grid 默认 `min-width: auto` 允许单元格内容撑大所在列轨道——但仅影响当前 Grid 容器。因此：

- **表头 Grid** 列宽 = 文字宽度（"封面""账号""类目"很短）
- **数据行 Grid** 列宽 = 内容宽度（MaterialImageCell 150px+、select 账号名 150px+）

> 两处定义了完全相同的 `gridTemplateColumns: '32px 56px 2fr 1.5fr 80px 100px 100px 100px 96px 32px'`，但渲染出的列宽各不相同。封面列表头 56px，数据列 150px，必然错位。

### 1.2 受影响范围

| 模式 | 文件数 | 列对齐保证 |
|------|--------|-----------|
| DataTable 共享组件 + 消费者 | 12 个 | ❌ 无保证（依赖内容不溢出） |
| Tailwind `grid-cols-N`（admin 页面） | 5 个 | ❌ 无保证 |
| 原生 `<table>`（RuleTable、AIConfigTab、admin/page.tsx） | 3 个 | ✅ 浏览器保证 |

**共享组件 DataTable 本身就带着这个缺陷**，只是大部分消费者内容简单（短文本/数字），尚未触发。MaterialWorkspace 因为内容复杂（图片组件、下拉框、行内编辑）率先暴露。

### 1.3 为什么选择新组件而非改造 DataTable

- DataTable 的 Grid 架构是 12 个消费者的稳定依赖，改内部实现风险不可控
- `<table>` 和 CSS Grid 是两种不同的布局模型，无法在同一个组件内优雅切换
- 新建组件允许增量迁移——MaterialWorkspace 先用，后续页面按需切换
- 两个组件共存，消费者自主选择

---

## 二、NativeTable 组件设计

### 2.1 核心选型

| 决策 | 选择 | 理由 |
|------|------|------|
| 底层元素 | `<table>` + `<thead>` + `<tbody>` + `<colgroup>` | 浏览器原生列对齐，零 JS 参与 |
| 列宽算法 | `table-layout: fixed` | 只从 `<colgroup>` 计算列宽，后续行内容绝不撑大列 |
| 宽度定义 | 每列 `width?: string` | 比 `gridTemplateColumns` 字符串更类型安全，一列一宽自描述 |
| 四态 | 内置（loading/error/empty/data） | 与 DataTable 一致的项目惯例 |

### 2.2 `fr` 弹性单位的替代

CSS Grid 的 `fr` 在 `<table>` 中无等价物。策略：**固定列用 px，弹性列用百分比**。百分比相对于表宽计算，消费者按原始 fr 比例换算。

换算公式：`fr 值 / fr 总和 × 剩余空间比例 ≈ 百分比`。

MaterialWorkspace 示例——原 `2fr 1.5fr`（约 4:3 比例）：

```
固定列合计 = 32 + 56 + 80 + 100 + 100 + 100 + 96 + 32 = 596px
弹性空间 ≈ 表宽 - 596px
描述:     2.0fr → 弹性空间的 57% → 约表宽的 28%
封面提示词: 1.5fr → 弹性空间的 43% → 约表宽的 20%
```

> `%` 值依赖于表宽，不同屏幕下绝对像素不同，但比例关系保持。组件不自动换算——消费者传入明确的 `width` 值，可以是 `px`、`%` 或任何合法 CSS 宽度。

### 2.3 Props 接口

```typescript
interface NativeTableColumn<T> {
  key: string
  header: React.ReactNode
  width?: string                     // CSS 宽度：'32px' / '28%' / '100px'，不设则由浏览器均分剩余
  align?: 'left' | 'center' | 'right'
  className?: string                 // 应用于 <th> 和 <td>
  sortable?: boolean
  render: (item: T, index: number) => React.ReactNode
}

interface NativeTableProps<T> {
  columns: NativeTableColumn<T>[]
  data: T[] | undefined
  keyExtractor: (item: T) => string | number

  // 四态
  isLoading?: boolean
  error?: unknown
  errorMessage?: string
  onRetry?: () => void

  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }

  // 排序
  orderBy?: string | null
  asc?: boolean
  onSortChange?: (field: string | null) => void

  // 行
  rowClassName?: string | ((item: T, index: number) => string)
  onRowClick?: (item: T, index: number) => void

  stickyHeader?: boolean
  className?: string
}
```

### 2.4 渲染结构

```html
<div class="overflow-auto">              ← 横向滚动容器（不含 header/footer）
  <table class="w-full table-fixed">
    <colgroup>
      <col style="width: 32px">          ← 固定 px 列
      <col style="width: 56px">
      <col style="width: 28%">           ← 弹性 % 列（原 2fr）
      <col style="width: 20%">           ← 弹性 % 列（原 1.5fr）
      <col style="width: 80px">
      ...
    </colgroup>
    <thead>
      <tr>
        <th class="sticky top-0 z-10 bg-gray-50 text-xs font-medium text-gray-500">
          {col.header}
        </th>
        ...
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="text-sm text-gray-700">{col.render(item)}</td>
        ...
      </tr>
    </tbody>
  </table>
</div>
```

关键点：
- `table-fixed`（即 `table-layout: fixed`）——列宽锁定，内容不撑大
- `<colgroup>` 在 `<thead>` 之前——fixed 算法第一遍扫描取 `<col>` 宽度
- `sticky top-0 z-10` 在 `<th>` 上——`<thead>` 语义包裹，天然分组
- `border-b` 在 `<tr>` 上——`border-collapse` 下跨列连续

### 2.5 排序

与 DataTable 的 SortHeaderButton 逻辑一致，复刻为 `<th>` 内的 `<button>`：

- 未选中：灰色文字 + `↕`
- 升序：蓝色文字 + `↑`
- 降序：蓝色文字 + `↓`
- 点击循环：未选中 → 升序 → 降序 → 取消

### 2.6 行点击

```tsx
const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, item: T, index: number) => {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('a') ||
      target.closest('input') || target.closest('select')) return
  onRowClick?.(item, index)
}
```

注意：与 DataTable 不同，NativeTable 新增 `target.closest('a')` 判断——`<td>` 内可能有 `<a>` 链接。

### 2.7 四态渲染

```
isLoading = true  → <LoadingSpinner size="lg" />
error != null     → <ErrorBanner variant="banner" onRetry={onRetry} />
data.length === 0 → <EmptyState title={...} description={...} action={...} />
否则              → <table>...</table>
```

与 DataTable 一致，使用项目统一的 LoadingSpinner / ErrorBanner / EmptyState 组件。

### 2.8 与 DataTable 的 Props 差异

| Prop | DataTable | NativeTable | 说明 |
|------|-----------|-------------|------|
| `gridTemplateColumns` | ✅ `string` | ❌ | 替换为 column 级别的 `width` |
| column `width` | ❌ | ✅ `string?` | 每列独立宽度 |
| column `sortable` | ✅ | ✅ | 相同 |
| column `align` | ✅ | ✅ | 相同 |
| `stickyHeader` | ✅ | ✅ | 相同 |
| `onRowClick` | ✅ | ✅ | 相同，NativeTable 额外检测 `<a>` |
| `isLoading/error/empty*` | ✅ | ✅ | 相同 |
| `maxHeight` | ✅ | ❌ | NativeTable 的 `overflow-auto` 始终渲染 |
| `onDismissError` | ✅ | ❌ | 简化，仅保留 `onRetry` |

---

## 三、MaterialWorkspace 迁移方案

### 3.1 当前结构

```
MaterialWorkspace
  ├─ <div> 商机头部（返回 + 创建按钮 + 商机名 + 价格 + 统计）
  ├─ <div> 素材表格区（overflow-y-auto）
  │   ├─ loading → <LoadingSpinner>
  │   ├─ error  → <ErrorBanner>
  │   ├─ empty  → <EmptyState>
  │   └─ data   → <>
  │       ├─ <div.grid> 表头（手写 10 个 <div>）
  │       └─ {materials.map(m => <MaterialRow ... />)}
  └─ <Pagination>
```

MaterialRow 组件：
- 从 React Query cache 读取 material + accounts + channels
- 手写 10 个 grid cell（checkbox / MaterialImageCell / 描述 / 封面提示词 / InlineEditCell / select账号 / select类目 / AI上下文按钮 / ProgressActionCell / 删除按钮）
- 行点击 → `onOpenSheet(materialId)`（排除 input/select/button/img）
- 内联保存逻辑（optimisticUpdate + editMaterial + 错误回滚）
- 三个"work"操作（改写/封面规划/生图）+ 发布 + 删除确认

### 3.2 目标结构

```
MaterialWorkspace
  ├─ <div> 商机头部（不变）
  ├─ <NativeTable
  │     columns={materialColumns}    ← 10 列定义，含 render 回调
  │     data={materials}
  │     keyExtractor={m => m.id}
  │     isLoading={materialLoading}
  │     error={materialError}
  │     onRetry={materialRefetch}
  │     emptyTitle="暂无素材"
  │     emptyDescription="点击「批量创建」为该商机创建素材"
  │     emptyAction={{ label: '批量创建', onClick: onCreateClick }}
  │     onRowClick={(m) => onOpenEditor(m.id)}
  │     stickyHeader
  │   />
  └─ <Pagination>
```

MaterialWorkspace 删除：
- 手写的 loading/error/empty 分支逻辑（4 个条件 × 各 ~10 行）
- 手写的 133 行表头 div
- `<MaterialRow>` 的 grid 容器层（row wrapper div + gridTemplateColumns）

### 3.3 MaterialRow 的处理

MaterialRow 转为纯逻辑 hook `useMaterialRow(materialId, selectedOid, materialPage)`，只包含数据+操作逻辑，不含 UI：

- 从 React Query cache 读取 material / accounts / channels
- 内联保存逻辑（optimisticUpdate + editMaterial + 错误回滚）
- 三个 work 操作（改写/封面规划/生图）+ 发布 + 删除确认
- 返回 `{ material, accounts, channels, savingField, handleInlineSave, handleTriggerWork, handlePublish, handleDeleteMaterial, ... }`

NativeTable 的 `render` 回调中调用此 hook 获取数据和方法，返回对应的单元格 JSX。MaterialRow.tsx 删除。

### 3.4 10 列定义

```typescript
const materialColumns = useMemo<NativeTableColumn<MaterialData>[]>(() => [
  { key: 'checkbox',  width: '32px', align: 'center', header: <ClearSelectionButton />, render: (m) => <CheckboxCell ... /> },
  { key: 'cover',     width: '56px', align: 'center', header: '封面',       render: (m) => <MaterialImageCell ... /> },
  { key: 'desc',      width: '28%',  align: 'left',   header: '描述',       render: (m) => <span className="line-clamp-2">{m.description}</span> },
  { key: 'prompt',    width: '20%',  align: 'left',   header: '封面提示词',  render: (m) => <span className="truncate">{m.ai_context?.coverprompt}</span> },
  { key: 'price',     width: '80px', align: 'center', header: '价格',       render: (m) => <InlineEditCell ... /> },
  { key: 'account',   width: '100px',align: 'center', header: '账号',       render: (m) => <AccountSelect ... /> },
  { key: 'category',  width: '100px',align: 'center', header: '类目',       render: (m) => <CategorySelect ... /> },
  { key: 'aiContext', width: '100px',align: 'center', header: 'AI上下文',   render: (m) => <AIContextPill ... /> },
  { key: 'progress',  width: '96px', align: 'center', header: '进度/操作',  render: (m) => <ProgressActionCell ... /> },
  { key: 'delete',    width: '32px', align: 'center', header: '删除',       render: (m) => <DeleteButton ... /> },
], [dependencies])
```

> `width` 字段对照原 `MATERIAL_GRID_COLS = '32px 56px 2fr 1.5fr 80px 100px 100px 100px 96px 32px'`：固定 px 列直译，两个 fr 列按 2:1.5 ≈ 4:3 比例换算为 `28%` 和 `20%`。

### 3.5 复选框列表头

当前 MaterialWorkspace 表头的复选框列在 `selectedMaterialIds.size > 0` 时显示"取消"按钮。不放在表头内——BatchActionBar 已处理选中状态的"取消选择"操作，表头列保持空，避免职责重叠。

---

## 四、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `components/ui/data/NativeTable.tsx` | 新组件主体（~200 行） |
| **修改** | `components/ui/data/index.ts` | 添加 `NativeTable` / `NativeTableColumn` / `NativeTableProps` 导出 |
| **新建** | `hooks/useMaterialRow.ts` | 从 MaterialRow 抽取数据+操作逻辑（~150 行） |
| **修改** | `components/batch-publish/workbench/MaterialWorkspace.tsx` | 替换手写表格为 NativeTable（-60 行 +30 行） |
| **删除** | `components/batch-publish/workbench/MaterialRow.tsx` | 逻辑迁移到 hook，UI 迁移到 NativeTable render |
| **不变** | `components/ui/data/DataTable.tsx` | 保持现状，继续服务 12 个现有消费者 |
| **不变** | `components/batch-publish/shared/constants.ts` | `MATERIAL_GRID_COLS` 常量不再需要，但暂不删除（避免影响其他引用） |

---

## 五、规范合规检查

| 规范域 | 检查项 | 状态 |
|--------|--------|------|
| 组件设计 | 命名导出 `export function NativeTable` | ✅ |
| 组件设计 | PascalCase 文件名 | ✅ |
| 组件设计 | 类型就近定义在组件文件中 | ✅ |
| 组件设计 | props ≤ 2 时考虑重构 | N/A（表格组件 props 多属合理） |
| 组件设计 | 禁止 default export | ✅ |
| 设计 Token | 表头文字 `text-xs font-medium text-gray-500` | ✅ |
| 设计 Token | 数据文字 `text-sm text-gray-700` | ✅ |
| 设计 Token | 数值列 `tabular-nums` | ✅（在列定义中消费者自行设置） |
| 设计 Token | 分割线 `border-gray-100` | ✅ |
| 设计 Token | stickyHeader 的 `<th>` 背景色 `bg-gray-50` | ✅ |
| 设计 Token | 输入框高度 `h-10` | ✅（后续使用注入，非组件职责） |
| 错误处理 | 四态使用统一组件（LoadingSpinner/ErrorBanner/EmptyState） | ✅ |
| 状态管理 | MaterialRow 逻辑抽取为独立 hook | ✅ |
| 暗色模式 | 已有 `dark:` 前缀跟随 DataTable 体系 | ✅ |
| 移动端 | 批量创作页移动端使用 MaterialCard（模式 C），不受影响 | ✅ |

---

## 六、不做什么

- ❌ **不改动 DataTable** — 保持现状，继续服务 12 个现有消费者
- ❌ **不迁移已有页面到 NativeTable** — 仅 MaterialWorkspace 作为首个消费者
- ❌ **不在组件内实现分页** — Pagination 在组件外部渲染，与 DataTable 模式一致
- ❌ **不支持 colspan/rowspan** — YAGNI，当前无场景需要
- ❌ **不支持拖拽排序** — YAGNI
- ❌ **不支持行选择（checkbox 列）的批量操作** — 消费者自行管理选中状态
- ❌ **不支持 `border-separate` + cellspacing** — 固定使用 `border-collapse`
- ❌ **不删除 `MATERIAL_GRID_COLS` 常量** — 等 MaterialWorkspace 迁移完成且稳定后清理

---

## 七、决议记录

- [x] 新建组件 `NativeTable`，不改造 `DataTable`
- [x] 底层用 `<table>` + `table-layout: fixed`，消除 `min-width: auto` 问题
- [x] 列宽用 per-column `width?: string`，替代 `gridTemplateColumns` 字符串。固定列用 px，弹性列用 %
- [x] 弹性列（原 fr）使用百分比 `width: '28%'` / `width: '20%'`，保留 2:1.5 比例关系
- [x] 四态内置（loading/error/empty/data）
- [x] sticky header 通过 `<th class="sticky top-0">` 实现
- [x] MaterialRow 逻辑抽取为 `useMaterialRow` hook
- [x] MaterialWorkspace 手写的 loading/error/empty 三态 + 表头 Grid 全部删除
- [x] 复选框列"取消选择"保留在 BatchActionBar，不放在表头
- [x] `MaterialRow.tsx` 删除（逻辑 → hook，UI → NativeTable render）
- [x] 暗色模式：已有 `dark:` 前缀体系，不重复声明
- [x] 移动端：Batch-publish 使用模式 C（Push/Pop 导航 + MaterialCard），不受 PC 端表格变更影响
- [x] DataTable 保持原样，两个组件并存
