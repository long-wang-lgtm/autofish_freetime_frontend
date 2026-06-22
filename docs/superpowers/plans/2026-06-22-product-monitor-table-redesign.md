# 商品监控表格与抽屉重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 ProductMonitorTab 表格（17→12列、冻结表头、趋势迷你图、商品信息列扩展）和 ProductDiagnosticDrawer 抽屉顶部元数据（价格/GID链接/状态/优先级/入库/关键词）。

**Architecture:** 自底向上：先改数据层（API+类型），再改组件（MiniTrendChart→表格→抽屉）。ProductMonitorTab.tsx 是最大改动文件（~150行），按模块化改造：列定义→渲染器→交互处理器→清理死代码。

**Tech Stack:** React + TypeScript + ECharts (unchanged) + Tailwind CSS v3 + @tanstack/react-query

**依赖：** 图表配色重设计（已实施）| 后端 API: `/monitor/item/stored` + `/monitor/item/priority`

---

## 文件改动范围

| 文件 | 改动量 | 要点 |
|------|--------|------|
| `lib/api/selection.ts` | ~30 行 | ProductItem 加 d7DailyCollect, ProductSortKey 更新, dtoToProductItem 加计算, 2 个新 API 函数 |
| `components/selection/product/MiniTrendChart.tsx` | 重写 ~50 行 | 纯 SVG → 三层容器（渐变bg+SVG折线+指标数字） |
| `components/selection/product/ProductMonitorTab.tsx` | ~150 行 | 列重组、sticky header、商品信息列重写、趋势列重写、交互新增、死代码清理 |
| `components/selection/product/ProductDiagnosticDrawer.tsx` | ~60 行 | Header 元数据区改为 4 行结构化布局 |

---

### Task 1: 数据层 — ProductItem + ProductSortKey + 新 API

**Files:**
- Modify: `lib/api/selection.ts`

- [ ] **Step 1: ProductItem 接口新增 `d7DailyCollect` 字段**

在 `ProductItem` 接口中，`d7DailyLook` 行后添加：

```typescript
  /** 日均浏览数 = d7.total_dlook / 7 */
  d7DailyLook: number | null
  /** 日均收藏数 = d7.total_dcollect / 7 */
  d7DailyCollect: number | null
  /** d7 流量增速 */
  d7BrowseGrowth: number | null
```

- [ ] **Step 2: ProductSortKey 更新 — 移除旧 key，新增趋势 key**

将 `ProductSortKey` 类型中的 `'wantStability' | 'lookStability' | 'collectStability' | 'priceTrend'` 替换为 `'wantTrend' | 'lookTrend' | 'collectTrend'`：

```typescript
export type ProductSortKey =
  | 'title'
  | 'price'
  // ... (中间保持不变)
  | 'd7BrowseGrowth'
  | 'acceleration'
  | 'wantTrend'
  | 'lookTrend'
  | 'collectTrend'
```

- [ ] **Step 3: dtoToProductItem 新增 d7DailyCollect 计算**

在 `const d7DailyLook = ...` 行后添加：

```typescript
  const d7DailyLook = d7 != null ? d7.total_dlook / 7 : null
  const d7DailyCollect = d7 != null ? d7.total_dcollect / 7 : null
```

并在返回对象中，`d7DailyLook` 行后添加：

```typescript
    d7DailyLook,
    d7DailyCollect,
```

- [ ] **Step 4: getProductSortValue 更新 case 分支**

将 `case 'wantStability':` / `'lookStability'` / `'collectStability'` / `'priceTrend'` 的 4 个 case 替换为 3 个新 case。趋势列的排序逻辑：取 slope 方向 `up=2, flat=1, down=0, null=-1`：

```typescript
    case 'wantTrend': {
      const s = item.trendDirection?.want_slope
      return s === 'up' ? 2 : s === 'flat' ? 1 : s === 'down' ? 0 : -1
    }
    case 'lookTrend': {
      const s = item.trendDirection?.look_slope
      return s === 'up' ? 2 : s === 'flat' ? 1 : s === 'down' ? 0 : -1
    }
    case 'collectTrend': {
      const s = item.trendDirection?.collect_slope
      return s === 'up' ? 2 : s === 'flat' ? 1 : s === 'down' ? 0 : -1
    }
```

- [ ] **Step 5: 新增两个 API 函数**

在 `cancelMonitorItem` 函数之后添加：

```typescript
/** 商品入库（商机库）— GET /monitor/item/stored?gid= */
export async function storedMonitorItem(gid: string): Promise<{ gid: string; monitorStatus: number }> {
  console.debug(`[SelectionAPI] storedMonitorItem gid=${gid}`)
  return selectionFetch<{ gid: string; monitorStatus: number }>(`/monitor/item/stored?gid=${encodeURIComponent(gid)}`)
}

/** 修改监控优先级 — POST /monitor/item/priority */
export async function updateMonitorItemPriority(gid: string, priority: number): Promise<{ gid: string; priority: number }> {
  console.debug(`[SelectionAPI] updateMonitorItemPriority gid=${gid} priority=${priority}`)
  return selectionFetch<{ gid: string; priority: number }>('/monitor/item/priority', {
    method: 'POST',
    body: JSON.stringify({ gid, priority }),
  })
}
```

- [ ] **Step 6: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 7: 提交**

```bash
git add lib/api/selection.ts
git commit -m "feat: add d7DailyCollect, update ProductSortKey, add stored+piority APIs"
```

---

### Task 2: MiniTrendChart — 重写为三层容器

**Files:**
- Modify: `components/selection/product/MiniTrendChart.tsx`

当前组件（67 行）为纯 SVG polyline。完全替换为三层结构。

- [ ] **Step 1: 重写 MiniTrendChart 组件**

替换 `components/selection/product/MiniTrendChart.tsx` 全部内容：

```typescript
'use client'

interface MiniTrendChartProps {
  /** 小时级时序数据（如 hourly_want_rate），按时间升序 */
  hourlyData: number[]
  /** 趋势方向 */
  slope: 'up' | 'down' | 'flat' | null
  /** 日均值 */
  dailyAvg: number | null
  /** 变异系数（stability） */
  cv: number | null
  /** 颜色主题 */
  color: 'amber' | 'blue' | 'violet'
}

const COLOR_MAP: Record<string, { stroke: string; gradient: [string, string] }> = {
  amber:  { stroke: '#d97706', gradient: ['rgba(217,119,6,0.10)', 'rgba(217,119,6,0.02)'] },
  blue:   { stroke: '#2563eb', gradient: ['rgba(37,99,235,0.08)', 'rgba(37,99,235,0.01)'] },
  violet: { stroke: '#7c3aed', gradient: ['rgba(124,58,237,0.08)', 'rgba(124,58,237,0.02)'] },
}

const SLOPE_DISPLAY: Record<string, { arrow: string; color: string }> = {
  up:   { arrow: '↗', color: '' },       // color 由主题决定
  down: { arrow: '↘', color: '#ef4444' },
  flat: { arrow: '→', color: '#9ca3af' },
}

function fmtDaily(v: number | null): string {
  if (v === null) return '-'
  return v.toFixed(1)
}

function fmtCV(v: number | null): string {
  if (v === null) return '-'
  return v.toFixed(2)
}

export function MiniTrendChart({ hourlyData, slope, dailyAvg, cv, color }: MiniTrendChartProps) {
  const W = 90
  const H = 32
  const palette = COLOR_MAP[color] || COLOR_MAP.amber
  const slopeInfo = (slope && SLOPE_DISPLAY[slope]) ? SLOPE_DISPLAY[slope] : { arrow: '-', color: '#9ca3af' }
  // 方向箭头颜色：up 用系列色，down/flat 用独立色
  const arrowColor = slope === 'up' ? palette.stroke : slopeInfo.color

  // 生成 SVG polyline
  let polylinePoints = ''
  if (hourlyData.length >= 2) {
    const max = Math.max(...hourlyData)
    const min = Math.min(...hourlyData)
    const range = max - min || 1
    const points = hourlyData.map((v, i) => {
      const x = (i / (hourlyData.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 4) - 2
      return `${x},${y}`
    })
    polylinePoints = points.join(' ')
  }

  const svgOpacity = hourlyData.length >= 2 ? 0.30 : 0.20

  return (
    <div className="relative w-[90px] h-[32px] rounded overflow-hidden" title={`日均 ${fmtDaily(dailyAvg)} · CV ${fmtCV(cv)}`}>
      {/* Layer 1: background gradient */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${palette.gradient[0]}, ${palette.gradient[1]})` }}
      />
      {/* Layer 2: SVG polyline */}
      {polylinePoints && (
        <svg width={W} height={H} className="absolute inset-0" style={{ opacity: svgOpacity }}>
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={palette.stroke}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {/* Layer 3: indicator text */}
      <div className="relative z-[1] flex justify-around items-center h-full text-[9px]">
        <span className="text-gray-500 tabular-nums">日{fmtDaily(dailyAvg)}</span>
        <span className="tabular-nums" style={{ color: arrowColor, fontWeight: 600 }}>{slopeInfo.arrow}</span>
        <span className="text-gray-500 tabular-nums">CV{fmtCV(cv)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 3: 提交**

```bash
git add components/selection/product/MiniTrendChart.tsx
git commit -m "feat: rebuild MiniTrendChart as 3-layer container (gradient + SVG + indicators)"
```

---

### Task 3: ProductMonitorTab — 列定义重写 + 表头 sticky

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 更新 import — 移除旧的, 加入新的**

移除不再需要的 import（`fmtCV`, `cvColor`, `Check`, `getBarPct` 稍后处理），新增：

```typescript
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listMonitorItems,
  removeMonitorItem,
  activateMonitorItem,
  cancelMonitorItem,
  storedMonitorItem,           // ← 新增
  updateMonitorItemPriority,   // ← 新增
  dtoToProductItem,
  getProductSortValue,
  type ProductSortKey,
} from '@/lib/api/selection'
import { ChevronUp, ChevronDown, Search, Trash2, ChevronRight } from 'lucide-react'  // ← 移除 Check
import { MiniTrendChart } from '@/components/selection/product/MiniTrendChart'
import { ProductDiagnosticDrawer } from '@/components/selection/product/ProductDiagnosticDrawer'
```

- [ ] **Step 2: 删除不再需要的格式化函数和类型**

删除以下代码块：
- `fmtCV` 函数（第 53-56 行）
- `cvColor` 函数（第 58-64 行）
- `getBarPct` 函数（第 66-68 行）—— 保留，价格列数据条仍需
- `ColumnGroup` 类型中的 `'stability'` 和 `'meta'`
- `GROUP_STYLE` 中的 `stability` 和 `meta` 条目

```typescript
type ColumnGroup = 'identity' | 'core' | 'conversion' | 'daily' | 'growth' | 'trend'

const GROUP_STYLE: Record<ColumnGroup, { bar: string }> = {
  identity:   { bar: '' },
  core:       { bar: 'bg-gradient-to-r from-amber-300 to-amber-400' },
  conversion: { bar: 'bg-gradient-to-r from-sky-300 to-sky-400' },
  daily:      { bar: 'bg-gradient-to-r from-teal-300 to-teal-400' },
  growth:     { bar: 'bg-gradient-to-r from-emerald-300 to-emerald-400' },
  trend:      { bar: 'bg-gradient-to-r from-rose-300 to-rose-400' },
}
```

- [ ] **Step 3: 重写 COLUMNS 数组（17→12 列）**

完全替换 `COLUMNS` 数组：

```typescript
interface ColumnDef {
  key: ProductSortKey | 'trendChart'  // trendChart 不再是 key，三列趋势独立
  label: string
  width: string
  group: ColumnGroup
  groupStart: boolean
  dataBar?: boolean
}

const GROUP_GAP = 'ml-2'

const COLUMNS: ColumnDef[] = [
  // ── 📦 商品标识 (identity) ──
  { key: 'title',       label: '商品信息', width: 'flex-1 min-w-[180px] max-w-[240px]', group: 'identity',   groupStart: true },
  // ── 📊 核心快照 (core, amber) ──
  { key: 'price',       label: '价格',     width: 'w-[80px] shrink-0',  group: 'core',       groupStart: true, dataBar: true },
  // ── 📈 转化质量 (conversion, sky) ──
  { key: 'd7IfRatio' as ProductSortKey,       label: '7天询藏比', width: 'w-[68px] shrink-0', group: 'conversion', groupStart: true },
  { key: 'd7InquiryRate' as ProductSortKey,   label: '7天询单率', width: 'w-[68px] shrink-0', group: 'conversion', groupStart: false },
  { key: 'd7FavoriteRate' as ProductSortKey,  label: '7天收藏率', width: 'w-[68px] shrink-0', group: 'conversion', groupStart: false },
  // ── 📐 日均量 (daily, teal) ──
  { key: 'd7DailyWant' as ProductSortKey,     label: '日均想要', width: 'w-[68px] shrink-0', group: 'daily',      groupStart: true },
  { key: 'd7DailyLook' as ProductSortKey,     label: '日均浏览', width: 'w-[68px] shrink-0', group: 'daily',      groupStart: false },
  // ── 🚀 增长信号 (growth, emerald) ──
  { key: 'd7BrowseGrowth' as ProductSortKey,  label: '流量增速', width: 'w-[80px] shrink-0', group: 'growth',     groupStart: true },
  { key: 'acceleration' as ProductSortKey,    label: '升温信号', width: 'w-[72px] shrink-0', group: 'growth',     groupStart: false },
  // ── 📈 趋势信号 (trend, rose) ──
  { key: 'wantTrend' as ProductSortKey,       label: '想要趋势', width: 'w-[90px] shrink-0', group: 'trend',      groupStart: true },
  { key: 'lookTrend' as ProductSortKey,       label: '浏览趋势', width: 'w-[90px] shrink-0', group: 'trend',      groupStart: false },
  { key: 'collectTrend' as ProductSortKey,    label: '收藏趋势', width: 'w-[90px] shrink-0', group: 'trend',      groupStart: false },
]
```

- [ ] **Step 4: 表头行添加 sticky 样式**

将表头 `<div>` 添加 `sticky top-0 z-10 bg-white`：

将：
```tsx
<div className="flex px-5 pt-2.5 pb-2 text-[11px] font-medium text-gray-500 bg-gradient-to-b from-gray-50 to-gray-50/50 select-none">
```

改为：
```tsx
<div className="flex px-5 pt-2.5 pb-2 text-[11px] font-medium text-gray-500 bg-gray-50 select-none sticky top-0 z-10">
```

将分组色条也 sticky：
```tsx
<div className="flex px-5 pb-1 border-b border-gray-100 sticky top-[34px] z-10 bg-white">
```

- [ ] **Step 5: 更新表头中的 unsortable 判断**

移除 `keywords`、`monitorStatus` 的无排序标记。趋势列改为可排序：

```typescript
const unsortable = col.key === 'trendChart'  // ← 仅 trendChart 不可排序（trendChart 已不是列 key，实际不会走到这里）
```

实际上 `trendChart` 已不在 COLUMNS 中，简化为：

```typescript
// 所有列均可排序
const isActive = sortKey === col.key
const isGroupStart = col.groupStart && col.group !== 'identity'
const isIdentity = col.group === 'identity'
```

- [ ] **Step 6: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 有类型错误（renderCell 尚未更新 case 分支），这是预期的——将在 Task 4/5 解决。

- [ ] **Step 7: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "refactor: ProductMonitorTab column definitions (17→12) + sticky header"
```

---

### Task 4: ProductMonitorTab — 商品信息列 + 价格列渲染器

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 移除 copiedGid 状态和 handleCopyGid**

删除：
```typescript
const [copiedGid, setCopiedGid] = useState<string | null>(null)
```
和 `handleCopyGid` 整个函数（第 157-165 行）。

- [ ] **Step 2: 新增交互状态和处理函数**

在状态声明区添加优先级编辑状态：

```typescript
const [editingPriority, setEditingPriority] = useState<string | null>(null)
const queryClient = useQueryClient()
```

在 `handleCancel` 后添加入库和优先级处理：

```typescript
const handleStored = useCallback(async (gid: string) => {
  const result = await storedMonitorItem(gid)
  queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
}, [queryClient])

const handlePriorityChange = useCallback(async (gid: string, priority: number) => {
  await updateMonitorItemPriority(gid, priority)
  setEditingPriority(null)
  queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
}, [queryClient])
```

- [ ] **Step 3: 重写 title (商品信息) 渲染器**

替换 renderCell 中的 `case 'title':` 整个分支：

```typescript
case 'title': {
  const STATUS_MAP: Record<number, { label: string; dot: string; bg: string; text: string }> = {
    0: { label: '已暂停', dot: 'bg-gray-400',   bg: 'bg-gray-100',   text: 'text-gray-500' },
    1: { label: '监控中', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    2: { label: '已分析', dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
    4: { label: '已入库', dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700' },
  }
  const s = STATUS_MAP[p.monitorStatus ?? -1]
  const isInteractive = p.monitorStatus === 0 || p.monitorStatus === 1
  const isEditing = editingPriority === p.id

  return (
    <div className="min-w-0 py-0.5 pr-2">
      {/* 第1行：描述 */}
      {p.description ? (
        <div className="text-[13px] text-gray-800 leading-snug line-clamp-2">
          {p.description}
        </div>
      ) : (
        <div className="text-[13px] text-gray-400 leading-snug italic">无描述</div>
      )}

      {/* 第2行：GID链接 + 状态badge + 优先级pill + 入库按钮 */}
      <div className="flex items-center gap-1 flex-wrap mt-0.5">
        {/* GID 链接 */}
        <a
          href={`https://www.goofish.com/item?id=${p.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[9px] text-gray-500 font-mono border-b border-dotted border-gray-300 hover:text-gray-700 transition-colors"
          title="在闲鱼打开"
        >
          {p.id} ↗
        </a>

        {/* 监控状态 badge */}
        {s && isInteractive ? (
          <button
            onClick={(e) => { e.stopPropagation(); p.monitorStatus === 1 ? handleCancel(p.id) : handleActivate(p.id) }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${s.bg} ${s.text} hover:opacity-80 transition-opacity cursor-pointer`}
            title={p.monitorStatus === 1 ? '点击暂停监控' : '点击启用监控'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </button>
        ) : s ? (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        ) : (
          <span className="text-[9px] text-gray-400">-</span>
        )}

        {/* 优先级 pill（null 时隐藏） */}
        {p.priority !== null && (
          isEditing ? (
            <select
              value={p.priority}
              onChange={(e) => {
                e.stopPropagation()
                handlePriorityChange(p.id, Number(e.target.value))
              }}
              onBlur={() => setEditingPriority(null)}
              onClick={(e) => e.stopPropagation()}
              className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer"
              autoFocus
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setEditingPriority(p.id) }}
              className="text-[9px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 cursor-text hover:bg-amber-100 transition-colors"
              title="点击编辑优先级"
            >
              ⚡{p.priority}
            </button>
          )
        )}

        {/* 入库按钮（已入库时隐藏） */}
        {p.monitorStatus !== 4 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleStored(p.id) }}
            className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
            title="添加入库(商机库)"
          >
            +入库
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 重写 price (价格) 渲染器 — 合并 priceTrend**

替换 `case 'price':` 整个分支：

```typescript
case 'price': {
  const pct = getBarPct(p.price, dataBarMax.price)
  const pt = p.priceTrend
  return (
    <span className="relative block w-full text-center">
      <span className="absolute left-0 top-0 bottom-0 rounded-sm bg-gradient-to-r from-amber-200/50 to-amber-100/20" style={{ width: pct }} />
      <span className="relative flex flex-col items-center">
        <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{fmtPrice(p.price)}</span>
        {pt === 'up' && <span className="text-[9px] font-semibold text-green-600">↑提价</span>}
        {pt === 'down' && <span className="text-[9px] font-semibold text-red-600">↓降价</span>}
        {pt === 'flat' && <span className="text-[9px] text-gray-400">→平稳</span>}
        {pt == null && <span className="text-[9px] text-gray-400">-</span>}
      </span>
    </span>
  )
}
```

⚠️ `getBarPct` 和 `fmtPrice` 保留。

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 有类型错误（趋势列 case 尚未更新），将在 Task 5 解决。

- [ ] **Step 6: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "feat: rewrite product info cell (GID link + status + priority + stored) and price cell (merge trend)"
```

---

### Task 5: ProductMonitorTab — 趋势列渲染器 + 删除旧 case

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

- [ ] **Step 1: 删除旧的稳定性、趋势、元数据 case 分支**

从 renderCell switch 中删除以下 case：
- `'wantStability'` / `'lookStability'` / `'collectStability'`（旧稳定性三列）
- `'trendChart'`（旧近期趋势列——改为 MiniTrendChart 新用法在新增的趋势 case 中）
- `'keywords'`（移到抽屉）
- `'priority'`（移到商品信息列）
- `'monitorStatus'`（移到商品信息列）
- `'priceTrend'`（移到价格列）

- [ ] **Step 2: 新增三个趋势 case（wantTrend / lookTrend / collectTrend）**

在 renderCell switch 中、`case 'price':` 分支之后（或任意位置），添加：

```typescript
case 'wantTrend': {
  const htData = p.hourlyTrend?.hourly_want_rate ?? []
  return (
    <MiniTrendChart
      hourlyData={htData.slice(-21)}
      slope={p.trendDirection?.want_slope ?? null}
      dailyAvg={p.d7DailyWant}
      cv={p.wantStability}
      color="amber"
    />
  )
}
case 'lookTrend': {
  const htData = p.hourlyTrend?.hourly_look_rate ?? []
  return (
    <MiniTrendChart
      hourlyData={htData.slice(-21)}
      slope={p.trendDirection?.look_slope ?? null}
      dailyAvg={p.d7DailyLook}
      cv={p.lookStability}
      color="blue"
    />
  )
}
case 'collectTrend': {
  const htData = p.hourlyTrend?.hourly_collect_rate ?? []
  return (
    <MiniTrendChart
      hourlyData={htData.slice(-21)}
      slope={p.trendDirection?.collect_slope ?? null}
      dailyAvg={p.d7DailyCollect}
      cv={p.collectStability}
      color="violet"
    />
  )
}
```

- [ ] **Step 3: 更新 dataBarMax — 移除旧的 priceTrend 依赖**

`dataBarMax` 计算不变（仍仅用 price），无需修改。

- [ ] **Step 4: 更新 renderCell 依赖数组**

`useCallback` 的依赖数组更新为：

```typescript
}, [dataBarMax, editingPriority, handleActivate, handleCancel, handleStored, handlePriorityChange])
```

移除已删除的 `copiedGid`、`handleCopyGid`。

- [ ] **Step 5: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 6: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "feat: add 3 trend columns with MiniTrendChart, remove old stability/keywords/priority/status/priceTrend cells"
```

---

### Task 6: ProductDiagnosticDrawer — Header 元数据重构

**Files:**
- Modify: `components/selection/product/ProductDiagnosticDrawer.tsx`

- [ ] **Step 1: 新增 import**

在 `ProductDiagnosticDrawer.tsx` 的 `@/lib/api/selection` import 中添加：

```typescript
import {
  type ProductItem,
  storedMonitorItem,
  updateMonitorItemPriority,
  activateMonitorItem,
  cancelMonitorItem,
} from '@/lib/api/selection'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'  // ← 如果尚未 import useState/useCallback
```

- [ ] **Step 2: 添加交互状态和 handler 以及工具函数**

在组件顶部（`const open = !!product` 之前）：

```typescript
function fmtPrice(v: number): string {
  return `¥${v.toLocaleString('zh-CN')}`
}

const [editingPriority, setEditingPriority] = useState(false)
const queryClient = useQueryClient()

const handleStored = useCallback(async (gid: string) => {
  await storedMonitorItem(gid)
  queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
}, [queryClient])

const handlePriorityChange = useCallback(async (gid: string, priority: number) => {
  await updateMonitorItemPriority(gid, priority)
  setEditingPriority(false)
  queryClient.invalidateQueries({ queryKey: ['monitor-items'] })
}, [queryClient])
```

- [ ] **Step 3: 替换 Header 元数据区**

替换当前第 50-93 行的 Header 元数据 block（`{product && (` ... `)}` 块的前半部分，到 `{product.keywords.length > 0 && (` 为止），改为新的 4 行结构化布局：

```tsx
{/* Header 元数据 */}
{product && (
  <div className="space-y-2">
    {/* 第1行：标题 + 价格 */}
    <div className="flex justify-between items-start">
      <div className="text-sm font-semibold text-gray-900 leading-snug flex-1 min-w-0">
        {product.description || product.title || '商品'}
      </div>
      <div className="text-right ml-3 shrink-0">
        <div className="text-[15px] font-bold text-gray-900 tabular-nums">{fmtPrice(product.price)}</div>
        <div className="text-[10px]">
          {product.priceTrend === 'up' && <span className="text-green-600 font-semibold">↑提价</span>}
          {product.priceTrend === 'down' && <span className="text-red-600 font-semibold">↓降价</span>}
          {product.priceTrend === 'flat' && <span className="text-gray-400">→平稳</span>}
          {(product.priceTrend == null) && <span className="text-gray-400">价格未知</span>}
        </div>
      </div>
    </div>

    {/* 第2行：GID链接 + 状态 + 优先级 + 入库 */}
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`https://www.goofish.com/item?id=${product.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] text-gray-500 font-mono border-b border-dotted border-gray-300 hover:text-gray-700 transition-colors"
      >
        {product.id} ↗
      </a>

      {/* 状态 badge（与表格共享逻辑） */}
      {(() => {
        const STATUS_MAP: Record<number, { label: string; dot: string; bg: string; text: string }> = {
          0: { label: '已暂停', dot: 'bg-gray-400',   bg: 'bg-gray-100',   text: 'text-gray-500' },
          1: { label: '监控中', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
          2: { label: '已分析', dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
          4: { label: '已入库', dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700' },
        }
        const s = STATUS_MAP[product.monitorStatus ?? -1]
        const isInteractive = product.monitorStatus === 0 || product.monitorStatus === 1
        if (!s) return <span className="text-xs text-gray-400">-</span>
        if (!isInteractive) {
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          )
        }
        return (
          <button
            onClick={() => product.monitorStatus === 1 ? cancelMonitorItem(product.id).then(() => queryClient.invalidateQueries({ queryKey: ['monitor-items'] })) : activateMonitorItem(product.id).then(() => queryClient.invalidateQueries({ queryKey: ['monitor-items'] }))}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text} hover:opacity-80 transition-opacity cursor-pointer`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </button>
        )
      })()}

      {/* 优先级 */}
      {product.priority !== null && (
        editingPriority ? (
          <select
            value={product.priority}
            onChange={(e) => handlePriorityChange(product.id, Number(e.target.value))}
            onBlur={() => setEditingPriority(false)}
            className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer"
            autoFocus
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setEditingPriority(true)}
            className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 cursor-text hover:bg-amber-100 transition-colors"
          >
            ⚡优先级 {product.priority}
          </button>
        )
      )}

      {/* 入库按钮 */}
      {product.monitorStatus !== 4 && (
        <button
          onClick={() => handleStored(product.id)}
          className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
        >
          + 入库
        </button>
      )}
    </div>

    {/* 第3行：采集 + 上架 + 商家 */}
    <div className="flex gap-3 text-[11px] text-gray-500">
      <span>
        采集:{' '}
        {wm?.d7 != null ? (
          <span className="font-medium text-gray-700">
            {wm.d7.quality_label === 'reliable' ? '可靠' :
             wm.d7.quality_label === 'limited' ? '有限' :
             wm.d7.quality_label === 'insufficient' ? '不足' : '-'}
            ({wm.d7.fetch_count ?? '-'}次)
          </span>
        ) : '-'}
      </span>
      {product.daysSincePublish != null && (
        <span>上架 {Math.round(product.daysSincePublish)} 天</span>
      )}
      <span>商家: {product.shopName || '-'}</span>
    </div>

    {/* 第4行：关键词 pills */}
    {product.keywords.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {product.keywords.map(kw => (
          <span key={kw} className="text-[11px] text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
            {kw}
          </span>
        ))}
      </div>
    )}

    {/* 非活跃状态警告 */}
    {product.monitorStatus != null && product.monitorStatus !== 1 && (
      <span className="inline-block text-xs font-medium text-red-600 bg-red-50 rounded px-2 py-0.5">
        {product.monitorStatus === 0 ? '已暂停' : product.monitorStatus === 2 ? '已分析' : product.monitorStatus === 4 ? '已入库' : '未知'}
      </span>
    )}

    {/* 上架天数（保留旧逻辑，移到第3行后不再需要此处单独显示） */}
    {/* 移除旧的: product.daysSincePublish != null && ... 块（已整合到第3行）} */}

    {/* 移除旧的: product.monitorStatus != null && product.monitorStatus !== 1 警告条（已保留在上面） */}
  </div>
)}
```

⚠️ 需要同时删除当前 drawer 中旧的上架天数显示（第 81-86 行）和旧的 GID/状态/优先级文本行（第 53-71 行），因为它们已整合到新布局中。

- [ ] **Step 4: TypeScript 检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 5: 提交**

```bash
git add components/selection/product/ProductDiagnosticDrawer.tsx
git commit -m "feat: restructure drawer header — new 4-row metadata layout with price, GID link, status, priority, stored"
```

---

### Task 7: 最终验证与清理

- [ ] **Step 1: TypeScript 全面检查**

```bash
npx tsc --noEmit
```

Expected: 零错误。

- [ ] **Step 2: 检查死代码引用**

确认以下内容已完全移除：
- `copiedGid` 状态 — ✅ 无引用
- `handleCopyGid` — ✅ 无引用
- `Check` icon import — ✅ 无引用
- `fmtCV` / `cvColor` — ✅ 无引用（`fmtCV` 在 MiniTrendChart 内部重新定义）
- `wantStability` / `lookStability` / `collectStability` case — ✅ 已删除
- `keywords` / `priority` / `monitorStatus` / `priceTrend` / `trendChart` case — ✅ 已删除
- STATUS_MAP 中的 `3: { label: '已发布', ... }` — ✅ 已替换

- [ ] **Step 3: 确认 import 清洁**

```bash
grep -n "Check\|copiedGid\|handleCopyGid\|fmtCV\|cvColor" components/selection/product/ProductMonitorTab.tsx
```

Expected: 无输出（所有引用已移除）。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: final verification — all TypeScript checks pass, dead code removed"
```

---

## 验收清单

对照设计文档 §11：

- [ ] 表格表头行冻结，滚动时始终可见
- [ ] 12 列布局正确，分组色条匹配新 6 组
- [ ] 商品信息列：描述 + GID链接(新标签页) + 状态badge(可点击) + 优先级(原地编辑) + 入库按钮
- [ ] GID 点击跳转 `https://www.goofish.com/item?id={gid}`（表格 + 抽屉一致）
- [ ] 价格列显示 ¥价格 + 动向箭头
- [ ] 三列趋势各自显示迷你图背景 + 日均 + 方向 + CV
- [ ] 抽屉顶部展示：标题、价格、GID链接、状态badge、优先级编辑、入库按钮、关键词pills、采集质量、上架天数、商家名
- [ ] 监控状态 badge 点击切换监控中↔已暂停（表格 + 抽屉一致）
- [ ] 优先级点击展开下拉 1-10，确认后调用 API（表格 + 抽屉一致）
- [ ] 入库按钮点击后 badge 变为"已入库"，按钮消失
- [ ] monitorStatus=3(PUBLISHED) 不再存在，替换为 4(STORED)
- [ ] `POST /monitor/item/priority` 可正常调用
- [ ] `GET /monitor/item/stored` 可正常调用
- [ ] 空状态/加载态不受影响
- [ ] `npx tsc --noEmit` 零错误
