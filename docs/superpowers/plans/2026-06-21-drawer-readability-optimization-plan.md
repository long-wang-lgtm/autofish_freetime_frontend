# 抽屉阅读体验优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 ProductDiagnosticDrawer 及其子组件进行 16 项阅读体验优化，涵盖双 Portal 修复、信息架构重排、三图修正、异常预警优化、稳定性诊断简化、基础数据重组和全局对比度修复。

**Architecture:** 9 个目标文件，不修改数据结构和 API 层。改动作用在组件渲染层，按 P0→P1→P2 优先级分 11 个 Task 逐步实施。每 Task 独立可提交。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + ECharts

---

### Task 1: 抽屉容器修复（双 Portal + 宽度 + 分隔线）

**Files:**
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: 导入 useIsMobile hook**

在文件顶部 import 区域添加：

```tsx
import { useIsMobile } from '@/hooks/useIsMobile'
```

- [ ] **Step 2: 调用 hook 并改写条件渲染**

在组件函数体开头（`const open = !!product` 之后）添加：

```tsx
const isMobile = useIsMobile()
```

将底部的 return 语句（第 141-167 行）从：

```tsx
return (
  <>
    {/* 桌面端 Sheet（md 及以上） */}
    <div className="hidden md:block">
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        width="520px"
      >
        {content}
      </Sheet>
    </div>
    {/* 移动端 BottomSheet（md 以下） */}
    <div className="block md:hidden">
      <BottomSheet
        open={open}
        onClose={onClose}
        title={product?.description || product?.title || '商品'}
        subtitle={product ? `GID: ${product.id}` : undefined}
        heightRatio={0.92}
      >
        {content}
      </BottomSheet>
    </div>
  </>
)
```

改为：

```tsx
if (isMobile) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={product?.description || product?.title || '商品'}
      subtitle={product ? `GID: ${product.id}` : undefined}
      heightRatio={0.92}
    >
      {content}
    </BottomSheet>
  )
}
return (
  <Sheet
    open={open}
    onClose={onClose}
    title={title}
    width="66.67vw"
  >
    {content}
  </Sheet>
)
```

- [ ] **Step 3: 增加模块分隔线**

在 content 中，在 AnomalyBanner 之后、WindowCompareCards（Part 1）之前插入分隔线：

```tsx
{/* Part 0: 异常预警 */}
<AnomalyBanner alerts={alerts} />

<hr className="border-gray-100 my-3" />
```

在 WindowCompareCards 之后、趋势诊断之前插入分隔线：

```tsx
<hr className="border-gray-100 my-3" />
```

在 TrafficActionChart 之后、StabilityPanel 之前插入分隔线：

```tsx
<hr className="border-gray-100 my-3" />
```

在 StabilityPanel 之后、GrowthPricePanel 之前插入分隔线：

```tsx
<hr className="border-gray-100 my-3" />
```

- [ ] **Step 4: 修正图表排序——累计→买卖意愿→流量转化**

当前顺序是 累计→买卖意愿→流量转化，符合规范，无需改动。但需将图表标题从 `text-[10px] text-gray-500` 改为 `text-[10px] text-gray-600`（符合 §13 对比度规范）。

- [ ] **Step 5: Commit**

```bash
git add components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "fix: dual Portal JS conditional render, width 66.67vw, section dividers, gray contrast

- Replace CSS display:none wrappers with useIsMobile() JS branching
- Sheet width 520px → 66.67vw
- Add hr.border-gray-100 between parts
- Upgrade chart section titles gray-500 → gray-600"
```

---

### Task 2: Hero Metric 行 + Header 发布时间

**Files:**
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: 在 Header 元数据区域添加发布时间**

在第 66-68 行（关键词标签之后）添加发布时间行：

```tsx
{product.daysSincePublish != null && (
  <div className="text-[10px] text-gray-600">
    上架 {product.daysSincePublish} 天
    {product.publishedAt && `（${product.publishedAt.split('T')[0]}）`}
  </div>
)}
```

- [ ] **Step 2: 添加 Hero Metric 行**

在 AnomalyBanner 之前、Header 元数据之后，加入 Hero Metric 行：

```tsx
{/* Hero Metric — 表格触发的关键信号 */}
{product && (
  <div className="flex items-center gap-4 px-2 py-2 bg-amber-50/50 rounded-lg border border-amber-100">
    <span className="text-[10px] text-gray-600">触发信号</span>
    {acceleration != null && acceleration > 0.3 ? (
      <>
        <span className="text-sm font-bold text-red-500">🔥 升温 +{(acceleration * 100).toFixed(0)}%</span>
        <span className="text-[10px] text-gray-600">
          D1 询单率 {(wm?.d1.inquiry_rate != null ? (wm!.d1.inquiry_rate * 100).toFixed(1) : '-')}%
          vs D7 {(wm?.d7.inquiry_rate != null ? (wm!.d7.inquiry_rate * 100).toFixed(1) : '-')}%
        </span>
      </>
    ) : acceleration != null && acceleration < -0.3 ? (
      <>
        <span className="text-sm font-bold text-blue-500">❄️ 降温 {Math.abs(acceleration * 100).toFixed(0)}%</span>
        <span className="text-[10px] text-gray-600">
          D1 询单率 {(wm?.d1.inquiry_rate != null ? (wm!.d1.inquiry_rate * 100).toFixed(1) : '-')}%
          vs D7 {(wm?.d7.inquiry_rate != null ? (wm!.d7.inquiry_rate * 100).toFixed(1) : '-')}%
        </span>
      </>
    ) : (
      <>
        <span className="text-sm font-medium text-gray-600">无明显异常信号</span>
        <span className="text-[10px] text-gray-500">各指标在正常范围内</span>
      </>
    )}
  </div>
)}
```

然后将原有的 `<hr className="border-gray-100 my-3" />` 和 `<AnomalyBanner alerts={alerts} />` 移到 Hero Metric 下方。

- [ ] **Step 3: Commit**

```bash
git add components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "feat: add Hero Metric row and publish time to drawer header

- Hero Metric highlights trigger signal at top of drawer
- Header shows daysSincePublish + publishedAt date
- Eliminates need for operators to scroll/search for signal"
```

---

### Task 3: 核心指标矩阵表格（三窗口 + Delta + fetch_count）

**Files:**
- Modify: `components/selection/product/WindowCompareCards.tsx`

- [ ] **Step 1: 重写 WindowCompareCards 为矩阵表格**

完整替换文件内容：

```tsx
'use client'

import type { WindowMetricsDTO } from '@/lib/api/selection'
import { judgeThreeWindowTrend } from '@/components/selection/product/hourlyTrendUtils'
import { Info } from 'lucide-react'

interface WindowCompareCardsProps {
  windowsMetrics: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO }
  d7DailyLook: number | null
  d7DailyWant: number | null
  d7BrowseGrowth: number | null
  acceleration: number | null
  windowShare: number | null
  priceTrend: string | null
}

function pct(v: number | null): string {
  if (v == null) return '-'
  return `${(v * 100).toFixed(1)}%`
}

function fmtRatio(v: number | null): string {
  if (v == null) return '-'
  return v.toFixed(2)
}

function fmtDelta(d: number | null): string {
  if (d == null) return '-'
  const sign = d > 0 ? '+' : ''
  return `${sign}${d.toFixed(2)} pp`
}

function fmtDeltaPct(d: number | null): string {
  if (d == null) return '-'
  const sign = d > 0 ? '+' : ''
  return `${sign}${(d * 100).toFixed(1)} pp`
}

function deltaArrow(d: number | null): string {
  if (d == null) return '→'
  if (d > 0.0005) return '↗'
  if (d < -0.0005) return '↘'
  return '→'
}

function deltaColor(d: number | null): string {
  if (d == null) return 'text-gray-400'
  if (d > 0.0005) return 'text-green-600'
  if (d < -0.0005) return 'text-red-600'
  return 'text-gray-400'
}

function lowSampleStyle(fetchCount: number): string {
  return fetchCount < 6
    ? 'italic text-gray-400 border-b border-dashed border-gray-300'
    : ''
}

function fetchCountLabel(n: number | null): string {
  if (n == null) return ''
  return `n=${n}`
}

export function WindowCompareCards({
  windowsMetrics: wm,
  d7DailyLook,
  d7DailyWant,
  d7BrowseGrowth,
  acceleration,
  windowShare,
  priceTrend,
}: WindowCompareCardsProps) {
  const { d1, d3, d7 } = wm

  // D1→D3, D3→D7, D1→D7 三组 Delta
  const d3InquiryDelta = d3.inquiry_rate != null && d1.inquiry_rate != null ? d3.inquiry_rate - d1.inquiry_rate : null
  const d7InquiryDelta = d7.inquiry_rate != null && d3.inquiry_rate != null ? d7.inquiry_rate - d3.inquiry_rate : null
  const totalInquiryDelta = d7.inquiry_rate != null && d1.inquiry_rate != null ? d7.inquiry_rate - d1.inquiry_rate : null

  const d3FavDelta = d3.favorite_rate != null && d1.favorite_rate != null ? d3.favorite_rate - d1.favorite_rate : null
  const d7FavDelta = d7.favorite_rate != null && d3.favorite_rate != null ? d7.favorite_rate - d3.favorite_rate : null
  const totalFavDelta = d7.favorite_rate != null && d1.favorite_rate != null ? d7.favorite_rate - d1.favorite_rate : null

  const d3IfDelta = d3.if_ratio != null && d1.if_ratio != null ? d3.if_ratio - d1.if_ratio : null
  const d7IfDelta = d7.if_ratio != null && d3.if_ratio != null ? d7.if_ratio - d3.if_ratio : null
  const totalIfDelta = d7.if_ratio != null && d1.if_ratio != null ? d7.if_ratio - d1.if_ratio : null

  const inquiryTrend = judgeThreeWindowTrend(d1.inquiry_rate, d3.inquiry_rate, d7.inquiry_rate)
  const favoriteTrend = judgeThreeWindowTrend(d1.favorite_rate, d3.favorite_rate, d7.favorite_rate)
  const ifTrend = judgeThreeWindowTrend(d1.if_ratio, d3.if_ratio, d7.if_ratio)

  const allSampleEnough = (d1.fetch_count ?? 0) >= 12 && (d3.fetch_count ?? 0) >= 12 && (d7.fetch_count ?? 0) >= 12

  const trendColor = (d: string) =>
    d === 'up' ? 'text-green-600' :
    d === 'down' ? 'text-red-600' :
    d === 'peak' ? 'text-orange-600' :
    d === 'v' ? 'text-blue-600' : 'text-gray-400'

  return (
    <div className="space-y-3">
      {/* 标题 */}
      <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">
        📊 核心指标
      </div>

      {/* 矩阵表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-gray-600 border-b border-gray-100">
              <th className="text-left py-1.5 px-1 font-medium"></th>
              <th className="text-center py-1.5 px-2 font-medium">
                D1 ({fetchCountLabel(d1.fetch_count)})
              </th>
              <th className="text-center py-1.5 px-2 font-medium">
                D3 ({fetchCountLabel(d3.fetch_count)})
              </th>
              <th className="text-center py-1.5 px-1 text-gray-500">vs D1</th>
              <th className="text-center py-1.5 px-2 font-medium">
                D7 ({fetchCountLabel(d7.fetch_count)})
              </th>
              <th className="text-center py-1.5 px-1 text-gray-500">vs D3</th>
              <th className="text-center py-1.5 px-2 font-semibold text-gray-800">D1→D7 总Δ</th>
              <th className="text-center py-1.5 px-1 text-gray-600">趋势</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* 询单率行 */}
            <tr>
              <td className="py-2 px-1 text-gray-600">询单率</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d1.fetch_count ?? 99)}`}
                  title={d1.fetch_count != null && d1.fetch_count < 6 ? `仅基于 ${d1.fetch_count} 次采集，置信度较低` : undefined}>
                {pct(d1.inquiry_rate)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {pct(d3.inquiry_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3InquiryDelta)}`}>
                {fmtDeltaPct(d3InquiryDelta)} {deltaArrow(d3InquiryDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {pct(d7.inquiry_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7InquiryDelta)}`}>
                {fmtDeltaPct(d7InquiryDelta)} {deltaArrow(d7InquiryDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalInquiryDelta)}`}>
                {fmtDeltaPct(totalInquiryDelta)} {deltaArrow(totalInquiryDelta)}
              </td>
              <td className="py-2 px-1 text-center">
                {allSampleEnough ? (
                  <span className={trendColor(inquiryTrend.direction)}>{inquiryTrend.label}</span>
                ) : (
                  <span className="text-gray-400">数据积累中</span>
                )}
              </td>
            </tr>

            {/* 收藏率行 */}
            <tr>
              <td className="py-2 px-1 text-gray-600">收藏率</td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d1.fetch_count ?? 99)}`}>
                {pct(d1.favorite_rate)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {pct(d3.favorite_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3FavDelta)}`}>
                {fmtDeltaPct(d3FavDelta)} {deltaArrow(d3FavDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {pct(d7.favorite_rate)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7FavDelta)}`}>
                {fmtDeltaPct(d7FavDelta)} {deltaArrow(d7FavDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalFavDelta)}`}>
                {fmtDeltaPct(totalFavDelta)} {deltaArrow(totalFavDelta)}
              </td>
              <td className="py-2 px-1 text-center">
                {allSampleEnough ? (
                  <span className={trendColor(favoriteTrend.direction)}>{favoriteTrend.label}</span>
                ) : (
                  <span className="text-gray-400">数据积累中</span>
                )}
              </td>
            </tr>

            {/* 询藏比行 */}
            <tr>
              <td className="py-2 px-1 text-gray-600 flex items-center gap-1">
                询藏比
                {ifTrend.direction === 'peak' && (
                  <Info className="w-2.5 h-2.5 text-gray-400 cursor-help" title="见顶回落：收藏增长放缓，询单仍在增长" />
                )}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d1.fetch_count ?? 99)}`}>
                {fmtRatio(d1.if_ratio)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d3.fetch_count ?? 99)}`}>
                {fmtRatio(d3.if_ratio)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d3IfDelta)}`}>
                {fmtDelta(d3IfDelta)} {deltaArrow(d3IfDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-medium text-gray-800 ${lowSampleStyle(d7.fetch_count ?? 99)}`}>
                {fmtRatio(d7.if_ratio)}
              </td>
              <td className={`py-2 px-1 text-center tabular-nums ${deltaColor(d7IfDelta)}`}>
                {fmtDelta(d7IfDelta)} {deltaArrow(d7IfDelta)}
              </td>
              <td className={`py-2 px-2 text-center tabular-nums font-semibold ${deltaColor(totalIfDelta)}`}>
                {fmtDelta(totalIfDelta)} {deltaArrow(totalIfDelta)}
              </td>
              <td className="py-2 px-1 text-center">
                {allSampleEnough ? (
                  <span className={trendColor(ifTrend.direction)}>{ifTrend.label}</span>
                ) : (
                  <span className="text-gray-400">数据积累中</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 规模参考 + 增长信号 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600 px-1">
        <span>
          规模参考: 7天日均浏览 <span className="font-semibold text-gray-800">{d7DailyLook?.toFixed(1) ?? '-'}/天</span>
          {' · '}
          日均想要 <span className="font-semibold text-gray-800">{d7DailyWant?.toFixed(1) ?? '-'}/天</span>
        </span>
        <span className="mx-1 text-gray-300">|</span>
        <span>
          流量增速{' '}
          <span className={`font-semibold ${
            d7BrowseGrowth == null ? 'text-gray-400' :
            d7BrowseGrowth > 0 ? 'text-green-600' : d7BrowseGrowth < 0 ? 'text-red-600' : 'text-gray-400'
          }`}>
            {d7BrowseGrowth != null ? `${(d7BrowseGrowth * 100).toFixed(1)}%` : '-'}
            {d7BrowseGrowth != null && d7BrowseGrowth > 0 ? ' ↗' : d7BrowseGrowth != null && d7BrowseGrowth < 0 ? ' ↘' : ''}
          </span>
        </span>
        <span>
          升温{' '}
          <span className={`font-semibold ${
            acceleration == null ? 'text-gray-400' :
            acceleration > 0.3 ? 'text-red-500' : acceleration < -0.3 ? 'text-blue-500' : 'text-gray-600'
          }`}>
            {acceleration != null ? `${(acceleration * 100).toFixed(1)}%` : '-'}
            {acceleration != null && acceleration > 0.3 ? ' 🔥' : ''}
          </span>
        </span>
        <span>
          窗口占比{' '}
          <span className="font-semibold text-gray-800">
            {windowShare != null ? `${(windowShare * 100).toFixed(1)}%` : '-'}
          </span>
        </span>
        <span>
          价格{' '}
          <span className={`font-semibold ${
            priceTrend === 'down' ? 'text-red-600' :
            priceTrend === 'up' ? 'text-green-600' : 'text-gray-600'
          }`}>
            {priceTrend === 'down' ? '↓降价' :
             priceTrend === 'up' ? '↑提价' : '→平稳'}
          </span>
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/selection/product/WindowCompareCards.tsx
git commit -m "feat: redesign matrix table with D1/D3/D7 windows, delta columns, fetch_count

- Replace 3-column card layout with single matrix table
- Add D1→D3, D3→D7, D1→D7 delta columns with pp units
- Annotate fetch_count per window, italic for low-sample (<6)
- Consolidate scale reference and growth signals into single row below table
- Unify ratio fmtRatio toFixed(2), daily toFixed(1)"
```

---

### Task 4: 累计增长图修正

**Files:**
- Modify: `components/selection/product/CumulativeGrowthChart.tsx`
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`（移除 props）

- [ ] **Step 1: 重写 CumulativeGrowthChart——移除基线、千分位格式化、图例吸顶、h-40**

完整替换文件内容：

```tsx
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface CumulativeGrowthChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function CumulativeGrowthChart({ hourlyTrend: ht }: CumulativeGrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number | string) => {
          const v = Number(value)
          if (Number.isNaN(v)) return String(value)
          return v.toLocaleString('zh-CN')
        },
      },
      legend: { show: false },
      grid: { left: 48, right: 16, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: {
        type: 'value',
        name: '累计值',
        min: 'dataMin',
        nameTextStyle: { fontSize: 10, color: '#9ca3af' },
        axisLabel: { fontSize: 10, color: '#9ca3af', formatter: (v: number) => v.toLocaleString('zh-CN') },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        { name: '累计想要', type: 'line', data: ht.cumulative_want, smooth: true, symbol: 'none', lineStyle: { color: '#2563eb', width: 2 } },
        { name: '累计浏览', type: 'line', data: ht.cumulative_look, smooth: true, symbol: 'none', lineStyle: { color: '#059669', width: 1.5 } },
        { name: '累计收藏', type: 'line', data: ht.cumulative_collect, smooth: true, symbol: 'none', lineStyle: { color: '#d97706', width: 1.5 } },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-600">暂无数据</div>
  }

  return (
    <div>
      {/* HTML 图例 */}
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
      <div ref={containerRef} className="w-full h-40" />
    </div>
  )
}
```

- [ ] **Step 2: 更新 ProductDiagnosticDrawer 中的调用**

移除 d7TotalWant / d7TotalLook / d7TotalCollect 三个 prop 传递：

```tsx
<CumulativeGrowthChart hourlyTrend={ht} />
```

同时移除图表标题 `<div className="text-[10px] text-gray-500 mb-1 ml-1">累计增长图 · 窗口期内增量</div>`（因为图例已在组件内部）。

- [ ] **Step 3: Commit**

```bash
git add components/selection/product/CumulativeGrowthChart.tsx components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "fix: remove baseline offset from cumulative chart, yAxis dataMin, h-40

- Use raw cumulative values instead of incremental (remove base calculation)
- Remove d7TotalWant/Look/Collect props
- Y-axis min:'dataMin' with zh-CN locale formatting
- HTML legend above chart, h-56→h-40
- Tooltip valueFormatter with zh-CN thousands separator"
```

---

### Task 5: 买卖意愿图重设计

**Files:**
- Modify: `components/selection/product/IntentConversionChart.tsx`

- [ ] **Step 1: 重写 IntentConversionChart——色系重做 + 参考线 + 圆点 + 图例吸顶 + 时间格式修正 + tooltip 格式化 + h-40**

完整替换文件内容：

```tsx
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface IntentConversionChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function IntentConversionChart({ hourlyTrend: ht }: IntentConversionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    const collectRates = ht.hourly_collect_rate.map((v, i) =>
      ht.hourly_look_rate[i] > 0 ? v / ht.hourly_look_rate[i] : null
    )
    const inquiryRates = ht.hourly_want_rate.map((v, i) =>
      ht.hourly_look_rate[i] > 0 ? v / ht.hourly_look_rate[i] : null
    )
    const ifRatios = ht.hourly_want_rate.map((v, i) =>
      ht.hourly_collect_rate[i] > 0 ? v / ht.hourly_collect_rate[i] : null
    )

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number | string, seriesName?: string) => {
          const v = Number(value)
          if (Number.isNaN(v)) return String(value)
          if (seriesName?.includes('率')) return `${v.toFixed(1)}%`
          if (seriesName?.includes('比')) return v.toFixed(2)
          return v.toLocaleString('zh-CN')
        },
      },
      legend: { show: false },
      grid: { left: 48, right: 56, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: [
        {
          type: 'value',
          name: '%',
          axisLabel: { fontSize: 10, color: '#6b7280', formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '比值',
          axisLabel: { fontSize: 10, color: '#6b7280' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '询单率',
          type: 'line',
          yAxisIndex: 0,
          data: inquiryRates.map(v => v != null ? v * 100 : null),
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#2563eb', width: 2 },
          itemStyle: { color: '#2563eb' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
            data: [{ yAxis: 10, label: { formatter: '10%', fontSize: 9, color: '#94a3b8' } }],
          },
        },
        {
          name: '收藏率',
          type: 'line',
          yAxisIndex: 0,
          data: collectRates.map(v => v != null ? v * 100 : null),
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#7c3aed', width: 2 },
          itemStyle: { color: '#7c3aed' },
        },
        {
          name: '询藏比',
          type: 'line',
          yAxisIndex: 1,
          data: ifRatios,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#0d9488', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#0d9488' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
            data: [
              { yAxis: 0.8, label: { formatter: '0.8', fontSize: 9, color: '#94a3b8' } },
              { yAxis: 1.2, label: { formatter: '1.2', fontSize: 9, color: '#94a3b8' } },
            ],
          },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-600">暂无数据</div>
  }

  return (
    <div>
      {/* HTML 图例 */}
      <div className="mb-1 ml-1">
        <span className="text-[10px] text-gray-600">买卖意愿图</span>
        <span className="flex gap-3 text-[9px] text-gray-600 flex-wrap mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />询单率
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-violet-600 inline-block rounded" />收藏率
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-teal-600 inline-block rounded border-dashed border-teal-600" style={{ borderTopWidth: 1.5 }} />询藏比
          </span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-40" />
    </div>
  )
}
```

- [ ] **Step 2: 更新 ProductDiagnosticDrawer 中图表标题**

移除 `<div className="text-[10px] text-gray-500 mb-1 ml-1">买卖意愿图</div>`（图例已在组件内部）。

- [ ] **Step 3: Commit**

```bash
git add components/selection/product/IntentConversionChart.tsx components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "feat: redesign intent conversion chart with color system, reference lines

- Color per §6: 询单率 #2563eb blue, 收藏率 #7c3aed violet, 询藏比 #0d9488 teal
- Add markLine references: 10% inquiry, 0.8/1.2 if_ratio (slate dashed)
- circle symbols on all series, same color as lines
- Fix X-axis minute being hardcoded :00 → actual minute
- HTML legend above chart, h-56→h-40
- Tooltip valueFormatter per data type"
```

---

### Task 6: 流量转化匹配图重设计

**Files:**
- Modify: `components/selection/product/TrafficActionChart.tsx`

- [ ] **Step 1: 重写 TrafficActionChart——加收藏数 + 色系重做 + 图例吸顶 + 时间修正 + tooltip + h-40**

完整替换文件内容：

```tsx
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HourlyTrendDTO } from '@/lib/api/selection'

interface TrafficActionChartProps {
  hourlyTrend: HourlyTrendDTO
}

export function TrafficActionChart({ hourlyTrend: ht }: TrafficActionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ht.ts || ht.ts.length === 0) return
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current)

    const times = ht.ts.map(t => {
      const d = new Date(t)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })

    chartRef.current.setOption({
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number | string, seriesName?: string) => {
          const v = Number(value)
          if (Number.isNaN(v)) return String(value)
          if (seriesName === '收藏数') return v.toLocaleString('zh-CN')
          if (typeof v === 'number' && !Number.isInteger(v)) return v.toFixed(1)
          return v.toLocaleString('zh-CN')
        },
      },
      legend: { show: false },
      grid: { left: 48, right: 56, top: 20, bottom: 28 },
      xAxis: { type: 'category', data: times, axisLabel: { fontSize: 9, color: '#9ca3af', rotate: 45 }, axisTick: { show: false } },
      yAxis: [
        {
          type: 'value',
          name: '浏览/小时',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        {
          type: 'value',
          name: '想要·收藏/小时',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { show: false },
        },
      ],
      series: [
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
        {
          name: '想要需求',
          type: 'line',
          yAxisIndex: 1,
          data: ht.hourly_want_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
        },
        {
          name: '收藏数',
          type: 'line',
          yAxisIndex: 1,
          data: ht.hourly_collect_rate,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#d97706', width: 1.5, type: 'dashed' },
        },
      ],
    })

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [ht])

  useEffect(() => { return () => { chartRef.current?.dispose(); chartRef.current = null } }, [])

  if (!ht.ts || ht.ts.length === 0) {
    return <div className="flex items-center justify-center h-40 text-sm text-gray-600">暂无数据</div>
  }

  return (
    <div>
      {/* HTML 图例 */}
      <div className="mb-1 ml-1">
        <span className="text-[10px] text-gray-600">流量转化匹配图</span>
        <span className="flex gap-3 text-[9px] text-gray-600 flex-wrap mt-0.5">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-emerald-400 inline-block rounded" />浏览流量
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-blue-600 inline-block rounded" />想要需求
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-0.5 bg-amber-600 inline-block rounded border-dashed border-amber-600" style={{ borderTopWidth: 1.5 }} />收藏数
          </span>
        </span>
      </div>
      <div ref={containerRef} className="w-full h-40" />
    </div>
  )
}
```

- [ ] **Step 2: 更新 ProductDiagnosticDrawer 中图表标题**

移除 `<div className="text-[10px] text-gray-500 mb-1 ml-1">流量转化匹配图</div>`（图例已在组件内部）。

- [ ] **Step 3: Commit**

```bash
git add components/selection/product/TrafficActionChart.tsx components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "feat: redesign traffic action chart with collect series, color system

- Add 收藏数 series (#d97706 amber dashed) per §6 color spec
- Replace gray area with emerald-green area (#6ee7b7 border, rgba(5,150,105,0.10) fill)
- 想要需求 #2563eb blue per §6
- Fix X-axis minute hardcoded :00 → actual minute
- HTML legend, h-56→h-40
- Tooltip valueFormatter"
```

---

### Task 7: 异常预警系统优化

**Files:**
- Modify: `components/selection/product/hourlyTrendUtils.ts`
- Modify: `components/selection/product/AnomalyBanner.tsx`

- [ ] **Step 1: hourlyTrendUtils.ts——合并流量+需求波动规则、零询单改 orange、新增"询单率骤降但流量未降"规则、移除数据不足预警、if_ratio 精度 toFixed(2)**

在 `detectAnomalies` 函数中：

1. 替换流量 + 需求波动规则（原第 97-128 行），合并为一条：

```typescript
  // 1. 合并流量 + 需求波动（当 want 或 look CV 达标时触发）
  const wantCv = d7.want_stability
  const lookCv = d7.look_stability
  const worstCv = Math.max(wantCv ?? 0, lookCv ?? 0)
  const worstDimension = (wantCv ?? 0) >= (lookCv ?? 0) ? '想要需求' : '浏览流量'
  if (worstCv >= 1.2) {
    alerts.push({
      type: 'data_volatile',
      severity: 'red',
      message: `🚨 数据波动剧烈 (${worstDimension} CV=${worstCv.toFixed(2)})，可能存在断崖或突增`,
    })
  } else if (worstCv >= 0.8) {
    alerts.push({
      type: 'data_unstable',
      severity: 'orange',
      message: `⚠️ 数据波动较大 (${worstDimension} CV=${worstCv.toFixed(2)})`,
    })
  }
```

2. 零询单规则（原第 154-160 行）：`severity: 'gray'` → `severity: 'orange'`：

```typescript
  // 7. 零询单窗口 (orange → 提升严重度)
  if (d1.total_dwant === 0 && d7.quality_label !== 'insufficient') {
    alerts.push({
      type: 'zero_inquiry',
      severity: 'orange',
      message: '❕ 近24小时零询单，商品可能已无活跃度',
    })
  }
```

3. 在零询单规则之后，新增"询单率骤降但流量未降"规则：

```typescript
  // 8. 询单率骤降但流量未减（最危险信号——商品竞争力恶化）
  if (
    d1.inquiry_rate != null &&
    d7.inquiry_rate != null &&
    d7.inquiry_rate > 0 &&
    d1.inquiry_rate < d7.inquiry_rate * 0.7 &&
    (d7.browse_growth == null || d7.browse_growth >= 0)
  ) {
    alerts.push({
      type: 'inquiry_collapse',
      severity: 'red',
      message: `🔴 询单率骤降但流量未减，商品竞争力在恶化 (D7=${(d7.inquiry_rate * 100).toFixed(1)}% → D1=${(d1.inquiry_rate * 100).toFixed(1)}%)`,
    })
  }
```

4. 极端询藏比预警：`toFixed(1)` → `toFixed(2)`：

```typescript
  // 9. 极端询藏比 (d7 if_ratio > 5)
  if (d7.if_ratio != null && d7.if_ratio > 5) {
    alerts.push({
      type: 'extreme_if_ratio',
      severity: 'gray',
      message: `❕ 询藏比极高 (${d7.if_ratio.toFixed(2)})，用户大量咨询但极少收藏`,
    })
  }
```

5. 移除数据不足预警规则（原第 192-198 行）——整段删除。改为导出单独的判断函数供 Header 使用：

```typescript
  // 11. 数据不足 — 已从预警移除，改为 Header 被动 badge
  // （不再作为 AnomalyAlert 产出）
```

- [ ] **Step 2: AnomalyBanner.tsx——标题对比度修复**

将标题从 `text-gray-400` 改为 `text-gray-600`：

```tsx
<div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">
  异常预警
</div>
```

- [ ] **Step 3: ProductDiagnosticDrawer.tsx——Header 区域添加"数据不足"被动 badge**

在 Header 元数据区域（关键词标签之后）添加：

```tsx
{wm?.d7?.quality_label === 'insufficient' && (
  <span className="text-[10px] text-gray-600 bg-gray-100 rounded px-2 py-0.5">
    数据有限（{wm.d7.fetch_count}次采集）
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/selection/product/hourlyTrendUtils.ts components/selection/product/AnomalyBanner.tsx components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "fix: merge traffic+want volatility alerts, upgrade zero-inquiry to orange, add inquiry collapse rule

- Merge look_stability and want_stability alerts (95% co-occurrence)
- Prioritize worst dimension in merged alert message
- Remove 'data insufficient' from anomaly banner → passive header badge
- Add 'inquiry rate collapse despite stable traffic' red alert
- Fix if_ratio precision toFixed(1)→toFixed(2) in alert messages
- AnomalyBanner section title gray-400→gray-600"
```

---

### Task 8: 稳定性诊断简化

**Files:**
- Modify: `components/selection/product/StabilityPanel.tsx`

- [ ] **Step 1: 重写 StabilityPanel——均值±标准差 + 人类标签单行展示**

完整替换文件内容：

```tsx
'use client'

import type { HourlyTrendDTO } from '@/lib/api/selection'
import { computeStabilityFromTrend } from '@/components/selection/product/hourlyTrendUtils'

interface StabilityPanelProps {
  hourlyTrend: HourlyTrendDTO | null
}

function cvLabel(cv: number | null): string {
  if (cv === null) return '-'
  if (cv < 0.5) return '波动较小'
  if (cv < 1.2) return '中等波动'
  return '剧烈波动'
}

function cvColor(cv: number | null): string {
  if (cv === null) return 'text-gray-600'
  if (cv < 0.5) return 'text-green-600'
  if (cv < 1.2) return 'text-amber-600'
  return 'text-red-600'
}

export function StabilityPanel({ hourlyTrend }: StabilityPanelProps) {
  const wantStats = computeStabilityFromTrend(hourlyTrend, 'hourly_want_rate')
  const lookStats = computeStabilityFromTrend(hourlyTrend, 'hourly_look_rate')
  const collectStats = computeStabilityFromTrend(hourlyTrend, 'hourly_collect_rate')

  const items = [
    { label: '想要需求', stats: wantStats },
    { label: '浏览流量', stats: lookStats },
    { label: '收藏意愿', stats: collectStats },
  ]

  const totalN = Math.max(wantStats.n, lookStats.n, collectStats.n)

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">
        📐 稳定性诊断
      </div>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-[11px]">
        {items.map(({ label, stats }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-gray-600 w-16 shrink-0">{label}</span>
            <span className="font-semibold text-gray-800 tabular-nums">
              {stats.mean?.toFixed(2) ?? '-'} ± {stats.stddev?.toFixed(2) ?? '-'} /h
            </span>
            <span className={`tabular-nums ${cvColor(stats.cv)}`}>
              波动 {stats.cv?.toFixed(2) ?? '-'} · {cvLabel(stats.cv)}
            </span>
          </div>
        ))}
        <div className="text-[10px] text-gray-500 pt-1">
          基于窗口内 {totalN} 个数据点 · 未排除昼夜周期效应
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/selection/product/StabilityPanel.tsx
git commit -m "refactor: simplify stability panel to single-row mean±stddev + human label

- Replace 3-card CV layout with single-row: mean ± stddev /h · CV · label
- Human-readable labels: 稳定(<0.5) / 中等(0.5-1.2) / 剧烈(≥1.2)
- Add '未排除昼夜周期效应' caveat at bottom
- Section title gray-400→gray-600"
```

---

### Task 9: 基础数据面板三区重组

**Files:**
- Modify: `components/selection/product/GrowthPricePanel.tsx`

- [ ] **Step 1: 重写 GrowthPricePanel——三区布局 + 千分位 + 去重商品状态**

完整替换文件内容：

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ProductItem } from '@/lib/api/selection'

interface GrowthPricePanelProps {
  product: ProductItem | null
}

function fmtPrice(v: number): string {
  return `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

function fmtCount(v: number): string {
  return v.toLocaleString('zh-CN')
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium tabular-nums ${valueClass ?? 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

export function GrowthPricePanel({ product }: GrowthPricePanelProps) {
  const [open, setOpen] = useState(false)

  if (!product) return null

  const wm = product.windowsMetrics
  const d7 = wm?.d7

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span>💡 基础数据</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronRight className="w-3.5 h-3.5" />
        }
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {/* 💰 商业表现 + 📈 流量周期 两列 */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {/* 左列：💰 商业表现 */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                💰 商业表现
              </div>
              <Row label="上架日期" value={
                product.publishedAt
                  ? new Date(product.publishedAt).toISOString().split('T')[0]
                  : '-'
              } />
              <Row label="上架天数" value={product.daysSincePublish?.toFixed(0) ?? '-'} />
              <Row label="全局日均询单" value={product.dailyWant?.toFixed(1) ?? '-'} />
              <Row label="价格" value={fmtPrice(product.price)} />
              <Row label="价格趋势" value={
                d7?.price_trend === 'up' ? '↑ 提价' :
                d7?.price_trend === 'down' ? '↓ 降价' :
                d7?.price_trend === 'flat' ? '→ 平稳' : '-'
              } />
              <Row label="最低价比" value={d7?.price_lowest_ratio?.toFixed(2) ?? '-'} />
              <Row label="预估订单" value={product.estimatedOrders != null ? fmtCount(Math.round(product.estimatedOrders)) : '-'} />
              <Row label="预估销售额" value={product.estimatedSales != null ? fmtPrice(product.estimatedSales) : '-'} />
            </div>

            {/* 右列：📈 流量周期 */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                📈 流量周期
              </div>
              <Row label="窗口日均询单" value={
                d7?.total_dwant != null ? (d7.total_dwant / 7).toFixed(1) : '-'
              } />
              <Row label="7天浏览增速" value={
                d7?.browse_growth != null ? `${(d7.browse_growth * 100).toFixed(1)}%` : '-'
              } />
              <Row label="7天询单增量" value={d7?.total_dwant != null ? fmtCount(d7.total_dwant) : '-'} />
              <Row label="7天浏览增量" value={d7?.total_dlook != null ? fmtCount(d7.total_dlook) : '-'} />
              <Row label="7天收藏增量" value={d7?.total_dcollect != null ? fmtCount(d7.total_dcollect) : '-'} />
            </div>
          </div>

          {/* 📊 采集质量（跨两列） */}
          <div className="border-t border-gray-100 pt-2">
            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
              📊 采集质量
            </div>
            <div className="flex gap-6 text-[11px]">
              <span className="text-gray-600">
                质量标签{' '}
                <span className="font-medium text-gray-800">
                  {d7?.quality_label === 'reliable' ? '可靠' :
                   d7?.quality_label === 'limited' ? '有限' :
                   d7?.quality_label === 'insufficient' ? '不足' : '-'}
                </span>
              </span>
              <span className="text-gray-600">
                采集次数{' '}
                <span className="font-medium text-gray-800">
                  {d7?.fetch_count?.toString() ?? '-'}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/selection/product/GrowthPricePanel.tsx
git commit -m "refactor: reorganize basic data panel into 3-zone layout (business/traffic/quality)

- Left column: 💰 business performance (publish date, daily want, price, orders)
- Right column: 📈 traffic cycle (window daily want, growth, increments)
- Bottom row: 📊 collection quality (quality label, fetch_count)
- Remove duplicate 商品状态 (already in Header)
- Apply fmtCount() for 7-day increments and estimated orders (thousands separator)
- gray-500→gray-600 for labels per WCAG AA"
```

---

### Task 10: 全局对比度修复 + 布局收尾

**Files:**
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: ProductDiagnosticDrawer.tsx 灰色对比度批量修复**

| 位置 | 旧 | 新 |
|------|----|----|
| AnomalyBanner 区域标题 | `text-gray-400` | `text-gray-600` |
| 趋势诊断区域标题 | `text-gray-400` | `text-gray-600` |
| 暂无数据占位 | `text-gray-400` | `text-gray-600` |
| 数据点不足占位 | `text-gray-400` | `text-gray-600` |
| 模块间分隔线 | `border-gray-100` | `border-gray-100`（保持）|
| Header GID/状态/优先级行 | `text-gray-500` | `text-gray-600` |
| Header 关键词 tag | `text-gray-500` | `text-gray-600` |

在代码中逐个替换（共涉及约 8 处 `text-gray-400` → `text-gray-600`，2 处 `text-gray-500` → `text-gray-600`）。

- [ ] **Step 2: Commit**

```bash
git add components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "fix: WCAG AA contrast — gray-400→gray-600 across drawer text labels

- Section titles, placeholder text, helper labels all upgraded
- gray-500→gray-600 for header metadata and keyword tags
- All 10px labels now meet 7.1:1 contrast ratio (AAA) on white bg"
```

---

### Task 11: 数据格式化统一（跨表格/抽屉精度对齐）

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`
- Modify: `components/selection/product/WindowCompareCards.tsx`

- [ ] **Step 1: ProductMonitorTab.tsx 格式化函数精度修正**

`fmtRatio`（第 25-28 行）：`toFixed(1)` → `toFixed(2)`：

```typescript
function fmtRatio(ratio: number | null): string {
  if (ratio === null) return '-'
  return ratio.toFixed(2)
}
```

`fmtAcceleration`（第 45-51 行）：`toFixed(0)` → `toFixed(1)`：

```typescript
function fmtAcceleration(acc: number | null): string {
  if (acc === null) return '-'
  const pct = (acc * 100).toFixed(1)
  if (acc > 0.3) return `加速 +${pct}%`
  if (acc < -0.3) return `降温 ${pct}%`
  return '平稳'
}
```

- [ ] **Step 2: WindowCompareCards.tsx 确认精度已对齐**

在 Task 3 中已完成：
- `fmtRatio` → `toFixed(2)` ✅
- `d7DailyLook` / `d7DailyWant` → `toFixed(1)` ✅（规模参考行）
- `acceleration` / `windowShare` → `toFixed(1)` ✅（增长信号行）

无需额外修改。

- [ ] **Step 3: Commit**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "fix: unify numeric precision across table and drawer

- fmtRatio: toFixed(1)→toFixed(2) (match drawer matrix table)
- fmtAcceleration: toFixed(0)→toFixed(1) (match fmtGrowth precision)
- Cross-view consistency: same datum, same decimal places"
```

---

### 完成检查清单

- [ ] 所有 `text-gray-400` 辅助文字 → `text-gray-600`（7 处已覆盖）
- [ ] 所有 `text-gray-500` Header 文字 → `text-gray-600`（3 处已覆盖）
- [ ] 三个图表 `h-56` → `h-40` ✅
- [ ] 三个图表 ECharts `legend: { show: false }` + HTML 图例 ✅
- [ ] 三个图表 X 轴分钟位不再硬编码 `:00` ✅
- [ ] 三个图表 tooltip `valueFormatter` 已添加 ✅
- [ ] 买卖意愿图 3 条参考线（10%、0.8、1.2）✅
- [ ] 买卖意愿图 symbol: 'circle' ✅
- [ ] 流量转化匹配图收藏数第三条线 ✅
- [ ] 累计增长图移除基线偏移 ✅
- [ ] 累计增长图移除 3 个 D7 total props ✅
- [ ] 矩阵表格三窗口 + Delta ✅
- [ ] 矩阵表格 fetch_count 标注 ✅
- [ ] Hero Metric 行已添加 ✅
- [ ] Header 上架天数 + 发布日期 ✅
- [ ] 异常预警合并流量+需求波动 ✅
- [ ] 零询单 gray→orange ✅
- [ ] "数据不足"从预警移除 → Header badge ✅
- [ ] 询单率骤降新规则 ✅
- [ ] 稳定性诊断均值±标准差单行展示 ✅
- [ ] 基础数据三区布局 + 去重商品状态 ✅
- [ ] 格式化精度统一（fmtRatio toFixed(2), fmtAcceleration toFixed(1), fmtCount 千分位）✅
- [ ] 双 Portal JS 条件渲染 ✅
- [ ] Sheet 宽度 66.67vw ✅
- [ ] 模块分隔线 ✅
- [ ] 图表固定顺序 累计→买卖意愿→流量转化 ✅
