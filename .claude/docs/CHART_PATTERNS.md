# 图表项目特定模式

本文档记录项目特有的 ECharts 使用模式——这些做法无法从 ECharts 官方文档直接推导。

---

## 1. ECharts 按需导入组件清单

项目中实际使用的 ECharts 组件组合：

```ts
import * as echarts from 'echarts/core'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  TitleComponent,
  MarkPointComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart, PieChart, BarChart,
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, TitleComponent, MarkPointComponent,
  CanvasRenderer,
])
```

> 新增图表类型时在此清单追加对应组件，禁止使用 `import * as echarts from 'echarts'`。

---

## 2. 图表色值常量（设计 Token）

这些色值是项目的设计决策，跨图表保持一致性：

```ts
/** 用户账号饼图调色板 */
export const USER_PALETTE = [
  '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
  '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#48C9B0',
] as const

export const OTHER_COLOR = '#cccccc'

/** 产品监控指标色（跨图表一致性） */
export const CHART_COLORS = {
  want: '#2563eb',        // 想要——核心转化
  browse: '#d97706',      // 浏览——流量指标
  collect: '#7c3aed',     // 收藏——兴趣指标
  inquiryRate: '#059669', // 询单率——转化率
  movingAverage: '#9ca3af',
  reference: '#6b7280',
} as const
```

> 代码位置：`lib/constants/chart-theme.ts`

---

## 3. tooltip 颜色与 series 显式设色的同步模式

tooltip 中的颜色标记必须与 series 颜色显式同步，不能依赖 ECharts 默认分配：

```tsx
const WANT_COLOR = CHART_COLORS.want  // '#2563eb'

const option: EChartsOption = {
  series: [{
    name: '想要',
    type: 'line',
    data: [...],
    color: WANT_COLOR,
    lineStyle: { color: WANT_COLOR },
    itemStyle: { color: WANT_COLOR },
  }],
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const dot = `<span style="display:inline-block;width:8px;height:8px;
        border-radius:50%;background:${WANT_COLOR};margin-right:4px"></span>`
      return `${dot}想要: ${params[0].value}`
    },
  },
}
```

**关键点**：series 的 `color` / `lineStyle.color` / `itemStyle.color` 三处 + tooltip formatter 中的 dot 颜色，全部使用同一个常量。

---

## 4. click 下钻从 useChart ref 桥接 echarts 实例

ECharts 图表支持点击下钻到详情，需要从 `useChart` 返回的 ref 获取 echarts 实例并绑定事件：

```tsx
const chartRef = useChart<HTMLDivElement>(option, [option])

useEffect(() => {
  const instance = (chartRef.current as any)?._echartInstance
  if (!instance) return
  const handler = (params: any) => {
    router.push(`/dashboard/products/${params.data?.id}`)
  }
  instance.on('click', handler)
  return () => { instance.off('click', handler) }
}, [chartRef, router])
```

**关键点**：事件绑定后必须在 cleanup 中 `off`，防止内存泄漏。

---

## 5. 上下子图共用 x 轴时的对齐（值轴刻度 + grid.left）

一张图里放上下两个子图（上销量、下销售额）各自独立值轴时，两个 `grid` 的 `left` 必须同值，
否则两条 x 轴错位——ECharts 的绘图区左边界是 `max(grid.left, 最宽刻度标签宽 + axisLabel.margin)`，
销售额轴标签带 `¥` 更长，就会被推到更右边。两个子图的左边界实测会差 8~16px。

```tsx
import {
  AXIS_LABEL_FONT_SIZE,
  axisAmountLabel,
  axisCountLabel,
  niceAxisMax,
  seriesMax,
  sharedAxisGutter,
} from '@/lib/utils/chart-axis'

// 值轴上限定到整档 → 最宽的刻度就是上限那一个
const countAxisMax = niceAxisMax(seriesMax(series.flatMap((s) => s.count)))
const amountAxisMax = niceAxisMax(seriesMax(series.flatMap((s) => s.payamt)))

// 两张轴里最宽的标签 → 公共标签列宽
const gutter = sharedAxisGutter([
  axisCountLabel(countAxisMax),
  axisAmountLabel(amountAxisMax),
])

const option: EChartsOption = {
  // 两个 grid 用同一个 left
  grid: [
    { left: gutter, right: 16, top: 40, height: '32%' },
    { left: gutter, right: 16, top: '54%', bottom: 50 },
  ],
  yAxis: [
    {
      type: 'value', gridIndex: 0,
      minInterval: 1,          // 刻度不带小数
      max: countAxisMax,
      axisLabel: { fontSize: AXIS_LABEL_FONT_SIZE, formatter: axisCountLabel },
    },
    {
      type: 'value', gridIndex: 1,
      minInterval: 1,
      max: amountAxisMax,
      axisLabel: { fontSize: AXIS_LABEL_FONT_SIZE, formatter: axisAmountLabel },
    },
  ],
  series: [
    // 拐点带弧但不糊，且不越出取值范围（单调插值）
    { type: 'line', smooth: LINE_SMOOTH, smoothMonotone: 'x', data: [...] },
  ],
}
```

**关键点**：① 标签列宽用 `measureTextWidth`（canvas 量宽，与 ECharts 同一套字体度量）算，`AXIS_LABEL_FONT_SIZE` 必须与 `axisLabel.fontSize` 一致；② 上限自己定死，量宽时才知道最宽的刻度是哪一串；③ 平滑度用 `LINE_SMOOTH`（`chart-theme.ts`，0.3；`smooth: true` = 0.5 会把尖峰抹圆）并配 `smoothMonotone: 'x'`，否则曲线会越出两点之间的取值范围（谷底穿零轴、峰值越上限）。

