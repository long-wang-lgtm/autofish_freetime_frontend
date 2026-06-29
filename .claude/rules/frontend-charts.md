# 图表实现规范

> 参考实现：`frontend/components/ui/echart/useChart.ts`（标准 Hook 模式）、`frontend/components/ui/echart/AccountPieChart.tsx`（正确用法示例）、`frontend/components/selection/product/MiniTrendChart.tsx`（迷你趋势图参考）

## 现状问题

项目中图表实现存在严重的模式分裂和代码重复：

- **全量导入 ECharts（8 个文件）**：所有图表文件使用 `import * as echarts from 'echarts'` 导入完整包（~1MB gzip 前），但仅使用 line 和 pie 两种图表类型。未做 tree-shaking。
- **实现模式分裂**：`useChart` hook（`AccountPieChart.tsx`、`ImStatusChart.tsx`、`admin/page.tsx`）与手动 `echarts.init` 模式（`TrendChart.tsx`、`CumulativeGrowthChart.tsx`、`IntentConversionChart.tsx`、`TrafficActionChart.tsx`）并存——后者 4 个文件各自重复相同的 `useRef` + `useEffect(init)` + `useEffect(dispose)` + `useEffect(resize)` 样板代码。
- **配色 4 套并存**：`USER_PALETTE` 在 `AccountPieChart.tsx` 和 `admin/page.tsx` 中重复定义（10 色 + OTHER_COLOR 完全相同的数组）；`COLOR_MAP` 在 `MiniTrendChart.tsx` 中独立定义；`CumulativeGrowthChart.tsx` 等 4 个 product chart 使用各自的硬编码色值。
- **tooltip 颜色与折线颜色错配**：`ImStatusChart.tsx` 中 tooltip 的 series dot 颜色从 data 数组派生（`slotColors`），但折线的 `color` 和 `lineStyle.color` 未显式设置——ECharts 自动分配的颜色可能与 tooltip 展示的颜色不一致。
- **零 dataZoom 支持**：全项目没有任何图表支持缩放/平移交互，时间序列数据无法局部查看。
- **零 click 下钻**：所有图表不可点击，无法从概览图表导航到详情页。
- **legend 实现分裂**：`AccountPieChart.tsx` 使用 ECharts 内置 legend；`TrendChart.tsx` 在部分模式下使用内置 legend；`CumulativeGrowthChart.tsx` / `IntentConversionChart.tsx` / `TrafficActionChart.tsx` 使用 HTML 自定义 legend（在 React 中渲染）；`ImStatusChart.tsx` 无 legend。
- **双 Y 轴滥用**：`CumulativeGrowthChart.tsx` 和 `TrafficActionChart.tsx` 将量级相差 10-100 倍的数据放在左右双 Y 轴（如浏览量和询单率），产生虚假视觉关联——用户会误认为两条曲线走势相关。

## 核心原则

### 1. 统一使用 useChart Hook

所有 ECharts 图表**必须**通过 `components/ui/echart/useChart.ts` 中的 `useChart` hook 初始化，**禁止**在组件中手动调用 `echarts.init()` / `chart.dispose()`。

`useChart` hook 已封装：初始化、setOption、窗口 resize 自适应、组件卸载时 dispose。使用方式：

```tsx
// ✅ 正确：使用 useChart hook
import { useChart } from '@/components/ui/echart/useChart'
import type { EChartsOption } from 'echarts'

function MyChart({ data }: { data: DataPoint[] }) {
  const option: EChartsOption = useMemo(() => ({
    xAxis: { type: 'category', data: data.map(d => d.label) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: data.map(d => d.value) }],
  }), [data])

  const chartRef = useChart<HTMLDivElement>(option, [option])
  return <div ref={chartRef} className="w-full h-64" />
}

// ❌ 禁止：手动 init 模式（TrendChart.tsx / CumulativeGrowthChart.tsx / IntentConversionChart.tsx / TrafficActionChart.tsx 中存在）
function BadChart({ data }: { data: DataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)
    chartRef.current.setOption({ /* ... */ }, true)
  }, [data])

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    return () => { chartRef.current?.dispose(); chartRef.current = null }
  }, [])

  return <div ref={containerRef} className="w-full h-64" />
}
```

### 2. ECharts 按需导入

禁止 `import * as echarts from 'echarts'`。改为按需导入实际使用的组件：

```tsx
// ✅ 按需导入——只引入使用的组件
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

// ❌ 禁止全量导入（当前 8 个文件都在这样做）
import * as echarts from 'echarts'
```

> 注：`useChart.ts` 内部的 `echarts.init()` 调用也需对应修改——hook 内部应使用按需导入后的 echarts 实例，或由调用方传入已注册组件的 echarts 实例。

### 3. 图表配色集中管理

> **⚠️ 待创建**：`lib/constants/chart-theme.ts` 文件尚不存在，需在 Phase 2 重构中创建。创建前图表组件可暂时保留各自的调色板，但禁止新增重复定义。

所有图表的系列颜色、调色板**必须**从 `lib/constants/chart-theme.ts`（新建议文件）统一导入，**禁止**在图表组件中硬编码颜色。

```ts
// lib/constants/chart-theme.ts（新建议文件）

/** 用户账号饼图调色板 */
export const USER_PALETTE = [
  '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
  '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#48C9B0',
] as const

/** 饼图"其他"分类颜色 */
export const OTHER_COLOR = '#cccccc'

/** 产品监控指标色（跨图表一致性） */
export const CHART_COLORS = {
  /** 想要——核心转化 */
  want: '#2563eb',
  /** 浏览——流量指标 */
  browse: '#d97706',
  /** 收藏——兴趣指标 */
  collect: '#7c3aed',
  /** 询单率——转化率 */
  inquiryRate: '#059669',
  /** 移动平均线 */
  movingAverage: '#9ca3af',
  /** 参考线 */
  reference: '#6b7280',
} as const

/** MiniTrendChart 用颜色映射 */
export const MINI_TREND_COLORS: Record<string, { stroke: string; gradient: [string, string] }> = {
  amber:  { stroke: CHART_COLORS.browse, gradient: ['rgba(217,119,6,0.10)', 'rgba(217,119,6,0.02)'] },
  blue:   { stroke: CHART_COLORS.want,   gradient: ['rgba(37,99,235,0.08)', 'rgba(37,99,235,0.01)'] },
  violet: { stroke: CHART_COLORS.collect, gradient: ['rgba(124,58,237,0.08)', 'rgba(124,58,237,0.02)'] },
}
```

```tsx
// ✅ 正确：从统一模块导入
import { USER_PALETTE, OTHER_COLOR, CHART_COLORS } from '@/lib/constants/chart-theme'

// ❌ 禁止：在组件中硬编码颜色（AccountPieChart.tsx / admin/page.tsx 重复定义 USER_PALETTE）
const USER_PALETTE = ['#5470C6', '#91CC75', '#FAC858', ...]  // 重复定义！
```

### 4. 跨图表颜色一致性

同一业务指标在所有图表中使用**完全相同**的颜色。例如"浏览"指标在 `TrafficActionChart.tsx`、`CumulativeGrowthChart.tsx`、`TrendChart.tsx` 中均为 `#d97706`（琥珀）。

```tsx
// ✅ 所有图表引用同一颜色常量
import { CHART_COLORS } from '@/lib/constants/chart-theme'

const trafficSeries = { color: CHART_COLORS.browse, ... }
const cumulativeSeries = { color: CHART_COLORS.browse, ... }
const trendSeries = { color: CHART_COLORS.browse, ... }

// ❌ 不同图表中同一指标使用不同颜色
// TrafficActionChart: 浏览=amber, CumulativeGrowthChart: 浏览=blue (不一致!)
```

### 5. 图表交互最低要求

所有图表必须支持以下基础交互：

| 交互 | 适用范围 | 实现方式 |
|------|----------|----------|
| **tooltip** | 所有图表 | ECharts `tooltip` 配置，值格式化 |
| **dataZoom** | 时间序列图表（折线图、柱状图） | ECharts `dataZoom` 组件，底部滑块 + 拖拽缩放 |
| **legend** | 多系列图表 | 统一使用 ECharts 内置 `legend`，**禁止** HTML 自定义 legend |

```tsx
// ✅ 时间序列图表必须配置 dataZoom
const option: EChartsOption = {
  dataZoom: [
    { type: 'slider', bottom: 8, height: 16 },  // 底部滑块
    { type: 'inside' },                           // 内部滚轮/拖拽缩放
  ],
  tooltip: { trigger: 'axis' },
  legend: { bottom: 32 },
  // ...
}

// ❌ 无 dataZoom 的时间序列图表（当前所有 product chart 都是如此）
// ❌ HTML 自定义 legend（CumulativeGrowthChart.tsx / IntentConversionChart.tsx / TrafficActionChart.tsx 的当前做法）
```

### 6. tooltip 颜色必须与 series 颜色同步

设置 series 时必须同时显式指定 `color` 和 `lineStyle.color`，tooltip 的 `formatter` 中展示的颜色标记必须匹配。

```tsx
// ✅ tooltip 颜色与 series 颜色完全同步
const WANT_COLOR = CHART_COLORS.want  // '#2563eb'

const option: EChartsOption = {
  series: [{
    name: '想要',
    type: 'line',
    data: [...],
    color: WANT_COLOR,              // 系列主色
    lineStyle: { color: WANT_COLOR }, // 折线颜色（与 color 一致）
    itemStyle: { color: WANT_COLOR }, // 数据点颜色
  }],
  tooltip: {
    trigger: 'axis',
    // formatter 中 series dot 颜色使用同一常量
    formatter: (params) => {
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${WANT_COLOR};margin-right:4px"></span>`
      return `${dot}想要: ${params[0].value}`
    },
  },
}

// ❌ 依赖 ECharts 自动配色，但 tooltip 中硬编码了不同的颜色
// （ImStatusChart.tsx 从 data 派生颜色但 series 未显式设色——可能不一致）
```

### 7. 移动端图表降级

移动端不使用完整 ECharts 图表。表格内嵌的趋势预览使用 SVG 实现的 `MiniTrendChart` 组件（`components/selection/product/MiniTrendChart.tsx`）。

```tsx
// ✅ 移动端表格趋势预览——使用 MiniTrendChart（纯 SVG，轻量）
import { MiniTrendChart } from '@/components/selection/product/MiniTrendChart'
<MiniTrendChart
  hourlyData={row.hourlyData}
  slope={row.slope}
  dailyAvg={row.dailyAvg}
  cv={row.cv}
  color="blue"
/>

// ❌ 移动端渲染完整 ECharts 折线图（性能开销大，体验差）
```

### 8. 双 Y 轴使用规则

**只有量级相近（差距小于 10 倍）的指标才能共享双 Y 轴。** 量级差距超过 10 倍的指标应拆分为独立图表。

```tsx
// ✅ 双 Y 轴正确使用：左右轴数据量级相近
// 左轴：询单人数 (量级 ~100)
// 右轴：收藏人数 (量级 ~80)  差距 < 10x，可共用
const option: EChartsOption = {
  yAxis: [
    { name: '人数', type: 'value' },
    { name: '人数', type: 'value' },
  ],
}

// ❌ 双 Y 轴滥用：左右轴数据量级差距 > 100x
// 左轴：浏览量 (量级 ~100,000)
// 右轴：询单率 (量级 ~0.05 = 5%)
// 视觉上两条线"走势相同"但实际分别代表完全不同的量纲——产生虚假关联误导
// → CumulativeGrowthChart.tsx / TrafficActionChart.tsx 当前做法，应拆分
const bad: EChartsOption = {
  yAxis: [
    { name: '浏览量', type: 'value' },
    { name: '询单率', type: 'value', axisLabel: { formatter: '{value}%' } },
  ],
}
```

### 9. click 下钻

数据概览图表应支持点击下钻到详情。ECharts 的 `click` 事件绑定通过 `useChart` hook 返回的 ref 配合 `useEffect` 实现：

```tsx
// ✅ 图表点击下钻
const chartRef = useChart<HTMLDivElement>(option, [option])

useEffect(() => {
  const chart = chartRef.current ? /* 获取 echarts 实例 */ null : null
  if (!chart) return
  const handler = (params: any) => {
    // 根据点击的数据点导航到详情页
    router.push(`/dashboard/products/${params.data?.id}`)
  }
  chart.on('click', handler)
  return () => { chart.off('click', handler) }
}, [chartRef, router])
```

## 反模式

- 手动调用 `echarts.init()` 而非使用 `useChart` hook（4 个 product chart 文件存在）
- 使用 `import * as echarts from 'echarts'` 全量导入（8 个文件存在）
- 在同一项目多个文件中重复定义相同的调色板常量（`USER_PALETTE` 在 2 个文件中重复）
- HTML 自定义 legend 替代 ECharts 内置 legend（3 个 product chart 文件存在）
- 时间序列图表无 `dataZoom`（所有 product chart + admin trend 都缺失）
- tooltip marker 颜色与 series 实际颜色不一致（依赖 ECharts 默认配色但 tooltip 使用不同颜色）
- 量级差距超过 100 倍的数据放在双 Y 轴图表中（`CumulativeGrowthChart.tsx`、`TrafficActionChart.tsx`）
- 移动端使用完整 ECharts 替代 SVG sparkline（表格内嵌场景应使用 `MiniTrendChart`）
- 图表无 click 下钻交互（所有当前图表均不支持）
- 在 `option` 中使用 `itemStyle: { color: USER_PALETTE[i] }` 手动索引配色（应使用 ECharts 全局 `color` 调色板配置）

## 另见

- [色彩语义体系](frontend-colors.md) — UI 交互色与图表色的分离原则
- [数字/日期/价格格式化规范](frontend-format.md) — 图表轴标签和 tooltip 的格式化函数
- [性能检查清单](frontend-performance.md) — ECharts 按需导入和懒加载
