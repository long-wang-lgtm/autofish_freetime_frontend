# 抽屉布局与字体优化设计

> 日期：2026-06-21 | 状态：待审核 | 依赖：[drawer-readability-optimization-design](./2026-06-21-drawer-readability-optimization-design.md)

## 问题清单

| # | 严重度 | 问题 | 来源 | 解决方案 |
|---|--------|------|------|---------|
| 1 | P0 | 累计增长图三线同轴——浏览量级（百/千）远大于想要/收藏（十级），后两者被压扁不可读 | 用户 | 双Y轴：左轴浏览，右轴想要+收藏 |
| 2 | P0 | PC端侧边栏正文/数据文字普遍偏小（text-[9px]~text-[10px]），运营无法阅读 | 用户 | 全区域字体提一级：9→10, 10→11 |
| 3 | P0 | intent chart valueFormatter 签名错误——第二参数是 dataIndex(number) 误当 seriesName(string) 使用，格式化从不生效 | 用户 | 修正 valueFormatter 实现，无需依赖 seriesName |
| 4 | P1 | 上架天数显示小数（43.2143...天）且日期无时分秒 | 用户 | 天数取整，日期显示完整 datetime |
| 5 | P1 | 侧边栏 66.67vw 偏窄；纵向堆叠过长导致频繁滚动 | 用户 | 80vw + 2×2网格，核心指标+趋势图合并 |
| 6 | P2 | 买卖意愿图参考线全用 slate-400 同色，无法与指标对应 | 用户 | 参考线颜色与图例同色 |

---

## 1. 累计增长图双Y轴

### 1.1 现状

三条线（累计想要/浏览/收藏）共用单Y轴。浏览量的累计值（百～千级）远大于想要和收藏（十级），导致想要和收藏折线被压扁在图表底部，波动几乎不可见。

### 1.2 方案

```
左轴 (yAxisIndex: 0) → 累计浏览    （量级大，单独一轴）
右轴 (yAxisIndex: 1) → 累计想要 + 累计收藏  （量级相近，合用一轴）
```

**ECharts 配置变更：**

```typescript
yAxis: [
  {
    type: 'value',
    name: '累计浏览',
    min: 'dataMin',
    axisLabel: { fontSize: 10, color: '#059669', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { lineStyle: { color: '#f3f4f6' } },
  },
  {
    type: 'value',
    name: '累计想要·收藏',
    min: 'dataMin',
    axisLabel: { fontSize: 10, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { show: false },
  },
],
series: [
  { name: '累计浏览', type: 'line', yAxisIndex: 0, data: ht.cumulative_look, lineStyle: { color: '#059669', width: 1.5 } },
  { name: '累计想要', type: 'line', yAxisIndex: 1, data: ht.cumulative_want, lineStyle: { color: '#2563eb', width: 2 } },
  { name: '累计收藏', type: 'line', yAxisIndex: 1, data: ht.cumulative_collect, lineStyle: { color: '#d97706', width: 1.5 } },
]
```

- 左轴标签用翠绿色（与浏览线同色），运营一眼对应
- grid right 从 `16` 改为 `56`（右轴需要标签空间）
- 图例标注左右轴归属

### 1.3 HTML 图例更新

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

---

## 2. 全局字体放大

### 2.1 原则

Header 标题区（text-xs / text-sm）作为视觉锚点保持不变，其下方的正文/数据区统一提一级。

### 2.2 变更清单

| 区域 | 当前 | 改为 | 涉及 |
|------|------|------|------|
| 图表 HTML 图例标签 | `text-[9px]` | `text-[10px]` | CumulativeGrowthChart, IntentConversionChart, TrafficActionChart |
| 图表 X 轴标签 (ECharts) | `fontSize: 9` | `fontSize: 10` | 三个图表 |
| 模块小标题 | `text-[10px]` | `text-[11px]` | ProductDiagnosticDrawer（趋势诊断）, WindowCompareCards（核心指标）, StabilityPanel, AnomalyBanner（异常预警） |
| 矩阵表格全部文字 | `text-[10px]` | `text-[11px]` | WindowCompareCards（table className, th, td） |
| 矩阵表格规模参考/增长信号行 | `text-[10px]` | `text-[11px]` | WindowCompareCards |
| Hero Metric 细节/标签 | `text-[10px]` | `text-[11px]` | ProductDiagnosticDrawer |
| Header 元数据（GID/状态/优先级） | `text-xs` | **不变** | ProductDiagnosticDrawer |
| Header 关键词标签 | `text-[10px]` | `text-[11px]` | ProductDiagnosticDrawer |
| Header 上架天数/badge | `text-[10px]` | `text-[11px]` | ProductDiagnosticDrawer |
| Hero Metric 信号大字 | `text-sm` | **不变** | ProductDiagnosticDrawer |
| 异常预警卡片文字 | `text-xs` | **不变** | AnomalyBanner |
| 稳定性面板数据 | `text-[11px]` | **不变** | StabilityPanel |
| 基础数据面板 | `text-[11px]` | **不变** | GrowthPricePanel |
| 图表容器高度 | `h-40` | `h-48` | 三个图表 |

---

## 3. 宽度 + 2×2 网格布局

### 3.1 宽度

Sheet `width` 从 `"66.67vw"` 改为 `"80vw"`。

### 3.2 布局变更

**当前（纵向堆叠）：**

```
📊 核心指标（矩阵表格，全宽）
📈 累计增长图（全宽）
买卖意愿图（全宽）
流量转化匹配图（全宽）
```

**改为 2×2 网格：**

```
┌────────────────────────────┬────────────────────────────┐
│  📊 核心指标（矩阵表格）     │  📈 累计增长图              │
│  左半宽 ≈ 50%              │  右半宽 ≈ 50%，h-48        │
├────────────────────────────┼────────────────────────────┤
│  买卖意愿图                 │  流量转化匹配图              │
│  左半宽 ≈ 50%，h-48        │  右半宽 ≈ 50%，h-48        │
└────────────────────────────┴────────────────────────────┘
```

### 3.3 ProductDiagnosticDrawer.tsx 布局代码

移除独立的"趋势诊断"小标题（图表自带 HTML 标题已足够），将 Part 1 + Part 2 合并为一个 grid：

```tsx
{/* Part 1+2: 核心指标 + 趋势图（2×2 网格） */}
<div className="grid grid-cols-2 gap-3">
  {/* 左上：核心指标矩阵 */}
  <WindowCompareCards
    windowsMetrics={wm}
    d7DailyLook={product!.d7DailyLook}
    d7DailyWant={product!.d7DailyWant}
    d7BrowseGrowth={product!.d7BrowseGrowth}
    acceleration={acceleration}
    windowShare={windowShare}
    priceTrend={product!.priceTrend}
  />

  {/* 右上：累计增长图 */}
  <CumulativeGrowthChart hourlyTrend={ht} />

  {/* 左下：买卖意愿图 */}
  <IntentConversionChart hourlyTrend={ht} />

  {/* 右下：流量转化匹配图 */}
  <TrafficActionChart hourlyTrend={ht} />
</div>
```

### 3.4 图表高度

`h-40`（160px）→ `h-48`（192px）。4/5 屏宽下右半列约 40vw ≈ 600px+，高度提升到 192px 后图表比例协调。

### 3.5 矩阵表格适配

左半列宽约 40vw（≈600px @ 1920px 屏宽），矩阵表格 8 列。`text-[11px]` 字号下每列均宽约 70px，delta 列标签 "vs D1"/"vs D3" 仅 4 字符无需缩短，"D1→D7 总Δ" 列标签 9 字符可完整显示。表格保留 overflow-x-auto 兜底小屏。

### 3.6 移动端

移动端（BottomSheet）布局**不变**——保持纵向堆叠。2×2 网格仅在桌面端（`!isMobile`）生效。通过条件 className 实现：

```tsx
<div className={isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
```

---

## 4. 买卖意愿图参考线颜色

### 4.1 现状

三条参考线全部 `#94a3b8`（slate-400），label 也是 slate-400。运营无法快速将参考线与对应指标关联。

### 4.2 方案

参考线颜色与图例同色：

| 参考线 | 所属指标 | 图例色 | 新 lineStyle.color | 新 label.color |
|--------|---------|--------|-------------------|----------------|
| 询单率 10% | 询单率（蓝） | `#2563eb` | `#2563eb` | `#2563eb` |
| 询藏比 0.8 | 询藏比（青） | `#0d9488` | `#0d9488` | `#0d9488` |
| 询藏比 1.2 | 询藏比（青） | `#0d9488` | `#0d9488` | `#0d9488` |

**代码变更（IntentConversionChart.tsx）：**

询单率 series 的 markLine：
```typescript
markLine: {
  silent: true,
  symbol: 'none',
  lineStyle: { color: '#2563eb', type: 'dashed', width: 1 },
  data: [{ yAxis: 10, label: { formatter: '10%', fontSize: 10, color: '#2563eb' } }],
},
```

询藏比 series 的 markLine：
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

---

## 5. Bug 修复

### 5.1 valueFormatter 签名错误

**文件：** `IntentConversionChart.tsx`、`TrafficActionChart.tsx`

**根因：** ECharts `valueFormatter` 的真实签名为：
```typescript
valueFormatter?: (value: OptionDataValue | OptionDataValue[], dataIndex: number) => string;
```

第二参数是 `dataIndex: number`，不是 `seriesName: string`。当前代码：
```typescript
valueFormatter: (value: number | string, seriesName?: string) => {
  if (seriesName?.includes('率')) return `${v.toFixed(1)}%`
  if (seriesName?.includes('比')) return v.toFixed(2)
  ...
}
```

`seriesName` 实际收到的是一个数字（dataIndex），`?.includes()` 在 number 上始终返回 `undefined`，格式化分支永不触发，所有值都走默认 `toLocaleString('zh-CN')` 路径。

**修复方案：** `valueFormatter` 不提供 seriesName，改为在数据准备阶段对值做精度控制，`valueFormatter` 仅负责通用数字格式化。

**IntentConversionChart：**

```typescript
// 数据准备时保留精度
const collectRates = ht.hourly_collect_rate.map((v, i) => {
  if (ht.hourly_look_rate[i] <= 0) return null
  return +(v / ht.hourly_look_rate[i] * 100).toFixed(1)  // 百分比 1 位小数
})
const inquiryRates = ht.hourly_want_rate.map((v, i) => {
  if (ht.hourly_look_rate[i] <= 0) return null
  return +(v / ht.hourly_look_rate[i] * 100).toFixed(1)
})
const ifRatios = ht.hourly_want_rate.map((v, i) => {
  if (ht.hourly_collect_rate[i] <= 0) return null
  return +(v / ht.hourly_collect_rate[i]).toFixed(2)       // 比率 2 位小数
})

// valueFormatter 通用处理
valueFormatter: (value: unknown) => {
  const v = Number(value)
  if (Number.isNaN(v)) return String(value)
  return v.toLocaleString('zh-CN')
},
```

**TrafficActionChart 同理修正。**

### 5.2 上架天数精度 + 日期格式

**文件：** `ProductDiagnosticDrawer.tsx`

**现状：**
```tsx
上架 {product.daysSincePublish} 天（{product.publishedAt.split('T')[0]}）
```
输出示例：`上架 43.214382453703706 天（2026-05-09）`

**问题：**
- `daysSincePublish` 是浮点数，未取整
- 日期只显示日期部分，无时分秒

**修复：**
```tsx
{product.daysSincePublish != null && (
  <div className="text-[11px] text-gray-600">
    上架 {Math.round(product.daysSincePublish)} 天
    {product.publishedAt && `（${new Date(product.publishedAt).toLocaleString('zh-CN')}）`}
  </div>
)}
```

输出示例：`上架 43 天（2026/5/9 14:23:05）`
- `Math.round()` 取整数天数
- `toLocaleString('zh-CN')` 输出 `YYYY/M/D HH:mm:ss` 中文格式

---

## 6. 改动文件汇总

| 文件 | 改动要点 | 行数估算 |
|------|---------|---------|
| `ProductDiagnosticDrawer.tsx` | width 80vw, 2×2网格替代纵向堆叠, 移动端条件布局, 字体批量 text-[10px]→text-[11px], 上架天数 Math.round + datetime, "趋势诊断"小标题移除 | +30 / -20 |
| `CumulativeGrowthChart.tsx` | 双Y轴（左浏览右想要+收藏）, 图例标注轴归属, grid right 16→56, h-40→h-48, X轴 fontSize 9→10, 图例 text-[9px]→text-[10px] | +25 / -15 |
| `IntentConversionChart.tsx` | valueFormatter 修正（数据层精度控制+通用格式化）, 参考线颜色改为图例同色（蓝/青）, h-40→h-48, X轴 fontSize 9→10, 图例 text-[9px]→text-[10px] | +20 / -15 |
| `TrafficActionChart.tsx` | valueFormatter 修正, h-40→h-48, X轴 fontSize 9→10, 图例 text-[9px]→text-[10px] | +10 / -10 |
| `WindowCompareCards.tsx` | 表格 text-[10px]→text-[11px]（table/thead/tbody/th/td）, 规模参考行 text-[10px]→text-[11px], 小标题 text-[10px]→text-[11px] | +5 / -5 |
| `StabilityPanel.tsx` | 小标题 text-[10px]→text-[11px] | +1 / -1 |
| `AnomalyBanner.tsx` | 小标题 text-[10px]→text-[11px] | +1 / -1 |
| `GrowthPricePanel.tsx` | 子区域小标题 text-[10px]→text-[11px] | +3 / -3 |

---

## 7. 改动原则

- 不修改数据结构，不改 API 层
- 移动端布局保持纵向堆叠不变
- 颜色体系沿用 §6 色系统一规范
- 已有 `useIsMobile()` hook 复用
