# 性能检查清单

> 基于项目前端性能审计发现的问题和已有最佳实践制定

## 当前性能画像

| 指标 | 当前状态 | 目标 |
|------|----------|------|
| ECharts 导入方式 | 全部 `import * as echarts`（8 处） | 按需导入 |
| `React.memo` | 0 处 | 纯展示组件覆盖 |
| 虚拟滚动 | 无 | 长列表使用 |
| 代码分割 | 0 处（无 `next/dynamic`） | 非首屏组件懒加载 |
| `loading="lazy"` | 0 处 | 所有 `<img>` 添加 |
| 内联事件处理器（新建函数引用） | 170+ 处 | 关键路径使用 `useCallback` |
| 裸 `useEffect + useState` 请求数据 | 1 处（admin proxy） | 全用 React Query |
| 乐观更新 | 5 处（仅 publish 域） | 扩大到 items 等域 |

## 积极发现

| 模式 | 说明 |
|------|------|
| `useCallback` | 135 处使用，在核心组件中较普及 |
| `useMemo` | 77 处使用 |
| React Query staleTime: 60s / gcTime: 5min | 配置合理 |
| `refetchOnWindowFocus: false` | 对管理后台合理 |
| `useChart` hook | `components/ui/echart/useChart.ts` 正确管理 ECharts 生命周期（init + dispose + resize 事件清理） |
| 事件监听/定时器清理 | `removeEventListener`、`clearTimeout`、`clearInterval` 系统性应用，无内存泄漏 |
| `useImStatusSnapshots`（SSE 单例） | `hooks/useImStatusSnapshots.ts` 设计良好，全局唯一 EventSource 实例，可作为 SSE 模式参考 |
| localStorage 总量 < 1KB | 仅存储 token + FAB 位置 + 少量 UI 状态 |
| `IntersectionObserver` 清理 | `ProductMonitorTab.tsx` 中对 sentinel observer 正确 disconnect |

## 性能规范

### 1. ECharts 必须按需导入

**当前问题**：所有 8 处 ECharts 引用使用 `import * as echarts from 'echarts'`，打包全量（~200KB gzipped）。

```ts
// ❌ 当前 — 全量导入
import * as echarts from 'echarts'

// ✅ 按需导入（可减少 ~200KB）
import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, BarChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer])
```

当前使用 ECharts 的文件清单：

| 文件 | 使用的图表类型 |
|------|----------------|
| `components/ui/echart/useChart.ts` | 基础封装（需改为按需） |
| `components/ui/echart/ImStatusChart.tsx` | 状态图表 |
| `components/ui/echart/AccountPieChart.tsx` | 饼图 |
| `components/selection/product/CumulativeGrowthChart.tsx` | 增长图 |
| `components/selection/product/IntentConversionChart.tsx` | 转化图 |
| `components/selection/product/TrafficActionChart.tsx` | 流量图 |
| `components/selection/product/TrendChart.tsx` | 趋势图 |
| `app/admin/page.tsx` | 仪表盘图表 |

可按图表类型统一封装一个 `createECharts` 工厂函数，各业务图表不再各自 import echarts。

### 2. 纯展示的大列表组件必须使用 React.memo

**当前问题**：`React.memo` 全项目零使用。以下纯展示组件在父组件 re-render 时会不必要地重新渲染，应包裹 `React.memo`：

| 组件 | 文件 | 场景 |
|------|------|------|
| `ItemRow` | `components/items/views/ItemRow.tsx` | 商品列表行，列表可能上百条 |
| `MobileProductCard` | `components/items/views/MobileProductCard.tsx` | 移动端商品卡片 |
| `MiniTrendChart` | `components/selection/product/MiniTrendChart.tsx` | SVG 迷你趋势图，在列表中大量渲染 |
| `AccountRow` | admin/accounts 中各账号行 | 账号列表行 |
| 所有 ECharts 图表组件 | `components/ui/echart/` + `components/selection/product/` | 图表初始化开销大 |

```tsx
// ✅ 纯展示组件包裹 React.memo
export const ItemRow = React.memo(function ItemRow({ item }: { item: Item }) {
  return <div>...</div>
})

// ✅ 需要自定义比较时使用第二个参数
export const ItemRow = React.memo(
  function ItemRow({ item }: { item: Item }) { ... },
  (prev, next) => prev.item.id === next.item.id && prev.item.updatedAt === next.item.updatedAt
)
```

### 3. 超过 100 项的列表必须使用虚拟滚动

**当前问题**：`ProductMonitorTab.tsx` 使用无限滚动 + IntersectionObserver 加载更多，但 DOM 中所有已加载项永不被回收。当列表增长到数百项时性能会显著下降。

```tsx
// ❌ 当前 — 无限滚动但 DOM 不回收
const items = data?.pages.flatMap(p => p.items) ?? [] // 只增不减
{items.map(item => <ItemRow key={item.id} item={item} />)}

// ✅ 使用 @tanstack/react-virtual（推荐，已有 React Query 技术栈）
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // 每项预估高度
  })
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(vItem => (
          <div key={vItem.key} style={{ position: 'absolute', top: 0, transform: `translateY(${vItem.start}px)` }}>
            <ItemRow item={items[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

适用场景：
- 商品列表（可能数百项）
- 账号列表（多账号场景）
- 发布实例列表
- 关键词/商家监控列表

**例外**：使用无限滚动分页且每次翻页仅加载 10-20 项的场景可暂不强制，但 `ProductMonitorTab` 的单页加载量大需优先改造。

### 4. 非首屏组件必须使用 next/dynamic 懒加载

**当前问题**：`next/dynamic` 零使用，所有组件在首屏全部加载。

```tsx
// ✅ 非首屏组件懒加载
import dynamic from 'next/dynamic'

const ChartPanel = dynamic(() => import('@/components/selection/product/TrendChart'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // ECharts 组件不需要 SSR
})

const AdminDashboard = dynamic(() => import('@/app/admin/page'))
```

应懒加载的组件：
- ECharts 图表组件（所有 8 处）—— 首屏不可见
- admin 仪表盘下的所有图表
- 抽屉/弹窗内的重组件（`ProductDiagnosticDrawer` 的图表）
- 移动端 Tab 切换的次要 Tab 内容

### 5. 所有 img 标签必须加 loading="lazy"

**当前问题**：全项目 0 处使用原生懒加载。

```tsx
// ✅ 所有 img 添加 lazy loading
<img src={url} alt="商品图片" loading="lazy" />
```

Next.js `Image` 组件默认支持懒加载，但使用原生 `<img>` 时必须手动添加。

### 6. 所有服务器数据必须通过 React Query 管理

**当前问题**：`app/admin/proxy/page.tsx:263` 使用裸 `useEffect + useState` 请求数据，无缓存、无去重、无后台刷新。

```tsx
// ❌ 禁止 — 裸 useEffect + useState 请求服务器数据
const [data, setData] = useState([])
useEffect(() => { fetchData().then(setData) }, [page])

// ✅ 使用 React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['proxies', page],
  queryFn: () => fetchProxies(page),
})
```

全局配置（`lib/api/queryClient.tsx`）已设置合理的 staleTime/gcTime，直接使用 useQuery 即可获得：
- 请求去重（同一 queryKey 不会重复请求）
- 后台刷新（stale 数据自动更新）
- 错误重试（retry: 1）
- 离线缓存

### 7. 事件处理器必须使用 useCallback（避免内联函数）

**当前问题**：项目中 264 处 `onClick={() => ...}` 内联箭头函数，每次渲染创建新函数引用。在列表中尤为昂贵（每个 item 的新引用导致子组件 props 变化）。

```tsx
// ❌ 避免 — 列表中的内联事件处理器
{items.map(item => (
  <button onClick={() => handleDelete(item.id)}>删除</button>
))}

// ✅ 抽取为 memoized 回调组件
function DeleteButton({ id, onDelete }: { id: string; onDelete: (id: string) => void }) {
  const handleClick = useCallback(() => onDelete(id), [id, onDelete])
  return <button onClick={handleClick}>删除</button>
}
// 再配合 React.memo：(prev, next) => prev.id === next.id
```

优先处理列表渲染中的内联事件处理器（`ItemRow`、`AccountTable`、`RuleTable` 等），单次渲染的独立按钮可放宽。

### 8. 优先使用 queryClient.setQueryData 做乐观更新

**当前问题**：items 页 mutation 后 `invalidateQueries` 两次（`items` + `itemStats`），导致两轮网络请求。改用 `setQueryData` 乐观更新可消除一轮请求。

```tsx
// ❌ 当前 — 双重 invalidate
await mutation.mutateAsync(data)
queryClient.invalidateQueries({ queryKey: ['items'] })
queryClient.invalidateQueries({ queryKey: ['itemStats'] })

// ✅ 乐观更新（仅更新受影响的字段）
await mutation.mutateAsync(data, {
  onSuccess: (updatedItem) => {
    queryClient.setQueryData(['items'], (old: Item[]) =>
      old?.map(i => i.id === updatedItem.id ? { ...i, ...updatedItem } : i)
    )
    // 如果 itemStats 可通过 items 计算，在此更新而非 invalidate
  }
})
```

参考实现：`components/publish/PublishInstanceList.tsx` 中已有的 `setQueryData` 模式。

### 9. 图表组件（ECharts）在移动端使用 MiniTrendChart（SVG）替代

**当面正面案例**：`components/selection/product/MiniTrendChart.tsx` 使用纯 SVG（90x32px）实现迷你趋势图，零外部依赖，极低开销。

移动端卡片/列表中的趋势图表应使用 `MiniTrendChart` 而非完整 ECharts 实例。ECharts 仅在桌面端展开详情或完整仪表盘中使用。

`MiniTrendChart` props：
```tsx
interface MiniTrendChartProps {
  hourlyData: number[]   // 24 小时数据点
  slope: number           // 趋势斜率
  dailyAvg: number        // 日均值
  cv: number              // 变异系数
  color: 'amber' | 'blue' | 'violet'  // 颜色主题
}
```

## 编码检查清单

每次提交前确认：

- [ ] 新增 ECharts 图表使用按需导入（非 `import * as echarts`）
- [ ] 新增列表组件（> 50 项）使用 `React.memo`
- [ ] 新增列表组件（> 100 项）使用虚拟滚动
- [ ] 新增非首屏组件使用 `next/dynamic` 懒加载
- [ ] 新增 `<img>` 标签有 `loading="lazy"`
- [ ] 服务器数据请求使用 React Query（非裸 `useEffect + useState`）
- [ ] 列表中的事件处理器使用 `useCallback` + `React.memo`
- [ ] mutation 后优先 `setQueryData` 乐观更新，再考虑 `invalidateQueries`
- [ ] 移动端图表优先使用 `MiniTrendChart`（SVG），非 ECharts
