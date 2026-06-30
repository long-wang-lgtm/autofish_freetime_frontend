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
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart, PieChart, BarChart,
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, TitleComponent,
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
