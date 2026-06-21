# 抽屉字体颜色统一设计

> 日期：2026-06-21 | 状态：待审核 | 依赖：[drawer-layout-font-optimization-design](./2026-06-21-drawer-layout-font-optimization-design.md)

## 问题清单

| # | 问题 | 解决方案 |
|---|------|---------|
| 1 | 自定义字号 text-[10px]/text-[11px] 偏小 + 硬编码缺乏管理 | 全部升级为 Tailwind 标准 token：text-xs(12px) / text-sm(14px) |
| 2 | ECharts X轴 fontSize:10 与外部不对齐 | fontSize:10 → 12 |
| 3 | 灰色偏浅（gray-600 大面积使用），长时间阅读疲劳 | 数据值 gray-800→gray-900，标签 gray-600→gray-700，图表轴色 #9ca3af→#6b7280 |
| 4 | 基础数据区默认折叠，运营每次都要点开 | useState(false) → useState(true) |
| 5 | 采集质量信息埋在折叠区底部，不方便快速参考 | 从 GrowthPricePanel 移至 Header 区域 |

---

## 1. 字号统一

### 原则

- 消除所有 `text-[Npx]` 硬编码，只用 Tailwind 标准 token
- 全抽屉最小字号 ≥ 12px
- 层级靠粗细/颜色区分，不靠字号差异

### 映射表

| 当前硬编码 | → 新 token | 实际大小 | 应用范围 |
|-----------|-----------|---------|---------|
| `text-[10px]` | `text-xs` | 12px | 图表 HTML legend 标签、图表 HTML 标题 |
| `text-[11px]` | `text-xs` | 12px | 模块小标题、矩阵表格、Header badges、Hero Metric 细节、稳定性面板、基础数据面板、规模参考/增长信号行 |
| `fontSize: 9` | — | （已在上次改为 10，本次继续） | — |
| `fontSize: 10` (ECharts X轴) | `fontSize: 12` | 12px | 三图表 X 轴标签 |
| `fontSize: 10` (ECharts 轴名/标签) | `fontSize: 12` | 12px | Y轴名、Y轴标签、markLine label |
| markLine label `fontSize: 10` | `fontSize: 12` | 12px | 参考线标签 |

### 不变的部分（已达 ≥12px）

| 元素 | 当前 token | 实际大小 |
|------|-----------|---------|
| Header GID/状态/优先级 | `text-xs` | 12px |
| 异常预警卡片正文 | `text-xs` | 12px |
| Hero Metric 信号文字 | `text-sm` | 14px |
| 占位提示文字 | `text-sm` | 14px |
| GrowthPricePanel toggle 按钮 | `text-xs` | 12px |

### 层级语义

```
text-sm (14px) + font-semibold  → 模块标题、Hero Metric 信号
text-xs (12px) + font-semibold  → 数据值、重要标签
text-xs (12px) + font-medium    → 字段名
text-xs (12px)                  → 辅助文字、legend、badge
```

### 涉及文件

`ProductDiagnosticDrawer.tsx`、`WindowCompareCards.tsx`、`CumulativeGrowthChart.tsx`、`IntentConversionChart.tsx`、`TrafficActionChart.tsx`、`StabilityPanel.tsx`、`AnomalyBanner.tsx`、`GrowthPricePanel.tsx`

---

## 2. 颜色统一

### 原则

全抽屉加深一档，数据值接近纯黑、标签从 gray-600→gray-700、图表轴色从 #9ca3af→#6b7280。

### 映射表

| 角色 | 当前 | → 新 | 新色值 |
|------|------|------|--------|
| 数据值（矩阵表 td 数值、稳定性数字）| `text-gray-800` | `text-gray-900` | #111827 |
| 字段名/标签（Row label、th 表头、辅助文字）| `text-gray-600` | `text-gray-700` | #374151 |
| 模块小标题 | `text-gray-600` | `text-gray-700` | #374151 |
| Delta 列头（"vs D1" / "vs D3"）| `text-gray-500` | `text-gray-600` | #4b5563 |
| 空值占位（null 数据的 '-'）| `text-gray-400` | `text-gray-500` | #6b7280 |
| 分隔符（· / \|）| `text-gray-300` | `text-gray-400` | #9ca3af |
| ECharts X 轴标签 | `#9ca3af` | `#6b7280` | gray-500 |
| ECharts Y 轴名 | `#9ca3af` / `#6b7280` | `#6b7280` | gray-500 |
| ECharts Y 轴标签 | `#9ca3af` / `#6b7280` | `#6b7280` | gray-500 |
| ECharts 分割线 | `#f3f4f6` | **不变** | gray-100 |
| 异常预警卡片文字 | `text-red-800` / `text-orange-800` 等 | **不变** | — |

### 例外（不改的）

- **品牌色/语义色：** 蓝/翠绿/琥珀/紫/青（§6 色系统一规范）、红/绿（delta 涨跌）、橙/红/绿（预警严重度）
- **Header 元数据行：** `text-gray-600` 保持不变（`text-xs font-mono`，在顶部作为低调元信息是合适的）
- **白底灰背景（bg-gray-50 / bg-gray-100）：** 不变

---

## 3. 基础数据默认展开

### 现状

`GrowthPricePanel.tsx:29`：`const [open, setOpen] = useState(false)`

### 修改

`useState(false)` → `useState(true)`，运营打开抽屉即可看到基础数据，不需额外点击。

---

## 4. 采集质量移至 Header

### 现状

采集质量（质量标签 + 采集次数）在 `GrowthPricePanel` 底部 `📊 采集质量` 区域，默认折叠，运营难以快速参考。

### 修改

从 `GrowthPricePanel` 移除 `📊 采集质量` 整个区块，将该信息移至 `ProductDiagnosticDrawer` 的 Header 元数据行内。

**Header 元数据行当前：**
```
GID: 955244769833 · 状态: 监控中 · 优先级: 3
```

**改为：**
```
GID: 955244769833 · 状态: 监控中 · 优先级: 3 · 采集: 可靠(21次)
```

或当数据不足时：
```
GID: 955244769833 · 状态: 监控中 · 优先级: 3 · 采集: 不足(3次)
```

**代码：**

在 Header 的 GID/状态/优先级行（`ProductDiagnosticDrawer.tsx:53-61`）末尾追加：

```tsx
{wm?.d7 != null && (
  <>
    {' · '}
    采集:{' '}
    {wm.d7.quality_label === 'reliable' ? '可靠' :
     wm.d7.quality_label === 'limited' ? '有限' :
     wm.d7.quality_label === 'insufficient' ? '不足' : '-'}
    ({wm.d7.fetch_count ?? '-'}次)
  </>
)}
```

同时从 `GrowthPricePanel.tsx` 删除 `📊 采集质量` 整个 div 块。

### 理由

- 采集质量是每次打开抽屉都需要确认的元信息，放在 Header 比埋在折叠区合理
- 与 GID/状态/优先级同行，信息密度高但不需要额外空间
- 基础数据区更精简，聚焦商业+流量数据

---

## 5. "数据积累中"说明（仅文档，无代码改动）

矩阵表格"趋势"列显示"数据积累中"的条件（`WindowCompareCards.tsx:92`）：

```typescript
const allSampleEnough = (d1.fetch_count ?? 0) >= 12 && (d3.fetch_count ?? 0) >= 12 && (d7.fetch_count ?? 0) >= 12
```

D1/D3/D7 任意窗口采集次数 < 12 时，三窗口单调性判断（`judgeThreeWindowTrend`）不可靠，不展示"持续上行/持续下行/见顶回落/触底反弹"等趋势标签，改显示灰色"数据积累中"。

---

## 6. 改动文件汇总

| 文件 | 改动要点 | 行数 |
|------|---------|------|
| `ProductDiagnosticDrawer.tsx` | text-[11px]→text-xs, text-gray-600→text-gray-700（标签/badge/Hero Metric）, Header 追加采集质量 | +5 / -3 |
| `WindowCompareCards.tsx` | text-[11px]→text-xs, text-gray-800→text-gray-900（数值）, text-gray-600→text-gray-700（标签/表头）, text-gray-500→text-gray-600（delta头）, text-gray-400→text-gray-500（null）, text-gray-300→text-gray-400（分隔符） | +10 / -10 |
| `CumulativeGrowthChart.tsx` | text-[10px]→text-xs, ECharts fontSize 10→12, axisLabel color #9ca3af→#6b7280, nameTextStyle color #9ca3af→#6b7280, grid bottom 28→32 | +8 / -8 |
| `IntentConversionChart.tsx` | text-[10px]→text-xs, ECharts fontSize 10→12, axisLabel color #9ca3af→#6b7280, markLine label fontSize 10→12, grid bottom 28→32 | +10 / -10 |
| `TrafficActionChart.tsx` | text-[10px]→text-xs, ECharts fontSize 10→12, axisLabel color #9ca3af→#6b7280, grid bottom 28→32 | +8 / -8 |
| `StabilityPanel.tsx` | text-[11px]→text-xs, text-gray-800→text-gray-900, text-gray-600→text-gray-700, text-gray-500→text-gray-600 | +5 / -5 |
| `AnomalyBanner.tsx` | text-[11px]→text-xs, text-gray-600→text-gray-700 | +2 / -2 |
| `GrowthPricePanel.tsx` | text-[11px]→text-xs, text-gray-600→text-gray-700, useState(true), 删除采集质量区块 | +3 / -12 |

---

## 7. 改动原则

- 不修改数据结构，不改 API 层
- 所有改动作用在组件渲染层
- 零 `text-[Npx]` 硬编码残留于抽屉组件
