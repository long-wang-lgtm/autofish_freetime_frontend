# Batch Publish Phase 0-2 Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the skeleton (page + routing + sidebar), API module, and shared components for the batch-publish system.

**Architecture:** 1-page-4-tab layout at `/dashboard/batch-publish?tab=`, new API module at `lib/api/batch-publish.ts` using `/api/selection/*` endpoints, shared components (StatusPipeline 4-node progress bar, BatchActionBar, constants).

**Tech Stack:** Next.js + React + Tailwind CSS v3, React Query, fetchApi

---

## Prerequisite Check

Before starting, verify these files exist and match expected patterns:
- `hooks/useTabRouting.ts` — useTabRouting hook
- `components/ui/navigation/TabBar/index.tsx` — TabBar component
- `components/layout/Sidebar.tsx` — Sidebar navigation
- `lib/utils/api.ts` — fetchApi function
- `components/ui/feedback/StatusBadge.tsx` — StatusBadge component

---

### Task 1: Create skeleton page with TabBar + routing

**Files:**
- Create: `app/dashboard/batch-publish/page.tsx`

This is the page skeleton. Four tabs with placeholder content. We use the exact same pattern as `app/dashboard/selection/page.tsx`.

- [ ] **Step 1: Create the page file**

Create `app/dashboard/batch-publish/page.tsx`:

```tsx
'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/navigation/TabBar'
import { useTabRouting } from '@/hooks/useTabRouting'
import { Search, Lightbulb, PenTool, FileText } from 'lucide-react'

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

      {activeTab === 'monitor' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          商品监控 — 开发中
        </div>
      )}
      {activeTab === 'opportunity' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          商机管理 — 开发中
        </div>
      )}
      {activeTab === 'workbench' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          创作台 — 开发中
        </div>
      )}
      {activeTab === 'materials' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          发布记录 — 开发中
        </div>
      )}
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

- [ ] **Step 2: Verify the page compiles**

Run: `cd /e/.project/autofish_freetime/frontend && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds (may have warnings about unused icons, that's fine for placeholder).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/batch-publish/page.tsx
git commit -m "feat: add batch-publish page skeleton with 4-tab routing

Phase 0: page.tsx with TabBar, useTabRouting for 4 tabs (monitor/opportunity/workbench/materials), placeholder content.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add sidebar navigation entry

**Files:**
- Modify: `components/layout/Sidebar.tsx` (add nav item after '选品监控')

- [ ] **Step 1: Add the nav item to Sidebar.tsx**

In `components/layout/Sidebar.tsx`, add a new entry to the `navItems` array after the '选品监控' entry (after line 58, before the '设置' entry):

The old code around lines 50-68:
```tsx
  {
    label: '选品监控',
    path: '/dashboard/selection',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: '设置',
```

Insert after the '选品监控' entry:
```tsx
  {
    label: '选品监控',
    path: '/dashboard/selection',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: '批量创作',
    path: '/dashboard/batch-publish',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    label: '设置',
```

The Edit to apply: replace the block `  {\n    label: '设置',` (which appears uniquely after 选品监控) with the new nav item plus `  {\n    label: '设置',`.

- [ ] **Step 2: Verify Sidebar compiles**

Run: `cd /e/.project/autofish_freetime/frontend && npx next build --no-lint 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add batch-publish to sidebar navigation

Phase 0: Add '批量创作' nav item linking to /dashboard/batch-publish.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Create API module — types

**Files:**
- Create: `lib/api/batch-publish.ts`

The API module follows the exact same patterns as `lib/api/selection.ts`:
- Types defined near API functions in the same file
- Uses `fetchApi` from `lib/utils/api.ts`
- Base URL: `${API_BASE_URL}/api/selection`

- [ ] **Step 1: Create the API module with all types and functions**

Create `lib/api/batch-publish.ts`:

```typescript
/**
 * 批量创作发布系统 — API 模块
 *
 * 所有接口基于 /api/selection/*，通过 fetchApi 统一请求。
 * 类型与 API 函数就近定义。
 */

import { fetchApi, API_BASE_URL, type OperationResponse } from '@/lib/utils/api'

const BP_BASE = `${API_BASE_URL}/api/selection`

// ============================================================
// 类型定义
// ============================================================

/** 素材状态 — 前端可见的 6 个稳定状态 */
export type MaterialStatus =
  | 'pending'
  | 'writing_done'
  | 'genimageplan_done'
  | 'genimage_done'
  | 'published'
  | 'publish_failed'

/** AI 上下文模板类型 */
export type TemplateType = 'only_opportunity' | 'with_item'

/** 素材 AI 上下文 */
export interface MaterialAIContext {
  template?: TemplateType
  images?: string[]
  items?: string[]
  coverprompt?: string
}

/** 监控商品 */
export interface MonitoredItem {
  gid: string
  uid?: string | null
  name?: string | null
  monitorStatus?: number | null
  title?: string | null
  description?: string | null
  price?: number | null
  wantCount?: number | null
  lookCount?: number | null
  collectCount?: number | null
  wantSlope?: number | null
  wantAvg?: number | null
  convertRate?: number | null
  hideAvg?: number | null
  trendData?: unknown | null
  publishTime?: number | null
  keywords?: string[] | null
  itemStatus?: number | null
  opportunity_id?: number | null
  created_at?: string | null
  updated_at?: string | null
}

/** 商机 */
export interface OpportunityItem {
  id: number
  name: string
  description?: string | null
  price?: number
  status: string
  ai_context_template?: TemplateType
  monitored_item_count?: number
  material_count?: number
  created_at?: string | null
  updated_at?: string | null
}

/** 商机创建/更新入参 */
export interface OpportunityInput {
  name: string
  description?: string
  price?: number
  ai_context_template?: TemplateType
}

/** 素材 */
export interface PublishMaterial {
  id: number
  description?: string | null
  price?: number | null
  category?: string | null
  status: MaterialStatus
  images?: MaterialImage[]
  ai_context?: MaterialAIContext
  to_uid?: string | null
  to_gid?: string | null
  opportunity_id: number
  opportunity_name?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** 素材图片 */
export interface MaterialImage {
  url: string
  order?: number
}

/** 素材创建入参 */
export interface MaterialCreateInput {
  opportunity_id: number
  count?: number
}

/** 素材编辑入参 */
export interface MaterialEditInput {
  id: number
  description?: string
  price?: number
  category?: string
  to_uid?: string
  images?: MaterialImage[]
}

/** AI 上下文更新入参 */
export interface MaterialContextInput {
  id: number
  contextTemplateType: TemplateType
  items?: string[]
  images?: string[]
  coverprompt?: string
}

/** 列表响应 — 监控商品 */
export interface MonitorItemListResponse {
  items: MonitoredItem[]
  total: number
}

/** 列表响应 — 商机 */
export interface OpportunityListResponse {
  items: OpportunityItem[]
  total: number
}

/** 列表响应 — 素材 */
export interface MaterialListResponse {
  items: PublishMaterial[]
  total: number
}

// ============================================================
// 监控商品 API
// ============================================================

/** 列出监控商品 — GET /api/selection/monitor/items */
export async function listMonitoredItems(params?: {
  page?: number
  page_size?: number
  search?: string
  monitorStatus?: number
  opportunity_id?: number | null
  orderBy?: string
  asc?: boolean
}): Promise<MonitorItemListResponse> {
  return fetchApi<MonitorItemListResponse>('/monitor/items', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 批量绑定商品到商机 — POST /api/selection/monitor/batch.bind */
export async function batchBindOpportunity(gids: string[], opportunityId: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/batch.bind', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gids, opportunity_id: opportunityId }),
  })
}

/** 解绑商品 — POST /api/selection/monitor/unbind.opportunity */
export async function unbindOpportunity(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/unbind.opportunity', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gid }),
  })
}

/** 删除监控商品 — DELETE /api/selection/monitor/item/delete */
export async function deleteMonitoredItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor/item/delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { gid },
  })
}

// ============================================================
// 商机 API
// ============================================================

/** 列出商机 — GET /api/selection/opportunities */
export async function listOpportunities(params?: {
  page?: number
  page_size?: number
  search?: string
  status?: string
}): Promise<OpportunityListResponse> {
  return fetchApi<OpportunityListResponse>('/opportunities', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 创建商机 — POST /api/selection/opportunity/create */
export async function createOpportunity(input: OpportunityInput): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity/create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 更新商机 — POST /api/selection/opportunity/update */
export async function updateOpportunity(id: number, input: Partial<OpportunityInput>): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity/update', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id, ...input }),
  })
}

/** 删除商机 — DELETE /api/selection/opportunity/delete */
export async function deleteOpportunity(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/opportunity/delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { id },
  })
}

// ============================================================
// 素材 API
// ============================================================

/** 列出素材 — GET /api/selection/materials */
export async function listMaterials(params?: {
  page?: number
  page_size?: number
  search?: string
  status?: MaterialStatus
  opportunity_id?: number
  dateFrom?: string
  dateTo?: string
}): Promise<MaterialListResponse> {
  return fetchApi<MaterialListResponse>('/materials', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}

/** 批量创建素材 — POST /api/selection/material.create */
export async function createMaterials(input: MaterialCreateInput): Promise<PublishMaterial[]> {
  return fetchApi<PublishMaterial[]>('/material.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 编辑素材 — POST /api/selection/material.edit */
export async function editMaterial(input: MaterialEditInput): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.edit', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 更新 AI 上下文 — POST /api/selection/material.context */
export async function updateMaterialContext(input: MaterialContextInput): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.context', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 触发 AI 改写 — POST /api/selection/material.rewrite */
export async function triggerRewrite(materialId: number): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.rewrite', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}

/** 获取发布类目 — POST /api/selection/material.channel */
export async function getChannel(materialId: number): Promise<{ category: string }> {
  return fetchApi<{ category: string }>('/material.channel', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}

/** 发布素材 — POST /api/selection/material.publish */
export async function publishMaterial(materialId: number): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.publish', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}

/** 删除素材 — DELETE /api/selection/material/delete */
export async function deleteMaterial(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/material/delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'DELETE',
    params: { id },
  })
}

/** 获取 AI 上下文模板 — GET /api/selection/material/context.template */
export async function getContextTemplate(materialId: number): Promise<MaterialAIContext> {
  return fetchApi<MaterialAIContext>('/material/context.template', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: { id: materialId },
  })
}
```

- [ ] **Step 2: Verify the module compiles**

Run: `cd /e/.project/autofish_freetime/frontend && npx tsc --noEmit lib/api/batch-publish.ts 2>&1`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api/batch-publish.ts
git commit -m "feat: add batch-publish API module with all types and functions

Phase 1: lib/api/batch-publish.ts — MonitoredItem, OpportunityItem, PublishMaterial types + 17 API functions covering monitor/opportunity/material endpoints.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Create shared constants

**Files:**
- Create: `components/batch-publish/shared/constants.ts`

- [ ] **Step 1: Create constants file**

Create `components/batch-publish/shared/constants.ts`:

```typescript
/**
 * 批量创作发布系统 — 共享常量
 *
 * 包含：状态映射、颜色配置、表格列配置、Tab 定义等。
 */

import type { MaterialStatus, TemplateType } from '@/lib/api/batch-publish'

// ============================================================
// 素材状态映射（StatusBadge 配置）
// ============================================================

export const MATERIAL_STATUS_CONFIG: Record<MaterialStatus, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  pending:            { label: '待处理',   color: 'gray' },
  writing_done:       { label: '改写完成', color: 'amber' },
  genimageplan_done:  { label: '封面完成', color: 'amber' },
  genimage_done:      { label: '生图完成', color: 'blue' as 'amber' },
  published:          { label: '已发布',   color: 'green' },
  publish_failed:     { label: '发布失败', color: 'red' },
}

// ============================================================
// 素材状态 — 4 节点进度（StatusPipeline 使用）
// ============================================================

export type PipelineNode = 'rewrite' | 'genimageplan' | 'genimage' | 'publish'

export const PIPELINE_NODES: { key: PipelineNode; label: string }[] = [
  { key: 'rewrite',       label: '改写' },
  { key: 'genimageplan',  label: '封面' },
  { key: 'genimage',      label: '生图' },
  { key: 'publish',       label: '发布' },
]

/**
 * 根据素材状态推导 4 节点各自的完成状态。
 * 返回 4 元素数组，对应 [改写, 封面, 生图, 发布]。
 * - 'done' = 完成
 * - 'pending' = 未开始
 * - 'failed' = 失败（仅发布节点）
 */
export function getPipelineState(status: MaterialStatus): ('done' | 'pending' | 'failed')[] {
  switch (status) {
    case 'pending':
      return ['pending', 'pending', 'pending', 'pending']
    case 'writing_done':
      return ['done', 'pending', 'pending', 'pending']
    case 'genimageplan_done':
      return ['done', 'done', 'pending', 'pending']
    case 'genimage_done':
      return ['done', 'done', 'done', 'pending']
    case 'published':
      return ['done', 'done', 'done', 'done']
    case 'publish_failed':
      return ['done', 'done', 'done', 'failed']
  }
}

// ============================================================
// 监控状态映射
// ============================================================

export const MONITOR_STATUS_CONFIG: Record<number, { label: string; color: 'green' | 'red' | 'amber' | 'gray' }> = {
  0:    { label: '已暂停', color: 'gray' },
  1:    { label: '监控中', color: 'green' },
  2:    { label: '已分析', color: 'amber' },
  3:    { label: '已入库', color: 'amber' },
  '-100': { label: '已删除', color: 'red' },
}

// ============================================================
// 商机状态映射
// ============================================================

export const OPPORTUNITY_STATUS_CONFIG: Record<string, { label: string; color: 'green' | 'gray' }> = {
  active:   { label: '启用', color: 'green' },
  inactive: { label: '停用', color: 'gray' },
}

// ============================================================
// AI 上下文模板映射
// ============================================================

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  only_opportunity: '仅商机信息',
  with_item:        '商机+监控商品',
}

// ============================================================
// Tab 定义
// ============================================================

export const BATCH_PUBLISH_TABS: { key: 'monitor' | 'opportunity' | 'workbench' | 'materials'; label: string }[] = [
  { key: 'monitor',     label: '商品监控' },
  { key: 'opportunity', label: '商机管理' },
  { key: 'workbench',   label: '创作台' },
  { key: 'materials',   label: '发布记录' },
]

// ============================================================
// 发布记录 — 状态筛选选项
// ============================================================

export const MATERIALS_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'publish_failed', label: '发布失败' },
]

// ============================================================
// 商品监控 — 状态筛选选项
// ============================================================

export const MONITOR_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: '1', label: '监控中' },
  { value: '2', label: '已分析' },
  { value: '3', label: '已入库' },
  { value: '0', label: '已暂停' },
]

// ============================================================
// 绑定状态筛选选项
// ============================================================

export const BIND_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'bound', label: '已绑定' },
  { value: 'unbound', label: '未绑定' },
]
```

- [ ] **Step 2: Verify compilation**

Run: `cd /e/.project/autofish_freetime/frontend && npx tsc --noEmit components/batch-publish/shared/constants.ts 2>&1`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/shared/constants.ts
git commit -m "feat: add batch-publish shared constants

Phase 2: constants.ts — material status config, pipeline state derivation, monitor/opportunity status maps, template labels, filter options.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Create StatusPipeline component

**Files:**
- Create: `components/batch-publish/shared/StatusPipeline.tsx`

A 4-node progress bar (改写 → 封面 → 生图 → 发布). Each node shows ○/●/✕ with connecting line.

- [ ] **Step 1: Create the component**

Create `components/batch-publish/shared/StatusPipeline.tsx`:

```tsx
'use client'

import type { MaterialStatus } from '@/lib/api/batch-publish'
import { PIPELINE_NODES, getPipelineState } from './constants'

interface StatusPipelineProps {
  status: MaterialStatus
}

const STATE_STYLES = {
  done: {
    dot: 'bg-blue-600 border-blue-600',
    line: 'bg-blue-600',
    text: 'text-blue-600',
  },
  pending: {
    dot: 'bg-white border-gray-300',
    line: 'bg-gray-200',
    text: 'text-gray-400',
  },
  failed: {
    dot: 'bg-red-500 border-red-500',
    line: 'bg-red-300',
    text: 'text-red-500',
  },
} as const

const STATE_ICONS: Record<string, string> = {
  done: '●',
  pending: '○',
  failed: '✕',
}

export function StatusPipeline({ status }: StatusPipelineProps) {
  const states = getPipelineState(status)

  return (
    <div className="flex items-center gap-0">
      {PIPELINE_NODES.map((node, i) => {
        const state = states[i]
        const style = STATE_STYLES[state]
        const isLast = i === PIPELINE_NODES.length - 1

        return (
          <div key={node.key} className="flex items-center">
            {/* 节点 */}
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] leading-none border ${style.dot}`}>
              <span className={style.text}>{STATE_ICONS[state]}</span>
            </span>
            {/* 标签 */}
            <span className={`ml-1 text-xs ${style.text}`}>{node.label}</span>
            {/* 连接线 */}
            {!isLast && (
              <div className={`w-4 h-px mx-1 ${style.line}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /e/.project/autofish_freetime/frontend && npx tsc --noEmit components/batch-publish/shared/StatusPipeline.tsx 2>&1`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add components/batch-publish/shared/StatusPipeline.tsx
git commit -m "feat: add StatusPipeline component for 4-node progress bar

Phase 2: StatusPipeline.tsx — visualizes material progress through rewrite/genimageplan/genimage/publish stages with done/pending/failed states.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Create BatchActionBar component

**Files:**
- Create: `components/batch-publish/shared/BatchActionBar.tsx`

Shared floating bottom action bar for batch operations. Appears when items are selected.

- [ ] **Step 1: Create the component**

Create `components/batch-publish/shared/BatchActionBar.tsx`:

```tsx
'use client'

interface BatchActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }[]
}

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function BatchActionBar({ selectedCount, onClear, actions }: BatchActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg -mx-1">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">
          已选 <span className="text-blue-600 font-semibold">{selectedCount}</span> 项
        </span>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          取消选择
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              variantStyles[action.variant || 'primary']
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /e/.project/autofish_freetime/frontend && npx tsc --noEmit components/batch-publish/shared/BatchActionBar.tsx 2>&1`

Expected: No type errors.

- [ ] **Step 3: Final build verification**

Run: `cd /e/.project/autofish_freetime/frontend && npx next build --no-lint 2>&1 | tail -30`

Expected: Build succeeds. All new files compile without errors.

- [ ] **Step 4: Commit**

```bash
git add components/batch-publish/shared/BatchActionBar.tsx
git commit -m "feat: add BatchActionBar shared component

Phase 2: BatchActionBar.tsx — floating bottom action bar for batch operations, appears when items selected with count + clear + configurable action buttons.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Completion Checklist

After all tasks complete, verify:

- [ ] `app/dashboard/batch-publish/page.tsx` exists — 4-tab page skeleton
- [ ] `components/layout/Sidebar.tsx` — contains '批量创作' nav entry
- [ ] `lib/api/batch-publish.ts` — all types + 17 API functions
- [ ] `components/batch-publish/shared/constants.ts` — all status/config maps
- [ ] `components/batch-publish/shared/StatusPipeline.tsx` — 4-node progress
- [ ] `components/batch-publish/shared/BatchActionBar.tsx` — batch action bar
- [ ] Full build `next build` succeeds with no errors

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `app/dashboard/batch-publish/page.tsx` | Create | 0 |
| `components/layout/Sidebar.tsx` | Modify | 0 |
| `lib/api/batch-publish.ts` | Create | 1 |
| `components/batch-publish/shared/constants.ts` | Create | 2 |
| `components/batch-publish/shared/StatusPipeline.tsx` | Create | 2 |
| `components/batch-publish/shared/BatchActionBar.tsx` | Create | 2 |
