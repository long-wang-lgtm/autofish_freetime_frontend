# 抽屉字体颜色统一 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除全部硬编码字号、全局字体≥12px、灰色加深一档、ECharts对齐、矩阵矩阵扩行去趋势列、采集质量移到Header、基础数据默认展开。

**Architecture:** 9 个文件，6 个 Task。不修改数据结构和 API 层。字体/颜色变更通过全局替换完成，结构性变更集中在前两个 Task。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + ECharts

---

### Task 1: 矩阵表格重构（扩行 + 去趋势列 + 去规模参考 + 字体颜色）

**Files:**
- Modify: `components/selection/product/WindowCompareCards.tsx`

- [ ] **Step 1: 新增 fmtDeltaInt 和日均计算**

在现有工具函数后插入：

```typescript
function fmtDeltaInt(d: number | null): string {
  if (d == null) return '-'
  const sign = d > 0 ? '+' : ''
  return `${sign}${Math.round(d)}`
}
```

- [ ] **Step 2: 计算浏览日均和想要日均**

在 delta 计算代码块后添加：

```typescript
const d1DailyLook = d1.total_dlook != null ? Math.round(d1.total_dlook / 1) : null
const d3DailyLook = d3.total_dlook != null ? Math.round(d3.total_dlook / 3) : null
const d7DailyLook = d7.total_dlook != null ? Math.round(d7.total_dlook / 7) : null
const d3DailyLookDelta = d3DailyLook != null && d1DailyLook != null ? d3DailyLook - d1DailyLook : null
const d7DailyLookDelta = d7DailyLook != null && d3DailyLook != null ? d7DailyLook - d3DailyLook : null
const totalDailyLookDelta = d7DailyLook != null && d1DailyLook != null ? d7DailyLook - d1DailyLook : null

const d1DailyWant = d1.total_dwant != null ? Math.round(d1.total_dwant / 1) : null
const d3DailyWant = d3.total_dwant != null ? Math.round(d3.total_dwant / 3) : null
const d7DailyWant = d7.total_dwant != null ? Math.round(d7.total_dwant / 7) : null
const d3DailyWantDelta = d3DailyWant != null && d1DailyWant != null ? d3DailyWant - d1DailyWant : null
const d7DailyWantDelta = d7DailyWant != null && d3DailyWant != null ? d7DailyWant - d3DailyWant : null
const totalDailyWantDelta = d7DailyWant != null && d1DailyWant != null ? d7DailyWant - d1DailyWant : null
```

- [ ] **Step 3: 删除趋势相关代码**

删除以下内容：
- `import { judgeThreeWindowTrend } from ...` 导入行
- `import { Info } from 'lucide-react'` 导入行
- `inquiryTrend` / `favoriteTrend` / `ifTrend` 三个 `judgeThreeWindowTrend` 调用
- `allSampleEnough` 变量
- `trendColor` 函数

- [ ] **Step 4: 删除 props 接口中的 d7DailyLook / d7DailyWant**

```typescript
interface WindowCompareCardsProps {
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO }
  d7BrowseGrowth: number | null
  acceleration: number | null
  windowShare: number | null
  priceTrend: string | null
}
```

- [ ] **Step 5: 删除表头 `<th>趋势</th>`，将 table className 改为 text-xs**

表头从：
```tsx
<th className="text-center py-1.5 px-1 text-gray-600">趋势</th>
```
删除此行。同时将 `<table className="w-full text-[11px]">` 改为 `<table className="w-full text-xs">`。

- [ ] **Step 6: 删除三行数据中的趋势 `<td>`，并新增浏览日均+想要日均两行**

删除每个 `<tr>` 末尾的趋势 `<td>...</td>`。然后在 `</tbody>` 前添加两行：

```tsx
{/* 浏览日均 row */}
<tr>
  <td className="py-2 px-1 text-gray-700">浏览日均</td>
  <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d1DailyLook ?? '-'}</td>
  <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d3DailyLook ?? '-'}</td>
  <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3DailyLookDelta)}`}>
    {fmtDeltaInt(d3DailyLookDelta)} {deltaArrow(d3DailyLookDelta)}
  </td>
  <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d7DailyLook ?? '-'}</td>
  <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7DailyLookDelta)}`}>
    {fmtDeltaInt(d7DailyLookDelta)} {deltaArrow(d7DailyLookDelta)}
  </td>
  <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalDailyLookDelta)}`}>
    {fmtDeltaInt(totalDailyLookDelta)} {deltaArrow(totalDailyLookDelta)}
  </td>
</tr>

{/* 想要日均 row */}
<tr>
  <td className="py-2 px-1 text-gray-700">想要日均</td>
  <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d1DailyWant ?? '-'}</td>
  <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d3DailyWant ?? '-'}</td>
  <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3DailyWantDelta)}`}>
    {fmtDeltaInt(d3DailyWantDelta)} {deltaArrow(d3DailyWantDelta)}
  </td>
  <td className="py-2 px-2 text-center tabular-nums font-medium text-gray-900">{d7DailyWant ?? '-'}</td>
  <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7DailyWantDelta)}`}>
    {fmtDeltaInt(d7DailyWantDelta)} {deltaArrow(d7DailyWantDelta)}
  </td>
  <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalDailyWantDelta)}`}>
    {fmtDeltaInt(totalDailyWantDelta)} {deltaArrow(totalDailyWantDelta)}
  </td>
</tr>
```

同时将询藏比行 `Info` icon 的 tooltip td 改为普通 td（删除 `flex items-center gap-1` 和 `<Info>`）。

- [ ] **Step 7: 删除底栏"规模参考"段**

删除底栏 flex-wrap div 中的"规模参考" span（原第232-236行），以及 `|` 分隔符。

- [ ] **Step 8: 字体颜色统一**

- 小标题：`text-[11px]` → `text-xs`、`text-gray-600` → `text-gray-700`
- 表头 th：`text-gray-600` → `text-gray-700`、`text-gray-500`（vs D1/vs D3）→ `text-gray-600`
- 数据 td：`text-gray-800` → `text-gray-900`
- 标签 td：`text-gray-600` → `text-gray-700`
- 底栏文字：`text-[11px]` → `text-xs`、`text-gray-600` → `text-gray-700`
- null 占位：`text-gray-400` → `text-gray-500`
- 分隔符：`text-gray-300` → `text-gray-400`

- [ ] **Step 9: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/WindowCompareCards.tsx
git commit -m "refactor: matrix table — add daily browse/want rows, remove trend col, remove scale ref

- Add 浏览日均 + 想要日均 rows (total/window_days)
- Remove trend column (always '数据积累中' due to fetch_count < 12)
- Remove scale reference from bottom bar (duplicate with D7 matrix)
- Remove d7DailyLook/d7DailyWant props
- Add fmtDeltaInt for integer delta formatting
- Font+color unification: text-xs, gray-900/700/600"
```

---

### Task 2: 抽屉容器更新（Header 采集质量 + 移除 props + 字体颜色）

**Files:**
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: Header 元数据行追加采集质量**

在第60行 `{' · '}` 之后插入：

```tsx
            {' · '}
            采集:{' '}
            {wm?.d7 != null ? (
              <>
                {wm.d7.quality_label === 'reliable' ? '可靠' :
                 wm.d7.quality_label === 'limited' ? '有限' :
                 wm.d7.quality_label === 'insufficient' ? '不足' : '-'}
                ({wm.d7.fetch_count ?? '-'}次)
              </>
            ) : '-'}
```

- [ ] **Step 2: 删除独立的 insufficient badge**

删除第77-81行的整个块：
```tsx
{wm?.d7?.quality_label === 'insufficient' && (
  <span className="text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5">
    数据有限（{wm.d7.fetch_count}次采集）
  </span>
)}
```

- [ ] **Step 3: 移除 WindowCompareCards 的 d7DailyLook / d7DailyWant props**

将调用从：
```tsx
<WindowCompareCards
  windowsMetrics={wm}
  d7DailyLook={product!.d7DailyLook}
  d7DailyWant={product!.d7DailyWant}
  d7BrowseGrowth={product!.d7BrowseGrowth}
  acceleration={acceleration}
  windowShare={windowShare}
  priceTrend={product!.priceTrend}
/>
```
改为：
```tsx
<WindowCompareCards
  windowsMetrics={wm}
  d7BrowseGrowth={product!.d7BrowseGrowth}
  acceleration={acceleration}
  windowShare={windowShare}
  priceTrend={product!.priceTrend}
/>
```

- [ ] **Step 4: 字体颜色统一（批量替换）**

- `text-[11px]` → `text-xs`（全部替换）
- `text-gray-600`（标签/badge/Hero Metric细节）→ `text-gray-700`
  - 但不改 Header 元数据行（`text-xs text-gray-600 font-mono`，保留 gray-600）

- [ ] **Step 5: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "feat: move collection quality to Header, remove scale props, font+color unification

- Header: add '采集: 可靠(21次)' after priority
- Remove standalone insufficient data badge (now in Header line)
- Remove d7DailyLook/d7DailyWant props from WindowCompareCards call
- Font: text-[11px]→text-xs; Color: gray-600→gray-700 (labels/badges)"
```

---

### Task 3: 三图表统一（ECharts fontSize + 字体 + 颜色 + grid）

**Files:**
- Modify: `components/selection/product/CumulativeGrowthChart.tsx`
- Modify: `components/selection/product/IntentConversionChart.tsx`
- Modify: `components/selection/product/TrafficActionChart.tsx`

- [ ] **Step 1: CumulativeGrowthChart — ECharts 配置**

- `grid: { ... bottom: 28 }` → `grid: { ... bottom: 32 }`
- X轴 `fontSize: 10` → `fontSize: 12`
- Y轴 `axisLabel.color: '#9ca3af'` → `'#6b7280'`
- Y轴 `nameTextStyle.color: '#9ca3af'` / `'#6b7280'` → 统一 `'#6b7280'`
- Y轴 `axisLabel.fontSize: 10` → `fontSize: 12`
- HTML legend `<span>` 的 `text-[10px]` → `text-xs`

- [ ] **Step 2: IntentConversionChart — ECharts 配置**

- `grid: { ... bottom: 28 }` → `grid: { ... bottom: 32 }`
- X轴 `fontSize: 10` → `fontSize: 12`
- Y轴 `axisLabel.color: '#6b7280'` → 不变（已是 gray-500）
- markLine label `fontSize: 10` → `fontSize: 12`
- HTML legend `<span>` 的 `text-[10px]` → `text-xs`

- [ ] **Step 3: TrafficActionChart — ECharts 配置 + nameTextStyle**

- `grid: { ... bottom: 28 }` → `grid: { ... bottom: 32 }`
- X轴 `fontSize: 10` → `fontSize: 12`
- Y轴 `axisLabel.color: '#9ca3af'` → `'#6b7280'`
- Y轴 `axisLabel.fontSize: 10` → `fontSize: 12`
- 两个 Y轴各添加 `nameTextStyle: { fontSize: 12, color: '#6b7280' }`
- HTML legend `<span>` 的 `text-[10px]` → `text-xs`

- [ ] **Step 4: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/CumulativeGrowthChart.tsx components/selection/product/IntentConversionChart.tsx components/selection/product/TrafficActionChart.tsx
git commit -m "fix: chart font+color unification — ECharts fontSize:12, text-xs, gray-500 axis

- X-axis fontSize 10→12, axisLabel color #9ca3af→#6b7280
- Y-axis fontSize 10→12, nameTextStyle color unified #6b7280
- grid.bottom 28→32 for larger axis labels
- TrafficActionChart: add nameTextStyle to Y axes
- HTML legend: text-[10px]→text-xs
- markLine labels: fontSize 10→12"
```

---

### Task 4: 稳定性面板 + 异常预警（字体颜色统一）

**Files:**
- Modify: `components/selection/product/StabilityPanel.tsx`
- Modify: `components/selection/product/AnomalyBanner.tsx`

- [ ] **Step 1: StabilityPanel.tsx**

- 小标题：`text-[11px]` → `text-xs`、`text-gray-600` → `text-gray-700`
- 容器内 `text-[11px]` → `text-xs`
- 数值 `text-gray-800` → `text-gray-900`
- 标签 `text-gray-600` → `text-gray-700`
- 底部注释 `text-[11px]` → `text-xs`、`text-gray-500` → `text-gray-600`

- [ ] **Step 2: AnomalyBanner.tsx**

- 小标题：`text-[11px]` → `text-xs`、`text-gray-600` → `text-gray-700`

- [ ] **Step 3: 提交**

```bash
npx tsc --noEmit
git add components/selection/product/StabilityPanel.tsx components/selection/product/AnomalyBanner.tsx
git commit -m "fix: Stability+Anomaly font+color unification — text-xs, gray-900/700/600"
```

---

### Task 5: 基础数据面板（默认展开 + 删除采集质量 + 字体颜色）

**Files:**
- Modify: `components/selection/product/GrowthPricePanel.tsx`

- [ ] **Step 1: 默认展开**

```typescript
// Line 29: useState(false) → useState(true)
const [open, setOpen] = useState(true)
```

- [ ] **Step 2: 删除采集质量区块**

删除 `📊 采集质量` 整个 div（含 `border-t border-gray-100 pt-2` 容器，质量标签行，采集次数行）。

- [ ] **Step 3: 字体颜色统一**

- 子区域小标题：`text-[11px]` → `text-xs`、`text-gray-600` → `text-gray-700`
- Row 组件 value 默认：`text-gray-800` → `text-gray-900`
- Row 组件 label：`text-gray-600` → `text-gray-700`
- toggle 按钮 `text-xs` → 不变，`text-gray-600` → `text-gray-700`

- [ ] **Step 4: 提交**

```bash
npx tsc --noEmit
git add components/selection/product/GrowthPricePanel.tsx
git commit -m "fix: GrowthPricePanel default open, remove collection quality, font+color unified

- useState(true) — basic data expanded by default
- Remove collection quality block (moved to Header)
- Font: text-[11px]→text-xs; Color: gray-800→gray-900, gray-600→gray-700"
```

---

### Task 6: 死代码清理

**Files:**
- Modify: `components/selection/product/hourlyTrendUtils.ts`

- [ ] **Step 1: 删除 judgeThreeWindowTrend**

删除 `judgeThreeWindowTrend` 函数定义（完整块，含注释和函数体，约15行）。

- [ ] **Step 2: 提交**

```bash
npx tsc --noEmit
git add components/selection/product/hourlyTrendUtils.ts
git commit -m "chore: remove unused judgeThreeWindowTrend (replaced by matrix daily avg rows)"
```

---

### 完成检查清单

- [ ] 全抽屉零 `text-[10px]` 和 `text-[11px]` 硬编码 ✅
- [ ] 全抽屉最小字号 12px ✅
- [ ] 三个图表 ECharts fontSize:12, grid.bottom:32 ✅
- [ ] 数据值 gray-900, 标签 gray-700, 图表轴 gray-500 ✅
- [ ] 矩阵表格 5 行（询单率/收藏率/询藏比/浏览日均/想要日均）× 7 列（去趋势）✅
- [ ] 底栏仅保留增速/升温/窗口占比/价格（去规模参考）✅
- [ ] Header 元数据行追加采集质量 ✅
- [ ] 基础数据默认展开 ✅
- [ ] GrowthPricePanel 无采集质量区块 ✅
- [ ] ProductDiagnosticDrawer 无 insufficient 独立 badge ✅
- [ ] d7DailyLook / d7DailyWant props 已从 WindowCompareCards 移除 ✅
- [ ] judgeThreeWindowTrend 死代码已删除 ✅
- [ ] 全项目 tsc --noEmit 零错误 ✅
