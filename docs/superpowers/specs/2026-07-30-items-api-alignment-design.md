# 商品管理 API 对齐后端 ShopItem 新模型

**日期**: 2026-07-30
**状态**: 设计中
**范围**: `lib/api/items.ts` 完整重写

---

## 背景

后端正在进行数据模型迁移：`ItemList`（旧）→ `ShopItem`（新）。前端 API 层仍基于旧模型，与后端实际接口严重偏离。本次重构以后端新接口为准，完全对齐。

## 后端确认的端点

| 方法 | 路径 | 入参 | 出参 | 说明 |
|------|------|------|------|------|
| GET | `/api/items/list` | query: uid, status, gid, title, page, size, order_by, asc | `ShopItemListResponse` | 所有参数走 query string |
| POST | `/api/items/shelves` | query: gid, uid | `ShopItem` | — |
| POST | `/api/items/offline` | query: gid, uid | `ShopItem` | — |
| PUT | `/api/items/update.item` | query: gid, body: `ShopItemUpdate` | `ShopItem` | 排除 config/account 字段 |
| PUT | `/api/items/update.item.config` | query: gid, body: `ShopItemConfigUpdate` | `ShopItem` | 排除 shipment/shipconfirm/evaluation |
| PUT | `/api/items/update.item.ship.config` | query: gid, body: `ShipConfigUpdate` | `ShopItem` | stage + byEntirety + voucher |
| POST | `/api/items/refresh` | query: uid | `OperationResponse` | — |

### 删除的前端端点

| 端点 | 前端函数 | 删除原因 |
|------|---------|---------|
| `GET /api/items/{gid}` | `getItem()` | 后端无此端点 |
| `GET /api/items/stats` | `getItemStats()` | 后端无此端点 |
| `GET /api/items/groups` | `listItemGroups()` | 后端无此端点 |

### 排序字段

仅 `ShopItem` 模型实际存在的可排序列：

```typescript
const ITEM_SORT_FIELDS = [
  { key: "gid",          label: "商品ID" },
  { key: "title",        label: "标题" },
  { key: "reservePrice", label: "价格" },
  { key: "publishTime",  label: "发布时间" },
  { key: "created_at",   label: "创建时间" },
  { key: "updated_at",   label: "更新时间" },
] as const
```

### 筛选参数

仅保留后端实际支持的字段：

```typescript
interface ItemFilters {
  uid?: string
  status?: number
  gid?: string
  title?: string
  page?: number
  size?: number
  order_by?: string
  asc?: boolean
}
```

### 搜索体系

旧有的 7 芯片搜索体系全部移除。仅保留 `gid` 和 `title` 两个直接筛选参数（后端已支持 `gid__contains` / `title__contains`）。搜索 UI 的改造属于后续页面适配阶段。

---

## 核心类型定义

### ShopItem

> null 判断以数据库模型 `ShopItem` 的 `null=True` 为准，非 Pydantic Schema。

```typescript
interface ShopItem {
  gid: number
  title: string
  picurl: string
  status: number
  reservePrice: string            // 价格（多SKU规格时为 "min~max"）
  publishTime: string | null      // ISO 8601 datetime，null=True
  auto_ship: boolean
  auto_reply: boolean
  auto_ai_reply: boolean
  auto_restock: boolean
  skus: ItemSKU[] | null          // null=True，库存信息在各 SKU.quantity 内
  created_at: string              // ISO 8601 datetime，auto_now_add
  updated_at: string              // ISO 8601 datetime，auto_now
  account: AccountName            // FK RESTRICT，不可为 null
  config: ShopItemConfig | null   // OneToOne null=True
  rulesCount: number | null       // 计算字段，可选
}
```

### AccountName

> 全部字段有默认值/非空约束，无 `null=True`。

```typescript
interface AccountName {
  uid: string
  name: string
  status: number
  isPro: boolean
}
```

### ShopItemConfig

> `shipment/shipconfirm/evaluation` 有 `default=itemorsku`，不可为 null。

```typescript
interface ShopItemConfig {
  gid: number
  sendCode: string | null             // null=True
  reply_default_content: string | null // null=True
  ai_prompt: string | null            // null=True
  shipment: ShipConfig                // 有默认值
  shipconfirm: ShipConfig             // 有默认值，收货后赠送
  evaluation: ShipConfig              // 有默认值，评价后赠送
}
```

### ShipConfig（shipment/shipconfirm/evaluation 共用）

```typescript
interface ShipConfig {
  byEntirety: boolean | null      // true=按商品发货 false=按SKU发货
  entirety: ShipByVoucher | null
  skus: Record<number, ShipByVoucher>
}

interface ShipByVoucher {
  kind: 'DIRECT' | 'VOUCHER'     // DIRECT=无卡/直发 VOUCHER=卡密
  skuid: number | null
  voucherkindid: number | null    // 卡种ID
  useinstructions: string | null  // 使用说明
}
```

### ItemSKU

```typescript
interface ItemSKU {
  skuid: number
  price: number                  // 单位：分
  quantity: number
  values: { name: string; value: string }[]
}
```

### 通用类型

```typescript
interface ShopItemListResponse {
  total: number
  page: number
  size: number
  items: ShopItem[]
}
```

---

## API 函数

```typescript
// 商品列表
listItems(filters?: ItemFilters): Promise<ShopItemListResponse>

// 上架
shelvesItem(gid: number, uid: string): Promise<ShopItem>

// 下架
offlineItem(gid: number, uid: string): Promise<ShopItem>

// 更新商品基础字段（排除 config / account）
updateItem(gid: number, data: ShopItemUpdate): Promise<ShopItem>

// 更新商品配置字段（sendCode / reply_default_content / ai_prompt）
updateItemConfig(gid: number, data: ShopItemConfigUpdate): Promise<ShopItem>

// 更新发货/收货/评价配置
updateItemShipConfig(gid: number, data: ShipConfigUpdate): Promise<ShopItem>

// 刷新账号商品
refreshItems(uid: string): Promise<OperationResponse>
```

所有函数通过 `fetchApi` 发出，所有参数走 URL query string 或 JSON body。

### 更新专用类型

```typescript
// PUT /update.item body — Partial<ShopItem> 但排除 config 和 account
type ShopItemUpdate = Partial<Omit<ShopItem, 'config' | 'account'>>

// PUT /update.item.config body — Partial<ShopItemConfig> 但排除 shipment/shipconfirm/evaluation
type ShopItemConfigUpdate = Partial<Omit<ShopItemConfig, 'shipment' | 'shipconfirm' | 'evaluation'>>

// PUT /update.item.ship.config body
interface ShipConfigUpdate {
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  byEntirety: boolean
  voucher: ShipByVoucher
}
```

---

## 删除清单

### 类型

`Item`, `ItemUpdate`, `ItemGroup`, `ItemGroupListResponse`, `ItemStats`, `ItemListResponse`, `ItemFilters`（旧）, `SearchField`, `SEARCH_FIELD_LABELS`, `SearchChipData`, `ItemsFilterState`, `CHIP_FIELD_PARAM`, `ShelfState`

### 函数

`getItem()`, `listItemGroups()`, `getItemStats()`, `chipsToFilters()`, `getShelfState()`

### 常量

`ITEM_SORT_FIELDS`（旧 3 字段版）→ 替换为新 7 字段版

---

## 不在本次范围内

- 页面组件适配（调用方）
- 搜索芯片 UI 的移除
- 表格列定义适配
- 上架/下架按钮状态逻辑重写


