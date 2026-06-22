# 图表配色重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 TrafficActionChart 和 CumulativeGrowthChart 的 tooltip 颜色错位、折线视觉混淆、Y 轴语义断裂问题，将配色统一为琥珀(浏览)/蓝(想要)/紫(收藏)方案。

**Architecture:** 修改两个 ECharts 图表组件的 series 配置（补 `series.color`、替换颜色）和 HTML 图例标签。CumulativeGrowthChart 额外删除 `min: 'dataMin'` 让 Y 轴从 0 开始、左轴标签去色化、浏览线改为面积图。IntentConversionChart 零改动。

**Tech Stack:** React + TypeScript + ECharts + Tailwind CSS v3

**依赖：** 抽屉字体颜色统一设计（已实施）

---

## 文件改动范围

| 文件 | 改动量 | 要点 |
|------|--------|------|
| `components/selection/product/TrafficActionChart.tsx` | ~12 行 | 三色替换（绿→琥珀、琥珀→紫）、补 series.color、HTML legend 改色+加轴标注、浏览线 areaStyle 改色 |
| `components/selection/product/CumulativeGrowthChart.tsx` | ~15 行 | 三色替换（同上）、补 series.color、删 min:dataMin、左轴标签去色、浏览改面积图、HTML legend 改色 |
| `components/selection/product/IntentConversionChart.tsx` | 0 行 | 无需修改 |

---

### Task 1: TrafficActionChart — series 层颜色修复

**Files:**
- Modify: `components/selection/product/TrafficActionChart.tsx:53-82`

- [ ] **Step 1: 修改 series 配置 — 浏览流量（绿→琥珀 + 补 series.color + areaStyle 改色）**

将第 61-62 行的 `lineStyle` 和 `areaStyle` 替换，并补上 `color` 属性。当前代码：

```typescript
// 第 54-63 行（series[0]）
{
  name: '浏览流量',
  type: 'line',
  yAxisIndex: 0,
  data: ht.hourly_look_rate,
  smooth: true,
  symbol: 'none',
  lineStyle: { color: '#6ee7b7', width: 1 },
  areaStyle: { color: 'rgba(5, 150, 105, 0.10)' },
},
```

修改为：

```typescript
{
  name: '浏览流量',
  type: 'line',
  yAxisIndex: 0,
  data: ht.hourly_look_rate,
  smooth: true,
  symbol: 'none',
  color: '#d97706',
  lineStyle: { color: '#d97706', width: 1.5 },
  areaStyle: { color: 'rgba(217, 119, 6, 0.08)' },
},
```

- [ ] **Step 2: 修改 series 配置 — 想要需求（补 series.color）**

将第 64-72 行补上 `color` 属性。当前代码：

```typescript
// 第 64-72 行（series[1]）
{
  name: '想要需求',
  type: 'line',
  yAxisIndex: 1,
  data: ht.hourly_want_rate,
  smooth: true,
  symbol: 'none',
  lineStyle: { color: '#2563eb', width: 2 },
},
```

修改为：

```typescript
{
  name: '想要需求',
  type: 'line',
  yAxisIndex: 1,
  data: ht.hourly_want_rate,
  smooth: true,
  symbol: 'none',
  color: '#2563eb',
  lineStyle: { color: '#2563eb', width: 2 },
},
```

- [ ] **Step 3: 修改 series 配置 — 收藏数（琥珀→紫罗兰 + 补 series.color）**

将第 73-81 行替换颜色并补 `color` 属性。当前代码：

```typescript
// 第 73-81 行（series[2]）
{
  name: '收藏数',
  type: 'line',
  yAxisIndex: 1,
  data: ht.hourly_collect_rate,
  smooth: true,
  symbol: 'none',
  lineStyle: { color: '#d97706', width: 1.5, type: 'dashed' },
},
```

修改为：

```typescript
{
  name: '收藏数',
  type: 'line',
  yAxisIndex: 1,
  data: ht.hourly_collect_rate,
  smooth: true,
  symbol: 'none',
  color: '#7c3aed',
  lineStyle: { color: '#7c3aed', width: 1.5, type: 'dashed' },
},
```

- [ ] **Step 4: 运行 TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 5: 提交**

```bash
git add components/selection/product/TrafficActionChart.tsx
git commit -m "fix: TrafficActionChart series color palette — green→amber, amber→violet, add series.color for tooltip

- 浏览流量: #6ee7b7(翠绿) → #d97706(琥珀), 补 series.color, areaStyle 改为琥珀底色
- 想要需求: 补 series.color=#2563eb
- 收藏数: #d97706(琥珀) → #7c3aed(紫罗兰), 补 series.color, 保留虚线
- 修复 tooltip 圆点颜色与折线颜色错位的致命缺陷"
```

---

### Task 2: TrafficActionChart — HTML 图例更新

**Files:**
- Modify: `components/selection/product/TrafficActionChart.tsx:99-111`

- [ ] **Step 1: 修改 HTML 图例颜色和轴标注**

当前代码（第 99-111 行）：

```tsx
<div className="mb-1 ml-1">
  <span className="text-xs text-gray-700">流量转化匹配图</span>
  <span className="flex gap-3 text-xs text-gray-700 flex-wrap mt-0.5">
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-emerald-400 inline-block rounded" />浏览流量
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />想要需求
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-amber-600 inline-block rounded" />收藏数
    </span>
  </span>
</div>
```

修改为：

```tsx
<div className="mb-1 ml-1">
  <span className="text-xs text-gray-700">流量转化匹配图</span>
  <span className="flex gap-3 text-xs text-gray-700 flex-wrap mt-0.5">
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-amber-600 inline-block rounded" />浏览流量（左轴）
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />想要需求（右轴）
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-violet-600 inline-block rounded" />收藏数（右轴）
    </span>
  </span>
</div>
```

变更点：
- `bg-emerald-400` → `bg-amber-600`
- `bg-amber-600` → `bg-violet-600`
- 所有标签追加轴归属标注（左轴/右轴）

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 3: 提交**

```bash
git add components/selection/product/TrafficActionChart.tsx
git commit -m "fix: TrafficActionChart HTML legend — match new amber/blue/violet palette, add axis labels"
```

---

### Task 3: CumulativeGrowthChart — series 层颜色修复 + Y 轴去色

**Files:**
- Modify: `components/selection/product/CumulativeGrowthChart.tsx:36-58`

- [ ] **Step 1: 修改 Y 轴配置 — 删除 min:dataMin + 左轴标签去色**

当前代码（第 36-52 行）：

```typescript
yAxis: [
  {
    type: 'value',
    name: '累计浏览',
    min: 'dataMin',
    nameTextStyle: { fontSize: 12, color: '#059669' },
    axisLabel: { fontSize: 12, color: '#059669', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { lineStyle: { color: '#f3f4f6' } },
  },
  {
    type: 'value',
    name: '累计想要·收藏',
    min: 'dataMin',
    nameTextStyle: { fontSize: 12, color: '#6b7280' },
    axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { show: false },
  },
],
```

修改为：

```typescript
yAxis: [
  {
    type: 'value',
    name: '累计浏览',
    nameTextStyle: { fontSize: 12, color: '#6b7280' },
    axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { lineStyle: { color: '#f3f4f6' } },
  },
  {
    type: 'value',
    name: '累计想要·收藏',
    nameTextStyle: { fontSize: 12, color: '#6b7280' },
    axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { show: false },
  },
],
```

变更点：
- 两侧 Y 轴删除 `min: 'dataMin'`（默认从 0 开始）
- 左轴 nameTextStyle.color: `#059669` → `#6b7280`
- 左轴 axisLabel.color: `#059669` → `#6b7280`

- [ ] **Step 2: 修改 series 配置 — 累计浏览（翠绿→琥珀 + 面积图 + 补 series.color）**

当前代码（第 55 行）：

```typescript
{ name: '累计浏览', type: 'line', yAxisIndex: 0, data: ht.cumulative_look, smooth: true, symbol: 'none', lineStyle: { color: '#059669', width: 1.5 } },
```

修改为：

```typescript
{
  name: '累计浏览',
  type: 'line',
  yAxisIndex: 0,
  data: ht.cumulative_look,
  smooth: true,
  symbol: 'none',
  color: '#d97706',
  lineStyle: { color: '#d97706', width: 2 },
  areaStyle: { color: 'rgba(217, 119, 6, 0.20)' },
},
```

- [ ] **Step 3: 修改 series 配置 — 累计想要（补 series.color）**

当前代码（第 56 行）：

```typescript
{ name: '累计想要', type: 'line', yAxisIndex: 1, data: ht.cumulative_want, smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 } },
```

修改为：

```typescript
{
  name: '累计想要',
  type: 'line',
  yAxisIndex: 1,
  data: ht.cumulative_want,
  smooth: true,
  symbol: 'none',
  color: '#2563eb',
  lineStyle: { color: '#2563eb', width: 2 },
},
```

- [ ] **Step 4: 修改 series 配置 — 累计收藏（琥珀→紫罗兰 + 补 series.color）**

当前代码（第 57 行）：

```typescript
{ name: '累计收藏', type: 'line', yAxisIndex: 1, data: ht.cumulative_collect, smooth: true, symbol: 'none', lineStyle: { color: '#d97706', width: 1.5 } },
```

修改为：

```typescript
{
  name: '累计收藏',
  type: 'line',
  yAxisIndex: 1,
  data: ht.cumulative_collect,
  smooth: true,
  symbol: 'none',
  color: '#7c3aed',
  lineStyle: { color: '#7c3aed', width: 2 },
},
```

- [ ] **Step 5: 运行 TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 6: 提交**

```bash
git add components/selection/product/CumulativeGrowthChart.tsx
git commit -m "fix: CumulativeGrowthChart color palette + Y-axis zero baseline

- 累计浏览: #059669(翠绿) → #d97706(琥珀), 补 series.color, 新增面积图 areaStyle
- 累计想要: 补 series.color=#2563eb
- 累计收藏: #d97706(琥珀) → #7c3aed(紫罗兰), 补 series.color, 线宽 1.5→2
- Y轴: 删除 min:dataMin 使双轴从 0 开始, 左轴标签色 #059669→#6b7280 统一中性灰
- 修复 tooltip 圆点颜色错位问题"
```

---

### Task 4: CumulativeGrowthChart — HTML 图例更新

**Files:**
- Modify: `components/selection/product/CumulativeGrowthChart.tsx:72-88`

- [ ] **Step 1: 修改 HTML 图例颜色**

当前代码（第 72-88 行）：

```tsx
<div className="mb-1 ml-1">
  <span className="text-xs text-gray-700">累计增长图</span>
  <span className="flex gap-3 text-xs text-gray-700 flex-wrap mt-0.5">
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
</div>
```

修改为：

```tsx
<div className="mb-1 ml-1">
  <span className="text-xs text-gray-700">累计增长图</span>
  <span className="flex gap-3 text-xs text-gray-700 flex-wrap mt-0.5">
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-amber-600 inline-block rounded" />累计浏览（左轴）
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />累计想要（右轴）
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-violet-600 inline-block rounded" />累计收藏（右轴）
    </span>
  </span>
</div>
```

变更点：
- `bg-emerald-600` → `bg-amber-600`
- `bg-amber-600` → `bg-violet-600`
- 轴归属标注已存在，无需新增

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 3: 提交**

```bash
git add components/selection/product/CumulativeGrowthChart.tsx
git commit -m "fix: CumulativeGrowthChart HTML legend — emerald→amber, amber→violet"
```

---

### Task 5: 最终验证

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 2: 视觉检查清单**

对照设计文档 §6 验收标准逐项确认：

- [ ] TrafficActionChart tooltip 圆点颜色与折线颜色一一对应：琥珀=浏览、蓝=想要、紫=收藏
- [ ] CumulativeGrowthChart tooltip 圆点颜色与折线颜色一一对应（同上）
- [ ] 浏览线（琥珀）与想要线（蓝）在任何位置交叉均可肉眼区分
- [ ] 想要线（蓝）与收藏线（紫）在色相上有足够差异
- [ ] 双 Y 轴标签色统一为中性灰 `#6b7280`（不上色）
- [ ] TrafficActionChart 收藏数线保留虚线样式
- [ ] CumulativeGrowthChart 累计浏览为面积图（`areaStyle`）
- [ ] CumulativeGrowthChart 双 Y 轴均从 0 开始（无 `min: 'dataMin'`）
- [ ] HTML 图例顺序：浏览→想要→收藏，含轴归属标注（左轴/右轴）
- [ ] 三张图表空状态/占位提示不受影响

- [ ] **Step 3: 提交最终验证结果**

```bash
git add -A
git diff --cached --stat
git commit -m "chore: final verification — chart color redesign complete"
```

---

## 不改的部分（确认清单）

- IntentConversionChart 配色（已有 itemStyle.color，tooltip 正确，配色合理）
- ECharts 字号（fontSize:12）、grid 间距（bottom:32）、X 轴旋转角（rotate:45）
- 组件接口（props）、数据结构（HourlyTrendDTO）、API 层
- HTML legend 的 `text-xs text-gray-700` 容器样式
