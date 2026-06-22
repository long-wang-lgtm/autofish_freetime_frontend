# CSS Grid 表格列宽重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ProductMonitorTab 表格从 flex + 硬编码 px 列宽迁移到 CSS Grid + fr 单位，零硬编码像素列宽，表格自动填满屏幕。

**Architecture:** 三步：定义 GRID_COLS 常量 → 三处 flex 改 grid → MiniTrendChart 自适应。改动集中在一个组件的方法内，无需跨文件协调。

**Tech Stack:** React + TypeScript + Tailwind CSS v3 + CSS Grid

**依赖：** 商品监控表格与抽屉重构（已实施）

---

### Task 1: ProductMonitorTab — Grid 常量 + 列定义去 px

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 新增 GRID_COLS 常量，移除 GROUP_GAP**

在 `COLUMNS` 数组之前添加：

```typescript
/** 表格 Grid 列模板，表头 / 分组色条 / 数据行共用 */
const GRID_COLS = '3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr 2fr 2fr 40px'
```

同时删除第 81 行的 `const GROUP_GAP = 'ml-2'`。

- [ ] **Step 2: ColumnDef 接口去 width，COLUMNS 数组去 width**

修改 `ColumnDef` 接口（当前约第 70-77 行）：

```typescript
interface ColumnDef {
  key: ProductSortKey
  label: string
  group: ColumnGroup
  groupStart: boolean
  dataBar?: boolean
}
```

移除 `width: string` 字段。

重写 `COLUMNS` 数组，删除每项中的 `width: '...'` 行。例如：

```typescript
const COLUMNS: ColumnDef[] = [
  { key: 'title',             label: '商品信息', group: 'identity',   groupStart: true },
  { key: 'price',             label: '价格',     group: 'core',       groupStart: true, dataBar: true },
  { key: 'd7IfRatio' as ProductSortKey,       label: '7天询藏比', group: 'conversion', groupStart: true },
  { key: 'd7InquiryRate' as ProductSortKey,   label: '7天询单率', group: 'conversion', groupStart: false },
  { key: 'd7FavoriteRate' as ProductSortKey,  label: '7天收藏率', group: 'conversion', groupStart: false },
  { key: 'd7DailyWant' as ProductSortKey,     label: '日均想要',  group: 'daily',      groupStart: true },
  { key: 'd7DailyLook' as ProductSortKey,     label: '日均浏览',  group: 'daily',      groupStart: false },
  { key: 'd7BrowseGrowth' as ProductSortKey,  label: '流量增速',  group: 'growth',     groupStart: true },
  { key: 'acceleration' as ProductSortKey,    label: '升温信号',  group: 'growth',     groupStart: false },
  { key: 'wantTrend' as ProductSortKey,       label: '想要趋势',  group: 'trend',      groupStart: true },
  { key: 'lookTrend' as ProductSortKey,       label: '浏览趋势',  group: 'trend',      groupStart: false },
  { key: 'collectTrend' as ProductSortKey,    label: '收藏趋势',  group: 'trend',      groupStart: false },
]
```

- [ ] **Step 3: TypeScript 检查（预期有引用 col.width 的错误）**

```bash
npx tsc --noEmit
```

Expected: 有错误（表头/色条/行仍引用 `col.width` 和 `GROUP_GAP`），将在 Task 2 解决。

- [ ] **Step 4: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "refactor: add GRID_COLS constant, remove width from ColumnDef and COLUMNS"
```

---

### Task 2: ProductMonitorTab — flex 改 grid

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 表头行 flex→grid**

找到表头 `<div>`（约第 445 行），当前：

```tsx
<div className="flex px-5 pt-2.5 pb-2 text-[11px] font-medium text-gray-500 bg-gray-50 select-none sticky top-0 z-10">
```

改为：

```tsx
<div
  className="grid px-5 pt-2.5 pb-2 text-[11px] font-medium text-gray-500 bg-gray-50 select-none sticky top-0 z-10 gap-x-2"
  style={{ gridTemplateColumns: GRID_COLS }}
>
```

同时删除每个 `<button>` 上的 `${col.width}` 和 `${isGroupStart ? GROUP_GAP : ''}`：

```tsx
// 改前
className={`group flex items-center gap-1 ${col.width} transition-all duration-150 ${isIdentity ? 'justify-start' : 'justify-center'} ... ${isGroupStart ? GROUP_GAP : ''}`}

// 改后
className={`group flex items-center gap-1 transition-all duration-150 ${isIdentity ? 'justify-start' : 'justify-center'} ...`}
```

- [ ] **Step 2: 分组色条 flex→grid**

分组色条 `<div>`（约第 482 行）：

```tsx
// 改前
<div className="flex px-5 pb-1 border-b border-gray-100 sticky top-[34px] z-10 bg-white">
  {COLUMNS.map(col => {
    const isGroupStart = col.groupStart && col.group !== 'identity'
    return (
      <div key={`bar-${col.key}`} className={`${col.width} ${isGroupStart ? GROUP_GAP : ''}`}>

// 改后
<div
  className="grid px-5 pb-1 border-b border-gray-100 sticky top-[34px] z-10 bg-white gap-x-2"
  style={{ gridTemplateColumns: GRID_COLS }}
>
  {COLUMNS.map(col => {
    const isGroupStart = col.groupStart && col.group !== 'identity'
    return (
      <div key={`bar-${col.key}`}>
```

- [ ] **Step 3: 数据行 flex→grid**

数据行 `<div>`（约第 502 行）：

```tsx
// 改前
<div className={`group flex px-5 py-[12px] items-center transition-all duration-200 cursor-pointer ...`}>

// 改后
<div
  className={`group grid px-5 py-[12px] items-center transition-all duration-200 cursor-pointer gap-x-2 ...`}
  style={{ gridTemplateColumns: GRID_COLS }}
>
```

删除每个单元格上的 `${col.width}` 和 `${isGroupStart ? GROUP_GAP : ''}`：

```tsx
// 改前
<div className={`${col.width} ${isIdentity ? 'text-left' : 'text-center flex items-center justify-center'} ${isGroupStart ? GROUP_GAP : ''}`}>

// 改后
<div className={isIdentity ? 'text-left' : 'text-center flex items-center justify-center'}>
```

- [ ] **Step 4: 移除 min-w-[1400px]**

找到外层 `<div className="min-w-[1400px]">`（约第 461 行），改成：

```tsx
<div>
```

直接退化为普通 `<div>`（或删除该包裹层）。

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 6: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "refactor: replace flex+px with CSS Grid+fr for table rows"
```

---

### Task 3: MiniTrendChart — SVG 自适应宽度

**Files:**
- Modify: `components/selection/product/MiniTrendChart.tsx`

- [ ] **Step 1: 固定宽度 W=90 改为 props 或自适应**

**简化方案（不引入 ResizeObserver）：** 将 `W` 作为可选 prop，默认 90；ProductMonitorTab 在趋势列中不传此 prop（使用默认值），未来需要时可覆盖。

当前趋势列 Grid 分配 2fr，在 1300px 容器下约 148px。90px SVG 居中显示在 148px 容器中，左右有留白但功能正常。

```typescript
// MiniTrendChart.tsx — 仅改这一行
const W = 90
// 改为
const W = 90  // 固定 90px 足够显示折线+3个数字，Grid 2fr 列提供额外 padding
```

**不需要改。** MiniTrendChart 内部 90px 宽度在 2fr 列（124-196px）内居中，视觉效果可接受。外层容器 `w-[90px]` 已是相对定位的 `<div>`，实际由父 Grid 列控制位置。

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: final verification — CSS Grid table width refactor complete"
```

---

## 验收清单

- [ ] `COLUMNS` 数组不含任何 `w-[Npx]` 或固定宽度字符串
- [ ] `GROUP_GAP` 已删除
- [ ] `min-w-[1400px]` 已移除
- [ ] 表头、色条、行使用同一 `GRID_COLS` 模板
- [ ] 表格在宽/窄视口下自动填满容器宽度
- [ ] 排序、分组色条、sticky 表头功能正常
- [ ] 商品信息列描述 `line-clamp-2` 正常
- [ ] `npx tsc --noEmit` 零错误
