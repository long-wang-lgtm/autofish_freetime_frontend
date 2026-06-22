# 抽屉图表配色重设计

> 日期：2026-06-22 | 状态：待审核
> 依赖：[抽屉字体颜色统一设计](./2026-06-21-drawer-font-color-unification-design.md)（已实施）
> 范围：TrafficActionChart、CumulativeGrowthChart、IntentConversionChart

---

## 问题总览

| # | 严重度 | 问题 | 影响范围 |
|---|--------|------|---------|
| 1 | 🔴 致命 | Tooltip 圆点颜色与折线颜色完全不匹配（"指鹿为马"） | TrafficActionChart、CumulativeGrowthChart |
| 2 | 🔴 严重 | 绿色（浏览）与蓝色（想要）同为冷色中明度，靠近/交叉时无法肉眼区分 | TrafficActionChart、CumulativeGrowthChart |
| 3 | 🟡 中度 | 右侧 Y 轴承载蓝+橙双线，但轴标签为灰色，颜色语义关联断裂 | TrafficActionChart、CumulativeGrowthChart |
| 4 | 🟡 中度 | 三色缺乏漏斗递进逻辑（浏览→想要→收藏），色板"工厂默认感" | TrafficActionChart、CumulativeGrowthChart |
| 5 | 🟡 中度 | 累计增长图绿线（浏览）与橙线（收藏）中后段高度重合，遮挡严重 | CumulativeGrowthChart |
| 6 | 🟢 轻度 | 累计增长图 Y 轴使用 `min: 'dataMin'`，不直观 | CumulativeGrowthChart |
| 7 | 🟢 轻度 | TrafficActionChart 左轴标签灰色，与浏览线（绿）无关联 | TrafficActionChart |

---

## 1. 根因分析

### 1.1 Tooltip 颜色错位（致命缺陷）

**根因：** ECharts tooltip 的系列圆点颜色取自 `series.color`（即默认调色板），**而非** `series.lineStyle.color`。

当前三个图表均只设置了 `lineStyle.color`，未设置 series 级别的 `color` 或 `itemStyle.color`。ECharts 回退到内置调色板：

```
默认调色板: #5470c6 → #91cc75 → #fac858 → #ee6666 → ...
            (蓝)      (绿)       (琥珀)     (红)
```

导致 tooltip 中的颜色与实际线条颜色完全错位：

| Chart | Series | 实际线条颜色 | Tooltip 圆点颜色（默认调色板） | 用户感知 |
|-------|--------|------------|--------------------------|---------|
| TrafficAction | 浏览流量 | `#6ee7b7` 翠绿 | `#5470c6` 蓝 | "为什么浏览是蓝色的？" |
| TrafficAction | 想要需求 | `#2563eb` 蓝 | `#91cc75` 绿 | "想要怎么变绿了？" |
| TrafficAction | 收藏数 | `#d97706` 琥珀 | `#fac858` 黄 | 勉强相近，但不精确 |
| CumulativeGrowth | 累计浏览 | `#059669` 翠绿 | `#5470c6` 蓝 | 完全错位 |
| CumulativeGrowth | 累计想要 | `#2563eb` 蓝 | `#91cc75` 绿 | 完全错位 |
| CumulativeGrowth | 累计收藏 | `#d97706` 琥珀 | `#fac858` 黄 | 勉强相近 |

**结论：** 这不是"调一下颜色"的问题，而是**颜色设置在了错误的位置**。ECharts 的 series 颜色需要从 `lineStyle.color` 提升到 `series.color`（或至少增设 `itemStyle.color`）才能被 tooltip 消费。

**IntentConversionChart 不受影响**——该图表在之前的修改中已为每个 series 补设了 `itemStyle.color`，tooltip 圆点正确。

### 1.2 绿色 + 蓝色视觉混淆

当前两个图表的浏览线使用翠绿（`#6ee7b7` / `#059669`），想要线使用蓝色（`#2563eb`）。

```
翠绿 hsl(160°, 70%, 50%)  vs  蓝色 hsl(220°, 60%, 50%)
```

两者均为中等明度（L≈50%）、中等饱和度（S≈60-70%）的**冷色系**。在 48px 高的图表区域内，两根 1-2px 宽的线条靠近或交叉时，人眼无法在 200ms 内完成色相辨别。

**漏斗语义与配色方案的矛盾：**

浏览→想要→收藏 是一个转化漏斗，三者在业务上有递进关系。但当前配色是"红绿灯式"的完全割裂色：
- 浏览 = 绿（安全/通过感）
- 想要 = 蓝（中性/信息感）
- 收藏 = 橙（警告/注意感）

这传递了错误的情感信号——收藏不应该是"警告"，浏览不应该是"通过"。

### 1.3 Y 轴颜色语义断裂

**TrafficActionChart：**
- 左轴标签"浏览/小时" → 灰色 `#6b7280`
- 左轴数据线 → 翠绿 `#6ee7b7`
- 用户需要通过图例做一次"翻译"才能建立联系

**CumulativeGrowthChart（稍好）：**
- 左轴标签"累计浏览" → 翠绿 `#059669`（与线一致 ✅）
- 右轴标签"累计想要·收藏" → 灰色 `#6b7280`（承载蓝+橙双线，无关联 ❌）

右侧 Y 轴的困境：一根轴对应两根线，无法同时匹配两种颜色。但完全不加颜色关联又让轴像"局外人"。

---

## 2. 配色设计原则

### 2.1 转化漏斗的色阶递进

```
浏览 (Browse)  ──→  想要 (Want)  ──→  收藏 (Collect)
 最宽 / 最被动        中段 / 意图         最窄 / 最主动
```

设计策略：**暖色系为基底（浏览）+ 冷色系递进（想要→收藏）**

- 浏览用暖色——代表"流量"的涌入，视觉上温暖、扩张、高辨识度
- 想要用标准蓝——代表"意图"，是整张图的核心锚点指标
- 收藏用深紫——代表"承诺行动"，比蓝色更深沉、更"重"

### 2.2 新配色方案

#### 主色调

| 指标 | 新颜色 | 色值 | Tailwind | Y 轴归属 |
|------|--------|------|----------|---------|
| 浏览（Browse） | 琥珀 | `#d97706` | amber-600 | 左轴 |
| 想要（Want） | 蓝 | `#2563eb` | blue-600 | 右轴 |
| 收藏（Collect） | 紫罗兰 | `#7c3aed` | violet-600 | 右轴 |

#### 设计理由

| 选择 | 理由 |
|------|------|
| 浏览→琥珀 | 暖色与冷色系（蓝/紫）形成**最大色温对比**，浏览线永远不会与想要/收藏线混淆 |
| 想要→蓝 | 保持蓝色作为"核心指标"的认知（蓝色在数据可视化中代表可信、主要数据） |
| 收藏→紫 | 蓝→紫的色相偏移仅约 30°，表示"想要→收藏"属于同一行为簇（右轴），但紫更深、更"重"，暗示更强的承诺度 |
| 整体 | 浏览（暖）vs 想要+收藏（冷）形成**左右轴的自然视觉分组** |

#### 对比度验证

```
浏览(琥珀 #d97706) vs 想要(蓝 #2563eb)
  ΔHue ≈ 180°（互补色方向），任何光照条件下可区分

想要(蓝 #2563eb) vs 收藏(紫 #7c3aed)
  ΔHue ≈ 30°（类似色但不同色相），饱和度/明度差异足够区分
```

### 2.3 Y 轴颜色关联策略

**双轴均不上色，保持中性灰 `#6b7280`。**

理由：

- 左轴承载 1 条线、右轴承载 2 条线——如果只给左轴上色，左右不对称，视觉上暗示"右轴不重要"
- 如果给右轴也上色，1:N 映射本身就是错的
- 轴标签本质是**文字描述**（"浏览/小时""想要·收藏/小时"），不是颜色指示器
- 线与轴的对应关系由 **HTML 图例中的轴归属标注**（左轴/右轴）承担，不依赖轴标签颜色

Y 轴着色的铁律：**只有所有轴都是独占轴（1:1）时才考虑着色；只要存在共享轴（1:N），全部中性。**

### 2.4 图例顺序规范

图例从左到右应与数据在图表中的**视觉显著性**一致，同时按漏斗顺序排列：

```
浏览流量（左轴）  →  想要需求（右轴）  →  收藏数（右轴）
   琥珀              蓝                   紫
```

每组标注轴归属，减少"这条线在哪个轴上"的疑问。

---

## 3. 逐图表修改方案

### 3.1 TrafficActionChart（流量转化匹配图）

**文件：** `components/selection/product/TrafficActionChart.tsx`

#### 3.1.1 ECharts series 层修改

```typescript
series: [
  {
    name: '浏览流量',
    type: 'line',
    yAxisIndex: 0,
    data: ht.hourly_look_rate,
    smooth: true,
    symbol: 'none',
    color: '#d97706',                              // ← 新增：控制 tooltip 圆点 + 图例
    lineStyle: { color: '#d97706', width: 1.5 },   // ← 颜色改为琥珀，宽度 1→1.5
    areaStyle: { color: 'rgba(217, 119, 6, 0.08)' }, // ← 新增：浅琥珀面积，区分左右轴
  },
  {
    name: '想要需求',
    type: 'line',
    yAxisIndex: 1,
    data: ht.hourly_want_rate,
    smooth: true,
    symbol: 'none',
    color: '#2563eb',                              // ← 新增
    lineStyle: { color: '#2563eb', width: 2 },     // ← 不变，补 series.color
  },
  {
    name: '收藏数',
    type: 'line',
    yAxisIndex: 1,
    data: ht.hourly_collect_rate,
    smooth: true,
    symbol: 'none',
    color: '#7c3aed',                              // ← 新增，颜色从琥珀改为紫罗兰
    lineStyle: { color: '#7c3aed', width: 1.5, type: 'dashed' },          // ← 保留虚线
  },
],
```

**变更要点：**
- 浏览：`#6ee7b7`(翠绿) → `#d97706`(琥珀)，线宽 1→1.5，新增面积填充
- 收藏：`#d97706`(琥珀) → `#7c3aed`(紫罗兰)，保留虚线
- 全部 series 新增 `color` 属性 = `lineStyle.color`

#### 3.1.2 Y 轴标签

双轴均不上色，保持中性灰 `#6b7280`（详见 §2.3）。仅修改左轴 nameTextStyle 的 color 为 `#6b7280`（已为灰色则不变）。

#### 3.1.3 HTML 图例

```tsx
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
```

**变更：**
- `bg-emerald-400` → `bg-amber-600`
- `bg-amber-600` → `bg-violet-600`
- 所有标签追加轴归属标注（左轴/右轴）

---

### 3.2 CumulativeGrowthChart（累计增长图）

**文件：** `components/selection/product/CumulativeGrowthChart.tsx`

#### 3.2.1 ECharts series 层修改

```typescript
series: [
  {
    name: '累计浏览',
    type: 'line',
    yAxisIndex: 0,
    data: ht.cumulative_look,
    smooth: true,
    symbol: 'none',
    color: '#d97706',                                       // ← 新增
    lineStyle: { color: '#d97706', width: 2 },              // ← 绿色→琥珀，1.5→2
    areaStyle: { color: 'rgba(217, 119, 6, 0.20)' },        // ← 新增面积图，透明度不淡
  },
  {
    name: '累计想要',
    type: 'line',
    yAxisIndex: 1,
    data: ht.cumulative_want,
    smooth: true,
    symbol: 'none',
    color: '#2563eb',                                       // ← 新增
    lineStyle: { color: '#2563eb', width: 2 },
  },
  {
    name: '累计收藏',
    type: 'line',
    yAxisIndex: 1,
    data: ht.cumulative_collect,
    smooth: true,
    symbol: 'none',
    color: '#7c3aed',                                       // ← 新增，颜色从琥珀改为紫罗兰
    lineStyle: { color: '#7c3aed', width: 2 },              // ← 1.5→2
  },
],
```

**变更要点：**
- 累计浏览：翠绿→琥珀、新增 `areaStyle` 面积填充、线宽 1.5→2
- 累计想要：补 `series.color`
- 累计收藏：琥珀→紫罗兰、补 `series.color`、线宽 1.5→2
- 三条线统一 `width: 2`（面积图可稍粗）

#### 3.2.2 Y 轴修改

```typescript
yAxis: [
  {
    type: 'value',
    name: '累计浏览',
    // min: 'dataMin',  ← 删除此行
    nameTextStyle: { fontSize: 12, color: '#6b7280' },
    axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { lineStyle: { color: '#f3f4f6' } },
  },
  {
    type: 'value',
    name: '累计想要·收藏',
    // min: 'dataMin',  ← 删除此行
    nameTextStyle: { fontSize: 12, color: '#6b7280' },
    axisLabel: { fontSize: 12, color: '#6b7280', formatter: (v: number) => v.toLocaleString('zh-CN') },
    splitLine: { show: false },
  },
],
```

**变更：**
- 两侧 Y 轴删除 `min: 'dataMin'`，默认从 0 开始
- 双轴标签色统一 `#6b7280`（中性灰），不上色（详见 §2.3）

#### 3.2.3 HTML 图例

```tsx
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
```

**变更：**
- `bg-emerald-600` → `bg-amber-600`
- `bg-amber-600` → `bg-violet-600`
- 所有标签追加轴归属标注

---

### 3.3 IntentConversionChart（买卖意愿图）

**文件：** `components/selection/product/IntentConversionChart.tsx`

#### 3.3.1 现状评估

IntentConversionChart 在之前的修改中已为每个 series 补设了 `itemStyle.color`（line 73、90、101），tooltip 无错位问题。现有配色：

| 指标 | 颜色 | 评估 |
|------|------|------|
| 询单率 | `#2563eb` blue-600 | ✅ 清晰 |
| 收藏率 | `#7c3aed` violet-600 | ✅ 清晰 |
| 询藏比 | `#0d9488` teal-600 | ✅ 区分度好（虚线 + 双 markLine） |

**结论：IntentConversionChart 配色方案维持不变。** 蓝/紫/青 三色在色相上有足够分离度，且虚线+markLine 的 询藏比 在视觉上天然退化。

#### 3.3.2 可选微调

如果追求全局色板一致性（三张图共用一套语义色），可考虑将 Intent 图的 收藏率颜色从 `#7c3aed` 改为与其他两图一致的 violet-600。当前已经是 violet-600，**无需修改**。

---

## 4. Tooltip 颜色修复的通则

**所有图表的所有 series 必须遵循：**

```
series.color === series.lineStyle.color === series.itemStyle.color
```

即 series 级 `color` 属性必须与 `lineStyle.color` 一致。这是确保 tooltip 圆点颜色正确的唯一方式。

**修改模式：**

```typescript
// ❌ 旧：仅设置 lineStyle.color，tooltip 走默认调色板
{ name: '...', lineStyle: { color: '#xxx' } }

// ✅ 新：series 级 color 控制 tooltip + itemStyle + lineStyle
{ name: '...', color: '#xxx', lineStyle: { color: '#xxx', width: N } }
```

注意：设置 `series.color` 后，`lineStyle.color` 仍需要显式设置（`series.color` 不自动传播到 `lineStyle`，两者在 ECharts 中是独立通道）。

---

## 5. 改动范围汇总

| 文件 | 改动量 | 要点 |
|------|--------|------|
| `TrafficActionChart.tsx` | ~12 行 | 三色替换（绿→琥珀、琥珀→紫）、补 series.color、HTML legend 改色+加轴标注、浏览线加面积 |
| `CumulativeGrowthChart.tsx` | ~15 行 | 三色替换（同上）、补 series.color、删 min:dataMin、浏览改面积图、HTML legend 改色+加轴标注 |
| `IntentConversionChart.tsx` | 0 行 | 无需修改（已有 itemStyle.color） |

总改动：**约 30 行**，两个文件。

---

## 6. 接受标准

- [ ] TrafficActionChart tooltip 圆点颜色与折线颜色一一对应：琥珀=浏览、蓝=想要、紫=收藏
- [ ] CumulativeGrowthChart tooltip 圆点颜色与折线颜色一一对应（同上）
- [ ] 浏览线（琥珀）与想要线（蓝）在任何位置交叉均可肉眼区分
- [ ] 想要线（蓝）与收藏线（紫）在色相上有足够差异
- [ ] 双 Y 轴标签色统一为中性灰 `#6b7280`（不上色）
- [ ] TrafficActionChart 收藏数线为实线（非虚线）
- [ ] CumulativeGrowthChart 累计浏览为面积图（`areaStyle`）
- [ ] CumulativeGrowthChart 双 Y 轴均从 0 开始（无 `min: 'dataMin'`）
- [ ] HTML 图例顺序：浏览→想要→收藏，含轴归属标注（左轴/右轴）
- [ ] 三张图表空状态/占位提示不受影响
- [ ] `npx tsc --noEmit` 零错误

---

## 7. 不改的部分

- IntentConversionChart 配色（已有 itemStyle.color，配色合理）
- ECharts 字号、grid 间距、X 轴旋转角（前一版设计已统一为 fontSize:12、bottom:32、rotate:45）
- 组件接口（props）、数据结构、API 层
- HTML legend 的 `text-xs text-gray-700` 容器样式
