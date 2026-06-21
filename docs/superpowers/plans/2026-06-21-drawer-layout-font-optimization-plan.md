# 抽屉布局与字体优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 累计增长图双Y轴、PC端全局字体放大、抽屉80vw+2×2网格布局、参考线着色、valueFormatter/上架天数bug修复。

**Architecture:** 8个文件，不修改数据结构和API层。按图表→容器→附属组件顺序分5个Task，每Task独立可提交。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + ECharts

---

### Task 1: 累计增长图双Y轴 + 字体 + valueFormatter 修正

**Files:**
- Modify: `components/selection/product/CumulativeGrowthChart.tsx`

- [ ] **Step 1: 将 yAxis 从单轴改为双轴数组**

Read the file, locate the `yAxis` config (当前为单对象)，替换为：

```typescript
yAxis: [
  {
    type: 'value',
    name: '累计浏览',
    min: 'dataMin',
    nameTextStyle: { fontSize: 10, color: '#059669' },
    axisLabel: { fontSize: 10, color: '#059669', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { lineStyle: { color: '#f3f4f6' } },
  },
  {
    type: 'value',
    name: '累计想要·收藏',
    min: 'dataMin',
    nameTextStyle: { fontSize: 10, color: '#6b7280' },
    axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { show: false },
  },
],
```

- [ ] **Step 2: 为 series 添加 yAxisIndex**

将三条 series 改为：

```typescript
series: [
  { name: '累计浏览', type: 'line', yAxisIndex: 0, data: ht.cumulative_look, smooth: true, symbol: 'none', lineStyle: { color: '#059669', width: 1.5 } },
  { name: '累计想要', type: 'line', yAxisIndex: 1, data: ht.cumulative_want, smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 } },
  { name: '累计收藏', type: 'line', yAxisIndex: 1, data: ht.cumulative_collect, smooth: true, symbol: 'none', lineStyle: { color: '#d97706', width: 1.5 } },
],
```

- [ ] **Step 3: 修正 grid.right 和 tooltip valueFormatter**

grid.right: `16` → `56`，为右轴标签留空间。

valueFormatter 修正（去掉无效的 seriesName 依赖）：

```typescript
grid: { left: 48, right: 56, top: 20, bottom: 28 },
tooltip: {
  trigger: 'axis',
  valueFormatter: (value: unknown) => {
    const v = Number(value)
    if (Number.isNaN(v)) return String(value)
    return v.toLocaleString('zh-CN')
  },
},
```

- [ ] **Step 4: h-40→h-48，空态占位同步**

容器 div：`className="w-full h-48"`
空态占位：`h-40` → `h-48`

- [ ] **Step 5: X 轴 fontSize 9→10，图例 text-[9px]→text-[10px]，图例标注轴归属**

X 轴：`axisLabel: { fontSize: 10, ... }`（当前 fontSize: 9）
HTML 图例 text-[9px]→text-[10px]，并添加左右轴标注：

```tsx
<span className="flex gap-3 text-[10px] text-gray-600 flex-wrap mt-0.5">
  <span className="inline-flex items-center gap-1">
    <span className="w-2 h-0.5 bg-emerald-600 inline-block rounded" />累计浏览（左轴）
  </span>
  <span className="inline-flex items-center gap-1">
    <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />累计想要（右轴）
  </span>
  <span className="inline-flex items-center gap-1">
    <span className="w-2 h-0.5 bg-amber-600 inline-block rounded" />累计收藏（右轴）
  </span>
</span>
```

- [ ] **Step 6: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/CumulativeGrowthChart.tsx
git commit -m "feat: dual Y-axis for cumulative chart (left browse, right want+collect)

- Left axis: browse (#059669), Right axis: want (#2563eb) + collect (#d97706)
- grid.right 16→56 for right axis labels
- Fix valueFormatter: remove invalid seriesName param
- h-40→h-48 (container + empty state)
- X-axis fontSize 9→10, legend text-[9px]→text-[10px]
- Legend annotated with axis assignment"
```

---

### Task 2: 买卖意愿图参考线着色 + 字体 + valueFormatter 修正

**Files:**
- Modify: `components/selection/product/IntentConversionChart.tsx`

- [ ] **Step 1: 数据准备层精度控制 + valueFormatter 修正**

将数据计算改为精度控制版本（百分比 1 位小数，比率 2 位小数）：

```typescript
const collectRates = ht.hourly_collect_rate.map((v, i) => {
  if (ht.hourly_look_rate[i] <= 0) return null
  return +(v / ht.hourly_look_rate[i] * 100).toFixed(1)
})
const inquiryRates = ht.hourly_want_rate.map((v, i) => {
  if (ht.hourly_look_rate[i] <= 0) return null
  return +(v / ht.hourly_look_rate[i] * 100).toFixed(1)
})
const ifRatios = ht.hourly_want_rate.map((v, i) => {
  if (ht.hourly_collect_rate[i] <= 0) return null
  return +(v / ht.hourly_collect_rate[i]).toFixed(2)
})
```

相应地，series data 简化为直接使用（不再需要 `v * 100` 转换）：
```typescript
data: inquiryRates,   // 已是百分比数值，无需 .map(v => v * 100)
data: collectRates,   // 同上
data: ifRatios,       // 已是 toFixed(2) 精度
```

valueFormatter 简化为通用数字格式化：
```typescript
tooltip: {
  trigger: 'axis',
  valueFormatter: (value: unknown) => {
    const v = Number(value)
    if (Number.isNaN(v)) return String(value)
    return v.toLocaleString('zh-CN')
  },
},
```

- [ ] **Step 2: 参考线颜色改为与图例同色**

询单率 markLine（`#94a3b8` → `#2563eb`）：
```typescript
markLine: {
  silent: true,
  symbol: 'none',
  lineStyle: { color: '#2563eb', type: 'dashed', width: 1 },
  data: [{ yAxis: 10, label: { formatter: '10%', fontSize: 10, color: '#2563eb' } }],
},
```

询藏比 markLine（`#94a3b8` → `#0d9488`）：
```typescript
markLine: {
  silent: true,
  symbol: 'none',
  lineStyle: { color: '#0d9488', type: 'dashed', width: 1 },
  data: [
    { yAxis: 0.8, label: { formatter: '0.8', fontSize: 10, color: '#0d9488' } },
    { yAxis: 1.2, label: { formatter: '1.2', fontSize: 10, color: '#0d9488' } },
  ],
},
```

- [ ] **Step 3: h-40→h-48，空态占位同步**

容器 div：`h-40` → `h-48`
空态占位：`h-40` → `h-48`

- [ ] **Step 4: X 轴 fontSize 9→10，图例 text-[9px]→text-[10px]**

X 轴：`axisLabel: { fontSize: 10, ... }`
HTML 图例：`text-[9px]` → `text-[10px]`

- [ ] **Step 5: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/IntentConversionChart.tsx
git commit -m "fix: intent chart reference line colors match legend, valueFormatter fix, font upgrade

- markLine: 询单率10% #2563eb, 询藏比0.8/1.2 #0d9488 (was #94a3b8)
- Fix valueFormatter: data-layer precision control (.toFixed) instead of seriesName
- h-40→h-48 (container + empty state)
- X-axis fontSize 9→10, legend text-[9px]→text-[10px]"
```

---

### Task 3: 流量转化图字体 + 高度 + valueFormatter 修正

**Files:**
- Modify: `components/selection/product/TrafficActionChart.tsx`

- [ ] **Step 1: valueFormatter 修正**

去掉无效的 seriesName 依赖，改为通用格式化：

```typescript
tooltip: {
  trigger: 'axis',
  valueFormatter: (value: unknown) => {
    const v = Number(value)
    if (Number.isNaN(v)) return String(value)
    if (typeof v === 'number' && !Number.isInteger(v)) return v.toFixed(1)
    return v.toLocaleString('zh-CN')
  },
},
```

（注：流量图的数据值均为整数——浏览量、想要数、收藏数，`toLocaleString` 即满足需求；保留 `!Number.isInteger` 分支防御未来变化。）

- [ ] **Step 2: h-40→h-48，空态占位同步**

容器 div：`h-40` → `h-48`
空态占位：`h-40` → `h-48`

- [ ] **Step 3: X 轴 fontSize 9→10，图例 text-[9px]→text-[10px]**

X 轴：`axisLabel: { fontSize: 10, ... }`
HTML 图例：`text-[9px]` → `text-[10px]`

- [ ] **Step 4: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/TrafficActionChart.tsx
git commit -m "fix: traffic chart valueFormatter fix, height+font upgrade

- Fix valueFormatter: remove invalid seriesName param
- h-40→h-48 (container + empty state)
- X-axis fontSize 9→10, legend text-[9px]→text-[10px]"
```

---

### Task 4: 抽屉布局重组 + 宽度 + 字体 + 上架天数修复

**Files:**
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: Sheet 宽度 66.67vw → 80vw**

```tsx
// Line ~197
width="80vw"
```

- [ ] **Step 2: 上架天数 Math.round + toLocaleString**

找到 `product.daysSincePublish` 行（当前约 line 71-75），替换为：

```tsx
{product.daysSincePublish != null && (
  <div className="text-[11px] text-gray-600">
    上架 {Math.round(product.daysSincePublish)} 天
    {product.publishedAt && `（${new Date(product.publishedAt).toLocaleString('zh-CN')}）`}
  </div>
)}
```

- [ ] **Step 3: Header 区域字体批量升级**

关键词标签（`text-[10px]` → `text-[11px]`）：
```tsx
<span key={kw} className="text-[11px] text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
```

数据不足 badge（`text-[10px]` → `text-[11px]`）：
```tsx
<span className="text-[11px] text-gray-600 bg-gray-100 rounded px-2 py-0.5">
```

已暂停/已分析/已发布 badge（`text-[10px]` → `text-[11px]`）：
```tsx
<span className="inline-block text-[11px] font-medium text-red-600 bg-red-50 rounded px-2 py-0.5">
```

- [ ] **Step 4: Hero Metric 细节文字字体升级**

Hero Metric 内所有 `text-[10px]` → `text-[11px]`（触发信号标签、D1/D7 询单率文字、"各指标在正常范围内"）。

- [ ] **Step 5: 2×2 网格布局 + 移除"趋势诊断"小标题和分隔线**

将当前 Part 1（WindowCompareCards）+ Part 2（趋势诊断三图）的代码从纵向堆叠改为条件布局：

```tsx
{/* Part 1+2: 核心指标 + 趋势图 */}
<div className={isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
  <WindowCompareCards
    windowsMetrics={wm}
    d7DailyLook={product!.d7DailyLook}
    d7DailyWant={product!.d7DailyWant}
    d7BrowseGrowth={product!.d7BrowseGrowth}
    acceleration={acceleration}
    windowShare={windowShare}
    priceTrend={product!.priceTrend}
  />

  <CumulativeGrowthChart hourlyTrend={ht} />

  <IntentConversionChart hourlyTrend={ht} />

  <TrafficActionChart hourlyTrend={ht} />
</div>
```

同时删除以下三行：
- `<div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">趋势诊断</div>`（小标题）
- Part 1 和 Part 2 之间的 `<hr className="border-gray-100 my-3" />`

- [ ] **Step 6: 确保移动端 isMobile 变量可在 content 闭包内访问**

`isMobile` 已在组件函数体顶部定义（line 23），`content` 闭包可直接引用。确认无需额外改动。

- [ ] **Step 7: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "feat: 80vw width, 2×2 grid layout, font upgrade, daysSincePublish fix

- Sheet width 66.67vw→80vw
- Desktop: 2×2 grid (matrix+cumulative, intent+traffic)
- Mobile: vertical stack preserved via isMobile conditional
- Remove '趋势诊断' subtitle and corresponding hr divider
- Header keyword/badge text-[10px]→text-[11px]
- Hero Metric detail text-[10px]→text-[11px]
- Fix daysSincePublish: Math.round() + toLocaleString('zh-CN') datetime"
```

---

### Task 5: 剩余组件字体批量升级

**Files:**
- Modify: `components/selection/product/WindowCompareCards.tsx`
- Modify: `components/selection/product/StabilityPanel.tsx`
- Modify: `components/selection/product/AnomalyBanner.tsx`
- Modify: `components/selection/product/GrowthPricePanel.tsx`

- [ ] **Step 1: WindowCompareCards — 全表 text-[10px]→text-[11px]**

三处改动：
- 小标题：`text-[10px]` → `text-[11px]`（"📊 核心指标"）
- 表格 className：`text-[10px]` → `text-[11px]`（table 元素）
- 规模参考/增长信号行：`text-[10px]` → `text-[11px]`

- [ ] **Step 2: StabilityPanel — 小标题 + 底部注释 text-[10px]→text-[11px]**

两处改动：
- 小标题：`text-[10px]` → `text-[11px]`（"📐 稳定性诊断"）
- 底部注释：`text-[10px]` → `text-[11px]`（"基于窗口内 N 个数据点 · 未排除昼夜周期效应"）

- [ ] **Step 3: AnomalyBanner — 小标题 text-[10px]→text-[11px]**

一处改动：
- 小标题：`text-[10px]` → `text-[11px]`（"异常预警"）

- [ ] **Step 4: GrowthPricePanel — 子区域小标题 text-[10px]→text-[11px]**

三处改动（💰商业表现、📈流量周期、📊采集质量）：
```tsx
// 每处从 text-[10px] 改为 text-[11px]
<div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
```

- [ ] **Step 5: TypeScript 检查并提交**

```bash
npx tsc --noEmit
git add components/selection/product/WindowCompareCards.tsx components/selection/product/StabilityPanel.tsx components/selection/product/AnomalyBanner.tsx components/selection/product/GrowthPricePanel.tsx
git commit -m "fix: font upgrade text-[10px]→text-[11px] across 4 remaining components

- WindowCompareCards: title + table + scale reference row
- StabilityPanel: title + footer note
- AnomalyBanner: section title
- GrowthPricePanel: 3 zone subtitles"
```

---

### 完成检查清单

- [ ] CumulativeGrowthChart: 双Y轴左浏览右想要+收藏，grid.right 56 ✅
- [ ] CumulativeGrowthChart: valueFormatter 修正，X轴 fontSize 10，图例 text-[10px] ✅
- [ ] CumulativeGrowthChart: h-48 容器+空态 ✅
- [ ] IntentConversionChart: 参考线 #2563eb / #0d9488 ✅
- [ ] IntentConversionChart: 数据层精度控制 + valueFormatter 修正 ✅
- [ ] IntentConversionChart: h-48 容器+空态，X轴 fontSize 10，图例 text-[10px] ✅
- [ ] TrafficActionChart: valueFormatter 修正 ✅
- [ ] TrafficActionChart: h-48 容器+空态，X轴 fontSize 10，图例 text-[10px] ✅
- [ ] ProductDiagnosticDrawer: width 80vw ✅
- [ ] ProductDiagnosticDrawer: 2×2 grid（桌面端）+ 移动端保留堆叠 ✅
- [ ] ProductDiagnosticDrawer: 移除"趋势诊断"小标题和 hr 分隔线 ✅
- [ ] ProductDiagnosticDrawer: 字体批量升级（Header/Hero Metric）✅
- [ ] ProductDiagnosticDrawer: daysSincePublish Math.round + toLocaleString ✅
- [ ] WindowCompareCards + StabilityPanel + AnomalyBanner + GrowthPricePanel: 字体升级 ✅
- [ ] 全项目 tsc --noEmit 零错误 ✅
