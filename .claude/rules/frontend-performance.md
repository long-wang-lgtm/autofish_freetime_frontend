# 性能检查清单

## 性能规范

### 1. ECharts 必须按需导入

禁止使用 `import * as echarts from 'echarts'` 全量导入（约 200KB gzipped）。改为从 `echarts/core`、`echarts/charts`、`echarts/components`、`echarts/renderers` 按需导入，通过 `echarts.use([])` 注册所需模块。具体组件清单见 docs/CHART_PATTERNS.md。

### 2. 纯展示的大列表组件必须使用 React.memo

纯展示组件在父组件 re-render 时会产生不必要的重新渲染，应包裹 `React.memo`。需要自定义比较时使用第二个参数，比较关键标识字段（如 `id` + `updatedAt`）。

适用组件类型：商品列表行、移动端商品卡片、SVG 迷你趋势图、账号列表行、所有 ECharts 图表组件。

**阈值**：列表项超过 50 条时必须使用 `React.memo`。

### 3. 超过 100 项的列表必须使用虚拟滚动

列表项超过 100 项时，必须使用虚拟滚动（推荐 @tanstack/react-virtual）回收不可见项的 DOM 节点。每项预估高度 64px，固定容器高度配合 `overflow: auto`。

适用场景：商品列表、账号列表、发布实例列表、关键词/商家监控列表。

**例外**：使用无限滚动分页且每次翻页仅加载 10-20 项的场景可暂不强制。

### 4. 非首屏组件必须使用 next/dynamic 懒加载

非首屏可见的组件必须使用 `next/dynamic` 懒加载，配合 loading 占位组件。ECharts 图表组件设置 `ssr: false`。

应懒加载的组件：ECharts 图表组件、admin 仪表盘图表、抽屉/弹窗内的重组件、移动端次要 Tab 内容。

### 5. 所有 img 标签必须加 loading="lazy"

所有原生 `<img>` 标签必须添加 `loading="lazy"` 属性。Next.js `Image` 组件默认支持懒加载，但使用原生 img 时必须手动添加。

### 6. 所有服务器数据必须通过 React Query 管理

禁止使用裸 `useEffect + useState` 请求服务端数据。所有服务端数据请求必须通过 `useQuery` 管理，获得请求去重、后台刷新、错误重试（retry: 1）、离线缓存等能力。

全局配置（staleTime: 60s, gcTime: 5min, refetchOnWindowFocus: false）已适用于管理后台场景。

### 7. 事件处理器必须使用 useCallback（避免内联函数）

列表渲染中禁止使用内联箭头函数 `onClick={() => handleDelete(item.id)}`。应抽取为 memoized 回调组件，使用 `useCallback` + `React.memo` 避免每次渲染创建新函数引用。

优先处理列表渲染中的内联事件处理器，单次渲染的独立按钮可放宽。

### 8. 优先使用 queryClient.setQueryData 做乐观更新

mutation 完成后优先使用 `setQueryData` 乐观更新缓存，避免不必要的 `invalidateQueries` 网络请求。仅当影响多个实体或列表顺序可能改变时才使用 `invalidateQueries`。

决策规则详见 docs/STATE_PATTERNS.md。

### 9. 图表组件在移动端使用 MiniTrendChart（SVG）替代

移动端卡片/列表中的趋势图表应使用 MiniTrendChart（纯 SVG，90x32px，零外部依赖），而非完整 ECharts 实例。ECharts 仅在桌面端展开详情或完整仪表盘中使用。

MiniTrendChart props：`hourlyData`（24 小时数据点）、`slope`（趋势斜率）、`dailyAvg`（日均值）、`cv`（变异系数）、`color`（amber/blue/violet）。

## 编码检查清单

每次提交前确认：

- [ ] 新增 ECharts 图表使用按需导入（非全量导入）
- [ ] 新增列表组件（> 50 项）使用 React.memo
- [ ] 新增列表组件（> 100 项）使用虚拟滚动
- [ ] 新增非首屏组件使用 next/dynamic 懒加载
- [ ] 新增 img 标签有 loading="lazy"
- [ ] 服务器数据请求使用 React Query（非裸 useEffect + useState）
- [ ] 列表中的事件处理器使用 useCallback + React.memo
- [ ] mutation 后优先 setQueryData 乐观更新，再考虑 invalidateQueries
- [ ] 移动端图表优先使用 MiniTrendChart（SVG），非 ECharts

## 另见

- [图表实现规范](frontend-charts.md) — ECharts 按需导入和配色统一
- [状态管理规范](frontend-state.md) — React Query 配置和乐观更新
- [组件设计规范](frontend-components.md) — MiniTrendChart 组件约定
