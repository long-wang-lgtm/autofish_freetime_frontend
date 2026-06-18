# 选品监控独立页 & 商品历史表现 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将选品监控从发布页拆分为独立页面，重组目录结构，为商品监控表新增 3 列（趋势指标、迷你趋势图、稳定性），实现商品历史详情抽屉。

**Architecture:** 核心思路是"先搬后改"——先完成目录重组和页面拆分（纯搬运，零功能变更），再扩展 API 类型，然后建新组件，最后改动 ProductMonitorTab 集成所有新功能。echarts v6.1.0 已有依赖，直接使用。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + echarts v6.1.0 + @tanstack/react-query + Zustand

**关联设计文档:** `docs/superpowers/specs/2026-06-18-selection-page-history-design.md`

---

## 文件结构总览

### 新建文件
| 文件 | 职责 |
|------|------|
| `app/dashboard/selection/page.tsx` | 选品监控独立页，顶层三 Tab + 设置入口 |
| `components/selection/shared/SettingsDrawer.tsx` | 设置面板（容纳 config/ 组件，基于 Sheet） |
| `components/selection/product/MiniTrendChart.tsx` | 列表行内迷你趋势图（纯 SVG sparkline） |
| `components/selection/product/TrendChart.tsx` | 可交互完整折线图（echarts，抽屉内用） |
| `components/selection/product/ProductHistoryDrawer.tsx` | 历史详情抽屉（基于 Sheet） |

### 修改文件
| 文件 | 变更 |
|------|------|
| `app/dashboard/publish/page.tsx` | 移除 selection Tab 所有相关代码 |
| `components/layout/Sidebar.tsx` | navItems 新增"选品监控"项 |
| `lib/api/selection.ts` | 扩展 ProductItem/MonitoredItemDTO/ProductSortKey，新增 getProductHistory |
| `components/selection/product/ProductMonitorTab.tsx` | 新增 3 列 + 行选中 + 抽屉集成 + e.stopPropagation |
| 所有移动文件的内部导入路径 | 匹配新目录结构 |

### 删除文件
| 文件 | 原因 |
|------|------|
| `components/selection/CategoryCard.tsx` | orphaned + 动态路由违规 |
| `components/selection/CategoryCardGrid.tsx` | orphaned，配套删除 |
| `components/selection/CategoryTypeTabs.tsx` | orphaned，配套删除 |

### 移动文件（目录重组）
```
components/selection/
├── TabBar.tsx              → shared/TabBar.tsx
├── ViewToggle.tsx          → shared/ViewToggle.tsx
├── DateListSidebar.tsx     → shared/DateListSidebar.tsx
├── HeatmapCalendar.tsx     → shared/HeatmapCalendar.tsx
├── KeywordCollectionTab.tsx → keyword/KeywordCollectionTab.tsx
├── NewKeywordModal.tsx     → keyword/NewKeywordModal.tsx
├── VerticalTimeline.tsx    → keyword/VerticalTimeline.tsx
├── KeywordsConfig.tsx      → keyword/KeywordsConfig.tsx
├── ReportCard.tsx          → keyword/ReportCard.tsx
├── ReportControlBar.tsx    → keyword/ReportControlBar.tsx
├── ReportSubTabs.tsx       → keyword/ReportSubTabs.tsx
├── ProductMonitorTab.tsx   → product/ProductMonitorTab.tsx
├── MerchantMonitorTab.tsx  → merchant/MerchantMonitorTab.tsx
├── AccountsConfig.tsx      → config/AccountsConfig.tsx
├── AIConfig.tsx            → config/AIConfig.tsx
├── CollectionConfig.tsx    → config/CollectionConfig.tsx
```

---

## 前置检查

- [ ] **Step 0.1: 确认 git 状态干净**

```bash
git status
```

预期：clean（或只有无关文件）

- [ ] **Step 0.2: 确认 echarts 可用**

```bash
node -e "require('echarts')" 2>&1 || echo "NEED_INSTALL"
```

如果输出 `NEED_INSTALL`，运行 `npm install`。预期：无错误。

---

## 阶段一：目录重组（纯搬运，零功能变更）

### Task 1: 删除 3 个 orphaned 文件

**Files:**
- Delete: `components/selection/CategoryCard.tsx`
- Delete: `components/selection/CategoryCardGrid.tsx`
- Delete: `components/selection/CategoryTypeTabs.tsx`

- [ ] **Step 1.1: 删除文件**

```bash
git rm components/selection/CategoryCard.tsx components/selection/CategoryCardGrid.tsx components/selection/CategoryTypeTabs.tsx
```

- [ ] **Step 1.2: 提交**

```bash
git commit -m "feat: delete orphaned CategoryCard/CategoryCardGrid/CategoryTypeTabs

These 3 files were orphaned (not imported by any page) and contained a
dynamic route violation (/dashboard/selection/\${category.id}) that conflicts
with the new static /dashboard/selection page.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 创建目标子目录

**Files:**
- Create: `components/selection/shared/` (dir)
- Create: `components/selection/keyword/` (dir)
- Create: `components/selection/product/` (dir)
- Create: `components/selection/merchant/` (dir)
- Create: `components/selection/config/` (dir)

- [ ] **Step 2.1: 创建目录**

```bash
mkdir -p components/selection/shared components/selection/keyword components/selection/product components/selection/merchant components/selection/config
```

- [ ] **Step 2.2: 提交**

```bash
git add components/selection/shared components/selection/keyword components/selection/product components/selection/merchant components/selection/config
git commit -m "feat: create selection subdirectories for domain grouping

shared/ keyword/ product/ merchant/ config/

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 移动文件到子目录

**移动清单：** 共 16 个文件移动到 5 个子目录。

- [ ] **Step 3.1: 移动 shared/ 文件**

```bash
git mv components/selection/TabBar.tsx components/selection/shared/TabBar.tsx
git mv components/selection/ViewToggle.tsx components/selection/shared/ViewToggle.tsx
git mv components/selection/DateListSidebar.tsx components/selection/shared/DateListSidebar.tsx
git mv components/selection/HeatmapCalendar.tsx components/selection/shared/HeatmapCalendar.tsx
```

- [ ] **Step 3.2: 移动 keyword/ 文件**

```bash
git mv components/selection/KeywordCollectionTab.tsx components/selection/keyword/KeywordCollectionTab.tsx
git mv components/selection/NewKeywordModal.tsx components/selection/keyword/NewKeywordModal.tsx
git mv components/selection/VerticalTimeline.tsx components/selection/keyword/VerticalTimeline.tsx
git mv components/selection/KeywordsConfig.tsx components/selection/keyword/KeywordsConfig.tsx
git mv components/selection/ReportCard.tsx components/selection/keyword/ReportCard.tsx
git mv components/selection/ReportControlBar.tsx components/selection/keyword/ReportControlBar.tsx
git mv components/selection/ReportSubTabs.tsx components/selection/keyword/ReportSubTabs.tsx
```

- [ ] **Step 3.3: 移动 product/ 文件**

```bash
git mv components/selection/ProductMonitorTab.tsx components/selection/product/ProductMonitorTab.tsx
```

- [ ] **Step 3.4: 移动 merchant/ 文件**

```bash
git mv components/selection/MerchantMonitorTab.tsx components/selection/merchant/MerchantMonitorTab.tsx
```

- [ ] **Step 3.5: 移动 config/ 文件**

```bash
git mv components/selection/AccountsConfig.tsx components/selection/config/AccountsConfig.tsx
git mv components/selection/AIConfig.tsx components/selection/config/AIConfig.tsx
git mv components/selection/CollectionConfig.tsx components/selection/config/CollectionConfig.tsx
```

- [ ] **Step 3.6: 提交**

```bash
git commit -m "feat: move 16 selection components into subdirectories

shared/ (4): TabBar, ViewToggle, DateListSidebar, HeatmapCalendar
keyword/ (7): KeywordCollectionTab, NewKeywordModal, VerticalTimeline,
  KeywordsConfig, ReportCard, ReportControlBar, ReportSubTabs
product/ (1): ProductMonitorTab
merchant/ (1): MerchantMonitorTab
config/ (3): AccountsConfig, AIConfig, CollectionConfig

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 更新所有内部导入路径

**影响范围：** 移动后的组件之间的交叉引用需要更新路径。

- [ ] **Step 4.1: 更新 KeywordCollectionTab 的导入**

文件：`components/selection/keyword/KeywordCollectionTab.tsx`

将：
```typescript
import { NewKeywordModal } from '@/components/selection/NewKeywordModal'
import { VerticalTimeline } from '@/components/selection/VerticalTimeline'
```

改为：
```typescript
import { NewKeywordModal } from '@/components/selection/keyword/NewKeywordModal'
import { VerticalTimeline } from '@/components/selection/keyword/VerticalTimeline'
```

运行确认当前导入：
```bash
grep -n "from '@/components/selection/" components/selection/keyword/KeywordCollectionTab.tsx
```

- [ ] **Step 4.2: 检查并更新其他交叉引用**

```bash
grep -rn "from '@/components/selection/" components/selection/ --include="*.tsx" --include="*.ts" | grep -v node_modules
```

对于每个匹配结果，根据文件的新位置更新导入路径。预期只有 `KeywordCollectionTab.tsx` 有交叉引用。如果还有其他交叉引用（如 `ReportCard` → `ReportSubTabs`），同样更新为新的子目录路径。

- [ ] **Step 4.3: 提交**

```bash
git add -A
git commit -m "fix: update cross-imports after directory restructure

KeywordCollectionTab → NewKeywordModal, VerticalTimeline paths updated.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 阶段二：页面拆分（零功能变更）

### Task 5: 清理 publish page（移除 selection Tab）

**Files:**
- Modify: `app/dashboard/publish/page.tsx`

- [ ] **Step 5.1: 删除 selection 相关导入**

删除以下 4 行：
```typescript
import { TabBar as SelectionTabBar, TabName } from '@/components/selection/TabBar'
import { KeywordCollectionTab } from '@/components/selection/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/MerchantMonitorTab'
```

- [ ] **Step 5.2: 简化 PUBLISH_TABS 和删除不用的类型/状态**

将：
```typescript
type PublishTab = 'publish' | 'selection'

const PUBLISH_TABS: { key: PublishTab; label: string }[] = [
  { key: 'publish', label: '商品发布' },
  { key: 'selection', label: '选品监控' },
]
```

改为：
```typescript
const PUBLISH_TABS: { key: string; label: string }[] = [
  { key: 'publish', label: '商品发布' },
]
```

删除：
```typescript
const [activePublishTab, setActivePublishTab] = useState<PublishTab>('publish')
const [selectionTab, setSelectionTab] = useState<TabName>('keyword')
const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)
```

- [ ] **Step 5.3: 简化 JSX**

移除 `{activePublishTab === 'selection' && (...)}` 整个分支（原第 141-153 行）。移除 `{activePublishTab === 'publish' && (` 的条件包裹，直接渲染发布内容。TabBar 的 `activeTab` 改为 `"publish"`，`onTabChange` 改为 `() => {}`。

完整修改后的 `publish/page.tsx` 见下方：

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TabBar } from '@/components/ui/Tab'
import { OpportunityLibrary } from '@/components/publish/OpportunityLibrary'
import { PublishWorkspace } from '@/components/publish/PublishWorkspace'
import { EditorDrawer } from '@/components/publish/EditorDrawer'
import { ResizableDivider } from '@/components/publish/ResizableDivider'
import { MobileTabView } from '@/components/publish/MobileTabView'
import { listOpportunities, type Opportunity } from '@/lib/api/opportunities'
import { type PublishedItem } from '@/lib/api/publish-items'
import { getAccountNames } from '@/lib/api/accounts'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const PUBLISH_TABS: { key: string; label: string }[] = [
  { key: 'publish', label: '商品发布' },
]

const LEFT_PANEL_DEFAULT_WIDTH = 280
const LEFT_PANEL_MIN_WIDTH = 200
const LEFT_PANEL_MAX_WIDTH = 480

export default function PublishPage() {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)

  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('publish_panel_left_width')
      return stored ? parseInt(stored) : LEFT_PANEL_DEFAULT_WIDTH
    }
    return LEFT_PANEL_DEFAULT_WIDTH
  })

  const { data: opportunitiesData, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => listOpportunities({ page_size: 100 }),
  })

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccountNames,
  })

  const [selectedItem, setSelectedItem] = useState<PublishedItem | null>(null)

  useEffect(() => {
    setSelectedItem(null)
  }, [selectedOpportunity?.id])

  const handleItemChange = useCallback((updated: PublishedItem) => {
    setSelectedItem(updated)
    queryClient.setQueryData(['published-items', selectedOpportunity?.id], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((i: PublishedItem) =>
          i.id === updated.id ? updated : i
        ),
      }
    })
  }, [queryClient, selectedOpportunity?.id])

  const handleLeftWidthChange = useCallback((delta: number) => {
    setLeftWidth(prev => {
      const next = Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(LEFT_PANEL_MAX_WIDTH, prev + delta))
      localStorage.setItem('publish_panel_left_width', String(next))
      return next
    })
  }, [])

  if (isMobile) {
    return (
      <div className="h-full">
        <MobileTabView
          opportunities={opportunitiesData?.items || []}
          selectedOpportunity={selectedOpportunity}
          onSelectOpportunity={setSelectedOpportunity}
          accounts={accountsData || []}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar
        tabs={PUBLISH_TABS}
        activeTab="publish"
        onTabChange={() => {}}
        variant="overline"
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div style={{ width: leftWidth, flexShrink: 0 }} className="overflow-hidden">
          <OpportunityLibrary
            opportunities={opportunitiesData?.items || []}
            isLoading={opportunitiesLoading}
            selectedOpportunity={selectedOpportunity}
            onSelectOpportunity={setSelectedOpportunity}
          />
        </div>

        <ResizableDivider
          direction="horizontal"
          onResize={handleLeftWidthChange}
        />

        <div className="flex-1 overflow-hidden">
          <PublishWorkspace
            opportunity={selectedOpportunity}
            accounts={accountsData || []}
            onRefreshOpportunities={() => queryClient.invalidateQueries({ queryKey: ['opportunities'] })}
            selectedItem={selectedItem}
            selectedItemId={selectedItem?.id}
            onSelectItem={setSelectedItem}
            onItemChange={handleItemChange}
          />
        </div>
      </div>

      <EditorDrawer
        item={selectedItem}
        accounts={accountsData || []}
        onSaveStatusChange={() => {}}
        onItemChange={handleItemChange}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  )
}
```

- [ ] **Step 5.4: 提交**

```bash
git add app/dashboard/publish/page.tsx
git commit -m "refactor: remove selection tab from publish page

Publish page is now single-purpose (商品发布 only). Selection monitoring
moves to its own independent page at /dashboard/selection.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 创建选品监控独立页

**Files:**
- Create: `app/dashboard/selection/page.tsx`

- [ ] **Step 6.1: 创建页面文件**

```typescript
'use client'

import { useState } from 'react'
import { TabBar, type TabName } from '@/components/selection/shared/TabBar'
import { KeywordCollectionTab } from '@/components/selection/keyword/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/product/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/merchant/MerchantMonitorTab'
import { SettingsDrawer } from '@/components/selection/shared/SettingsDrawer'
import { Settings } from 'lucide-react'

export default function SelectionPage() {
  const [selectionTab, setSelectionTab] = useState<TabName>('keyword')
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 顶部工具栏：TabBar + 设置按钮 */}
      <div className="flex items-center justify-between">
        <TabBar activeTab={selectionTab} onTabChange={setSelectionTab} />
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>

      {/* Tab 内容 */}
      {selectionTab === 'keyword' && (
        <KeywordCollectionTab
          selectedKeywordId={selectedKeywordId}
          onSelectKeyword={setSelectedKeywordId}
        />
      )}
      {selectionTab === 'product' && <ProductMonitorTab />}
      {selectionTab === 'merchant' && <MerchantMonitorTab />}

      {/* 设置抽屉 */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 6.2: 提交**

```bash
git add app/dashboard/selection/page.tsx
git commit -m "feat: create independent selection monitoring page

/dashboard/selection with keyword/product/merchant 3-tab layout and
settings entry point. Logic migrated from publish page without changes.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 添加侧边栏导航项

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 7.1: 在 navItems 中插入"选品监控"项**

在"商品发布"对象（`path: '/dashboard/publish'`）之后、"设置"对象（`label: '设置'`）之前插入：

```typescript
  {
    label: '选品监控',
    path: '/dashboard/selection',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
```

- [ ] **Step 7.2: 提交**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add 选品监控 nav item to sidebar

Placed between 商品发布 and 设置, linking to /dashboard/selection.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: 全局检查旧导入路径

- [ ] **Step 8.1: 搜索外部文件是否引用了旧路径**

```bash
grep -rn "from '@/components/selection/TabBar'" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "components/selection/"
grep -rn "from '@/components/selection/KeywordCollectionTab'" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "components/selection/"
grep -rn "from '@/components/selection/ProductMonitorTab'" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "components/selection/"
grep -rn "from '@/components/selection/MerchantMonitorTab'" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "components/selection/"
```

预期：无结果。如有遗漏，更新为新的子目录路径。

- [ ] **Step 8.2: 如有遗漏，提交修复**

```bash
git add -A
git commit -m "fix: update remaining stale import paths after directory restructure"
```

---

## 阶段三：API 类型扩展

### Task 9: 扩展 API 类型和函数

**Files:**
- Modify: `lib/api/selection.ts`

- [ ] **Step 9.1: 扩展 MonitoredItemDTO（新增 5 个字段）**

在 `MonitoredItemDTO` 接口的 `updated_at` 之后，`}` 之前添加：

```typescript
  /** 最近 10 次采集的询单数，按时间升序 */
  recentInquiries?: number[] | null
  /** 近 10 次采集的询单整体趋势方向 */
  trend?: 'up' | 'down' | 'flat' | null
  /** 趋势涨跌幅百分比（如 23.5 表示 +23.5%） */
  trendValue?: number | null
  /** 询单数变异系数 CV（σ/μ），值越小越稳定 */
  stabilityValue?: number | null
  /** 最近一次采集时间（ISO 8601） */
  lastCollectedAt?: string | null
```

- [ ] **Step 9.2: 扩展 ProductItem（新增 5 个字段）**

在 `ProductItem` 接口的 `keywords` 之后，`}` 之前添加：

```typescript
  /** 最近 10 次采集的询单数，按时间升序 */
  recentInquiries: number[]
  /** 近 10 次采集的询单整体趋势方向 */
  trend: 'up' | 'down' | 'flat'
  /** 趋势涨跌幅百分比（如 23.5 表示 +23.5%） */
  trendValue: number
  /** 询单数变异系数 CV（σ/μ），值越小越稳定 */
  stabilityValue: number
  /** 最近一次采集时间（ISO 8601），供迷你图 tooltip */
  lastCollectedAt: string | null
```

- [ ] **Step 9.3: 更新 dtoToProductItem 函数**

在 return 对象的 `keywords` 行之后，`}` 之前添加：

```typescript
    recentInquiries: item.recentInquiries ?? [],
    trend: item.trend ?? 'flat',
    trendValue: item.trendValue ?? 0,
    stabilityValue: item.stabilityValue ?? 0,
    lastCollectedAt: item.lastCollectedAt ?? null,
```

- [ ] **Step 9.4: 扩展 ProductSortKey**

在联合类型末尾添加两个新值：

```typescript
export type ProductSortKey =
  | 'title'
  | 'price'
  | 'wantCount'
  | 'lookCount'
  | 'collectCount'
  | 'inquiryRate'
  | 'wantCollectRatio'
  | 'dailyWant'
  | 'estimatedSales'
  | 'estimatedOrders'
  | 'collectRate'
  | 'daysSincePublish'
  | 'publishedAt'
  | 'priority'
  | 'status'
  | 'trendValue'      // 🆕
  | 'stabilityValue'  // 🆕
```

- [ ] **Step 9.5: 更新 getProductSortValue 函数**

在 switch 的 `case 'status':` 之后添加：

```typescript
    case 'trendValue':
      return item.trendValue
    case 'stabilityValue':
      return item.stabilityValue
```

- [ ] **Step 9.6: 新增 HistoryPoint 类型和 getProductHistory API 函数**

在文件末尾添加：

```typescript
// ============ 商品历史表现 ============

/** 历史采集数据点 */
export interface HistoryPoint {
  /** 采集时间（ISO 8601） */
  collectedAt: string
  /** 本次采集时的询单数 */
  inquiryCount: number
  /** 本次采集时的浏览数 */
  viewCount: number
  /** 本次采集时的想要数 */
  wantCount: number
  /** 本次采集时的收藏数 */
  favoriteCount: number
  /** 本次采集时的价格（如有变动） */
  price: number | null
}

/** 商品历史表现响应 */
export interface ProductHistoryResponse {
  gid: string
  items: HistoryPoint[]
}

/** 获取商品历史采集数据 — GET /api/topic/monitor/item/{gid}/history */
export async function getProductHistory(
  gid: string,
  days: 7 | 30 | 90 = 7
): Promise<ProductHistoryResponse> {
  console.debug(`[SelectionAPI] getProductHistory gid=${gid} days=${days}`)
  return selectionFetch<ProductHistoryResponse>(
    `/monitor/item/${encodeURIComponent(gid)}/history?days=${days}`
  )
}
```

- [ ] **Step 9.7: 提交**

```bash
git add lib/api/selection.ts
git commit -m "feat: extend API types for product history

- MonitoredItemDTO/ProductItem: add recentInquiries, trend, trendValue,
  stabilityValue, lastCollectedAt
- ProductSortKey: add trendValue, stabilityValue
- New types: HistoryPoint, ProductHistoryResponse
- New API: getProductHistory(gid, days)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 阶段四：新建组件

### Task 10: 创建 MiniTrendChart 组件

**Files:**
- Create: `components/selection/product/MiniTrendChart.tsx`

- [ ] **Step 10.1: 编写组件**

```typescript
'use client'

interface MiniTrendChartProps {
  /** 最近 10 次采集的询单数，按时间升序 */
  data: number[]
  /** 趋势方向，决定折线颜色 */
  trend: 'up' | 'down' | 'flat'
  /** 最近一次采集时间（ISO 8601），用于 tooltip */
  lastCollectedAt: string | null
}

const COLOR_MAP: Record<string, string> = {
  up: '#16a34a',   // green-600
  down: '#dc2626', // red-600
  flat: '#9ca3af', // gray-400
}

export function MiniTrendChart({ data, trend, lastCollectedAt }: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return <span className="text-xs text-gray-400">-</span>
  }

  const width = 100
  const height = 28
  const padding = 2

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // 将数据点映射为 SVG 坐标
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const polyline = points.join(' ')
  const lastValue = data[data.length - 1]
  const color = COLOR_MAP[trend] || COLOR_MAP.flat

  const tooltipText = lastCollectedAt
    ? `最后采集: ${new Date(lastCollectedAt).toLocaleDateString('zh-CN')} · 询单 ${lastValue}`
    : `最近询单: ${lastValue}`

  return (
    <div className="inline-flex items-center justify-center" title={tooltipText}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1]?.split(',')[0] || 0}
          cy={points[points.length - 1]?.split(',')[1] || 0}
          r="2"
          fill={color}
        />
      </svg>
    </div>
  )
}
```

- [ ] **Step 10.2: 提交**

```bash
git add components/selection/product/MiniTrendChart.tsx
git commit -m "feat: add MiniTrendChart component

Pure SVG sparkline for in-table rendering. 100x28px, color-coded by
trend direction. Shows last collected value on hover tooltip.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: 创建 TrendChart 组件（echarts 折线图）

**Files:**
- Create: `components/selection/product/TrendChart.tsx`

- [ ] **Step 11.1: 编写组件**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { HistoryPoint } from '@/lib/api/selection'

interface TrendChartProps {
  /** 历史数据点 */
  data: HistoryPoint[]
  /** 数据类型：'inquiry' = 询单趋势, 'conversion' = 转化率趋势 */
  type: 'inquiry' | 'conversion'
  /** 是否显示 7 日移动平均线（仅 inquiry 类型，且数据 ≥ 14 天时显示） */
  showMA?: boolean
}

export function TrendChart({ data, type, showMA = false }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current)
    }

    const times = data.map(d => {
      const t = new Date(d.collectedAt)
      return `${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
    })

    if (type === 'inquiry') {
      const inquiryData = data.map(d => d.inquiryCount)
      const series: any[] = [
        {
          name: '询单数',
          type: 'line',
          data: inquiryData,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#2563eb', width: 2 },
          itemStyle: { color: '#2563eb' },
        },
      ]

      // 7 日移动平均
      if (showMA && data.length >= 14) {
        const maData: (number | null)[] = []
        for (let i = 0; i < inquiryData.length; i++) {
          if (i < 6) {
            maData.push(null)
          } else {
            const slice = inquiryData.slice(i - 6, i + 1)
            maData.push(slice.reduce((a, b) => a + b, 0) / slice.length)
          }
        }
        series.push({
          name: '7日均值',
          type: 'line',
          data: maData,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#9ca3af', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#9ca3af' },
        })
      }

      chartRef.current.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const time = params[0].axisValue
            let html = `<div class="text-xs">${time}</div>`
            params.forEach((p: any) => {
              if (p.value != null) {
                html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${p.value}</b></div>`
              }
            })
            return html
          },
        },
        grid: { left: 40, right: 16, top: 12, bottom: 24 },
        xAxis: {
          type: 'category',
          data: times,
          axisLabel: { fontSize: 10, color: '#9ca3af', rotate: 45 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          axisLabel: { fontSize: 10, color: '#9ca3af' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        series,
      })
    } else {
      // conversion type — 双折线图（双 Y 轴）
      const inquiryRates = data.map(d =>
        d.viewCount > 0 ? (d.inquiryCount / d.viewCount) * 100 : null
      )
      const favoriteRates = data.map(d =>
        d.inquiryCount > 0 ? (d.favoriteCount / d.inquiryCount) * 100 : null
      )

      chartRef.current.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const time = params[0].axisValue
            let html = `<div class="text-xs">${time}</div>`
            params.forEach((p: any) => {
              if (p.value != null) {
                html += `<div class="text-xs">${p.marker} ${p.seriesName}: <b>${Number(p.value).toFixed(1)}%</b></div>`
              }
            })
            return html
          },
        },
        legend: {
          data: ['浏览→询单', '询单→收藏'],
          bottom: 0,
          textStyle: { fontSize: 11, color: '#6b7280' },
        },
        grid: { left: 40, right: 56, top: 12, bottom: 32 },
        xAxis: {
          type: 'category',
          data: times,
          axisLabel: { fontSize: 10, color: '#9ca3af', rotate: 45 },
          axisTick: { show: false },
        },
        yAxis: [
          {
            type: 'value',
            name: '浏览→询单 %',
            axisLabel: { fontSize: 10, color: '#3b82f6', formatter: '{value}%' },
            splitLine: { lineStyle: { color: '#f3f4f6' } },
          },
          {
            type: 'value',
            name: '询单→收藏 %',
            axisLabel: { fontSize: 10, color: '#a855f7', formatter: '{value}%' },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: '浏览→询单',
            type: 'line',
            yAxisIndex: 0,
            data: inquiryRates,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#3b82f6', width: 2 },
            itemStyle: { color: '#3b82f6' },
          },
          {
            name: '询单→收藏',
            type: 'line',
            yAxisIndex: 1,
            data: favoriteRates,
            smooth: true,
            symbol: 'none',
            lineStyle: { color: '#a855f7', width: 2 },
            itemStyle: { color: '#a855f7' },
          },
        ],
      })
    }

    const handleResize = () => chartRef.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data, type, showMA])

  // 清理
  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        暂无历史数据
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-56" />
}
```

- [ ] **Step 11.2: 提交**

```bash
git add components/selection/product/TrendChart.tsx
git commit -m "feat: add TrendChart component with echarts

Supports two modes: inquiry trend (single line + optional 7-day MA)
and conversion rate trend (dual Y-axis for view→inquiry and
inquiry→favorite). Uses project's existing echarts v6 dependency.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: 创建 ProductHistoryDrawer 组件

**Files:**
- Create: `components/selection/product/ProductHistoryDrawer.tsx`

- [ ] **Step 12.1: 编写组件**

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sheet } from '@/components/ui/Sheet'
import { TrendChart } from '@/components/selection/product/TrendChart'
import { getProductHistory, type ProductItem } from '@/lib/api/selection'
import { RotateCcw } from 'lucide-react'

interface ProductHistoryDrawerProps {
  /** 选中的商品 GID，null 时不渲染 Sheet */
  gid: string | null
  /** 选中的商品信息（列表行数据），用于头部展示 */
  product: ProductItem | null
  /** 关闭回调 */
  onClose: () => void
}

type TimeRange = 7 | 30 | 90

const TIME_RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: 7, label: '7天' },
  { key: 30, label: '30天' },
  { key: 90, label: '90天' },
]

export function ProductHistoryDrawer({ gid, product, onClose }: ProductHistoryDrawerProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(7)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product-history', gid, timeRange],
    queryFn: () => getProductHistory(gid!, timeRange),
    enabled: !!gid,
  })

  const open = !!gid

  // 计算稳定性指标
  const inquiryValues = data?.items.map(d => d.inquiryCount) || []
  const mean = inquiryValues.length > 0 ? inquiryValues.reduce((a, b) => a + b, 0) / inquiryValues.length : 0
  const variance = inquiryValues.length > 0
    ? inquiryValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / inquiryValues.length
    : 0
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0

  // 转化率 CV
  const conversionRates = data?.items.map(d =>
    d.inquiryCount > 0 ? d.favoriteCount / d.inquiryCount : null
  ).filter(Boolean) as number[] || []
  const convMean = conversionRates.length > 0 ? conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length : 0
  const convVariance = conversionRates.length > 0
    ? conversionRates.reduce((sum, v) => sum + (v - convMean) ** 2, 0) / conversionRates.length
    : 0
  const convCv = convMean > 0 ? Math.sqrt(convVariance) / convMean : 0

  // 汇总计算
  const totalInquiry = inquiryValues.reduce((a, b) => a + b, 0)
  const avgDailyInquiry = timeRange > 0 ? totalInquiry / timeRange : 0
  const avgConversion = conversionRates.length > 0
    ? conversionRates.reduce((a, b) => a + b, 0) / conversionRates.length
    : 0

  const firstInquiry = inquiryValues[0] || 0
  const lastInquiry = inquiryValues[inquiryValues.length - 1] || 0
  const trendPct = firstInquiry > 0 ? ((lastInquiry - firstInquiry) / firstInquiry) * 100 : 0
  const trendDirection = trendPct > 1 ? 'up' : trendPct < -1 ? 'down' : 'flat'

  const cvLabel = cv <= 0.3 ? '稳定' : cv <= 0.6 ? '一般' : '波动'
  const cvColor = cv <= 0.3 ? 'text-green-600 bg-green-50' : cv <= 0.6 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'

  const convCvLabel = convCv <= 0.3 ? '稳定' : convCv <= 0.6 ? '一般' : '波动'
  const convCvColor = convCv <= 0.3 ? 'text-green-600 bg-green-50' : convCv <= 0.6 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? `${product.description || product.title || '商品'} / ${gid}` : ''}
      width="520px"
    >
      <div className="p-4 space-y-5 overflow-y-auto h-full">
        {/* 时间范围切换 */}
        <div className="flex items-center gap-1.5">
          {TIME_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTimeRange(opt.key)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timeRange === opt.key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 错误态 */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-gray-500">数据加载失败</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> 重试
            </button>
          </div>
        )}

        {/* 加载态 */}
        {isLoading && !isError && (
          <div className="space-y-4">
            <div className="h-56 bg-gray-100 animate-pulse rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
              <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
            </div>
            <div className="h-28 bg-gray-100 animate-pulse rounded-lg" />
          </div>
        )}

        {/* 数据态 */}
        {!isLoading && !isError && (
          <>
            {!data || data.items.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                该商品暂无历史采集数据
              </div>
            ) : (
              <>
                {/* 询单趋势图 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">询单趋势</h4>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <TrendChart
                      data={data.items}
                      type="inquiry"
                      showMA={data.items.length >= 14}
                    />
                  </div>
                </div>

                {/* 转化率趋势图 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">转化率趋势</h4>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <TrendChart
                      data={data.items}
                      type="conversion"
                    />
                  </div>
                </div>

                {/* 稳定性指标 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">稳定性指标</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">询单稳定性</p>
                      <p className="text-lg font-semibold text-gray-900">CV {cv.toFixed(2)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cvColor}`}>
                        {cvLabel}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">转化稳定性</p>
                      <p className="text-lg font-semibold text-gray-900">CV {convCv.toFixed(2)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${convCvColor}`}>
                        {convCvLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 汇总区 */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">数据汇总</h4>
                  <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">时间段总询单</span>
                      <span className="text-xs font-semibold text-gray-900">{totalInquiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">日均询单</span>
                      <span className="text-xs font-semibold text-gray-900">{avgDailyInquiry.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">询单→收藏转化率均值</span>
                      <span className="text-xs font-semibold text-gray-900">{(avgConversion * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">询单趋势方向</span>
                      <span className={`text-xs font-semibold ${
                        trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'} {Math.abs(trendPct).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 12.2: 提交**

```bash
git add components/selection/product/ProductHistoryDrawer.tsx
git commit -m "feat: add ProductHistoryDrawer with history charts and stats

Sheet-based overlay drawer showing: inquiry trend chart, conversion
rate chart, stability CV indicators, and summary stats. Supports
7/30/90 day time range switching. Handles loading, empty, and error
states.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 13: 创建 SettingsDrawer 组件

**Files:**
- Create: `components/selection/shared/SettingsDrawer.tsx`
- Modify: `components/selection/config/AccountsConfig.tsx`
- Modify: `components/selection/config/AIConfig.tsx`

- [ ] **Step 13.1: 编写 SettingsDrawer**

```typescript
'use client'

import { Sheet } from '@/components/ui/Sheet'
import { AccountsConfig } from '@/components/selection/config/AccountsConfig'
import { AIConfig } from '@/components/selection/config/AIConfig'
import { CollectionConfig } from '@/components/selection/config/CollectionConfig'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  return (
    <Sheet open={open} onClose={onClose} title="选品监控设置" width="480px">
      <div className="p-4 space-y-6 overflow-y-auto h-full">
        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">对标账号</h4>
          <AccountsConfig />
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">AI 分析配置</h4>
          <AIConfig />
        </section>

        <section>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">采集设置</h4>
          <CollectionConfig />
        </section>
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 13.2: 去掉配置组件的外层卡片样式**

先查看具体样式：
```bash
grep -n "bg-white.*rounded" components/selection/config/AccountsConfig.tsx components/selection/config/AIConfig.tsx
```

对于 `AccountsConfig.tsx`，找到最外层 div 的 `className`，移除 `bg-white rounded-xl p-5` 等卡片样式，保留 `space-y-3`。

对于 `AIConfig.tsx`，找到最外层 div 的 `className`，移除 `bg-white rounded-xl p-5` 等卡片样式，保留 `space-y-4`。

- [ ] **Step 13.3: 提交**

```bash
git add components/selection/shared/SettingsDrawer.tsx components/selection/config/AccountsConfig.tsx components/selection/config/AIConfig.tsx
git commit -m "feat: add SettingsDrawer + remove card-in-card styles from config components

SettingsDrawer hosts AccountsConfig, AIConfig, and CollectionConfig
in a Sheet overlay. Removed outer card wrappers from AccountsConfig
and AIConfig to avoid visual redundancy inside the drawer.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 阶段五：ProductMonitorTab 扩展

### Task 14: 给删除按钮加 e.stopPropagation()

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

**说明：** 先修 bug 再加功能。在加行级 onClick 之前，必须确保删除按钮已阻止冒泡。

- [ ] **Step 14.1: 修改删除按钮的 onClick**

找到第 491 行附近：
```typescript
onClick={() => handleRemove(p.id)}
```

改为：
```typescript
onClick={(e) => { e.stopPropagation(); handleRemove(p.id) }}
```

- [ ] **Step 14.2: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "fix: add e.stopPropagation() to ProductMonitorTab delete button

Prevents row click selection from firing when clicking the delete button.
Required before adding row-level onClick for history drawer.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 15: 新增 3 列 + 行选中 + 历史抽屉集成

**Files:**
- Modify: `components/selection/product/ProductMonitorTab.tsx`

依赖：Task 9（API 类型）、Task 10（MiniTrendChart）、Task 12（ProductHistoryDrawer）

- [ ] **Step 15.1: 新增导入**

在文件顶部导入区添加：
```typescript
import { MiniTrendChart } from '@/components/selection/product/MiniTrendChart'
import { ProductHistoryDrawer } from '@/components/selection/product/ProductHistoryDrawer'
```

- [ ] **Step 15.2: 扩展 ColumnGroup 类型，新增 'trend' 分组**

```typescript
type ColumnGroup = 'identity' | 'core' | 'conversion' | 'time' | 'value' | 'meta' | 'trend'
```

在 `GROUP_STYLE` 对象中添加：
```typescript
  trend:      { bar: 'bg-gradient-to-r from-rose-300 to-rose-400' },
```

- [ ] **Step 15.3: 扩展 ColumnDef.key 类型，追加 3 列到 COLUMNS**

```typescript
interface ColumnDef {
  key: ProductSortKey | 'keywords' | 'monitorStatus' | 'trendChart'
  label: string
  width: string
  group: ColumnGroup
  groupStart: boolean
  dataBar?: boolean
}
```

在 `COLUMNS` 数组末尾（`monitorStatus` 列之后，`];` 之前）添加：
```typescript
  // ── 📈 趋势表现（rose）──
  { key: 'trendValue' as ProductSortKey,    label: '趋势指标',   width: 'w-[90px] shrink-0',  group: 'trend', groupStart: true },
  { key: 'trendChart' as any,               label: '近期趋势',   width: 'w-[100px] shrink-0', group: 'trend', groupStart: false },
  { key: 'stabilityValue' as ProductSortKey, label: '稳定性',    width: 'w-[90px] shrink-0',  group: 'trend', groupStart: false },
```

- [ ] **Step 15.4: 更新 unsortable 判断**

找到：
```typescript
const unsortable = col.key === 'keywords' || col.key === 'monitorStatus'
```

改为：
```typescript
const unsortable = col.key === 'keywords' || col.key === 'monitorStatus' || col.key === 'trendChart'
```

- [ ] **Step 15.5: 更新表格最小宽度**

找到 `min-w-[1340px]`，改为：
```typescript
<div className="min-w-[1620px]">
```

（原 1340 + 90 + 100 + 90 = 1620）

- [ ] **Step 15.6: 新增 selectedProductId 状态**

在组件顶部 state 区域添加：
```typescript
const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
```

- [ ] **Step 15.7: 在 renderCell 中添加 3 个新列的渲染逻辑**

在 switch 的 `default:` 之前添加：
```typescript
      // ── 趋势指标 ──
      case 'trendValue': {
        const v = p.trendValue
        const isUp = p.trend === 'up'
        const isDown = p.trend === 'down'
        return (
          <span className={`text-xs font-semibold tabular-nums ${
            isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-400'
          }`}>
            {isUp ? '↑' : isDown ? '↓' : '→'} {Math.abs(v).toFixed(1)}%
          </span>
        )
      }

      // ── 迷你趋势图 ──
      case 'trendChart':
        return (
          <MiniTrendChart
            data={p.recentInquiries}
            trend={p.trend}
            lastCollectedAt={p.lastCollectedAt}
          />
        )

      // ── 稳定性 ──
      case 'stabilityValue': {
        const cv = p.stabilityValue
        const colorClass = cv <= 0.3 ? 'text-green-600' : cv <= 0.6 ? 'text-yellow-600' : 'text-red-600'
        return (
          <span className={`text-xs font-semibold tabular-nums ${colorClass}`}>
            CV {cv.toFixed(2)}
          </span>
        )
      }
```

- [ ] **Step 15.8: 数据行添加 onClick 和高亮样式**

找到行 div（约第 467-469 行）：
```typescript
<div
  key={p.id}
  className="group flex px-5 py-[12px] items-center hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-all duration-200"
>
```

改为：
```typescript
<div
  key={p.id}
  onClick={() => setSelectedProductId(prev => prev === p.id ? null : p.id)}
  className={`group flex px-5 py-[12px] items-center transition-all duration-200 cursor-pointer ${
    selectedProductId === p.id
      ? 'bg-blue-50/60 hover:bg-blue-50/70'
      : 'hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent'
  }`}
>
```

- [ ] **Step 15.9: 底部添加 ProductHistoryDrawer**

在组件最外层 `</div>` 之前、AI 分析报告之后添加：
```typescript
      {/* 历史详情抽屉 */}
      <ProductHistoryDrawer
        gid={selectedProductId}
        product={selectedProductId ? filtered.find(p => p.id === selectedProductId) ?? null : null}
        onClose={() => setSelectedProductId(null)}
      />
```

- [ ] **Step 15.10: 提交**

```bash
git add components/selection/product/ProductMonitorTab.tsx
git commit -m "feat: add 3 new columns + row selection + history drawer to ProductMonitorTab

New columns: trend indicator (sortable), mini sparkline (unsortable),
stability CV (sortable). Row click selects product and opens history
drawer. Column group 'trend' added with rose color bar.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 阶段六：验证

### Task 16: TypeScript 类型检查

- [ ] **Step 16.1: 运行 TypeScript 编译检查**

```bash
npx tsc --noEmit 2>&1 | head -80
```

预期：零错误。如有错误，逐一修复。

常见可能问题：
- 导入路径不匹配（新旧路径混用）
- ProductSortKey 新增值未在 getProductSortValue 中处理
- 组件 props 类型不匹配

- [ ] **Step 16.2: 运行 lint 检查**

```bash
npx next lint 2>&1
```

预期：零错误或仅有预先存在的 warning。

---

### Task 17: 功能完整性核对

逐项核对设计文档中的所有需求：

- [ ] **Step 17.1: 页面拆分**
  - `/dashboard/publish` — 仅显示商品发布 Tab，无选品监控
  - `/dashboard/selection` — 可访问，默认显示关键词采集 Tab
  - 侧边栏显示"选品监控"导航项，可点击跳转

- [ ] **Step 17.2: 三个 Tab 功能正常**
  - 关键词采集 Tab — 与原来行为一致
  - 商品监控 Tab — 显示 18 列表格，包含 3 个新列
  - 商户监控 Tab — 与原来行为一致

- [ ] **Step 17.3: 新列功能**
  - 趋势指标列：显示箭头 + 百分比，颜色正确，可排序
  - 近期趋势列：显示 SVG 迷你图，颜色随 trend 变化，不可排序
  - 稳定性列：显示 CV 值，颜色分级正确，可排序

- [ ] **Step 17.4: 行点击交互**
  - 点击行（非操作区域）→ 选中高亮 + 右侧抽屉滑入
  - 再次点击同一行 → 取消选中 + 抽屉关闭
  - 点击抽屉 X 按钮 → 取消选中 + 抽屉关闭
  - 点击 badge 切换监控状态 → 行不选中（stopPropagation 已存在）
  - 点击删除按钮 → 执行删除，行不选中（stopPropagation 已修复）

- [ ] **Step 17.5: 历史抽屉内容**
  - 头部显示商品信息 + GID
  - 时间范围切换按钮组可用（7/30/90 天）
  - 询单趋势折线图渲染正常
  - 转化率趋势双折线图渲染正常
  - 稳定性指标卡片显示 CV 值 + 等级标签
  - 汇总区显示 4 项统计数据

- [ ] **Step 17.6: 空态和错误态**
  - 未选中商品 → Sheet 不渲染
  - 选中商品无历史数据 → 抽屉内显示"暂无历史采集数据"
  - 数据加载中 → 骨架屏
  - API 失败 → 错误提示 + 重试按钮

- [ ] **Step 17.7: 设置抽屉**
  - 点击"设置"按钮 → SettingsDrawer 弹出
  - 显示 AccountsConfig / AIConfig / CollectionConfig
  - 三个组件使用 mock 数据正常显示

---

### Task 18: 最终提交

- [ ] **Step 18.1: 最终 git status 确认**

```bash
git status
```

预期：所有变更已提交，工作区 clean。

- [ ] **Step 18.2: 查看完整变更摘要**

```bash
git log --oneline master..HEAD
```

---

## 实施顺序

严格按阶段顺序执行，每阶段内任务也按编号顺序：

```
阶段一：目录重组 (Task 1-4)
  → 阶段二：页面拆分 (Task 5-8)
    → 阶段三：API 扩展 (Task 9)
      → 阶段四：新组件 (Task 10-13)
        → 阶段五：ProductMonitorTab 扩展 (Task 14-15)
          → 阶段六：验证 (Task 16-18)
```

**关键依赖链：**
- Task 6（selection page）依赖 Task 1-4（目录重组）
- Task 9（API 类型）必须在 Task 10-15 之前
- Task 12（ProductHistoryDrawer）依赖 Task 11（TrendChart）
- Task 15（ProductMonitorTab 扩展）依赖 Task 9（API）、Task 10（MiniTrendChart）、Task 12（ProductHistoryDrawer）、Task 14（stopPropagation）
- Task 13（SettingsDrawer）依赖 Task 1-4（目录重组，config 组件就位）
