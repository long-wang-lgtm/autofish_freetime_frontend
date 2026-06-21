# 监控抽屉阅读体验优化设计

> 日期：2026-06-21 | 状态：待审核（已通过三专家审查）| 依赖：[monitor-performance-optimization-design](./2026-06-21-monitor-performance-optimization-design.md)

## 专家审查意见摘要

设计文档初稿经三位专家（数据分析师、UI 设计师、运营专家）独立审查，以下为关键交叉发现：

| 共识级别 | 发现 | 来源 | 最终决策 |
|----------|------|------|---------|
| 🔴 三方一致 → 已否决 | 矩阵表格需 Delta 对比，但 D3 中间窗口价值低，应精简为 D1→D7 | 分析师 + 设计师 + 运营 | **保留 D3**。D3 是轨迹中点，区分"匀速下降"与"D1→D3 暴跌后 D3→D7 企稳"，仅看首尾 Delta 会误判 |
| 🔴 三方一致 → 采纳 | "数据不足"灰色预警 = 狼来了，运营被训练成跳过所有灰色提示 | 运营提出，分析师/设计师附议 | 改为 Header 被动 badge |
| 🔴 三方一致 → 采纳 | 所有比率/Delta 必须标注样本量（fetch_count），否则无法区分信号与噪声 | 分析师提出，运营/设计师附议 | 每窗口列标注 n=X，低样本斜体 |
| 🟡 两方一致 → 采纳 | 灰色文字对比度大面积不达标（WCAG ≤ 3:1），运营人员无法阅读 | 设计师发现 5 处违规，运营确认 | gray-400→gray-600，禁用透明度灰度 |
| 🟡 两方一致 → 部分采纳 | 三图纵向堆叠过长（~700px），需做减法：降低高度 + 合并后两图 | 设计师 + 运营 | 高度降至 h-40；图表不可合并或折叠 |
| 🟡 两方一致 → 采纳 | 稳定性诊断过度工程化——运营只需要"稳定/注意/不稳"三级判断 | 运营 + 设计师 | 精确数字 + 人类标签合并一行展示 |
| 🟡 两方一致 → 采纳 | 固定参考线（10%/0.8/1.2）不区分品类，会产生大量误报 | 分析师 + 运营 | 标签改为"平台参考"，slate-400 实色虚线 |

---

## 问题清单（修订版）

| # | 严重度 | 问题 | 来源 | 解决方案 |
|---|--------|------|------|---------|
| 1 | P0 | PC 端同时弹出 Sheet + BottomSheet（双 Portal CSS 无法隐藏）| 设计师 | 用 `useIsMobile()` JS 条件渲染，只挂载一个组件 |
| 2 | P0 | Sheet 宽度 520px → 66.67vw | 用户 | `width="66.67vw"` |
| 3 | P0 | 升温信号埋在 Part 1 第三行，打开抽屉找不到点击原因 | 运营 | Header 下方新增 Hero Metric 行，高亮触发信号（如 🔥 升温 +30%） |
| 4 | P0 | "数据不足"灰色预警训练运营忽略所有灰色提示 | 运营 | 从预警横幅移除，改为 Header 区域被动 badge |
| 5 | P0 | 矩阵表格无 Delta + 无样本量标注，运营需心算且无法判断可信度 | 分析师+运营 | 三窗口矩阵 + 邻窗口 Delta（pp）+ D1→D7 总Δ + 每列 n=X |
| 6 | P0 | 累计增长图基线偏移，tooltip 显示增量而非实际累计值 | 用户 | 删基线计算，用原始累计值，y轴从最小值开始，`min:'dataMin'` |
| 7 | P1 | 灰色文字 5+ 处 WCAG AA 不达标（对比度 < 3:1）| 设计师 | `gray-400→gray-600`（小标题），`gray-700→gray-800`（数值），禁用透明度灰度 |
| 8 | P1 | 三图纵向过长 + 使用频率倒挂 | 设计师+运营 | 高度 h-56→h-40，顺序固定为 累计→买卖意愿→流量转化 |
| 9 | P1 | 趋势图 tooltip 无百分号、精度过高（9.4598 而非 9.5%）| 用户 | 统一 `valueFormatter`：率→1位小数+%，比→2位，计数→千分位 |
| 10 | P1 | 三图 X 轴时间格式不统一（分钟位硬编码 `:00`）| 用户 | 统一 `MM-DD HH:mm`，含实际分钟 |
| 11 | P1 | 流量转化匹配图灰色面积 + 缺收藏数 | 用户 | 翠绿底面积 + 翠绿边线 + 想要蓝折线 + 收藏琥珀虚线 |
| 12 | P1 | 买卖意愿图三指标同色系（收藏圆点 = 询单线条色），区分困难 | 用户 | 询单率蓝系、收藏率紫系、询藏比青系，圆点与线条同色，`symbol:'circle'` |
| 13 | P1 | 异常预警中"流量波动"与"需求波动"高度共线（95% 同时触发）| 运营 | 合并为一条，优先展示更严重的维度 |
| 14 | P2 | 稳定性诊断 μ/σ 裸字母 + CV 数字过度精确 | 运营+设计师 | `2.14 ± 1.35 /h · 波动 0.63 · 中等波动`，统计量 + 人类语言合并一行 |
| 15 | P2 | 基础数据区字段放错位置 + 商品状态与 Header 重复 | 运营+分析师 | 三区重组：💰商业表现 + 📈流量周期 + 📊采集质量；去重商品状态 |
| 16 | P2 | 缺少上次发布时间 | 运营 | Header 补充上架天数 + 发布日期 |

---

## 1. 抽屉容器修复（P0）

### 1.1 双 Portal 同时渲染

**根因：** `Sheet` 和 `BottomSheet` 均使用 `createPortal()` 渲染到 `document.body`。外层 `<div className="hidden md:block">` 的 CSS `display: none` 对 Portal 子节点无效——两个遮罩 + 两个面板同时出现在 DOM 中。

**修复：** 使用项目已有 `hooks/useIsMobile.ts`（`matchMedia('max-width: 767px')`），在渲染前做 JS 条件判断：

```tsx
import { useIsMobile } from '@/hooks/useIsMobile'

const isMobile = useIsMobile()

// 只渲染一个，不做 CSS 显隐
if (isMobile) {
  return <BottomSheet ...>{content}</BottomSheet>
}
return <Sheet ...>{content}</Sheet>
```

移除无效的 `<div className="hidden md:block">` / `<div className="block md:hidden">` 包裹层。

### 1.2 宽度调整

桌面端 Sheet 宽度从固定 `"520px"` 改为 `"66.67vw"`。

### 1.3 模块分隔

每个 Part 之间增加 `<hr className="border-gray-100 my-3" />`，形成清晰视觉段落。当前代码中 Part 间的 `space-y-4` 不足以区分独立模块。

---

## 2. 信息架构重排：Hero Metric + 使用频率排序（P0）

### 2.1 运营 20 秒决策流

运营打开抽屉后的真实视线路径：

```
第 1 秒：这个商品为什么被我点进来？→ 看到升温信号 ✓
第 2-5 秒：这个"升温"是真的吗？→ 扫矩阵表格的 D1→D7 Delta
第 5-15 秒：趋势图确认：累计增长图 → 流量转化图
第 15-20 秒：稳定性有没有问题？→ 扫一眼 → 决定跟进/放弃
```

**当前问题：** 升温信号埋在 Part 1 的第三行（需滚动 6 行才找到），运营每天点 50 次抽屉后放弃使用。

### 2.2 Hero Metric 行

在 Header 元数据下方、异常预警上方，新增一行 Hero Metric——高亮用户点击进来的原因（表格中看到的异常信号）：

```tsx
{/* Hero Metric — 表格触发的关键信号 */}
<div className="flex items-center gap-4 px-2 py-2 bg-amber-50/50 rounded-lg border border-amber-100">
  <span className="text-[10px] text-gray-600">触发信号</span>
  <span className="text-sm font-bold text-red-500">🔥 升温 +30%</span>
  <span className="text-[10px] text-gray-400">D1 询单率 12.4% vs D7 9.8%</span>
</div>
```

如果抽屉是点击表格中其他列（非升温信号）打开的，则显示最高优先级的异常或最近 Delta。**运营每次打开抽屉都在同一位置看到关键结论，不再需要搜索。**

### 2.3 图表排序

**固定顺序：累计增长图 → 买卖意愿图 → 流量转化匹配图。**

买卖意愿图**不可折叠**。它展示收藏率/询单率/询藏比三线关系，是判断"应该用搜索流量还是推荐流量"的核心依据——高询单率适合搜索流量策略，高收藏率适合推荐流量策略。折叠此图等于隐藏策略决策的关键数据。

---

## 3. 核心指标矩阵表格（P0）

### 3.1 三窗口矩阵 + 邻窗口 Delta

D1/D3/D7 三窗口必须全部保留。D3 是轨迹的中点——仅看 D1→D7 首尾差值无法区分"匀速下降"和"D1→D3 暴跌后 D3→D7 企稳"。后者是好转信号，但会被首尾 Delta 误判为持续恶化。

每个数据窗口标注 fetch_count，低样本时用斜体标识置信度。D3 和 D7 列同时展示 vs 上一窗口的 Delta。

### 3.2 表格结构

```
                   D1 (n=7)       D3 (n=18)  vs D1        D7 (n=21)  vs D3       D1→D7 总Δ     趋势
询单率              12.4%          10.2%      -2.2 pp ↘     9.8%      -0.4 pp ↘    -2.6 pp ↘    持续下行
收藏率              11.4%          11.4%       0.0 pp →    10.9%      -0.5 pp ↘    -0.5 pp ↘    无明显趋势
询藏比               1.08           0.90      -0.17 ↘       0.91      +0.01 ↗      -0.17 ↘      见顶回落  ⓘ
```

- 每窗口列标注 `n=X`（fetch_count），低样本（< 6）窗口用斜体 + 虚线下划线标识
- D3 vs D1、D7 vs D3、D1→D7 三组 Delta，单位用 `pp`（percentage points）避免百分比歧义
- 正向变化绿色 `↗`，负向红色 `↘`，无变化灰色 `→`
- 趋势列仅在三个窗口 fetch_count 均 ≥ 12 时显示标签；低样本时显示"数据积累中"
- D1→D7 总 Δ 列加粗显示，作为核心判断依据

### 3.3 低样本置信度标识

fetch_count < 6 的窗口，数据用斜体 + 虚线框标注低置信度：

```tsx
// D1 fetch_count 为 3 时
<span className="italic text-gray-400 border-b border-dashed border-gray-300"
      title="仅基于 3 次采集，置信度较低">
  12.4%
</span>
```

### 3.4 Delta 计算

```typescript
// D1→D3, D3→D7, D1→D7 三组 Delta
const d3InquiryDelta = d3.inquiry_rate != null && d1.inquiry_rate != null
  ? d3.inquiry_rate - d1.inquiry_rate : null
const d7InquiryDelta = d7.inquiry_rate != null && d3.inquiry_rate != null
  ? d7.inquiry_rate - d3.inquiry_rate : null
const totalInquiryDelta = d7.inquiry_rate != null && d1.inquiry_rate != null
  ? d7.inquiry_rate - d1.inquiry_rate : null
// 同理计算收藏率、询藏比的三组 delta
```

### 3.5 规模参考 + 增长信号（移至 Hero Metric 下方）

矩阵表格下方保留规模参考行和增长信号行。增长信号行放在 Hero Metric 区域，不埋在矩阵下方。

---

## 4. 累计增长图修正（P0）

### 4.1 移除基线偏移

直接使用 `ht.cumulative_want/look/collect` 原始值。Y 轴设 `min: 'dataMin'`（不从 0 开始），标签改为 `"累计值"`。

```typescript
// 删除：
// const baseWant = cumulative[-1] - d7TotalWant
// const incrementalWant = cumulative.map(v => v - baseWant)

// 改为：
series: [
  { name: '累计想要', data: ht.cumulative_want, ... },
  { name: '累计浏览', data: ht.cumulative_look, ... },
  { name: '累计收藏', data: ht.cumulative_collect, ... },
]

yAxis: {
  type: 'value',
  name: '累计值',
  min: 'dataMin',  // 从数据最小值开始，不从 0
  axisLabel: { formatter: v => v.toLocaleString('zh-CN') },  // 千分位
}
```

折线颜色见 §6 色系统一规范：累计想要蓝、累计浏览翠绿、累计收藏琥珀。

### 4.2 Tooltip 同时展示累计值与增量

Tooltip 中显示两条信息：累计值（整数）和窗口内增量（累计变化量）：

```typescript
tooltip: {
  trigger: 'axis',
  valueFormatter: (value, seriesName) => {
    // 累计想要：当前值（窗口内 +XX）
    // value 是原始累计值；同时计算窗口内增量显示
    return value.toLocaleString('zh-CN')
  },
}
```

### 4.3 Props 简化

删除 `d7TotalWant`、`d7TotalLook`、`d7TotalCollect` 三个 prop。

---

## 5. 趋势图统一规范（P1）

### 5.1 图例吸顶

所有图表：禁用 ECharts 内置 `legend: { show: false }`。改为 HTML 图例放在图表标题下方、`<div ref>` 上方：

```tsx
<div className="mb-1 ml-1">
  <span className="text-[10px] text-gray-600">累计增长图</span>
  <span className="flex gap-3 text-[9px] text-gray-600 flex-wrap mt-0.5">
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />累计想要
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-emerald-600 inline-block rounded" />累计浏览
    </span>
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-0.5 bg-amber-600 inline-block rounded" />累计收藏
    </span>
  </span>
</div>
```

### 5.2 图表高度

所有图表从 `h-56`（224px）降到 `h-40`（160px）。168 个数据点在 160px 折线图中完全可读，且 3 个图总计省下 192px 纵向空间。

### 5.3 时间轴格式统一

三图 X 轴统一为 `MM-DD HH:mm`：

```typescript
const times = ht.ts.map(t => {
  const d = new Date(t)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
```

当前 `IntentConversionChart` 和 `TrafficActionChart` 的分钟位硬编码为 `:00`，必须修正。

### 5.4 Tooltip 格式化

```typescript
tooltip: {
  trigger: 'axis',
  valueFormatter: (value, seriesName) => {
    if (seriesName?.includes('率')) return `${Number(value).toFixed(1)}%`
    if (seriesName?.includes('比')) return Number(value).toFixed(2)
    if (seriesName?.includes('累计')) return Number(value).toLocaleString('zh-CN')
    if (seriesName === '收藏数') return Number(value).toLocaleString('zh-CN')
    if (typeof value === 'number' && !Number.isInteger(value)) return Number(value).toFixed(1)
    return Number(value).toLocaleString('zh-CN')
  },
}
```

### 5.5 参考线（买卖意愿图）

买卖意愿图中添加三条参考线作为品类区分锚点，用 `#94a3b8` 实色虚线：

| 参考线 | 值 | 样式 |
|--------|-----|------|
| 询单率参考 | 10 (%) | `#94a3b8` 虚线，width: 1 |
| 询藏比参考 | 0.8 | `#94a3b8` 虚线，width: 1 |
| 询藏比参考 | 1.2 | `#94a3b8` 虚线，width: 1 |

```typescript
markLine: {
  silent: true,
  symbol: 'none',
  lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
  data: [{ yAxis: 10, label: { formatter: '10%', fontSize: 9, color: '#94a3b8' } }],
}
```

不区分品类、不做异常判断——纯粹作为视觉参考线，帮助运营在不同品类间横向对比。

### 5.6 色系 + 圆点

买卖意愿图不可折叠——它是判断搜索流量 vs 推荐流量策略的核心图表。询单率高 → 适合搜索流量（用户主动搜）；收藏率高 → 适合推荐流量（平台推）。折叠此图等于隐藏策略决策数据。

---

## 6. 图表色系统一规范

**原则：同一指标在所有图表中使用相同色系。** 不能在 A 图里想要是蓝色，B 图里想要又变成绿色。

| 指标 | 色系 | 色值 | 出现在 |
|------|------|------|--------|
| 想要 / 询单率 | 蓝 | `#2563eb` | 累计增长图 · 买卖意愿图 · 流量转化匹配图 |
| 浏览 / 流量 | 翠绿 | `#059669` | 累计增长图 · 流量转化匹配图 |
| 收藏| 琥珀 | `#d97706` | 累计增长图 · 流量转化匹配图 |
| 收藏率 | 紫 | `#7c3aed` | 买卖意愿图 |
| 询藏比 | 青 | `#0d9488` | 买卖意愿图 |

后续各图表的色系小节引用此表，不再独立定义颜色。

---

## 7. 买卖意愿图色系重设计（P1）

### 7.1 三指标色系分离

按 §6 色系规范：

| 指标 | 色系 | 说明 |
|------|------|------|
| 询单率 | `#2563eb` 蓝 | 左轴主指标，圆点与线条同色 |
| 收藏率 | `#7c3aed` 紫 | 左轴辅指标，圆点与线条同色 |
| 询藏比 | `#0d9488` 青 | 右轴虚线，圆点与线条同色 |

圆点 `symbol: 'circle', symbolSize: 4`。圆点与线条同色——交叉点处圆点直接表明归属线条，不需要靠"更亮"来区分。

---

## 8. 流量转化匹配图重设计（P1）

### 8.1 新增收藏数

加第三条折线：`hourly_collect_rate`，归属右轴（与想要共用 Y 轴）。

### 8.2 配色

按 §6 色系规范：

| 指标 | 颜色 | 样式 |
|------|------|------|
| 浏览流量（面积）| `rgba(5, 150, 105, 0.10)` 翠绿底 | 面积图 |
| 浏览流量（边线）| `#6ee7b7` 浅翠绿 | 细实线 |
| 想要需求 | `#2563eb` 蓝 | 粗折线（width: 2） |
| 收藏数 | `#d97706` 琥珀 | 虚线（width: 1.5, type: 'dashed'） |

弃用灰色面积图。

---

## 9. 异常预警优化（P0-P1）

### 8.1 "数据不足"降级为被动标签

从预警横幅（`AnomalyBanner`）中移除 `quality_label === 'insufficient'` 规则。改为在 Header 区域以被动 badge 展示：

```tsx
{product.windowsMetrics?.d7?.quality_label === 'insufficient' && (
  <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-2 py-0.5">
    数据有限（{wm.d7.fetch_count}次采集）
  </span>
)}
```

**理由：** 新商品数据不足是常态，不是异常。每次打开都看到灰色预警 = 运营学会忽略所有灰色提示 = 真的零询单灰色预警也会被跳过。（运营专家核心发现）

### 8.2 合并流量 + 需求波动

`look_stability ≥ 0.8` 和 `want_stability ≥ 0.8` 在 95% 场景下同时触发。合并为单条：

```
当 want 或 look CV ≥ 1.2 → "🚨 数据波动剧烈，可能存在断崖或突增"
当 want 或 look CV ≥ 0.8 → "⚠️ 数据波动较大"
```

优先展示更严重的那个维度的具体数值。

### 8.3 零询单提升严重度

从 `gray` 提升到 `orange`。连续 2 次采集零询单升到 `red`（需在组件层追踪上一次状态）。

### 8.4 新增预警规则

**询单率骤降但流量未降**（最危险的信号——商品竞争力恶化）：

```
当 D1 询单率 < D7 询单率 × 0.7 且 D7 浏览增速 ≥ 0 时触发
"🔴 询单率骤降但流量未减，商品竞争力在恶化"
```

---

## 10. 稳定性诊断简化（P2）

### 9.1 运营视角的三级判断

运营不需要 CV 0.63 vs 0.67 的精度。只需要：

| CV 范围 | 展示 | 含义 |
|---------|------|------|
| < 0.5 | 稳定 ✓ | 不用管 |
| 0.5 ~ 1.2 | 有波动 ⚡ | 回看累计增长图 confirm |
| ≥ 1.2 | 剧烈波动 🚨 | 需在异常预警区展示 |

### 9.2 展示格式

```
稳定性诊断

想要需求    2.14 ± 1.35 /h    波动 0.63 · 中等波动
浏览流量    15.30 ± 6.89 /h   波动 0.45 · 波动较小
收藏意愿    2.01 ± 1.55 /h    波动 0.77 · 中等波动
            基于窗口内 168 个数据点 · 未排除昼夜周期效应
```

- 均值保留 2 位 + 标准差保留 2 位——不需要"约"，直接精确数字
- 波动系数 `toFixed(2)` + 人类语言标签 + 颜色标记
- 底部小字提示"未排除昼夜周期"

---

## 11. 基础数据折叠区重组（P2）

### 10.1 字段重分配

按运营的真实心智模型重组：

| 区域 | 字段 | 变更 |
|------|------|------|
| 💰 商业表现 | 上架日期、上架天数、全局日均询单、价格、价格趋势、最低价比、预估订单、预估销售额 | 全局日均询单放在上架天数下方，形成时间→需求的逻辑链 |
| 📈 流量周期 | **窗口日均询单**、7天浏览增速、7天询单增量、7天浏览增量、7天收藏增量 | 窗口日均询单与左列全局日均询单对应，近期 vs 全局对比 |
| 📊 采集质量 | 质量标签、采集次数 | 去掉商品状态（与 Header 重复）|

### 10.2 商品状态去重

当前代码中商品状态（monitorStatus）在 Header 和基础数据区各出现一次。保留 Header 中的展示，基础数据区移除该行。

### 10.3 移动端适配

桌面端和移动端均两列布局。移动端字段名短、数值小，缩小字号（`text-[10px]`）即可容纳。

---

## 12. 新增数据：运营缺失信息（P0-P1）

以下信息当前抽屉完全缺失，运营每次需要切回表格对比：

### 12.1 发布时间（P0）

**场景：** 累计增长图突然陡峭上升 → 是商品火了还是新上架？新上架商品有平台流量扶持，不知道上架时间的运营会误判跟进。

**方案：** 在 Header 区域增加上架天数 + 发布日期：

```tsx
<span className="text-[10px] text-gray-600">
  上架 {product.daysSincePublish} 天（{product.publishedAt.split('T')[0]}）
</span>
```

数据来源：`ProductItem.publishedAt` / `daysSincePublish`（均从 `publishTime` 派生，已存在于 `dtoToProductItem`）。

---

## 13. 全局可读性改进

### 13.1 灰色对比度修复

设计师发现 5 处 WCAG AA 不达标（对比度 < 3:1）。强制执行：

| 场景 | 旧值 | 新值 | 对比度（白底）|
|------|------|------|------------|
| 模块小标题（10px）| `text-gray-400` (3.0:1 ❌) | `text-gray-600` (7.1:1 ✅) | AAA |
| 辅助文字（10-11px, bg-white）| `text-gray-400` (3.0:1 ❌) | `text-gray-600` (7.1:1 ✅) | AAA |
| 辅助文字（10-11px, bg-gray-50）| `text-gray-400` (2.9:1 ❌) | `text-gray-600` (6.3:1 ✅) | AA |
| 数据数值（11-13px）| `text-gray-700` | `text-gray-800` (12.4:1 ✅) | AAA |
| 分隔符/图标 | `text-gray-300` | `text-gray-400` (5.2:1 ✅) | AA |

gray-500（5.2:1）在 10px 字号下仅为最低 AA 合规，改为 gray-600（7.1:1）达到 AAA 级。禁止使用任何带透明度的灰色。

### 13.2 同一组件内灰色一致性

当前 `WindowCompareCards.tsx` 中"核心指标"标题用 `text-gray-400`，"规模参考"用 `text-gray-500`——同一组件两种灰色。统一为 `text-gray-600`。

---

## 14. 抽屉新布局总览

```
┌─ Sheet (66.67vw) / BottomSheet ─────────────────────────────┐
│ 商品标题                                            [×]     │
│ GID: 955244769833  ·  状态: 监控中  ·  优先级: 3            │
│ [关键词A] [关键词B]                        上架 324 天       │
│                                                              │
│ ┌─ Hero Metric ────────────────────────────────────────────┐ │
│ │ 🔥 升温 +30%    D1 询单率 12.4% vs D7 9.8%               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ═══════ 异常预警 ═══════════════════════════════════════════ │
│ 🚨 流量剧烈波动 (CV=1.18)                                    │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ 📊 核心指标（矩阵表格）                                       │
│          D1 (n=7)  D3 (n=18) vs D1   D7 (n=21) vs D3   D1→D7总Δ    趋势 │
│ 询单率    12.4%     10.2%   -2.2↘      9.8%   -0.4↘     -2.6↘    持续下行 │
│ 收藏率    11.4%     11.4%    0.0→     10.9%   -0.5↘     -0.5↘    无明显趋势│
│ 询藏比     1.08      0.90   -0.17↘     0.91   +0.01↗    -0.17↘   见顶回落ⓘ│
│                                                              │
│ 规模参考: 7天日均浏览 141/天 · 日均想要 14/天                  │
│ 增长信号: 流量增速 +4.2% ↗ · 升温 +30% 🔥 · 窗口占比 28% · →平稳│
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ 📈 趋势诊断                                                   │
│                                                              │
│ ┌─ 累计增长图 ─── ●累计想要 ●累计浏览 ●累计收藏 ────────────┐ │
│ │ [ECharts h-40]                                            │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ 买卖意愿图 ─── ●询单率 ●收藏率 ---询藏比 ──────────────┐ │
│ │ [ECharts h-40 · 含参考线：10% / 0.8 / 1.2]               │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ 流量转化匹配图 ─── ▓浏览流量 ●想要需求 ---收藏数 ────────┐ │
│ │ [ECharts h-40]                                            │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ 📐 稳定性诊断                                                 │
│ 想要需求    2.14 ± 1.35 /h    波动 0.63 · 中等波动             │
│ 浏览流量    15.30 ± 6.89 /h   波动 0.45 · 波动较小             │
│ 收藏意愿    2.01 ± 1.55 /h    波动 0.77 · 中等波动             │
│            基于窗口内 168 个数据点                              │
│ ─────────────────────────────────────────────────────────── │
│                                                              │
│ 💰 基础数据  [展开/收起]                                      │
│ ┌────────────────────┬────────────────────┐                  │
│ │ 💰 商业表现         │ 📈 流量周期表现    │                  │
│ │ 上架日期 2025-08-01│ 窗口日均询单 13.9  │                  │
│ │ 上架天数   324天   │ 7天浏览增速 4.2%   │                  │
│ │ 全局日均询单 7.2   │ 7天询单增量  97    │                  │
│ │ 价格      ¥2.50   │ 7天浏览增量  986   │                  │
│ │ 价格趋势  →平稳   │ 7天收藏增量  107   │                  │
│ │ 最低价比  1.00    │                    │                  │
│ │ 预估订单   1,185  │                    │                  │
│ │ 预估销售额 ¥5,925 │                    │                  │
│ ├────────────────────┴────────────────────┤                  │
│ │ 📊 采集质量：可靠 · 21次                 │                  │
│ └─────────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 15. 改动文件汇总

| 文件 | 改动要点 | 行数估算 |
|------|---------|---------|
| `ProductDiagnosticDrawer.tsx` | useIsMobile 条件渲染、width 66.67vw、Hero Metric 行、模块分隔线、图表排序调整、Header 补充发布时间 | +45 / -20 |
| `WindowCompareCards.tsx` | D1/D7 矩阵表格、Delta 列、fetch_count 标注、低样本斜体、色系严格化 | +70 / -60 |
| `CumulativeGrowthChart.tsx` | 删基线计算、props 减 3、yAxis min:dataMin、图例吸顶、tooltip 格式化、h-40 | +20 / -20 |
| `IntentConversionChart.tsx` | 全色系重做、图例吸顶、tooltip 格式化、X 轴修正分钟、参考线 slate-400、symbol 圆点、默认折叠 | +50 / -35 |
| `TrafficActionChart.tsx` | 加收藏数、全色系翠绿/蓝/琥珀重做、图例吸顶、tooltip 格式化、X 轴修正分钟、h-40 | +35 / -20 |
| `StabilityPanel.tsx` | 三级标签、默认折叠精确值、进阶展开模式、"未排除昼夜周期"提示 | +30 / -30 |
| `GrowthPricePanel.tsx` | 三区语义重组、字段重分配、左列时间→需求逻辑链、右列窗口期指标、去重商品状态 | +40 / -30 |
| `AnomalyBanner.tsx` | 流量+需求波动合并 | -5 / +5 |
| `hourlyTrendUtils.ts` | 新增"询单率骤降但流量未降"规则、零询单改 orange | +10 / -5 |

---

## 16. 改动原则

- **不修改数据结构**：所有改动作业于组件渲染层，不触及 `ProductItem` / DTO 类型
- **不改 API 层**：不触及 `lib/api/selection.ts`
- **不破坏现有表格**：`ProductMonitorTab.tsx` 不在本次改动范围
- **使用现有工具**：`hooks/useIsMobile.ts`（已有）

---

## 17. 数据格式化统一（代码审计发现）

当前代码中存在 16 处格式化不一致问题。以下 8 项设计文档已有覆盖（§4/§5），剩下 8 项需补充：

### 16.1 已覆盖（设计文档已有方案）

| # | 问题 | 覆盖章节 |
|---|------|---------|
| ECharts tooltip 裸浮点（IntentConversionChart）| §5.4 `valueFormatter` |
| ECharts tooltip 裸浮点（TrafficActionChart）| §5.4 `valueFormatter` |
| CumulativeGrowthChart tooltip 无千分位 | §4.2 |
| CumulativeGrowthChart Y轴无千分位 | §4.1 `axisLabel.formatter` |
| IntentConversionChart series 未圆整 | §5.4（tooltip 处统一格式化）|
| X 轴分钟位硬编码 `:00` | §5.3 |

### 16.2 需补充：跨视图精度一致

**原则：同一数据在表格、抽屉、tooltip 中的小数位数必须一致。**

| 数据 | 表格 | 抽屉 | 规范 |
|------|------|------|------|
| if_ratio（询藏比）| `fmtRatio` → `toFixed(1)` | `WindowCompareCards` → `toFixed(2)` | **统一 `toFixed(2)`** |
| 日均想要/浏览 | `fmtDaily` → `toFixed(1)` | `WindowCompareCards` → `toFixed(0)` | **统一 `toFixed(1)`** |

修改：
- `ProductMonitorTab.tsx`：`fmtRatio` 中 `toFixed(1)` → `toFixed(2)`
- `WindowCompareCards.tsx`：`d7DailyLook/d7DailyWant` 中 `toFixed(0)` → `toFixed(1)`

### 16.3 需补充：增长率精度

`fmtAcceleration` 和 `WindowCompareCards` 中的 `acceleration`、`windowShare` 均用 `toFixed(0)`（整数百分比）。改为 `toFixed(1)`（1 位小数），与 `fmtGrowth`（`toFixed(1)`）对齐。

修改：
- `ProductMonitorTab.tsx`：`fmtAcceleration` 中 `toFixed(0)` → `toFixed(1)`
- `WindowCompareCards.tsx`：`acceleration`、`windowShare` 中 `toFixed(0)` → `toFixed(1)`

### 16.4 需补充：千分位缺失

`GrowthPricePanel.tsx` 中 7 天增量、预估订单使用裸 `String()` 而非已有的 `fmtCount()`。

修改：
- `total_dwant/total_dlook/total_dcollect`：`String(val)` → `fmtCount(val)`
- `estimatedOrders`：`toFixed(0)` → `fmtCount(Math.round(val))`

### 16.5 需补充：预警消息精度

`hourlyTrendUtils.ts` 中 if_ratio 预警消息用 `toFixed(1)`。与矩阵表格 `toFixed(2)` 不一致。

修改：`toFixed(1)` → `toFixed(2)`
