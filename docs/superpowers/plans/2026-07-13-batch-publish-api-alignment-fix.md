# API 对齐修复 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `lib/api/batch-publish.ts` 的类型和函数 + 所有 hooks/组件 对齐后端实际路由和 Schema，消除全部 23 项差异。

**Architecture:** 先类型、再函数、再调用方。TypeScript 编译器是天然影响面检测器——API 模块改完后 `tsc --noEmit` 精确指出所有需修改的 hooks/组件。

**Tech Stack:** TypeScript, React Query, fetchApi

**前置:** 后端已补齐 MonitoredItem 的 price/wantCount/lookCount/collectCount 字段 + `material.context.templateType` 路由。

---

### Task 1: 重写 API 类型定义

**Files:**
- Modify: `lib/api/batch-publish.ts:1-98`（类型定义区域）

- [ ] **Step 1: 重写 MonitoredItem 类型**

将 L37-59 的 `MonitoredItem` 接口替换为：

```typescript
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
  opportunity?: OpportunitySchema | null
  created_at?: string | null
  updated_at?: string | null
}
```

关键变更：删除 `opportunity_id?: number | null`，新增 `opportunity?: OpportunitySchema | null`。

- [ ] **Step 2: 重写 OpportunityItem 类型 + 新增 OpportunityParams**

将 L62-73 的 `OpportunityItem` 接口替换为：

```typescript
/** 商机 */
export interface OpportunityItem {
  id: number
  name: string
  description?: string | null
  price?: number
  status: string
  ai_context_template?: TemplateType
  monitoredItemCount?: number
  materialCount?: number
  userId?: string | null
  created_at?: string | null
  updated_at?: string | null
}
```

然后在它后面新增：

```typescript
/** 商机创建/更新入参（不含 id、计数、时间戳） */
export interface OpportunityParams {
  name: string
  description?: string
  price?: number
  status?: string
  ai_context_template?: TemplateType
}
```

关键变更：`monitored_item_count`→`monitoredItemCount`，`material_count`→`materialCount`，删除 `OpportunityInput`（用 `OpportunityParams` 替代）。

- [ ] **Step 3: 重写 PublishMaterial 类型**

将 L84-98 的 `PublishMaterial` 接口替换为：

```typescript
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
  opportunity?: OpportunityItem | null
  created_at?: string | null
  updated_at?: string | null
}
```

关键变更：删除 `opportunity_id: number` 和 `opportunity_name?: string | null`，新增 `opportunity?: OpportunityItem | null`。

- [ ] **Step 4: 重写 MaterialImage 类型**

将 L101-103 的 `MaterialImage` 接口替换为：

```typescript
/** 素材图片 */
export interface MaterialImage {
  md5: string
  filepath?: string | null
  flare?: string | null
  url?: string | null
  size?: number | null
}
```

关键变更：对齐后端 ORM `MaterialImage` TypedDict 结构。

- [ ] **Step 5: 替换 MaterialCreateInput → MaterialCreateParams + 新增辅助类型**

将 L107-110 的 `MaterialCreateInput` 替换为：

```typescript
/** 素材创建入参 */
export interface MaterialCreateParams {
  num: number
  opp: OpportunityItem
}
```

然后在 `MaterialContextInput` 后面（L123-129 之后）新增：

```typescript
/** AI 工作阶段 */
export type RewriteStage = 'write' | 'genimageplan' | 'genimage'

/** AI 工作请求 */
export interface RewriteWorkRequest {
  stage: RewriteStage
}

/** 发布类目项 */
export interface ChannelItemResponse {
  channelCateName: string
  channelCateId: string
}
```

- [ ] **Step 6: 删除旧的 OpportunityInput 导出引用（若有）**

检查文件中是否还有对 `OpportunityInput` 的引用。L76-81 的 `OpportunityInput` 接口需要删除（已被 `OpportunityParams` 替代）。

- [ ] **Step 7: 提交**

```bash
git add lib/api/batch-publish.ts
git commit -m "fix: rewrite API type definitions to align with backend schemas

- MonitoredItem: opportunity_id → opportunity (nested schema)
- OpportunityItem: monitored_item_count/material_count → camelCase
- PublishMaterial: opportunity_id/opportunity_name → opportunity (nested)
- MaterialImage: url/order → md5/filepath/flare/url/size
- Add OpportunityParams, RewriteStage, ChannelItemResponse types
- Rename MaterialCreateInput → MaterialCreateParams"
```

---

### Task 2: 重写 API 函数（路径/方法/参数）

**Files:**
- Modify: `lib/api/batch-publish.ts:149-347`（所有 API 函数）

- [ ] **Step 1: 重写监控商品 API（4 函数）**

将 `listMonitoredItems`（L154-168）替换为：

```typescript
/** 列出监控商品 — GET /api/selection/monitor.item.list */
export async function listMonitoredItems(params?: {
  page?: number
  page_size?: number
  uid?: string
  uname?: string
  gid?: string
  title?: string
  itemStatus?: number
  monitorStatus?: number
  oid?: number | null
  order_by?: string
  asc?: boolean
}): Promise<MonitorItemListResponse> {
  return fetchApi<MonitorItemListResponse>('/monitor.item.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}
```

将 `batchBindOpportunity`（L171-178）路径从 `/monitor.batch.bind` 改为 `/monitor.batch.bind.opportunity`：

```typescript
/** 批量绑定商品到商机 — POST /api/selection/monitor.batch.bind.opportunity */
export async function batchBindOpportunity(gids: string[], opportunityId: number): Promise<MonitoredItemListResponse> {
  return fetchApi<MonitoredItemListResponse>('/monitor.batch.bind.opportunity', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gids, opportunity_id: opportunityId }),
  })
}
```

将 `deleteMonitoredItem`（L191-198）方法从 DELETE 改为 POST，路径从 `/monitor/item/delete` 改为 `/monitor.item.delete`：

```typescript
/** 删除监控商品 — POST /api/selection/monitor.item.delete */
export async function deleteMonitoredItem(gid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/monitor.item.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gid }),
  })
}
```

`unbindOpportunity`（L181-188）路径已经正确 ✅，删除注释中的误导信息即可。

在 `batchBindOpportunity` 和 `unbindOpportunity` 之间新增单个绑定函数：

```typescript
/** 单个商品绑定到商机 — POST /api/selection/monitor.bind.opportunity */
export async function bindOpportunity(gid: string, opportunityId: number): Promise<MonitoredItem> {
  return fetchApi<MonitoredItem>('/monitor.bind.opportunity', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gid, opportunity_id: opportunityId }),
  })
}

/** 绑定商品并同时创建商机 — POST /api/selection/monitor.bind.opportunity.create */
export async function bindOpportunityAndCreate(
  gid: string,
  name: string,
  description: string,
  ai_context_template: TemplateType,
): Promise<MonitoredItem> {
  return fetchApi<MonitoredItem>('/monitor.bind.opportunity.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ gid, name, description, ai_context_template }),
  })
}
```

- [ ] **Step 2: 重写商机 API（4 函数）**

将 `listOpportunities`（L205-216）路径和参数改为：

```typescript
/** 列出商机 — GET /api/selection/opportunity.list */
export async function listOpportunities(params?: {
  page?: number
  page_size?: number
  name?: string
  description?: string
  status?: string
  ai_context_template?: string
}): Promise<OpportunityListResponse> {
  return fetchApi<OpportunityListResponse>('/opportunity.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}
```

将 `createOpportunity`（L219-226）改为接受 `opp` 参数：

```typescript
/** 创建商机 — POST /api/selection/opportunity.create */
export async function createOpportunity(opp: OpportunityParams): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ opp }),
  })
}
```

将 `updateOpportunity`（L229-236）改为 query `oid` + body `opp`：

```typescript
/** 更新商机 — POST /api/selection/opportunity.update */
export async function updateOpportunity(oid: number, opp: Partial<OpportunityParams>): Promise<OpportunityItem> {
  return fetchApi<OpportunityItem>('/opportunity.update', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { oid } as Record<string, string | number>,
    body: JSON.stringify({ opp }),
  })
}
```

将 `deleteOpportunity`（L239-246）方法从 DELETE 改为 POST，参数名 `id`→`oid`：

```typescript
/** 删除商机 — POST /api/selection/opportunity.delete */
export async function deleteOpportunity(oid: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/opportunity.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    params: { oid } as Record<string, string | number>,
  })
}
```

- [ ] **Step 3: 重写素材 API（8 函数）**

将 `listMaterials`（L253-267）改为：

```typescript
/** 列出素材 — GET /api/selection/material.list */
export async function listMaterials(params?: {
  page?: number
  page_size?: number
  oid?: number
  name?: string
  description?: string
  category?: string
  status?: string
}): Promise<MaterialListResponse> {
  return fetchApi<MaterialListResponse>('/material.list', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    params: params as Record<string, string | number>,
  })
}
```

将 `createMaterials`（L270-277）改为接受 `{ num, opp }`：

```typescript
/** 批量创建素材 — POST /api/selection/material.create */
export async function createMaterials(params: MaterialCreateParams): Promise<PublishMaterial[]> {
  return fetchApi<PublishMaterial[]>('/material.create', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify(params),
  })
}
```

将 `triggerRewrite`（L299-307）**合并为** `triggerWork`：

```typescript
/** 触发 AI 工作 — POST /api/selection/material.rewrite.work */
export async function triggerWork(materialId: number, stage: RewriteStage): Promise<PublishMaterial> {
  return fetchApi<PublishMaterial>('/material.rewrite.work', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId, work: { stage } }),
  })
}
```

将 `getChannel`（L310-317）返回类型从 `{ category: string }` 改为 `ChannelItemResponse[]`：

```typescript
/** 获取发布类目 — POST /api/selection/material.channel */
export async function getChannel(materialId: number): Promise<ChannelItemResponse[]> {
  return fetchApi<ChannelItemResponse[]>('/material.channel', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id: materialId }),
  })
}
```

将 `deleteMaterial`（L330-337）方法从 DELETE 改为 POST：

```typescript
/** 删除素材 — POST /api/selection/material.delete */
export async function deleteMaterial(id: number): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/material.delete', {
    baseUrl: BP_BASE,
    credentials_: 'include',
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}
```

将 `getContextTemplate`（L340-346）确认路径正确（后端已补齐）：

```typescript
/** 获取 AI 上下文模板 — GET /api/selection/material.context.templateType */
export async function getContextTemplate(): Promise<OperationResponse> {
  return fetchApi<OperationResponse>('/material.context.templateType', {
    baseUrl: BP_BASE,
    credentials_: 'include',
  })
}
```

`editMaterial`（L280-287）、`updateMaterialContext`（L290-297）、`publishMaterial`（L320-327）路径和签名已经正确 ✅，无需修改。

- [ ] **Step 4: 更新 constants.ts 中的 exports 引用**

文件 `components/batch-publish/shared/constants.ts` L7 从 API 模块导入 `MaterialStatus` 和 `TemplateType`。新增类型 `RewriteStage`、`ChannelItemResponse` 不在 constants 中使用，无需修改 constants.ts。

- [ ] **Step 5: 提交**

```bash
git add lib/api/batch-publish.ts
git commit -m "fix: rewrite API functions to align with backend routes

P0 - Path alignment:
- listMonitoredItems: /monitor/items → /monitor.item.list
- batchBindOpportunity: /monitor.batch.bind → /monitor.batch.bind.opportunity
- deleteMonitoredItem: DELETE → POST /monitor.item.delete
- listOpportunities: /opportunities → /opportunity.list
- deleteOpportunity: DELETE → POST /opportunity.delete
- listMaterials: /materials → /material.list
- deleteMaterial: DELETE → POST /material.delete

P2 - Parameter alignment:
- listMonitoredItems: search→uid/gid/title, opportunity_id→oid, orderBy→order_by
- listOpportunities: search→name/description
- updateOpportunity: body{id,...} → query{oid}+body{opp}
- createMaterials: {opportunity_id,count} → {num,opp}
- listMaterials: search→name/description, opportunity_id→oid

P3 - Design alignment:
- triggerRewrite merged into triggerWork(id, stage)
- getChannel returns ChannelItemResponse[]
- getContextTemplate path corrected

Added: bindOpportunity, bindOpportunityAndCreate"
```

---

### Task 3: 适配 Hooks

**Files:**
- Modify: `hooks/batch-publish/useMonitorData.ts`
- Modify: `hooks/batch-publish/useMonitorMutations.ts`
- Modify: `hooks/batch-publish/useOpportunityData.ts`
- Modify: `hooks/batch-publish/useOpportunityMutations.ts`
- Modify: `hooks/batch-publish/useMaterialsData.ts`

- [ ] **Step 1: 修复 useMonitorData.ts — 参数名映射**

将 L18-26 的 queryFn 内部调用改为：

```typescript
    queryFn: () => listMonitoredItems({
      page,
      page_size: pageSize,
      title: search || undefined,
      monitorStatus: monitorStatus ? Number(monitorStatus) : undefined,
      oid: bindStatus === 'bound' ? undefined : bindStatus === 'unbound' ? 0 : undefined,
      order_by: orderBy ?? undefined,
      asc,
    }),
```

关键变更：
- `search` → `title`（后端不支持单字段模糊搜索，映射为商品标题搜索）
- `opportunity_id` → `oid`
- `orderBy` → `order_by`
- `bindStatus === 'bound'` 时 `oid` 传 `undefined`（表示不过滤，因为已绑定的商品 oid 不为 null），`bindStatus === 'unbound'` 时 `oid` 传 `0`（后端 `oid=0` 意味着 `opportunity_id IS NULL`）

- [ ] **Step 2: 修复 useMonitorMutations.ts — 新增 bind/bindAndCreate**

在现有三个 mutation 之后，新增两个 mutation：

```typescript
  const singleBindMutation = useMutation({
    mutationFn: ({ gid, opportunityId }: { gid: string; opportunityId: number }) =>
      bindOpportunity(gid, opportunityId),
    onSuccess: () => {
      toast.addToast({ title: '绑定成功', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `绑定失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const bindAndCreateMutation = useMutation({
    mutationFn: ({ gid, name, description, ai_context_template }: {
      gid: string; name: string; description: string; ai_context_template: TemplateType
    }) => bindOpportunityAndCreate(gid, name, description, ai_context_template),
    onSuccess: () => {
      toast.addToast({ title: '创建并绑定成功', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `创建绑定失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })
```

更新顶部 import，添加 `bindOpportunity`, `bindOpportunityAndCreate`, `TemplateType`：

```typescript
import { batchBindOpportunity, unbindOpportunity, deleteMonitoredItem, bindOpportunity, bindOpportunityAndCreate, type TemplateType } from '@/lib/api/batch-publish'
```

更新 return 对象，新增 `singleBindMutation`, `bindAndCreateMutation`。

- [ ] **Step 3: 修复 useOpportunityData.ts — search→name**

将 L16-21 的 queryFn 内部调用改为：

```typescript
    queryFn: () => listOpportunities({
      page,
      page_size: pageSize,
      name: search || undefined,
      status: status || undefined,
    }),
```

- [ ] **Step 4: 修复 useOpportunityMutations.ts — update/delete 签名变更**

更新 import（`OpportunityInput` → `OpportunityParams`）：

```typescript
import { createOpportunity, updateOpportunity, deleteOpportunity, type OpportunityParams } from '@/lib/api/batch-publish'
```

修改 createMutation（L12）：

```typescript
    mutationFn: (opp: OpportunityParams) => createOpportunity(opp),
```

修改 updateMutation（L22-24）：

```typescript
    mutationFn: ({ oid, opp }: { oid: number; opp: Partial<OpportunityParams> }) =>
      updateOpportunity(oid, opp),
```

修改 deleteMutation（L35）：

```typescript
    mutationFn: (oid: number) => deleteOpportunity(oid),
```

- [ ] **Step 5: 修复 useMaterialsData.ts — search→description, opportunity_id→oid**

将 L17-23 的 queryFn 内部调用改为：

```typescript
    queryFn: () => listMaterials({
      page,
      page_size: pageSize,
      description: search || undefined,
      status: status || undefined,
      oid: opportunityId,
    }),
```

- [ ] **Step 6: 提交**

```bash
git add hooks/batch-publish/
git commit -m "fix: adapt batch-publish hooks to rewritten API signatures

- useMonitorData: search→title, opportunity_id→oid, orderBy→order_by
- useMonitorMutations: add singleBind + bindAndCreate mutations
- useOpportunityData: search→name
- useOpportunityMutations: updateOpportunity(id,input)→updateOpportunity(oid,opp)
- useMaterialsData: search→description, opportunity_id→oid"
```

---

### Task 4: 适配组件

**Files:**
- Modify: `components/batch-publish/monitor/MonitorTable.tsx:155-156`
- Modify: `components/batch-publish/monitor/MonitorCard.tsx:60`
- Modify: `components/batch-publish/materials/MaterialTable.tsx:74,77`
- Modify: `components/batch-publish/materials/MaterialCard.tsx:27,31`
- Modify: `components/batch-publish/opportunity/OpportunityCard.tsx:63-64,73`
- Modify: `components/batch-publish/opportunity/OpportunityTab.tsx:127-128,158-159`
- Modify: `components/batch-publish/monitor/BindOpportunityModal.tsx:37,49,115`

- [ ] **Step 1: 修复 MonitorTable.tsx — opportunity 嵌套对象**

L154-158，将：

```typescript
      render: (item) => (
        <span className={`text-sm ${item.opportunity_id ? 'text-blue-600' : 'text-gray-400'}`}>
          {item.opportunity_id ? `商机 #${item.opportunity_id}` : '未绑定'}
        </span>
      ),
```

改为：

```typescript
      render: (item) => (
        <span className={`text-sm ${item.opportunity?.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {item.opportunity?.name ?? (item.opportunity?.id ? `商机 #${item.opportunity.id}` : '未绑定')}
        </span>
      ),
```

- [ ] **Step 2: 修复 MonitorCard.tsx — 绑定状态 dot**

L60，将：

```typescript
        <span className={`w-2 h-2 rounded-full ${item.opportunity_id ? 'bg-green-500' : 'bg-gray-300'}`} />
```

改为：

```typescript
        <span className={`w-2 h-2 rounded-full ${item.opportunity?.id ? 'bg-green-500' : 'bg-gray-300'}`} />
```

- [ ] **Step 3: 修复 MaterialTable.tsx — opportunity 嵌套对象**

L72-78，将：

```typescript
      render: (item) => (
        <button
          onClick={() => onOpportunityClick(item.opportunity_id)}
          className="text-sm text-blue-600 hover:underline"
        >
          {item.opportunity_name || `商机 #${item.opportunity_id}`}
        </button>
      ),
```

改为：

```typescript
      render: (item) => (
        <button
          onClick={() => { if (item.opportunity?.id) onOpportunityClick(item.opportunity.id) }}
          className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          disabled={!item.opportunity?.id}
        >
          {item.opportunity?.name ?? (item.opportunity?.id ? `商机 #${item.opportunity.id}` : '未知商机')}
        </button>
      ),
```

- [ ] **Step 4: 修复 MaterialCard.tsx — opportunity 嵌套对象**

L27-31，将：

```typescript
        <button
          onClick={(e) => { e.stopPropagation(); onOpportunityClick(item.opportunity_id) }}
          className="text-blue-600 hover:underline"
        >
          {item.opportunity_name || `商机 #${item.opportunity_id}`}
        </button>
```

改为：

```typescript
        <button
          onClick={(e) => { e.stopPropagation(); if (item.opportunity?.id) onOpportunityClick(item.opportunity.id) }}
          className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          disabled={!item.opportunity?.id}
        >
          {item.opportunity?.name ?? (item.opportunity?.id ? `商机 #${item.opportunity.id}` : '未知商机')}
        </button>
```

- [ ] **Step 5: 修复 OpportunityCard.tsx — camelCase 计数**

L63-64，将：

```typescript
          <span>📦 {item.monitored_item_count ?? 0} 监控商品</span>
          <span>📝 {item.material_count ?? 0} 素材</span>
```

改为：

```typescript
          <span>📦 {item.monitoredItemCount ?? 0} 监控商品</span>
          <span>📝 {item.materialCount ?? 0} 素材</span>
```

L73，将 `item.material_count` 改为 `item.materialCount`。

- [ ] **Step 6: 修复 OpportunityTab.tsx — camelCase + mutation 调用签名**

L127-128，将：

```typescript
                    <span className="text-sm text-gray-600">📦 {item.monitored_item_count ?? 0}</span>
                    <span className="text-sm text-gray-600">📝 {item.material_count ?? 0}</span>
```

改为：

```typescript
                    <span className="text-sm text-gray-600">📦 {item.monitoredItemCount ?? 0}</span>
                    <span className="text-sm text-gray-600">📝 {item.materialCount ?? 0}</span>
```

L158-159，将：

```typescript
                updateMutation.mutate(
                  { id: editingItem.id, input: values },
                  { onSuccess: () => setSheetOpen(false) }
                )
```

改为：

```typescript
                updateMutation.mutate(
                  { oid: editingItem.id, opp: values },
                  { onSuccess: () => setSheetOpen(false) }
                )
```

L154，将 `createMutation.mutate(values, ...)` 改为 `createMutation.mutate(values as OpportunityParams, ...)`（需 import `OpportunityParams`）。

L108，`deleteMutation.mutate(id)` 不变——hook 层已改为接受 `oid`，但调用方仍传 `id` 这个名字，JavaScript 运行时按位置传参不按名字。

- [ ] **Step 7: 修复 BindOpportunityModal.tsx — API 调用签名 + 字段名**

L6，更新 import：

```typescript
import { listOpportunities, createOpportunity, type OpportunityParams } from '@/lib/api/batch-publish'
```

L37，将 `listOpportunities({ search: search || undefined, page, page_size: 10 })` 改为：

```typescript
    queryFn: () => listOpportunities({ name: search || undefined, page, page_size: 10 }),
```

L49-53，将 `OpportunityInput` 引用改为 `OpportunityParams`：

```typescript
      const input: OpportunityParams = {
        name: newName.trim(),
        description: newDescription || undefined,
        ai_context_template: newTemplate,
      }
      const opp = await createOpportunity(input)
```

注意：`createOpportunity` 现在接受 `opp: OpportunityParams`（单个参数），不是 `input` 对象。需要改为 `createOpportunity(input)` —— 但函数签名现在期望 `createOpportunity(opp)`，即参数名从 `input` 变 `opp`。调用方式不变（传一个对象）。

L115，将：

```typescript
                    {opp.monitored_item_count ?? 0} 商品 · {opp.material_count ?? 0} 素材
```

改为：

```typescript
                    {opp.monitoredItemCount ?? 0} 商品 · {opp.materialCount ?? 0} 素材
```

- [ ] **Step 8: 提交**

```bash
git add components/batch-publish/
git commit -m "fix: adapt components to rewritten API types

- MonitorTable/MonitorCard: opportunity_id → opportunity?.id/name
- MaterialTable/MaterialCard: opportunity_id/name → opportunity?.id/name
- OpportunityCard/Tab: snake_case counts → camelCase
- OpportunityTab: updateMutation call signature id→oid, input→opp
- BindOpportunityModal: search→name, monitored_item_count→monitoredItemCount"
```

---

### Task 5: tsc 验证 + 修补

- [ ] **Step 1: 运行 TypeScript 编译检查**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit 2>&1 | head -100
```

- [ ] **Step 2: 逐条修复 tsc 报错**

常见遗漏点：
- 某组件仍引用了 `item.opportunity_id`（grep 检查）：`grep -rn "opportunity_id\|opportunity_name\|monitored_item_count\|material_count" components/ hooks/ --include="*.ts" --include="*.tsx"`
- `OpportunityForm.tsx` 的 `defaultValues` prop 类型是 `Partial<OpportunityItem>`，字段名变化后需确认 zod schema 的 defaultValues 映射是否正确（`defaultValues?.price`、`defaultValues?.ai_context_template` 等字段在 `OpportunityItem` 中仍存在 ✅）
- `useMonitorPage.ts` 从 `useMonitorMutations` 中解构的返回值——如果新增了 `singleBindMutation` 和 `bindAndCreateMutation`，需要更新解构和 return
- `useOpportunityPage.ts` 从 `useOpportunityMutations` 解构——`updateMutation.mutate` 的参数类型已变

- [ ] **Step 3: 修复 useMonitorPage.ts 和 useOpportunityPage.ts 的解构**

`useMonitorPage.ts` L32-37，更新解构以包含新增 mutation：

```typescript
  const {
    bindMutation,
    unbindMutation,
    deleteMutation,
    singleBindMutation,
    bindAndCreateMutation,
  } = useMonitorMutations()
```

并在 return 对象中新增 `singleBindMutation`, `bindAndCreateMutation`。

`useOpportunityPage.ts` L12，确认解构不受影响（`createMutation`, `updateMutation`, `deleteMutation` 名称未变，只是内部类型变了）。

- [ ] **Step 4: 再次运行 tsc 确认零错误**

```bash
cd E:\.project\autofish_freetime\frontend && npx tsc --noEmit
```

预期：零错误。

- [ ] **Step 5: 终验 grep — 确认无旧字段名残留**

```bash
grep -rn "opportunity_id\|opportunity_name" components/batch-publish/ hooks/batch-publish/ lib/api/batch-publish.ts
```

预期：仅 `lib/api/batch-publish.ts` 中 `batchBindOpportunity` 和 `bindOpportunity` 函数体内发送给后端的 `opportunity_id` 参数名保留（这是后端期望的 body 字段名，不是前端类型）。其他文件中应无残留。

```bash
grep -rn "monitored_item_count\|material_count" components/ hooks/
```

预期：零结果。

- [ ] **Step 6: 最终提交**

```bash
git add -A
git commit -m "fix: tsc verification pass — zero errors after full API alignment

All 23 Appendix C mismatches resolved:
- 9 path corrections (P0)
- 7 type corrections (P1)  
- 5 parameter name corrections (P2)
- 2 design-level corrections (P3: triggerWork + channel response)

Verified: tsc --noEmit passes, no legacy field names remain."
```
