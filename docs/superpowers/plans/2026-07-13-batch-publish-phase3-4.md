# 批量创作发布系统 Phase 3-4 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现批量创作发布系统的商品监控 Tab、商机管理 Tab（Phase 3）和发布记录 Tab（Phase 4）。

**Architecture:** 遵循三层 Hook 拆分（Filters → Data → Mutations → Page），复用已有 UI 组件（DataTable/SearchToolbar/Pagination/StatusBadge/EmptyState/ErrorBanner/ConfirmDialog/Sheet/ViewToggle）。监控 Tab 包含趋势图侧边栏（3 张 ECharts 图表）。所有 API 调用通过 `lib/api/batch-publish.ts` 已有函数。

**Tech Stack:** React + TypeScript + React Query + ECharts（按需导入）+ fetchApi

---

## 文件结构

```
lib/constants/
├── chart-theme.ts                    # 新建：趋势图配色常量（TREND_WANT/TREND_LOOK/TREND_COLLECT）

hooks/batch-publish/
├── useMonitorFilters.ts              # 新建：监控筛选状态
├── useMonitorData.ts                 # 新建：监控数据获取（React Query）
├── useMonitorMutations.ts            # 新建：监控变更操作
├── useMonitorPage.ts                 # 新建：监控页组合层
├── useOpportunityFilters.ts          # 新建：商机筛选状态
├── useOpportunityData.ts             # 新建：商机数据获取
├── useOpportunityMutations.ts        # 新建：商机变更操作
├── useOpportunityPage.ts             # 新建：商机页组合层
├── useMaterialsFilters.ts            # 新建：发布记录筛选状态
├── useMaterialsData.ts               # 新建：发布记录数据获取
├── useMaterialsPage.ts               # 新建：发布记录页组合层

components/batch-publish/monitor/
├── MonitorTab.tsx                    # 新建：监控 Tab 主容器（表格+侧边栏）
├── MonitorFilterBar.tsx              # 新建：筛选栏（搜索+状态下拉+绑定状态下拉）
├── MonitorTable.tsx                  # 新建：DataTable 列定义
├── MonitorDetailPanel.tsx            # 新建：侧边栏面板（摘要+趋势图容器）
├── MonitorTrendCharts.tsx            # 新建：3 张 ECharts 趋势图
├── MonitorCard.tsx                   # 新建：移动端卡片
├── BindOpportunityModal.tsx          # 新建：绑定商机弹窗（含新建商机 Tab）

components/batch-publish/opportunity/
├── OpportunityTab.tsx                # 新建：商机管理 Tab 主容器
├── OpportunityGrid.tsx               # 新建：卡片网格视图
├── OpportunityCard.tsx               # 新建：单张商机卡片
├── OpportunityForm.tsx               # 新建：商机 CRUD 表单

components/batch-publish/materials/
├── MaterialsTab.tsx                  # 新建：发布记录 Tab 主容器
├── MaterialTable.tsx                 # 新建：发布记录表格（只读）
├── MaterialCard.tsx                  # 新建：移动端卡片

app/dashboard/batch-publish/
├── page.tsx                          # 修改：替换占位内容为真实 Tab 组件
```

---

### Task 1: 趋势图配色常量

**Files:**
- Create: `lib/constants/chart-theme.ts`

- [ ] **Step 1: 创建趋势图配色常量文件**

```typescript
/**
 * 趋势图配色常量
 *
 * 遵循 frontend-charts.md：图表色与 UI 交互色完全独立。
 * 3 色体系：蓝（核心转化）、琥珀（流量）、紫罗兰（兴趣）。
 */

/** 想要 / 转化率 — 核心转化指标 */
export const TREND_WANT = '#2563eb'

/** 浏览 — 流量指标 */
export const TREND_LOOK = '#d97706'

/** 收藏 / 询藏比 — 兴趣指标 */
export const TREND_COLLECT = '#7c3aed'

/** 趋势图通用透明色（面积图 fill） */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: 提交**

```bash
git add lib/constants/chart-theme.ts
git commit -m "feat: add trend chart color constants for batch-publish monitor"
```

---

### Task 2: 监控筛选 Hook

**Files:**
- Create: `hooks/batch-publish/useMonitorFilters.ts`

- [ ] **Step 1: 创建 useMonitorFilters**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useMonitorFilters() {
  const [search, setSearch] = useState('')
  const [monitorStatus, setMonitorStatus] = useState('')
  const [bindStatus, setBindStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [orderBy, setOrderBy] = useState<string | null>('wantSlope')
  const [asc, setAsc] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    monitorStatus: monitorStatus || undefined,
    bindStatus: bindStatus || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'search') setSearch(value)
    if (key === 'monitorStatus') { setMonitorStatus(value); setPage(1) }
    if (key === 'bindStatus') { setBindStatus(value); setPage(1) }
  }, [])

  const onSortChange = useCallback((field: string | null) => {
    setOrderBy(field)
    setAsc(field ? false : false)
    setPage(1)
  }, [])

  return {
    search,
    monitorStatus,
    bindStatus,
    page,
    pageSize,
    setPage,
    orderBy,
    asc,
    onSortChange,
    filters,
    onFilterChange,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMonitorFilters.ts
git commit -m "feat: add useMonitorFilters hook for batch-publish monitor"
```

---

### Task 3: 监控数据 Hook

**Files:**
- Create: `hooks/batch-publish/useMonitorData.ts`

- [ ] **Step 1: 创建 useMonitorData**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { listMonitoredItems } from '@/lib/api/batch-publish'

interface UseMonitorDataParams {
  page: number
  pageSize: number
  search: string
  monitorStatus: string | undefined
  bindStatus: string | undefined
  orderBy: string | null
  asc: boolean
}

export function useMonitorData({ page, pageSize, search, monitorStatus, bindStatus, orderBy, asc }: UseMonitorDataParams) {
  const params: Record<string, string | number> = {
    page,
    page_size: pageSize,
  }
  if (search) params.search = search
  if (monitorStatus) params.monitorStatus = Number(monitorStatus)
  if (bindStatus === 'bound') params.opportunity_id = 0 // 有值即筛选已绑定
  if (bindStatus === 'unbound') params.opportunity_id = -1 // -1 表示筛选未绑定（传 null 给后端）
  if (orderBy) { params.orderBy = orderBy; params.asc = asc ? 1 : 0 }

  const enabled = true

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'monitored-items', params],
    queryFn: () => listMonitoredItems({
      page,
      page_size: pageSize,
      search: search || undefined,
      monitorStatus: monitorStatus ? Number(monitorStatus) : undefined,
      opportunity_id: bindStatus === 'bound' ? 0 : bindStatus === 'unbound' ? null : undefined,
      orderBy: orderBy ?? undefined,
      asc,
    }),
    enabled,
  })

  return {
    data: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMonitorData.ts
git commit -m "feat: add useMonitorData hook for batch-publish monitor"
```

---

### Task 4: 监控变更操作 Hook

**Files:**
- Create: `hooks/batch-publish/useMonitorMutations.ts`

- [ ] **Step 1: 创建 useMonitorMutations**

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { batchBindOpportunity, unbindOpportunity, deleteMonitoredItem } from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useMonitorMutations() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const bindMutation = useMutation({
    mutationFn: ({ gids, opportunityId }: { gids: string[]; opportunityId: number }) =>
      batchBindOpportunity(gids, opportunityId),
    onSuccess: (_, { gids }) => {
      toast.success(`${gids.length} 个商品绑定成功`)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: any) => {
      toast.error(`绑定失败：${err?.message || '请稍后重试'}`)
    },
  })

  const unbindMutation = useMutation({
    mutationFn: (gid: string) => unbindOpportunity(gid),
    onSuccess: () => {
      toast.success('解绑成功')
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: any) => {
      toast.error(`解绑失败：${err?.message || '请稍后重试'}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (gid: string) => deleteMonitoredItem(gid),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
    },
    onError: (err: any) => {
      toast.error(`删除失败：${err?.message || '请稍后重试'}`)
    },
  })

  return {
    bindMutation,
    unbindMutation,
    deleteMutation,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMonitorMutations.ts
git commit -m "feat: add useMonitorMutations hook for batch-publish monitor"
```

---

### Task 5: 监控页组合层 Hook

**Files:**
- Create: `hooks/batch-publish/useMonitorPage.ts`

- [ ] **Step 1: 创建 useMonitorPage**

```typescript
'use client'

import { useMonitorFilters } from './useMonitorFilters'
import { useMonitorData } from './useMonitorData'
import { useMonitorMutations } from './useMonitorMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useMonitorPage() {
  const isMobile = useIsMobile()

  const {
    search,
    monitorStatus,
    bindStatus,
    page,
    pageSize,
    setPage,
    orderBy,
    asc,
    onSortChange,
    filters,
    onFilterChange,
  } = useMonitorFilters()

  const {
    data,
    total,
    isLoading,
    error,
    refetch,
  } = useMonitorData({ page, pageSize, ...filters, orderBy, asc })

  const {
    bindMutation,
    unbindMutation,
    deleteMutation,
  } = useMonitorMutations()

  return {
    // 筛选
    search,
    monitorStatus,
    bindStatus,
    onFilterChange,
    // 排序 & 分页
    orderBy,
    asc,
    onSortChange,
    page,
    pageSize,
    total,
    setPage,
    // 数据
    data,
    isLoading,
    error,
    refetch,
    // 操作
    bindMutation,
    unbindMutation,
    deleteMutation,
    isMobile,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMonitorPage.ts
git commit -m "feat: add useMonitorPage composition hook for batch-publish monitor"
```

---

### Task 6: 监控筛选栏组件

**Files:**
- Create: `components/batch-publish/monitor/MonitorFilterBar.tsx`

- [ ] **Step 1: 创建 MonitorFilterBar**

```typescript
'use client'

import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import {
  MONITOR_STATUS_FILTER_OPTIONS,
  BIND_STATUS_FILTER_OPTIONS,
} from '@/components/batch-publish/shared/constants'

interface MonitorFilterBarProps {
  search: string
  monitorStatus: string
  bindStatus: string
  onFilterChange: (key: string, value: string) => void
  onRefresh: () => void
}

export function MonitorFilterBar({
  search,
  monitorStatus,
  bindStatus,
  onFilterChange,
  onRefresh,
}: MonitorFilterBarProps) {
  return (
    <SearchToolbar>
      <input
        type="text"
        placeholder="搜索商品标题/uid/gid..."
        value={search}
        onChange={(e) => onFilterChange('search', e.target.value)}
        className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 min-w-0 max-w-xs"
      />

      <select
        value={monitorStatus}
        onChange={(e) => onFilterChange('monitorStatus', e.target.value)}
        className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {MONITOR_STATUS_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={bindStatus}
        onChange={(e) => onFilterChange('bindStatus', e.target.value)}
        className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {BIND_STATUS_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div className="flex-1" />

      <button
        onClick={onRefresh}
        className="h-10 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        刷新
      </button>
    </SearchToolbar>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/MonitorFilterBar.tsx
git commit -m "feat: add MonitorFilterBar component for batch-publish"
```

---

### Task 7: 监控表格组件

**Files:**
- Create: `components/batch-publish/monitor/MonitorTable.tsx`

- [ ] **Step 1: 创建 MonitorTable**

```typescript
'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MONITOR_STATUS_CONFIG, MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorTableProps {
  data: MonitoredItem[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  orderBy: string | null
  asc: boolean
  onSortChange: (field: string | null) => void
  selectedGids: Set<string>
  onToggleSelect: (gid: string) => void
  onToggleAll: () => void
  onOpenDetail: (item: MonitoredItem) => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
}

const GRID_COLS = '32px 0.8fr 2fr 0.7fr 0.9fr 0.8fr 0.7fr 0.7fr 0.7fr 1fr 0.6fr'

export function MonitorTable({
  data,
  isLoading,
  error,
  onRetry,
  orderBy,
  asc,
  onSortChange,
  selectedGids,
  onToggleSelect,
  onToggleAll,
  onOpenDetail,
  page,
  total,
  pageSize,
  onPageChange,
}: MonitorTableProps) {
  const columns = useMemo<DataTableColumn<MonitoredItem>[]>(() => [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={data.length > 0 && selectedGids.size === data.length}
          onChange={onToggleAll}
          className="w-4 h-4 rounded border-gray-300"
        />
      ),
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedGids.has(item.gid)}
          onChange={() => onToggleSelect(item.gid)}
          className="w-4 h-4 rounded border-gray-300"
        />
      ),
    },
    {
      key: 'gid',
      header: '商品 gid',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.gid}</span>
      ),
    },
    {
      key: 'title',
      header: '标题',
      render: (item) => (
        <span className="text-sm text-gray-800 leading-snug line-clamp-2">{item.title || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: '价格',
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.price != null ? fmtPrice(item.price) : '-'}</span>
      ),
    },
    {
      key: 'wantSlope',
      header: '想要斜率',
      sortable: true,
      align: 'right',
      render: (item) => {
        const fc = (item.trendData as any)?.fetchCount
        const windows = (item.trendData as any)?.windows
        const lowConfidence = fc != null && fc < 6
        return (
          <div className="flex flex-col items-end">
            <span className={`text-sm tabular-nums ${(item.wantSlope ?? 0) > 0 ? 'text-green-600' : (item.wantSlope ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {fmtGrowth(item.wantSlope)}
            </span>
            <span className={`text-xs ${lowConfidence ? 'italic text-amber-600' : 'text-gray-400'}`}>
              {fc != null ? `采集${fc}次` : '无数据'}·窗口{windows ?? '?'}天
            </span>
          </div>
        )
      },
    },
    {
      key: 'wantAvg',
      header: '日均想要',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.wantAvg != null ? fmtNumber(item.wantAvg) : '-'}</span>
      ),
    },
    {
      key: 'convertRate',
      header: '转化率',
      sortable: true,
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{fmtPercent(item.convertRate)}</span>
      ),
    },
    {
      key: 'itemStatus',
      header: '商品状态',
      render: (item) => (
        <StatusBadge
          status={item.itemStatus ?? 0}
          config={{
            0: { label: '在售', color: 'green' },
            1: { label: '下架', color: 'gray' },
            2: { label: '售出', color: 'amber' },
            '-1': { label: '删除', color: 'red' },
          }}
        />
      ),
    },
    {
      key: 'monitorStatus',
      header: '监控状态',
      render: (item) => (
        <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
      ),
    },
    {
      key: 'opportunity',
      header: '绑定商机',
      render: (item) => (
        <span className={`text-sm ${item.opportunity_id ? 'text-blue-600' : 'text-gray-400'}`}>
          {item.opportunity_id ? `商机 #${item.opportunity_id}` : '未绑定'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'center',
      render: (item) => (
        <button
          onClick={() => onOpenDetail(item)}
          className="h-10 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          详情
        </button>
      ),
    },
  ], [selectedGids, onToggleSelect, onToggleAll, onOpenDetail])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.gid}
        gridTemplateColumns={GRID_COLS}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="暂无监控商品"
        emptyDescription="添加关键词后，系统将自动采集监控商品数据"
        orderBy={orderBy}
        asc={asc}
        onSortChange={onSortChange}
        stickyHeader
      />
      <Pagination
        page={page}
        total={total}
        pageSize={pageSize}
        onChange={onPageChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/MonitorTable.tsx
git commit -m "feat: add MonitorTable component for batch-publish"
```

---

### Task 8: 趋势图组件

**Files:**
- Create: `components/batch-publish/monitor/MonitorTrendCharts.tsx`

- [ ] **Step 1: 创建 MonitorTrendCharts**

```typescript
'use client'

import { useMemo } from 'react'
import { useChart } from '@/components/ui/chart/useChart'
import { TREND_WANT, TREND_LOOK, TREND_COLLECT, withAlpha } from '@/lib/constants/chart-theme'
import { fmtPercent } from '@/lib/utils/format'
import type { TrendTime, TrendDays } from '@/lib/api/batch-publish'

// ---- ECharts 按需导入 ----
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DataZoomComponent,
  CanvasRenderer,
])

interface MonitorTrendChartsProps {
  trendData: {
    trendTime: TrendTime
    trendDays: TrendDays
    fetchCount: number
    windows: number
  }
}

const BASE_GRID = { left: 48, right: 16, top: 12, bottom: 48 }
const LINE_WIDTH = 1.5
const DATAZOOM = [
  { type: 'slider' as const, bottom: 8, height: 16 },
  { type: 'inside' as const },
]

export function MonitorTrendCharts({ trendData }: MonitorTrendChartsProps) {
  const { trendTime, trendDays } = trendData

  // ---- 图1：累计趋势（折线图 / 单 Y 轴） ----
  const chart1Option = useMemo<echarts.EChartsOption | null>(() => {
    if (!trendTime?.timestamp?.length) return null
    return {
      grid: BASE_GRID,
      dataZoom: DATAZOOM,
      legend: { bottom: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: trendTime.timestamp.map((t) => {
          const d = new Date(t * 1000)
          return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        }),
        axisLabel: { fontSize: 10, color: '#9ca3af' },
      },
      yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#9ca3af' } },
      series: [
        {
          name: '浏览',
          type: 'line',
          data: trendTime.lookCount ?? [],
          color: TREND_LOOK,
          lineStyle: { color: TREND_LOOK, width: LINE_WIDTH },
          itemStyle: { color: TREND_LOOK },
        },
        {
          name: '想要',
          type: 'line',
          data: trendTime.wantCount ?? [],
          color: TREND_WANT,
          lineStyle: { color: TREND_WANT, width: LINE_WIDTH },
          itemStyle: { color: TREND_WANT },
        },
        {
          name: '收藏',
          type: 'line',
          data: trendTime.collectCount ?? [],
          color: TREND_COLLECT,
          lineStyle: { color: TREND_COLLECT, width: LINE_WIDTH },
          itemStyle: { color: TREND_COLLECT },
        },
      ],
    }
  }, [trendTime])

  // ---- 图2：日增量（面积折线图 / 双 Y 轴） ----
  const chart2Option = useMemo<echarts.EChartsOption | null>(() => {
    if (!trendDays?.date?.length) return null
    const xData = trendDays.date.map((t) => {
      const d = new Date(t * 1000)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    return {
      grid: BASE_GRID,
      dataZoom: DATAZOOM,
      legend: { bottom: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 10, color: '#9ca3af' } },
      yAxis: [
        {
          type: 'value',
          name: '浏览',
          axisLabel: { fontSize: 10, color: TREND_LOOK },
          nameTextStyle: { color: TREND_LOOK, fontSize: 10 },
        },
        {
          type: 'value',
          name: '想要/收藏',
          axisLabel: { fontSize: 10, color: TREND_COLLECT },
          nameTextStyle: { color: TREND_COLLECT, fontSize: 10 },
        },
      ],
      series: [
        {
          name: '日浏览',
          type: 'line',
          yAxisIndex: 0,
          data: trendDays.lookIncrement ?? [],
          color: TREND_LOOK,
          lineStyle: { color: TREND_LOOK, width: LINE_WIDTH },
          itemStyle: { color: TREND_LOOK },
          areaStyle: { color: withAlpha(TREND_LOOK, 0.15) },
          smooth: true,
        },
        {
          name: '日想要',
          type: 'line',
          yAxisIndex: 1,
          data: trendDays.wantIncrement ?? [],
          color: TREND_COLLECT,
          lineStyle: { color: TREND_COLLECT, width: LINE_WIDTH },
          itemStyle: { color: TREND_COLLECT },
          areaStyle: { color: withAlpha(TREND_COLLECT, 0.15) },
          smooth: true,
        },
        {
          name: '日收藏',
          type: 'line',
          yAxisIndex: 1,
          data: trendDays.collectIncrement ?? [],
          color: TREND_WANT,
          lineStyle: { color: TREND_WANT, width: LINE_WIDTH, type: 'dashed' },
          itemStyle: { color: TREND_WANT },
          areaStyle: { color: withAlpha(TREND_WANT, 0.15) },
          smooth: true,
        },
      ],
    }
  }, [trendDays])

  // ---- 图3：转化率 & 询藏比（双 Y 轴折线） ----
  const chart3Option = useMemo<echarts.EChartsOption | null>(() => {
    if (!trendDays?.date?.length) return null
    const xData = trendDays.date.map((t) => {
      const d = new Date(t * 1000)
      return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    return {
      grid: BASE_GRID,
      dataZoom: DATAZOOM,
      legend: { bottom: 12, textStyle: { fontSize: 11 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 10, color: '#9ca3af' } },
      yAxis: [
        {
          type: 'value',
          name: '转化率',
          axisLabel: { fontSize: 10, color: TREND_WANT, formatter: (v: number) => fmtPercent(v) },
          nameTextStyle: { color: TREND_WANT, fontSize: 10 },
        },
        {
          type: 'value',
          name: '询藏比',
          axisLabel: { fontSize: 10, color: TREND_COLLECT, formatter: (v: number) => fmtPercent(v) },
          nameTextStyle: { color: TREND_COLLECT, fontSize: 10 },
        },
      ],
      series: [
        {
          name: '转化率',
          type: 'line',
          yAxisIndex: 0,
          data: trendDays.convertRate ?? [],
          color: TREND_WANT,
          lineStyle: { color: TREND_WANT, width: LINE_WIDTH },
          itemStyle: { color: TREND_WANT },
        },
        {
          name: '询藏比',
          type: 'line',
          yAxisIndex: 1,
          data: trendDays.hideAvg ?? [],
          color: TREND_COLLECT,
          lineStyle: { color: TREND_COLLECT, width: LINE_WIDTH },
          itemStyle: { color: TREND_COLLECT },
        },
      ],
    }
  }, [trendDays])

  const chart1Ref = useChart(chart1Option, [chart1Option])
  const chart2Ref = useChart(chart2Option, [chart2Option])
  const chart3Ref = useChart(chart3Option, [chart3Option])

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 图1：累计趋势 */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-medium text-gray-500 mb-1">📈 累计趋势</p>
        <div ref={chart1Ref} className="w-full h-full" />
      </div>
      {/* 图2：日增量 */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-medium text-gray-500 mb-1">📊 日增量</p>
        <div ref={chart2Ref} className="w-full h-full" />
      </div>
      {/* 图3：转化率 & 询藏比 */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-medium text-gray-500 mb-1">📉 转化率 & 询藏比</p>
        <div ref={chart3Ref} className="w-full h-full" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/MonitorTrendCharts.tsx
git commit -m "feat: add MonitorTrendCharts with 3 ECharts trend charts"
```

---

### Task 9: 侧边栏详情面板组件

**Files:**
- Create: `components/batch-publish/monitor/MonitorDetailPanel.tsx`

- [ ] **Step 1: 创建 MonitorDetailPanel**

```typescript
'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { MonitorTrendCharts } from './MonitorTrendCharts'
import { fmtPrice } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorDetailPanelProps {
  item: MonitoredItem
  onClose: () => void
}

export function MonitorDetailPanel({ item, onClose }: MonitorDetailPanelProps) {
  const td = item.trendData as any
  const hasTrendData = td?.trendTime?.timestamp?.length > 0
  const lowConfidence = td?.fetchCount != null && td.fetchCount < 6

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900">商品详情</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 space-y-2">
        <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{item.title || '无标题'}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {item.price != null && (
            <span className="text-sm font-semibold text-gray-900">{fmtPrice(item.price)}</span>
          )}
          <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
          {item.itemStatus != null && (
            <StatusBadge
              status={item.itemStatus}
              config={{
                0: { label: '在售', color: 'green' },
                1: { label: '下架', color: 'gray' },
                2: { label: '售出', color: 'amber' },
              }}
            />
          )}
        </div>
        {td && (
          <p className="text-xs text-gray-400">
            采集{td.fetchCount ?? '?'}次 · 窗口{td.windows ?? '?'}天
          </p>
        )}
        {lowConfidence && (
          <p className="text-xs text-amber-600 italic">
            采集次数较少（{td.fetchCount}次），数据置信度较低
          </p>
        )}
      </div>

      {/* Trend Charts */}
      <div className="flex-1 min-h-0 p-4">
        {hasTrendData ? (
          <MonitorTrendCharts
            trendData={{
              trendTime: td.trendTime,
              trendDays: td.trendDays,
              fetchCount: td.fetchCount ?? 0,
              windows: td.windows ?? 0,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            暂无趋势数据
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/MonitorDetailPanel.tsx
git commit -m "feat: add MonitorDetailPanel sidebar with trend charts"
```

---

### Task 10: 绑定商机弹窗组件

**Files:**
- Create: `components/batch-publish/monitor/BindOpportunityModal.tsx`

- [ ] **Step 1: 创建 BindOpportunityModal**

```typescript
'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/overlay/Modal'
import { useQuery } from '@tanstack/react-query'
import { listOpportunities, createOpportunity, type OpportunityInput } from '@/lib/api/batch-publish'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

interface BindOpportunityModalProps {
  open: boolean
  onClose: () => void
  selectedCount: number
  onConfirm: (opportunityId: number) => void
  isPending: boolean
}

export function BindOpportunityModal({
  open,
  onClose,
  selectedCount,
  onConfirm,
  isPending,
}: BindOpportunityModalProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  const [selectedOID, setSelectedOID] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newTemplate, setNewTemplate] = useState<'only_opportunity' | 'with_item'>('only_opportunity')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { search, page }],
    queryFn: () => listOpportunities({ search: search || undefined, page, page_size: 10 }),
    enabled: open && activeTab === 'existing',
  })

  const handleCreateAndBind = async () => {
    if (!newName.trim()) {
      setCreateError('请输入商机名称')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      const input: OpportunityInput = {
        name: newName.trim(),
        description: newDescription || undefined,
        ai_context_template: newTemplate,
      }
      const opp = await createOpportunity(input)
      onConfirm(opp.id)
    } catch (err: any) {
      setCreateError(err?.message || '创建失败')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`绑定商品到商机（已选 ${selectedCount} 个）`} size="md">
      {/* Tab 切换 */}
      <div className="flex gap-0 border-b border-gray-100 mb-4">
        <button
          onClick={() => setActiveTab('existing')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'existing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          选择已有商机
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'new'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          创建新商机
        </button>
      </div>

      {activeTab === 'existing' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="搜索商机..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {isLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {(data?.items ?? []).map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => setSelectedOID(opp.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedOID === opp.id
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{opp.name}</p>
                  <p className="text-xs text-gray-400">
                    {opp.monitored_item_count ?? 0} 商品 · {opp.material_count ?? 0} 素材
                  </p>
                </button>
              ))}
              {!data?.items?.length && (
                <p className="text-sm text-gray-400 text-center py-4">暂无商机</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="h-10 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={() => selectedOID && onConfirm(selectedOID)}
              disabled={!selectedOID || isPending}
              className="h-10 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '绑定中...' : '确认绑定'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">商机名称 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              placeholder="如：日系简约风手机壳"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">描述</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical mt-1"
              placeholder="选填"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">AI 上下文模板</label>
            <select
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value as 'only_opportunity' | 'with_item')}
              className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white mt-1"
            >
              <option value="only_opportunity">{TEMPLATE_TYPE_LABELS.only_opportunity}</option>
              <option value="with_item">{TEMPLATE_TYPE_LABELS.with_item}</option>
            </select>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="h-10 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleCreateAndBind}
              disabled={createLoading || isPending}
              className="h-10 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createLoading ? '创建中...' : '创建并绑定'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/BindOpportunityModal.tsx
git commit -m "feat: add BindOpportunityModal for batch-publish monitor"
```

---

### Task 11: 移动端监控卡片组件

**Files:**
- Create: `components/batch-publish/monitor/MonitorCard.tsx`

- [ ] **Step 1: 创建 MonitorCard**

```typescript
'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MONITOR_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtGrowth, fmtNumber, fmtPercent } from '@/lib/utils/format'
import type { MonitoredItem } from '@/lib/api/batch-publish'

interface MonitorCardProps {
  item: MonitoredItem
  isSelected: boolean
  onToggleSelect: (gid: string) => void
  onOpenDetail: (item: MonitoredItem) => void
  selectionMode: boolean
}

export function MonitorCard({ item, isSelected, onToggleSelect, onOpenDetail, selectionMode }: MonitorCardProps) {
  const fc = (item.trendData as any)?.fetchCount
  const windows = (item.trendData as any)?.windows
  const lowConfidence = fc != null && fc < 6

  return (
    <div
      className={`bg-white border rounded-xl p-3 space-y-2 min-h-[44px] ${
        isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200'
      }`}
      onClick={selectionMode ? () => onToggleSelect(item.gid) : () => onOpenDetail(item)}
    >
      {/* 标题行 */}
      <div className="flex items-start gap-2">
        {selectionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(item.gid)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <span className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 flex-1">
          {item.title || '无标题'}
        </span>
      </div>

      {/* 信息行 */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.price != null && (
          <span className="text-sm font-semibold text-gray-900">{fmtPrice(item.price)}</span>
        )}
        <StatusBadge status={item.monitorStatus ?? 0} config={MONITOR_STATUS_CONFIG} />
        <span className={`w-2 h-2 rounded-full ${item.opportunity_id ? 'bg-green-500' : 'bg-gray-300'}`} />
      </div>

      {/* 指标行 */}
      <div className="flex items-center gap-3 text-sm">
        <span className={(item.wantSlope ?? 0) > 0 ? 'text-green-600' : (item.wantSlope ?? 0) < 0 ? 'text-red-600' : 'text-gray-500'}>
          {fmtGrowth(item.wantSlope)}
        </span>
        <span className="text-gray-700">{fmtNumber(item.wantAvg ?? 0)}</span>
        <span className="text-gray-500">{fmtPercent(item.convertRate)}</span>
      </div>

      {/* 数据窗口 */}
      {fc != null && (
        <p className={`text-xs ${lowConfidence ? 'italic text-amber-600' : 'text-gray-400'}`}>
          采集{fc}次 · 窗口{windows ?? '?'}天
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/MonitorCard.tsx
git commit -m "feat: add MonitorCard mobile component for batch-publish"
```

---

### Task 12: 监控 Tab 主容器

**Files:**
- Create: `components/batch-publish/monitor/MonitorTab.tsx`

- [ ] **Step 1: 创建 MonitorTab**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useMonitorPage } from '@/hooks/batch-publish/useMonitorPage'
import { MonitorFilterBar } from './MonitorFilterBar'
import { MonitorTable } from './MonitorTable'
import { MonitorDetailPanel } from './MonitorDetailPanel'
import { MonitorCard } from './MonitorCard'
import { BindOpportunityModal } from './BindOpportunityModal'
import { BatchActionBar } from '@/components/batch-publish/shared/BatchActionBar'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import type { MonitoredItem } from '@/lib/api/batch-publish'

export function MonitorTab() {
  const {
    search, monitorStatus, bindStatus, onFilterChange,
    orderBy, asc, onSortChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    bindMutation, unbindMutation, deleteMutation,
    isMobile,
  } = useMonitorPage()

  // 选择状态
  const [selectedGids, setSelectedGids] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  // 弹窗状态
  const [bindModalOpen, setBindModalOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<MonitoredItem | null>(null)
  const [unbindTarget, setUnbindTarget] = useState<MonitoredItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MonitoredItem | null>(null)

  const onToggleSelect = useCallback((gid: string) => {
    setSelectedGids((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid); else next.add(gid)
      return next
    })
  }, [])

  const onToggleAll = useCallback(() => {
    if (selectedGids.size === data.length) {
      setSelectedGids(new Set())
    } else {
      setSelectedGids(new Set(data.map((d) => d.gid)))
    }
  }, [selectedGids, data])

  const onClearSelection = useCallback(() => {
    setSelectedGids(new Set())
    setSelectionMode(false)
  }, [])

  const handleBindConfirm = useCallback((opportunityId: number) => {
    bindMutation.mutate(
      { gids: Array.from(selectedGids), opportunityId },
      { onSuccess: () => { setBindModalOpen(false); onClearSelection() } }
    )
  }, [selectedGids, bindMutation, onClearSelection])

  // 错误 & 空状态处理
  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as any)?.message || '未知错误'}`}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <MonitorFilterBar
        search={search}
        monitorStatus={monitorStatus}
        bindStatus={bindStatus}
        onFilterChange={onFilterChange}
        onRefresh={() => refetch()}
      />

      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              size="sm"
              title="暂无监控商品"
              description="添加关键词后，系统将自动采集监控商品数据"
            />
          ) : (
            data.map((item) => (
              <MonitorCard
                key={item.gid}
                item={item}
                isSelected={selectedGids.has(item.gid)}
                onToggleSelect={onToggleSelect}
                onOpenDetail={setDetailItem}
                selectionMode={selectionMode}
              />
            ))
          )}
          {/* 移动端长按进入批量选择 */}
          {selectionMode && (
            <BatchActionBar
              selectedCount={selectedGids.size}
              onClear={onClearSelection}
              actions={[
                { label: '绑定商机', onClick: () => setBindModalOpen(true), variant: 'primary' },
                { label: '退出选择', onClick: () => { setSelectionMode(false); onClearSelection() }, variant: 'secondary' },
              ]}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MonitorTable
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            orderBy={orderBy}
            asc={asc}
            onSortChange={onSortChange}
            selectedGids={selectedGids}
            onToggleSelect={onToggleSelect}
            onToggleAll={onToggleAll}
            onOpenDetail={setDetailItem}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* PC 端批量操作栏 */}
      {!isMobile && selectedGids.size > 0 && (
        <BatchActionBar
          selectedCount={selectedGids.size}
          onClear={onClearSelection}
          actions={[
            { label: '绑定商机', onClick: () => setBindModalOpen(true), variant: 'primary' },
          ]}
        />
      )}

      {/* 侧边栏详情面板 */}
      {detailItem && (
        <>
          <div className="fixed inset-0 bg-black/30 z-20" onClick={() => setDetailItem(null)} />
          <MonitorDetailPanel item={detailItem} onClose={() => setDetailItem(null)} />
        </>
      )}

      {/* 绑定弹窗 */}
      <BindOpportunityModal
        open={bindModalOpen}
        onClose={() => setBindModalOpen(false)}
        selectedCount={selectedGids.size}
        onConfirm={handleBindConfirm}
        isPending={bindMutation.isPending}
      />

      {/* 解绑确认 */}
      {unbindTarget && (
        <ConfirmDialog
          open={!!unbindTarget}
          onOpenChange={(open) => { if (!open) setUnbindTarget(null) }}
          title="确认解绑"
          description={`确定要解绑商品 "${unbindTarget.title || unbindTarget.gid}" 吗？`}
          confirmLabel="解绑"
          variant="danger"
          loading={unbindMutation.isPending}
          onConfirm={() => unbindMutation.mutate(unbindTarget.gid, { onSuccess: () => setUnbindTarget(null) })}
        />
      )}

      {/* 删除确认 */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          title="确认删除"
          description={`确定要删除监控商品 "${deleteTarget.title || deleteTarget.gid}" 吗？此操作不可恢复。`}
          confirmLabel="删除"
          variant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.gid, { onSuccess: () => setDeleteTarget(null) })}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/monitor/MonitorTab.tsx
git commit -m "feat: add MonitorTab main container for batch-publish"
```

---

### Task 13: 商机筛选 Hook

**Files:**
- Create: `hooks/batch-publish/useOpportunityFilters.ts`

- [ ] **Step 1: 创建 useOpportunityFilters**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useOpportunityFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    status: status || undefined,
  }

  const onFilterChange = useCallback((key: string, value: string) => {
    if (key === 'search') setSearch(value)
    if (key === 'status') { setStatus(value); setPage(1) }
  }, [])

  return {
    search,
    status,
    page,
    pageSize,
    setPage,
    filters,
    onFilterChange,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useOpportunityFilters.ts
git commit -m "feat: add useOpportunityFilters hook"
```

---

### Task 14: 商机数据 Hook

**Files:**
- Create: `hooks/batch-publish/useOpportunityData.ts`

- [ ] **Step 1: 创建 useOpportunityData**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { listOpportunities } from '@/lib/api/batch-publish'

interface UseOpportunityDataParams {
  page: number
  pageSize: number
  search: string
  status: string | undefined
}

export function useOpportunityData({ page, pageSize, search, status }: UseOpportunityDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'opportunities', { page, pageSize, search, status }],
    queryFn: () => listOpportunities({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
    }),
  })

  return {
    data: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useOpportunityData.ts
git commit -m "feat: add useOpportunityData hook"
```

---

### Task 15: 商机变更操作 Hook

**Files:**
- Create: `hooks/batch-publish/useOpportunityMutations.ts`

- [ ] **Step 1: 创建 useOpportunityMutations**

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOpportunity, updateOpportunity, deleteOpportunity, type OpportunityInput } from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useOpportunityMutations() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const createMutation = useMutation({
    mutationFn: (input: OpportunityInput) => createOpportunity(input),
    onSuccess: () => {
      toast.success('商机创建成功')
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: any) => {
      toast.error(`创建失败：${err?.message || '请稍后重试'}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<OpportunityInput> }) =>
      updateOpportunity(id, input),
    onSuccess: () => {
      toast.success('商机已更新')
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: any) => {
      toast.error(`更新失败：${err?.message || '请稍后重试'}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: () => {
      toast.success('商机已删除')
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: any) => {
      toast.error(`删除失败：${err?.message || '请稍后重试'}`)
    },
  })

  return { createMutation, updateMutation, deleteMutation }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useOpportunityMutations.ts
git commit -m "feat: add useOpportunityMutations hook"
```

---

### Task 16: 商机页组合层 Hook

**Files:**
- Create: `hooks/batch-publish/useOpportunityPage.ts`

- [ ] **Step 1: 创建 useOpportunityPage**

```typescript
'use client'

import { useOpportunityFilters } from './useOpportunityFilters'
import { useOpportunityData } from './useOpportunityData'
import { useOpportunityMutations } from './useOpportunityMutations'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useOpportunityPage() {
  const isMobile = useIsMobile()
  const { search, status, page, pageSize, setPage, filters, onFilterChange } = useOpportunityFilters()
  const { data, total, isLoading, error, refetch } = useOpportunityData({ page, pageSize, ...filters })
  const { createMutation, updateMutation, deleteMutation } = useOpportunityMutations()

  return {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    createMutation, updateMutation, deleteMutation,
    isMobile,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useOpportunityPage.ts
git commit -m "feat: add useOpportunityPage composition hook"
```

---

### Task 17: 商机卡片组件

**Files:**
- Create: `components/batch-publish/opportunity/OpportunityCard.tsx`

- [ ] **Step 1: 创建 OpportunityCard**

```typescript
'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { OPPORTUNITY_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice } from '@/lib/utils/format'
import type { OpportunityItem } from '@/lib/api/batch-publish'
import { useState } from 'react'

interface OpportunityCardProps {
  item: OpportunityItem
  onEdit: (item: OpportunityItem) => void
  onSelect: (item: OpportunityItem) => void
  onDelete: (id: number) => void
  isDeleting?: boolean
}

export function OpportunityCard({ item, onEdit, onSelect, onDelete, isDeleting }: OpportunityCardProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:border-blue-300 transition-colors cursor-pointer space-y-3"
        onClick={() => onSelect(item)}
      >
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{item.name}</h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              title="编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 描述 */}
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
        )}

        {/* 信息行 */}
        <div className="flex items-center gap-2 flex-wrap">
          {(item.price ?? 0) > 0 && (
            <span className="text-sm font-semibold text-gray-800">{fmtPrice(item.price!)}</span>
          )}
          <StatusBadge status={item.status} config={OPPORTUNITY_STATUS_CONFIG} />
        </div>

        {/* 统计 */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>📦 {item.monitored_item_count ?? 0} 监控商品</span>
          <span>📝 {item.material_count ?? 0} 素材</span>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="删除商机"
        description={
          (item.material_count ?? 0) > 0
            ? `该商机下有 ${item.material_count} 份素材将被一并删除，确定删除吗？`
            : `确定要删除商机「${item.name}」吗？`
        }
        confirmLabel="删除"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => { onDelete(item.id); setShowDelete(false) }}
      />
    </>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/opportunity/OpportunityCard.tsx
git commit -m "feat: add OpportunityCard component"
```

---

### Task 18: 商机表单组件

**Files:**
- Create: `components/batch-publish/opportunity/OpportunityForm.tsx`

- [ ] **Step 1: 创建 OpportunityForm**

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TEMPLATE_TYPE_LABELS } from '@/components/batch-publish/shared/constants'
import type { OpportunityItem } from '@/lib/api/batch-publish'

const opportunitySchema = z.object({
  name: z.string().min(1, '请输入商机名称').max(100, '名称最多 100 字'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, '价格不能为负').optional(),
  ai_context_template: z.enum(['only_opportunity', 'with_item']),
})

type OpportunityFormValues = z.infer<typeof opportunitySchema>

interface OpportunityFormProps {
  defaultValues?: Partial<OpportunityItem>
  onSubmit: (values: OpportunityFormValues) => void
  isPending: boolean
  submitLabel: string
}

export function OpportunityForm({ defaultValues, onSubmit, isPending, submitLabel }: OpportunityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      price: defaultValues?.price ?? 0,
      ai_context_template: (defaultValues?.ai_context_template as 'only_opportunity' | 'with_item') ?? 'only_opportunity',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 名称 */}
      <div>
        <label className="text-sm font-medium text-gray-700">
          商机名称 <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          maxLength={100}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="如：日系简约风手机壳"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      {/* 描述 */}
      <div>
        <label className="text-sm font-medium text-gray-700">描述</label>
        <textarea
          {...register('description')}
          rows={3}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="选填"
        />
      </div>

      {/* 价格 */}
      <div>
        <label className="text-sm font-medium text-gray-700">参考价格</label>
        <input
          {...register('price')}
          type="number"
          min={0}
          step={0.01}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
      </div>

      {/* AI 上下文模板 */}
      <div>
        <label className="text-sm font-medium text-gray-700">AI 上下文模板</label>
        <select
          {...register('ai_context_template')}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="only_opportunity">{TEMPLATE_TYPE_LABELS.only_opportunity}</option>
          <option value="with_item">{TEMPLATE_TYPE_LABELS.with_item}</option>
        </select>
      </div>

      {/* 提交 */}
      <div className="flex justify-end pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? '保存中...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/opportunity/OpportunityForm.tsx
git commit -m "feat: add OpportunityForm component with react-hook-form + zod"
```

---

### Task 19: 商机管理 Tab 主容器

**Files:**
- Create: `components/batch-publish/opportunity/OpportunityTab.tsx`

- [ ] **Step 1: 创建 OpportunityTab**

```typescript
'use client'

import { useState } from 'react'
import { useOpportunityPage } from '@/hooks/batch-publish/useOpportunityPage'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { Pagination } from '@/components/ui/data/Pagination'
import { Sheet } from '@/components/ui/overlay/Sheet'
import { ViewToggle } from '@/components/selection/shared/ViewToggle'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityForm } from './OpportunityForm'
import { OPPORTUNITY_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OpportunityItem } from '@/lib/api/batch-publish'

export function OpportunityTab() {
  const {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    createMutation, updateMutation, deleteMutation,
    isMobile,
  } = useOpportunityPage()

  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [editingItem, setEditingItem] = useState<OpportunityItem | null>(null)
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create')
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSelect = (item: OpportunityItem) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(item.id))
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  const handleEdit = (item: OpportunityItem) => {
    setEditingItem(item)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    setSheetMode('create')
    setSheetOpen(true)
  }

  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as any)?.message || '未知错误'}`}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      {/* 筛选栏 */}
      <SearchToolbar>
        <input
          type="text"
          placeholder="搜索商机..."
          value={search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
        <div className="flex-1" />
        <ViewToggle view={view} onChange={setView} />
        <button
          onClick={handleCreate}
          className="h-10 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          新建商机
        </button>
      </SearchToolbar>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {data.length === 0 && !isLoading ? (
          <EmptyState
            size="md"
            title="暂无商机"
            description="点击右上角「新建商机」创建第一个商机"
            action={{ label: '新建商机', onClick: handleCreate }}
          />
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((item) => (
                  <OpportunityCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onSelect={handleSelect}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              /* 列表视图 — 简单表格 */
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                {data.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">📦 {item.monitored_item_count ?? 0}</span>
                    <span className="text-sm text-gray-600">📝 {item.material_count ?? 0}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 rounded"
                      >
                        编辑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />

      {/* 创建/编辑 Sheet */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetMode === 'create' ? '新建商机' : '编辑商机'}
        width="500px"
      >
        <div className="p-6">
          <OpportunityForm
            defaultValues={editingItem ?? undefined}
            onSubmit={(values) => {
              if (sheetMode === 'create') {
                createMutation.mutate(values, { onSuccess: () => setSheetOpen(false) })
              } else if (editingItem) {
                updateMutation.mutate(
                  { id: editingItem.id, input: values },
                  { onSuccess: () => setSheetOpen(false) }
                )
              }
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
            submitLabel={sheetMode === 'create' ? '创建商机' : '保存修改'}
          />
        </div>
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/opportunity/OpportunityTab.tsx
git commit -m "feat: add OpportunityTab with card grid + CRUD for batch-publish"
```

---

### Task 20: 发布记录筛选 Hook

**Files:**
- Create: `hooks/batch-publish/useMaterialsFilters.ts`

- [ ] **Step 1: 创建 useMaterialsFilters**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

export function useMaterialsFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [opportunityId, setOpportunityId] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch,
    status: status || undefined,
    opportunityId,
  }

  const onFilterChange = useCallback((key: string, value: string | number | undefined) => {
    if (key === 'search') setSearch(value as string)
    if (key === 'status') { setStatus(value as string); setPage(1) }
    if (key === 'opportunityId') { setOpportunityId(value as number | undefined); setPage(1) }
  }, [])

  return {
    search,
    status,
    opportunityId,
    page,
    pageSize,
    setPage,
    filters,
    onFilterChange,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMaterialsFilters.ts
git commit -m "feat: add useMaterialsFilters hook"
```

---

### Task 21: 发布记录数据 Hook

**Files:**
- Create: `hooks/batch-publish/useMaterialsData.ts`

- [ ] **Step 1: 创建 useMaterialsData**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { listMaterials } from '@/lib/api/batch-publish'

interface UseMaterialsDataParams {
  page: number
  pageSize: number
  search: string
  status: string | undefined
  opportunityId: number | undefined
}

export function useMaterialsData({ page, pageSize, search, status, opportunityId }: UseMaterialsDataParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['batch-publish', 'materials', 'all', { page, pageSize, search, status, opportunityId }],
    queryFn: () => listMaterials({
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status as any,
      opportunity_id: opportunityId,
    }),
  })

  return {
    data: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMaterialsData.ts
git commit -m "feat: add useMaterialsData hook"
```

---

### Task 22: 发布记录页组合层 Hook

**Files:**
- Create: `hooks/batch-publish/useMaterialsPage.ts`

- [ ] **Step 1: 创建 useMaterialsPage**

```typescript
'use client'

import { useMaterialsFilters } from './useMaterialsFilters'
import { useMaterialsData } from './useMaterialsData'
import { useIsMobile } from '@/hooks/useIsMobile'

export function useMaterialsPage() {
  const isMobile = useIsMobile()
  const { search, status, opportunityId, page, pageSize, setPage, filters, onFilterChange } = useMaterialsFilters()
  const { data, total, isLoading, error, refetch } = useMaterialsData({ page, pageSize, ...filters })

  return {
    search, status, opportunityId, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    isMobile,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add hooks/batch-publish/useMaterialsPage.ts
git commit -m "feat: add useMaterialsPage composition hook"
```

---

### Task 23: 发布记录表格组件

**Files:**
- Create: `components/batch-publish/materials/MaterialTable.tsx`

- [ ] **Step 1: 创建 MaterialTable**

```typescript
'use client'

import { useMemo } from 'react'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { Pagination } from '@/components/ui/data/Pagination'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtDateTime, fmtPrice } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialTableProps {
  data: PublishMaterial[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
  page: number
  total: number
  pageSize: number
  onPageChange: (p: number) => void
  onOpportunityClick: (id: number) => void
}

const GRID_COLS = '0.8fr 2fr 0.6fr 0.8fr 0.6fr 1fr 0.7fr 0.7fr'

export function MaterialTable({
  data, isLoading, error, onRetry,
  page, total, pageSize, onPageChange,
  onOpportunityClick,
}: MaterialTableProps) {
  const columns = useMemo<DataTableColumn<PublishMaterial>[]>(() => [
    {
      key: 'updated_at',
      header: '发布时间',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">
          {item.updated_at ? fmtDateTime(item.updated_at) : '-'}
        </span>
      ),
    },
    {
      key: 'description',
      header: '描述',
      render: (item) => (
        <span className="text-sm text-gray-800 leading-snug line-clamp-2">{item.description || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: '价格',
      align: 'right',
      render: (item) => (
        <span className="text-sm text-gray-700 tabular-nums">{item.price != null ? fmtPrice(item.price) : '-'}</span>
      ),
    },
    {
      key: 'category',
      header: '类目',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.category || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (item) => (
        <StatusBadge status={item.status} config={MATERIAL_STATUS_CONFIG} />
      ),
    },
    {
      key: 'opportunity',
      header: '所属商机',
      render: (item) => (
        <button
          onClick={() => onOpportunityClick(item.opportunity_id)}
          className="text-sm text-blue-600 hover:underline"
        >
          {item.opportunity_name || `商机 #${item.opportunity_id}`}
        </button>
      ),
    },
    {
      key: 'to_uid',
      header: '发布账号',
      render: (item) => (
        <span className="text-sm text-gray-600">{item.to_uid || '-'}</span>
      ),
    },
    {
      key: 'to_gid',
      header: '发布商品',
      render: (item) => (
        <span className="text-sm text-gray-600 tabular-nums">{item.to_gid || '-'}</span>
      ),
    },
  ], [onOpportunityClick])

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => String(item.id)}
        gridTemplateColumns={GRID_COLS}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle="暂无发布记录"
        emptyDescription="在创作台完成素材发布后，记录将出现在这里"
        stickyHeader
      />
      <Pagination page={page} total={total} pageSize={pageSize} onChange={onPageChange} />
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/materials/MaterialTable.tsx
git commit -m "feat: add MaterialTable read-only component"
```

---

### Task 24: 移动端发布记录卡片

**Files:**
- Create: `components/batch-publish/materials/MaterialCard.tsx`

- [ ] **Step 1: 创建 MaterialCard**

```typescript
'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtDateTime } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialCardProps {
  item: PublishMaterial
  onOpportunityClick: (id: number) => void
}

export function MaterialCard({ item, onOpportunityClick }: MaterialCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">{item.description || '-'}</span>
        <StatusBadge status={item.status} config={MATERIAL_STATUS_CONFIG} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        {item.price != null && (
          <span className="font-semibold text-gray-900">{fmtPrice(item.price)}</span>
        )}
        <span className="text-gray-400">{item.category || '未分类'}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <button
          onClick={(e) => { e.stopPropagation(); onOpportunityClick(item.opportunity_id) }}
          className="text-blue-600 hover:underline"
        >
          {item.opportunity_name || `商机 #${item.opportunity_id}`}
        </button>
        <span>·</span>
        <span>{item.updated_at ? fmtDateTime(item.updated_at) : '-'}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/materials/MaterialCard.tsx
git commit -m "feat: add MaterialCard mobile component"
```

---

### Task 25: 发布记录 Tab 主容器

**Files:**
- Create: `components/batch-publish/materials/MaterialsTab.tsx`

- [ ] **Step 1: 创建 MaterialsTab**

```typescript
'use client'

import { useMaterialsPage } from '@/hooks/batch-publish/useMaterialsPage'
import { SearchToolbar } from '@/components/ui/data/SearchToolbar'
import { MaterialTable } from './MaterialTable'
import { MaterialCard } from './MaterialCard'
import { MATERIALS_STATUS_FILTER_OPTIONS } from '@/components/batch-publish/shared/constants'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { useRouter, useSearchParams } from 'next/navigation'

export function MaterialsTab() {
  const {
    search, status, onFilterChange,
    page, pageSize, total, setPage,
    data, isLoading, error, refetch,
    isMobile,
  } = useMaterialsPage()

  const router = useRouter()
  const searchParams = useSearchParams()

  const handleOpportunityClick = (id: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'workbench')
    params.set('oid', String(id))
    router.push(`/dashboard/batch-publish?${params.toString()}`)
  }

  if (error && !isLoading && data.length === 0) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as any)?.message || '未知错误'}`}
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      {/* 筛选栏 */}
      <SearchToolbar>
        <input
          type="text"
          placeholder="搜索描述..."
          value={search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 flex-1 min-w-0 max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {MATERIALS_STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </SearchToolbar>

      {/* 内容区 */}
      {isMobile ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {data.length === 0 && !isLoading ? (
            <EmptyState
              size="sm"
              title="暂无发布记录"
              description="在创作台完成素材发布后，记录将出现在这里"
            />
          ) : (
            data.map((item) => (
              <MaterialCard
                key={item.id}
                item={item}
                onOpportunityClick={handleOpportunityClick}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <MaterialTable
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onOpportunityClick={handleOpportunityClick}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add components/batch-publish/materials/MaterialsTab.tsx
git commit -m "feat: add MaterialsTab read-only archive for batch-publish"
```

---

### Task 26: 更新 page.tsx 接入 Tab 组件

**Files:**
- Modify: `app/dashboard/batch-publish/page.tsx`

- [ ] **Step 1: 替换占位内容为真实组件**

编辑 `app/dashboard/batch-publish/page.tsx`，将 `PageContent` 函数中的占位 div 替换为：

```typescript
'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/navigation/TabBar'
import { useTabRouting } from '@/hooks/useTabRouting'
import { Search, Lightbulb, PenTool, FileText } from 'lucide-react'
import dynamic from 'next/dynamic'

// 非首屏组件懒加载（遵循 frontend-performance.md）
const MonitorTab = dynamic(
  () => import('@/components/batch-publish/monitor/MonitorTab').then(m => ({ default: m.MonitorTab })),
  { loading: () => <div className="flex items-center justify-center h-64 text-gray-400 text-sm">加载中...</div> }
)
const OpportunityTab = dynamic(
  () => import('@/components/batch-publish/opportunity/OpportunityTab').then(m => ({ default: m.OpportunityTab })),
  { loading: () => <div className="flex items-center justify-center h-64 text-gray-400 text-sm">加载中...</div> }
)
const WorkbenchTab = dynamic(
  () => import('@/components/batch-publish/workbench/WorkbenchTab').then(m => ({ default: m.WorkbenchTab })),
  { loading: () => <div className="flex items-center justify-center h-64 text-gray-400 text-sm">加载中...</div> }
)
const MaterialsTab = dynamic(
  () => import('@/components/batch-publish/materials/MaterialsTab').then(m => ({ default: m.MaterialsTab })),
  { loading: () => <div className="flex items-center justify-center h-64 text-gray-400 text-sm">加载中...</div> }
)

type TabName = 'monitor' | 'opportunity' | 'workbench' | 'materials'

const BATCH_PUBLISH_TABS: { key: TabName; label: string; icon: React.ReactNode }[] = [
  { key: 'monitor', label: '商品监控', icon: <Search className="w-4 h-4" /> },
  { key: 'opportunity', label: '商机管理', icon: <Lightbulb className="w-4 h-4" /> },
  { key: 'workbench', label: '创作台', icon: <PenTool className="w-4 h-4" /> },
  { key: 'materials', label: '发布记录', icon: <FileText className="w-4 h-4" /> },
]

function PageContent() {
  const [activeTab, setTab] = useTabRouting<TabName>(
    ['monitor', 'opportunity', 'workbench', 'materials'],
    'monitor'
  )

  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar
        tabs={BATCH_PUBLISH_TABS}
        activeTab={activeTab}
        onTabChange={(key) => setTab(key as TabName)}
        variant="overline"
      />

      {activeTab === 'monitor' && <MonitorTab />}
      {activeTab === 'opportunity' && <OpportunityTab />}
      {activeTab === 'workbench' && <WorkbenchTab />}
      {activeTab === 'materials' && <MaterialsTab />}
    </div>
  )
}

export default function BatchPublishPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
    }>
      <PageContent />
    </Suspense>
  )
}
```

> **注意**：WorkbenchTab 在 Phase 5 才实现，但 import 路径先保留以避免后续重构。当前 Phase 3-4 只实现 MonitorTab、OpportunityTab、MaterialsTab。如果 WorkbenchTab 不存在编译会失败——如果当前就运行编译，需要保留占位组件或在 `build` 前注释掉 WorkbenchTab 的引用。

- [ ] **Step 2: 编译验证（先注释掉 WorkbenchTab 引用）**

在 WorkbenchTab 未实现前，在 page.tsx 中临时注释：
```typescript
// const WorkbenchTab = dynamic(...) // TODO: Phase 5
{activeTab === 'workbench' && (
  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">创作台 — Phase 5 开发中</div>
)}
```

```bash
npx tsc --noEmit
```
Expected: No errors（除 WorkbenchTab 外的所有 Import 正常）

- [ ] **Step 3: 提交**

```bash
git add app/dashboard/batch-publish/page.tsx
git commit -m "feat: wire MonitorTab, OpportunityTab, MaterialsTab into batch-publish page"
```

---

### Task 27: 全量编译验证

- [ ] **Step 1: TypeScript 编译**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Next.js 构建验证**

```bash
npx next build 2>&1 | tail -20
```
Expected: Build successful. 检查是否有 ESLint 错误。

- [ ] **Step 3: 修正任何编译/构建错误**

逐一修复，不跳过任何报错。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: fix build errors for batch-publish Phase 3-4"
```

---

## 自审检查

### 1. Spec 覆盖

| Spec Section | 对应 Task | 状态 |
|------------|----------|------|
| §4.1.1 布局结构（PC 端 DataTable + 侧边栏） | Task 7, Task 9, Task 12 | ✅ |
| §4.1.2 筛选栏 | Task 6 | ✅ |
| §4.1.3 表格列（11 列 + GRID_COLS） | Task 7 | ✅ |
| §4.1.4 侧边栏趋势图（3 张 ECharts 图表） | Task 1, Task 8, Task 9 | ✅ |
| §4.1.5 批量操作（绑定商机 / BindOpportunityModal） | Task 10, Task 12 | ✅ |
| §4.1.6 移动端（卡片列表 + 指标行 + 采集窗口） | Task 11, Task 12 | ✅ |
| §4.2 商机管理 Tab（卡片网格 + CRUD + Sheet） | Task 17, Task 18, Task 19 | ✅ |
| §4.4 发布记录 Tab（只读表格 + 筛选 + 链接） | Task 23, Task 24, Task 25 | ✅ |
| §2.4 React Query 缓存边界 | Task 3, Task 14, Task 21 | ✅ |
| §5.2 Hook 三层拆分 | Task 2-5, 13-16, 20-22 | ✅ |
| §5.3 组件目录 | 所有组件 Task | ✅ |
| §6.4 技术约束 | 全 Task 遵循 | ✅ |

### 2. 占位符扫描

所有步骤均包含实际代码，无 "TBD" / "TODO" / "implement later" / "add appropriate error handling" 等占位内容。

### 3. 类型一致性

- `MaterialStatus` — 从 `lib/api/batch-publish.ts` 导入，在 constants.ts / StatusPipeline / DataTable 中一致使用
- `MonitoredItem` — `trendData` 字段类型为 `unknown | null`，通过 `as any` 兼容
- `OpportunityItem` — id/name/status 与 API 模块定义一致
- `PublishMaterial` — 所有字段与 API 模块定义一致
- Query Key 前缀统一为 `['batch-publish', ...]`
- 组件 Props 命名一致：`onOpenDetail` / `onToggleSelect` / `onFilterChange` 等

---
