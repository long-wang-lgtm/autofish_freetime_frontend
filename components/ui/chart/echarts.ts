/**
 * ECharts 按需注册
 *
 * 遵循 frontend-performance.md / frontend-charts.md：
 * 禁止 `import * as echarts from 'echarts'` 全量导入（约 200KB gzipped）。
 *
 * 所有图表组件从这里取 echarts 核心（`useChart` 已统一封装，组件通常不需要直接引用）。
 * 新增图表类型或组件时，在下方的 use() 清单中追加，不要改回全量导入。
 */
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  // 图表类型
  BarChart,
  LineChart,
  PieChart,
  // 组件
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkPointComponent,
  // 渲染器
  CanvasRenderer,
])

export { echarts }
