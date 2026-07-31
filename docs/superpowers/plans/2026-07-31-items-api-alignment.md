# Items API Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完整重写 `lib/api/items.ts`，对齐后端 ShopItem 新模型与更新后的 7 个 API 端点。

**Architecture:** 单一文件替换——删除所有旧类型/函数/常量（15 类型 + 5 函数），写入新的 ShopItem 类型体系 + 7 个 API 函数。仅改此文件，调用方适配为后续任务。

**Tech Stack:** TypeScript, `fetchApi` (from `@/lib/utils/api`), `OperationResponse` (from `@/lib/utils/api`)

**Spec:** `docs/superpowers/specs/2026-07-30-items-api-alignment-design.md`

## Global Constraints

- 所有 API 请求通过 `fetchApi` 发起，禁止直接调用 fetch
- 所有 API 请求的基础地址从环境变量 `NEXT_PUBLIC_API_BASE_URL` 读取，后接 `/api` 路径前缀
- 查询参数走 `params` 选项（fetchApi 自动编码），不手动拼接 URL
- 类型就近定义在 API 文件中（`lib/api/items.ts`）
- 使用命名导出（`export interface` / `export function`），禁止 default export
- 遵循 `frontend-api.md`：DTO 后缀、通用响应类型、命名层级分明

---

### Task 1: 写入全部类型定义

**Files:**
- Rewrite: `lib/api/items.ts`

**Produces:**
- `ShopItem`, `AccountName`, `ShopItemConfig`, `ShipConfig`, `ShipByVoucher`, `ItemSKU` interfaces
- `ShopItemListResponse` interface
- `ItemFilters` interface
- `ShopItemUpdate`, `ShopItemConfigUpdate`, `ShipConfigUpdate` types
- `ITEM_SORT_FIELDS` constant

- [ ] **Step 1: 备份旧文件并清空，写入文件头注释和新类型**

```typescript
/**
 * 商品管理 API 客户端
 *
 * 对齐后端 ShopItem 新模型（旧 ItemList 模型已弃用）。
 * 所有查询参数统一走 fetchApi 的 params 选项。
 */
import { fetchApi, OperationResponse } from "@/lib/utils/api"

// ═══════════════════════════════════════════════════════════════
// 排序字段
// ═══════════════════════════════════════════════════════════════

export const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "reservePrice", label: "价格" },
  { key: "publishTime",  label: "发布时间" },
  { key: "created_at",   label: "创建时间" },
  { key: "updated_at",   label: "更新时间" },
] as const

// ═══════════════════════════════════════════════════════════════
// 筛选参数
// ═══════════════════════════════════════════════════════════════

export interface ItemFilters {
  uid?: string
  status?: number
  gid?: string
  title?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}

// ═══════════════════════════════════════════════════════════════
// 核心数据模型（对齐后端 ShopItemSchema）
// ═══════════════════════════════════════════════════════════════

/** 账号精简信息（AccountNameSchema） */
export interface AccountName {
  uid: string
  name: string
  status: number
  isPro: boolean
}

/** SKU 规格项 */
export interface ItemSKU {
  skuid: number
  price: number                        // 单位：分
  quantity: number
  values: { name: string; value: string }[]
}

/** 发货方式（DIRECT=直发 VOUCHER=卡密） */
export interface ShipByVoucher {
  kind: 'DIRECT' | 'VOUCHER'
  skuid: number | null
  voucherkindid: number | null         // 卡种 ID
  useinstructions: string | null       // 使用说明
}

/** 发货/收货后赠送/评价后赠送 — 三家共用 */
export interface ShipConfig {
  byEntirety: boolean | null           // true=按商品 false=按 SKU
  entirety: ShipByVoucher | null
  skus: Record<number, ShipByVoucher>
}

/** 商品配置（一对一关联 ItemConfig 表） */
export interface ShopItemConfig {
  gid: number
  sendCode: string | null
  reply_default_content: string | null
  ai_prompt: string | null
  shipment: ShipConfig                 // 发货配置
  shipconfirm: ShipConfig              // 收货后赠送
  evaluation: ShipConfig               // 评价后赠送
}

/** 商品主模型（ShopItemSchema） */
export interface ShopItem {
  gid: number
  title: string
  picurl: string
  status: number
  reservePrice: string                 // 价格字符串（多 SKU 时为 "min~max"）
  publishTime: string | null           // ISO 8601 datetime
  auto_ship: boolean
  auto_reply: boolean
  auto_ai_reply: boolean
  auto_restock: boolean
  skus: ItemSKU[] | null
  created_at: string                   // ISO 8601 datetime
  updated_at: string                   // ISO 8601 datetime
  account: AccountName
  config: ShopItemConfig | null
  rulesCount: number | null
}

/** 商品列表分页响应 */
export interface ShopItemListResponse {
  total: number
  page: number
  size: number
  items: ShopItem[]
}

// ═══════════════════════════════════════════════════════════════
// 更新专用类型
// ═══════════════════════════════════════════════════════════════

/** PUT /update.item body — 排除 config / account */
export type ShopItemUpdate = Partial<Omit<ShopItem, 'config' | 'account'>>

/** PUT /update.item.config body — 排除 shipment / shipconfirm / evaluation */
export type ShopItemConfigUpdate = Partial<Omit<ShopItemConfig, 'shipment' | 'shipconfirm' | 'evaluation'>>

/** PUT /update.item.ship.config body */
export interface ShipConfigUpdate {
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  byEntirety: boolean
  voucher: ShipByVoucher
}
```

- [ ] **Step 2: 运行 TypeScript 检查确认类型无自引用错误**

```bash
npx tsc --noEmit --pretty lib/api/items.ts
```

Expect: 仅可能有未使用导入警告（`OperationResponse` 尚未使用），无类型错误。

- [ ] **Step 3: 提交**

```bash
git add lib/api/items.ts
git commit -m "feat(items): replace old types with ShopItem model types

- Remove Item, ItemUpdate, ItemGroup, ItemStats, SearchField, etc.
- Add ShopItem, ShopItemConfig, ShipConfig, ShipByVoucher, ItemSKU
- Add ItemFilters (new), ShopItemListResponse
- Add update types: ShopItemUpdate, ShopItemConfigUpdate, ShipConfigUpdate
- Replace ITEM_SORT_FIELDS with 6 ShopItem-compatible fields"
```

---

### Task 2: 写入 API 函数

**Files:**
- Modify: `lib/api/items.ts` (append after types)

**Consumes:**
- All types from Task 1
- `fetchApi`, `OperationResponse` from `@/lib/utils/api`

**Produces:**
- `listItems()`, `shelvesItem()`, `offlineItem()`, `updateItem()`, `updateItemConfig()`, `updateItemShipConfig()`, `refreshItems()`

- [ ] **Step 1: 追加 API 函数代码**

```typescript
// ═══════════════════════════════════════════════════════════════
// API 函数
// ═══════════════════════════════════════════════════════════════

/** 商品列表 — GET /api/items/list */
export async function listItems(filters?: ItemFilters): Promise<ShopItemListResponse> {
  return fetchApi<ShopItemListResponse>("/api/items/list", { params: filters as Record<string, string | number> })
}

/** 上架商品 — POST /api/items/shelves?gid=&uid= */
export async function shelvesItem(gid: number, uid: string): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/shelves", {
    method: "POST",
    params: { gid, uid },
  })
}

/** 下架商品 — POST /api/items/offline?gid=&uid= */
export async function offlineItem(gid: number, uid: string): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/offline", {
    method: "POST",
    params: { gid, uid },
  })
}

/** 更新商品基础字段 — PUT /api/items/update.item?gid= */
export async function updateItem(gid: number, data: ShopItemUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 更新商品配置 — PUT /api/items/update.item.config?gid= */
export async function updateItemConfig(gid: number, data: ShopItemConfigUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item.config", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 更新发货/收货/评价配置 — PUT /api/items/update.item.ship.config?gid= */
export async function updateItemShipConfig(gid: number, data: ShipConfigUpdate): Promise<ShopItem> {
  return fetchApi<ShopItem>("/api/items/update.item.ship.config", {
    method: "PUT",
    params: { gid },
    body: JSON.stringify(data),
  })
}

/** 刷新账号商品 — POST /api/items/refresh?uid= */
export async function refreshItems(uid: string): Promise<OperationResponse> {
  return fetchApi<OperationResponse>("/api/items/refresh", {
    method: "POST",
    params: { uid },
  })
}
```

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
npx tsc --noEmit --pretty lib/api/items.ts
```

Expect: 无错误（`OperationResponse` 已使用，无未使用导入）。

- [ ] **Step 3: 提交**

```bash
git add lib/api/items.ts
git commit -m "feat(items): add 7 API functions for ShopItem endpoints

- listItems (GET /list)
- shelvesItem (POST /shelves)
- offlineItem (POST /offline)
- updateItem (PUT /update.item)
- updateItemConfig (PUT /update.item.config)
- updateItemShipConfig (PUT /update.item.ship.config)
- refreshItems (POST /refresh)
All query params via fetchApi params option, no manual URL concatenation."
```

---

### Task 3: 验证旧调用方的 breakage 清单

**Files:**
- 不修改任何文件，仅列出需要适配的调用方

**Consumes:** 新 `lib/api/items.ts`（Task 1+2 完成后的状态）

- [ ] **Step 1: 运行全项目 TypeScript 检查，收集所有 errors**

```bash
npx tsc --noEmit --pretty 2>&1 | grep "lib/api/items" | head -60
```

- [ ] **Step 2: 将错误文件清单写入临时文件**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -E "^[a-z].*\.tsx?:[0-9]+" | grep -v node_modules | sort -u > /tmp/items-breakage.txt
cat /tmp/items-breakage.txt
```

- [ ] **Step 3: 分类确认影响面**

Expected breakage (15 source files, all in scope for follow-up page adaptation):

| 文件 | 删除的导入 | 需要替换为 |
|------|-----------|-----------|
| `hooks/useItemsFilters.ts` | `chipsToFilters`, `ItemFilters`, `ItemsFilterState` | 新 `ItemFilters` |
| `hooks/useItemsData.ts` | `listItems`, `ItemFilters` | 同名（签名略有变） |
| `hooks/useItemMutations.ts` | `updateItem`, `refreshItems`, `shelvesItem`, `offlineItem`, `Item`, `ItemListResponse` | 同名 + `ShopItem`, `ShopItemListResponse` |
| `components/items/parts/ItemsFilterBarMobile.tsx` | `ITEM_SORT_FIELDS`, `SEARCH_FIELD_LABELS`, `ItemsFilterState`, `SearchField` | 新 `ITEM_SORT_FIELDS`，其余删除 |
| `components/items/parts/ItemsFilterBarDesktop.tsx` | `SEARCH_FIELD_LABELS`, `ItemsFilterState`, `SearchField` | 全部删除 |
| `components/items/parts/SearchChip.tsx` | `SearchField` | 删除组件 |
| `components/items/parts/ShelfActions.tsx` | `getShelfState`, `Item` | 新 `ShopItem` |
| `components/items/parts/RuleBindingPanel.tsx` | `ItemGroup` | 删除 |
| `components/items/drawers/ItemEditDrawer.tsx` | `Item`, `ItemUpdate`, `updateItem` | `ShopItem`, `ShopItemUpdate`, 同名函数 |
| `components/items/drawers/ConfigDrawer.tsx` | `Item` | `ShopItem` |
| `components/items/drawers/RuleItemsAllDrawer.tsx` | `listItemGroups` | 删除 |
| `components/items/drawers/RulesItemsingleDrawer.tsx` | `Item` | `ShopItem` |
| `components/items/views/ItemRow.tsx` | `Item` | `ShopItem` |
| `components/items/views/MobileProductCard.tsx` | `Item` | `ShopItem` |
| `components/items/ItemsTab.tsx` | `Item` | `ShopItem` |

- [ ] **Step 4: 提交记录文件**

```bash
git add /tmp/items-breakage.txt  # 仅记录，不提交到仓库
# 将清单追加到审计日志
echo "## $(date +%Y-%m-%d) — items.ts 重写影响面" >> docs/superpowers/specs/2026-07-30-items-api-alignment-design.md
echo "" >> docs/superpowers/specs/2026-07-30-items-api-alignment-design.md
echo "15 个源文件需适配，详见实施计划 Task 3。" >> docs/superpowers/specs/2026-07-30-items-api-alignment-design.md
git add docs/superpowers/specs/2026-07-30-items-api-alignment-design.md
git commit -m "docs: record items.ts rewrite impact — 15 callers need adaptation"
```
