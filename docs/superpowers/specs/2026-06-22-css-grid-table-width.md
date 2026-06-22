# CSS Grid 表格列宽重构

> 日期：2026-06-22 | 状态：已确认
> 依赖：[商品监控表格与抽屉重构设计](./2026-06-22-product-monitor-table-redesign.md)（已实施）
> 范围：ProductMonitorTab.tsx、MiniTrendChart.tsx

---

## 问题

当前表格列宽全部硬编码像素值（`w-[68px]`、`w-[80px]`、`w-[90px]` 等），配 `min-w-[1400px]` 容器和 `max-w-[240px]` 钳制。导致：
- 238px 死白空间浪费在表格右侧
- 宽屏不扩展，窄屏强制滚动
- 列宽与内容脱节（90px 趋势列装不下 3 个数字）

## 目标

- 零硬编码像素列宽
- 表格自动填满容器可用宽度
- 列宽比例一步控制，表头/色条/数据行对齐天然保证

---

## 1. grid-template-columns

```css
grid-template-columns: 3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr 2fr 2fr 40px;
```

| 列 | 单位 | 依据 |
|---|------|------|
| 商品信息 | 3fr | 描述+多badge+按钮，空间需求最大 |
| 价格 | 1fr | ¥XX.XX + 动向小字 |
| 7天询藏比 | 1fr | 数字+tooltip |
| 7天询单率 | 1fr | X.X% |
| 7天收藏率 | 1fr | X.X% |
| 日均想要 | 1fr | X.X |
| 日均浏览 | 1fr | XXX.X |
| 流量增速 | 1fr | +XX.X% |
| 升温信号 | 1fr | 加速/降温 +XX% |
| 想要趋势 | 2fr | 迷你图+3指标，需要比数据列更多空间 |
| 浏览趋势 | 2fr | 同上 |
| 收藏趋势 | 2fr | 同上 |
| 操作 | 40px | 仅此一个固定值：垃圾桶图标 16px + padding |

### 宽度示例

| 容器 | 1fr ≈ | 2fr ≈ | 3fr ≈ |
|------|-------|-------|-------|
| 1100px | 62px | 124px | 186px |
| 1300px | 74px | 148px | 222px |
| 1500px | 86px | 172px | 258px |
| 1700px | 98px | 196px | 293px |

---

## 2. 代码变更

### 2.1 新增常量

```typescript
/** 表格 Grid 列模板，表头/色条/数据行共用 */
const GRID_COLS = '3fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr 2fr 2fr 40px'
```

### 2.2 移除的代码

| 移除 | 位置 | 原因 |
|------|------|------|
| `ColumnDef.width` | 接口定义 | 由 Grid 统一控制 |
| `COLUMNS[].width` | 每个列定义 | 同上 |
| `GROUP_GAP` | 常量 | Grid `gap-x` 替代 |
| `min-w-[1400px]` | 容器 div | Grid 自动填满 |
| 表头 `isGroupStart ? GROUP_GAP : ''` | 模板字符串 | 不再需要 |

### 2.3 表头行

**改前：**
```tsx
<div className="flex px-5 pt-2.5 pb-2 text-[11px] ... sticky top-0 z-10">
  {COLUMNS.map(col => (
    <button className={`... ${col.width} ${isGroupStart ? GROUP_GAP : ''} ...`}>
```

**改后：**
```tsx
<div
  className="grid px-5 pt-2.5 pb-2 text-[11px] ... sticky top-0 z-10 gap-x-2"
  style={{ gridTemplateColumns: GRID_COLS }}
>
  {COLUMNS.map(col => (
    <button className="... flex items-center gap-1 ...">
```

### 2.4 分组色条

**改前：**
```tsx
<div className="flex px-5 pb-1 border-b border-gray-100 sticky top-[34px] z-10 bg-white">
  {COLUMNS.map(col => (
    <div key={`bar-${col.key}`} className={`${col.width} ${isGroupStart ? GROUP_GAP : ''}`}>
```

**改后：**
```tsx
<div
  className="grid px-5 pb-1 border-b border-gray-100 sticky top-[34px] z-10 bg-white gap-x-2"
  style={{ gridTemplateColumns: GRID_COLS }}
>
  {COLUMNS.map(col => (
    <div key={`bar-${col.key}`}>
```

### 2.5 数据行

**改前：**
```tsx
<div className="flex px-5 py-[12px] items-center ...">
  {COLUMNS.map(col => (
    <div className={`${col.width} ${isIdentity ? 'text-left' : 'text-center flex items-center justify-center'} ${isGroupStart ? GROUP_GAP : ''}`}>
```

**改后：**
```tsx
<div
  className="grid px-5 py-[12px] items-center ... gap-x-2"
  style={{ gridTemplateColumns: GRID_COLS }}
>
  {COLUMNS.map(col => (
    <div className={isIdentity ? 'text-left' : 'text-center flex items-center justify-center'}>
```

### 2.6 操作列

操作列仍硬编码在 `GRID_COLS` 模板末尾 `40px`（不参与 fr 分配），渲染时加 `flex items-center justify-center`。

### 2.7 groupStart 逻辑

`groupStart` 仍保留于列定义，仅影响分组色条渲染（`col.group !== 'identity' && col.groupStart` 时画色条）。`GROUP_GAP` 的间距效果由 Grid `gap-x-2` 统一承担，不再有分组左边距差异。

---

## 3. MiniTrendChart 自适应

当前 SVG viewBox 硬编码 `W = 90`。Grid 下趋势列宽度由 `fr` 决定，可能为 120-200px 不等。

**方案：** MiniTrendChart 不设固定宽高，改用 `w-full h-[32px]`，SVG 内部 `W` 动态读取容器 `clientWidth`（`useRef` + `useEffect` + `ResizeObserver`）。

**Props 不变**，仅内部渲染逻辑改为自适应。

---

## 4. 改动范围

| 文件 | 改动 | 要点 |
|------|------|------|
| `ProductMonitorTab.tsx` | ~40 行 | 新增 GRID_COLS、移除 ColumnDef.width/COLUMNS.width/GROUP_GAP/min-w-[1400px]、表头/色条/行改 grid |
| `MiniTrendChart.tsx` | ~15 行 | SVG 宽度自适应容器 |

---

## 5. 不改的部分

- 列定义 key/label/group/groupStart/dataBar
- 分组色条渲染逻辑
- 排序、renderCell、交互处理器
- 表头 sticky 逻辑
- 抽屉、API、数据层

---

## 6. 接受标准

- [ ] `COLUMNS` 数组不含任何 `w-[Npx]` 或固定宽度字符串
- [ ] 表格在 1920px 和 1280px 视口下均撑满可用宽度，无右侧死白
- [ ] 表头、色条、数据行列完全对齐
- [ ] 商品信息列描述 `line-clamp-2` 正常截断
- [ ] MiniTrendChart 在趋势列中自适应宽度
- [ ] 分组色条渲染正确
- [ ] 排序交互正常
- [ ] `npx tsc --noEmit` 零错误
