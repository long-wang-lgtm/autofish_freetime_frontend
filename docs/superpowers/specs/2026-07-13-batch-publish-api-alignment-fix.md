# 批量发布 API 对齐修复 — 设计规格

> 2026-07-13 | 纯前端对齐后端，解决附录 C 全部 23 项差异
> 父文档：`2026-07-13-batch-publish-design.md` 附录 C

---

## 一、修复目标

将 `lib/api/batch-publish.ts`（类型 + 函数）及其所有调用方（hooks + 组件）对齐后端实际路由和 Schema，消除附录 C 中记录的全部差异。

**边界**：纯前端修改，不动后端。后端已补齐 MonitoredItem 的 price/wantCount/lookCount/collectCount 字段 + `material.context.templateType` 路由。

## 二、修复策略

**先类型，再函数，再调用方**。TypeScript 类型系统是天然的影响面检测器——API 模块改完后，`tsc --noEmit` 会精确指出所有需要修改的 hooks/组件。

### 执行顺序

```
Step 1: API 模块 — 类型定义重写（对齐后端 Schema）
Step 2: API 模块 — 函数路径/方法/参数重写（对齐后端路由）
Step 3: Hooks — 适配新的函数签名和参数名
Step 4: 组件 — 适配新的类型字段名
Step 5: tsc 验证 + 修补遗漏
```

---

## 三、Step 1：类型定义重写

### 3.1 MonitoredItem

```typescript
// 旧 → 新
interface MonitoredItem {
  gid: string
  uid?: string | null
  name?: string | null
  monitorStatus?: number | null
  title?: string | null
  description?: string | null
  price?: number | null          // 后端已补齐 ✅
  wantCount?: number | null      // 后端已补齐 ✅
  lookCount?: number | null      // 后端已补齐 ✅
  collectCount?: number | null   // 后端已补齐 ✅
  wantSlope?: number | null
  wantAvg?: number | null
  convertRate?: number | null
  hideAvg?: number | null
  trendData?: unknown | null
  publishTime?: number | null
  keywords?: string[] | null
  itemStatus?: number | null
  // opportunity_id?: number | null  ← 删除
  opportunity?: OpportunitySchema | null  // ← 新增：嵌套商机对象
  created_at?: string | null
  updated_at?: string | null
}
```

**变更点**：
- 删除 `opportunity_id?: number | null`
- 新增 `opportunity?: OpportunitySchema | null`（后端 `select_related('opportunity')` 返回嵌套对象）
- `price`/`wantCount`/`lookCount`/`collectCount` 保留（后端已补齐）

### 3.2 OpportunityItem

```typescript
interface OpportunityItem {
  id: number
  name: string
  description?: string | null
  price?: number
  status: string
  ai_context_template?: TemplateType
  // monitored_item_count?: number  ← 删除
  // material_count?: number        ← 删除
  monitoredItemCount?: number      // ← 新增（后端 annotate + camelCase）
  materialCount?: number           // ← 新增
  userId?: string | null           // ← 新增（后端 Schema 有此字段）
  created_at?: string | null
  updated_at?: string | null
}
```

**变更点**：
- `monitored_item_count` → `monitoredItemCount`
- `material_count` → `materialCount`
- 新增 `userId`（后端 Schema 有）

### 3.3 OpportunityInput → 删除，改用 OpportunitySchema

后端 `opportunity.create` 接受 `opp: OpportunitySchema`，`opportunity.update` 也接受 `opp: OpportunitySchema`。前端不再需要单独的 `OpportunityInput` 类型，直接使用 `Partial<OpportunityItem>` 或定义 `OpportunityParams`：

```typescript
// 新建/更新时传递的字段（无 id, 无计数, 无时间戳）
interface OpportunityParams {
  name: string
  description?: string
  price?: number
  status?: string
  ai_context_template?: TemplateType
}
```

### 3.4 PublishMaterial

```typescript
interface PublishMaterial {
  id: number
  description?: string | null
  price?: number | null
  category?: string | null
  status: MaterialStatus
  images?: MaterialImage[]
  ai_context?: MaterialAIContext
  to_uid?: string | null
  to_gid?: string | null
  // opportunity_id: number           ← 删除
  // opportunity_name?: string | null ← 删除
  opportunity?: OpportunitySchema | null  // ← 新增：嵌套完整商机对象
  created_at?: string | null
  updated_at?: string | null
}
```

**变更点**：
- 删除 `opportunity_id` + `opportunity_name`
- 新增 `opportunity?: OpportunitySchema | null`（后端返回嵌套对象）

### 3.5 MaterialImage

```typescript
// 旧
interface MaterialImage { url: string; order?: number }

// 新 — 对齐后端 ORM MaterialImage TypedDict
interface MaterialImage {
  md5: string
  filepath?: string | null
  flare?: string | null
  url?: string | null
  size?: number | null
}
```

### 3.6 MaterialCreateInput → 重新设计

```typescript
// 旧
interface MaterialCreateInput { opportunity_id: number; count?: number }

// 新 — 对齐后端 material.create(num, opp)
interface MaterialCreateParams {
  num: number
  opp: OpportunityItem  // 完整商机对象（至少包含 id）
}
```

### 3.7 MaterialEditInput — 不变

后端 `material.edit` 接受 `id` + `edit: PublishMaterialSchema`，前端 `MaterialEditInput` 结构基本对齐，仅需确认字段名一致。

### 3.8 MaterialContextInput — 路径对齐

类型本身不变（`id + contextTemplateType + items? + images? + coverprompt?`），但函数路径从 `/material.context` 确认是否对齐。

### 3.9 新增：ChannelItemResponse

```typescript
interface ChannelItemResponse {
  channelCateName: string
  channelCateId: string
}
```

### 3.10 新增：RewriteWorkRequest

```typescript
type RewriteStage = 'write' | 'genimageplan' | 'genimage'

interface RewriteWorkRequest {
  stage: RewriteStage
}
```

---

## 四、Step 2：API 函数重写

### 4.1 监控商品

| 函数 | 当前 | 改为 |
|------|------|------|
| `listMonitoredItems` | `GET /monitor/items`<br>参数: `search`, `opportunity_id`, `orderBy` | `GET /monitor.item.list`<br>参数: `uid?`, `uname?`, `gid?`, `title?`, `oid?`, `order_by?` |
| `batchBindOpportunity` | `POST /monitor.batch.bind` | `POST /monitor.batch.bind.opportunity` |
| `deleteMonitoredItem` | `DELETE /monitor/item/delete`<br>query param: `gid` | `POST /monitor.item.delete`<br>body: `{ gid }` |
| `unbindOpportunity` | `POST /monitor.unbind.opportunity` | ✅ 已正确 |

**新增函数**（利用后端已有路由）：

| 函数 | 路由 | 用途 |
|------|------|------|
| `bindOpportunity` | `POST /monitor.bind.opportunity` | 单个商品绑定到商机 |
| `bindOpportunityAndCreate` | `POST /monitor.bind.opportunity.create` | 绑定并同时创建商机（一站式） |

### 4.2 商机

| 函数 | 当前 | 改为 |
|------|------|------|
| `listOpportunities` | `GET /opportunities`<br>参数: `search` | `GET /opportunity.list`<br>参数: `name?`, `description?`, `status?`, `ai_context_template?` |
| `createOpportunity` | `POST /opportunity/create`<br>body: `OpportunityInput` | 路径不变<br>body: `{ opp: OpportunityParams }` |
| `updateOpportunity` | `POST /opportunity/update`<br>body: `{ id, ...input }` | 路径不变<br>query: `oid`<br>body: `{ opp: OpportunityParams }` |
| `deleteOpportunity` | `DELETE /opportunity/delete`<br>query: `id` | `POST /opportunity.delete`<br>query: `oid` |

### 4.3 素材

| 函数 | 当前 | 改为 |
|------|------|------|
| `listMaterials` | `GET /materials`<br>参数: `search`, `opportunity_id` | `GET /material.list`<br>参数: `oid?`, `name?`, `description?`, `category?`, `status?` |
| `createMaterials` | `POST /material.create`<br>body: `{ opportunity_id, count }` | 路径不变<br>body: `{ num, opp }` |
| `editMaterial` | `POST /material.edit` | ✅ 路径正确（确认参数格式） |
| `updateMaterialContext` | `POST /material.context` | ✅ 路径正确 |
| `triggerRewrite` | `POST /material.rewrite`<br>body: `{ id }` | **合并为 `triggerWork`**<br>`POST /material.rewrite.work`<br>body: `{ id, work: { stage } }` |
| `publishMaterial` | `POST /material.publish` | ✅ 已正确 |
| `deleteMaterial` | `DELETE /material/delete`<br>query: `id` | `POST /material.delete`<br>body: `{ id }` |
| `getChannel` | 返回 `{ category }` | 返回 `ChannelItemResponse[]` |
| `getContextTemplate` | `GET /material/context.template` | 后端已补齐（确认路径） |

**设计级变更 — triggerRewrite 合并为 triggerWork**：

后端将改写/封面规划/生图三个阶段合并为一个 `POST /material.rewrite.work` 接口，通过 `work.stage` 区分。前端删除独立的 `triggerCoverPlan`、`triggerGenImage`（这两个在设计规格中存在但从未实现），统一为：

```typescript
async function triggerWork(materialId: number, stage: RewriteStage): Promise<PublishMaterial>
```

调用方在 AI 按钮状态机中根据当前状态决定传哪个 `stage`：
- 改写 → `stage: 'write'`
- 封面规划 → `stage: 'genimageplan'`
- 生图 → `stage: 'genimage'`

---

## 五、Step 3：Hooks 适配

### 5.1 useMonitorData

```typescript
// 旧 queryFn
listMonitoredItems({
  page, page_size: pageSize,
  search: search || undefined,
  monitorStatus: ...,
  opportunity_id: bindStatus === 'bound' ? 0 : ...,
  orderBy: orderBy ?? undefined,
  asc,
})

// 新 queryFn — search 拆分为 title + gid
listMonitoredItems({
  page, page_size: pageSize,
  title: search || undefined,      // 模糊搜索 → title 字段
  gid: search || undefined,        // 同时搜 gid（或拆分为两个独立输入框）
  monitorStatus: ...,
  oid: bindStatus === 'bound' ? 0 : bindStatus === 'unbound' ? undefined : undefined,
  order_by: orderBy ?? undefined,
  asc,
})
```

**注意**：后端不支持单一 `search` 字段做模糊匹配。搜索框拆分为两个输入框（标题 + gid），或限制前端只搜 `title`。

### 5.2 useMonitorMutations — 适配新函数名和参数

- `deleteMonitoredItem` 方法从 `DELETE` 改为 `POST`（函数内部变更，hook 层无感）
- 新增 `bindOpportunity(gid, opportunityId)` — 单个绑定
- 新增 `bindOpportunityAndCreate(gid, name, description, template)` — 一站式绑定+创建

### 5.3 useOpportunityData

```typescript
// 旧
listOpportunities({ search: search || undefined, ... })

// 新 — search 改为 name（后端用 name 字段筛选）
listOpportunities({ name: search || undefined, ... })
```

### 5.4 useOpportunityMutations

- `updateOpportunity(id, input)` → `updateOpportunity(oid, opp)`（参数名 + 结构变化）
- `deleteOpportunity(id)` → `deleteOpportunity(oid)`（参数名 + GET→POST）

### 5.5 useMaterialsData

```typescript
// 旧
listMaterials({ search: search || undefined, opportunity_id: opportunityId, ... })

// 新 — search 改为 description（后端用 description 字段模糊搜索）
listMaterials({ description: search || undefined, oid: opportunityId, ... })
```

### 5.6 新增 Hook：useMonitorBindMutations

封装单商品绑定 + 一站式绑定+创建逻辑，供 `BindOpportunityModal` 使用。

---

## 六、Step 4：组件适配

### 6.1 MonitorTable.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L87 | `item.price` | 不变（后端已补齐） |
| L155-156 | `item.opportunity_id ? '商机 #N' : '未绑定'` | `item.opportunity?.name ?? '未绑定'` |

### 6.2 MonitorCard.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L53 | `item.price` | 不变（后端已补齐） |
| L60 | `item.opportunity_id ? ...` | `item.opportunity?.id ? ...` |

### 6.3 MonitorFilterBar.tsx

筛选栏核心变更：搜索从单字段变为多字段。

**方案**：保留单一搜索输入框，前端将其映射为 `title` 参数（商品标题模糊搜索最常用）。界面 placeholder 从"搜索商品标题/uid/gid..."改为"搜索商品标题"。如需要 uid/gid 精确搜索，后续可加下拉切换。

绑定状态筛选：参数名 `opportunity_id` → `oid`，映射逻辑不变。

### 6.4 MonitorDetailPanel.tsx + MonitorTrendCharts.tsx

trendData 结构一致，无需修改。✅

### 6.5 BindOpportunityModal.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L37 | `listOpportunities({ search, ... })` | `listOpportunities({ name: search, ... })` |
| L49 | `createOpportunity(input)`（类型 `OpportunityInput`） | `createOpportunity({ opp: input })`（类型 `OpportunityParams`） |
| L115 | `opp.monitored_item_count` | `opp.monitoredItemCount` |
| L115 | `opp.material_count` | `opp.materialCount` |

"创建新商机"Tab 可升级为使用 `POST /monitor.bind.opportunity.create`（一站式绑定），减少一次 API 调用：
1. 创建商机 + 绑定 → 一步完成
2. 无需 `createOpportunity` + `batchBindOpportunity` 两步

### 6.6 OpportunityCard.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L63 | `item.monitored_item_count` | `item.monitoredItemCount` |
| L64 | `item.material_count` | `item.materialCount` |
| L73 | `item.material_count` | `item.materialCount` |

### 6.7 OpportunityTab.tsx + OpportunityForm.tsx

- `updateOpportunity` 调用方式变更：`updateOpportunity(id, input)` → `updateOpportunity(oid, { opp })`
- `deleteOpportunity` 调用方式变更：`deleteOpportunity(id)` → `deleteOpportunity(oid)`

### 6.8 MaterialTable.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L74 | `item.opportunity_id` | `item.opportunity?.id ?? 0` |
| L77 | `item.opportunity_name \|\| '商机 #...'` | `item.opportunity?.name \|\| '商机 #...'` |

### 6.9 MaterialCard.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L27 | `item.opportunity_id` | `item.opportunity?.id ?? 0` |
| L31 | `item.opportunity_name \|\| ...` | `item.opportunity?.name \|\| ...` |

### 6.10 OpportunityTab.tsx

| 行号 | 当前 | 改为 |
|------|------|------|
| L108 | `deleteMutation.mutate(id)` | 不变（hook 内部参数名改变，调用方无感） |
| L127 | `item.monitored_item_count` | `item.monitoredItemCount` |
| L128 | `item.material_count` | `item.materialCount` |
| L158-159 | `{ id: editingItem.id, input: values }` | `{ oid: editingItem.id, opp: values }` |

### 6.11 OpportunityForm.tsx

类型引用 `OpportunityItem` → 部分字段名变化（form 字段本身不变，因为 zod schema 使用独立类型）。

---

## 七、受影响文件清单

### 直接修改

| 文件 | 变更量 | 说明 |
|------|--------|------|
| `lib/api/batch-publish.ts` | **重写** | 类型全改 + 函数路径/方法/参数全改 |
| `hooks/batch-publish/useMonitorData.ts` | 中 | 参数名适配 |
| `hooks/batch-publish/useMonitorMutations.ts` | 小 | 新增 bind/bindAndCreate |
| `hooks/batch-publish/useMonitorFilters.ts` | 小 | 参数名适配 |
| `hooks/batch-publish/useMonitorPage.ts` | 小 | 级联变更 |
| `hooks/batch-publish/useOpportunityData.ts` | 小 | search→name |
| `hooks/batch-publish/useOpportunityMutations.ts` | 中 | update/delete 签名变更 |
| `hooks/batch-publish/useMaterialsData.ts` | 小 | search→description, opportunity_id→oid |
| `components/batch-publish/monitor/MonitorTable.tsx` | 小 | opportunity_id→opportunity?.name |
| `components/batch-publish/monitor/MonitorCard.tsx` | 小 | opportunity_id→opportunity?.id |
| `components/batch-publish/monitor/MonitorFilterBar.tsx` | 中 | search 映射 + 参数名 |
| `components/batch-publish/monitor/BindOpportunityModal.tsx` | 中 | API 调用签名 + 字段名 + 可选一站式 |
| `components/batch-publish/opportunity/OpportunityCard.tsx` | 小 | snake_case→camelCase |
| `components/batch-publish/opportunity/OpportunityForm.tsx` | 小 | 类型引用 |
| `components/batch-publish/opportunity/OpportunityTab.tsx` | 小 | mutation 调用签名 |
| `components/batch-publish/materials/MaterialTable.tsx` | 小 | opportunity_id→opportunity?.id, opportunity_name→opportunity?.name |
| `components/batch-publish/materials/MaterialCard.tsx` | 小 | 同上 |
| `components/batch-publish/opportunity/OpportunityTab.tsx` | 小 | snake_case→camelCase 计数 + mutation 调用签名 |
| `components/batch-publish/shared/constants.ts` | 小 | 如有类型引用需更新 |

### 不受影响

| 文件 | 原因 |
|------|------|
| `StatusPipeline.tsx` | 纯 UI |
| `BatchActionBar.tsx` | 纯 UI |
| `MonitorTrendCharts.tsx` | trendData 结构一致 |
| `MonitorDetailPanel.tsx` | 同上 |
| `page.tsx` | 路由壳，无 API 调用 |
| `useMaterialsFilters.ts` | 仅 UI 状态，不调 API |
| `useMaterialsPage.ts` | 组合层，传参透传 |

---

## 八、验证标准

1. `tsc --noEmit` 零错误
2. 所有 `['batch-publish', ...]` query key 前缀不变
3. 组件中不再有 `opportunity_id` / `opportunity_name` / `monitored_item_count` / `material_count` 引用
4. 所有删除操作使用 POST（非 DELETE）
5. `triggerRewrite` 已被 `triggerWork(id, stage)` 替代

---

## 九、变更不涉及

- React Query cache key 结构（保持 `['batch-publish', ...]`）
- 页面布局和 CSS
- 移动端降级逻辑
- Phase 5 创作台组件（这些组件尚未创建，创建时直接使用对齐后的 API）
