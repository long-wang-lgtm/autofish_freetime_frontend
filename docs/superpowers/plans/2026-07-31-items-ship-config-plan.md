# 商品管理页 — 发货/收货赠送/评价赠送 配置重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将商品管理页三个配置字段从纯文本迁移为结构化 ShipConfig 弹窗，抽象公共 ShipConfigModal/SkuConfigModal 组件，同时适配 ItemsTab 到 ShopItem 新模型。

**Architecture:** 自底向上分 4 层：API 补充 → hooks 适配 → 新组件创建 → 现有组件集成。新组件 ShipConfigModal（三个 stage 共用）和 SkuConfigModal（多 SKU 商品明细）均使用居中 Modal；ConfigStatusCell 作为轻量状态指示单元格。

**Tech Stack:** React + TypeScript + Tailwind CSS v3 + React Query + 居中 Modal（`components/ui/overlay/Modal.tsx`）

## Global Constraints

- 严禁动态路由（全局规则）
- 所有组件使用命名导出 `export function`（不可 default export）
- 卡片圆角 `rounded-xl`，分割线 `border-gray-100`
- 输入框 `h-10 px-3 py-2 text-sm`，按钮同高
- 字号不可用任意值 `text-[Npx]`
- 颜色使用 Tailwind token，图表色独立体系
- 弹窗使用居中 Modal 组件，移动端不降级 BottomSheet
- `fetchApi` 是唯一 HTTP 入口，所有 API 基础地址从环境变量读取

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| CREATE | `components/items/parts/ConfigStatusCell.tsx` | 表格配置状态单元格（已配置/未配置） |
| CREATE | `components/items/parts/ShipConfigModal.tsx` | 公共配置弹窗（DIRECT/VOUCHER 切换 + 卡种选择 + 使用说明） |
| CREATE | `components/items/parts/SkuConfigModal.tsx` | 多 SKU 商品明细弹窗（SKU 列表 + 按商品/SKU 切换） |
| MODIFY | `lib/api/items.ts` | 新增 VoucherKind 类型 + getVoucherKinds API |
| MODIFY | `components/items/config.ts` | 更新 ConfigField、FIELD_LABELS、PLACEHOLDERS，新增 STAGE_LABELS |
| MODIFY | `hooks/useItemsFilters.ts` | 移除 chipsToFilters 等已删除导出依赖 |
| MODIFY | `hooks/useItemsData.ts` | 适配 ShopItem 泛型 |
| MODIFY | `hooks/useItemMutations.ts` | 适配 ShopItem 类型 + 新增 shipConfig mutation |
| MODIFY | `components/items/ItemsTab.tsx` | 列定义适配 ShopItem；集成 ShipConfigModal/SkuConfigModal |
| MODIFY | `components/items/views/MobileProductCard.tsx` | 三个配置字段改为结构化判断 |
| MODIFY | `components/items/parts/ShelfActions.tsx` | 适配 ShopItem |
| MODIFY | `components/items/parts/SendCodeEditor.tsx` | sendCode 移至 config |
| MODIFY | `components/items/views/ItemRow.tsx` | 适配 ShopItem（保留 ITEMS_GRID_COLS 导出） |
| MODIFY | `components/items/drawers/ConfigDrawer.tsx` | 适配 ShopItem（保留给 sendCode/ai_prompt 等非 ShipConfig 字段） |

---

### Task 1: API 补充 — VoucherKind 类型 + getVoucherKinds

**Files:**
- Modify: `lib/api/items.ts`

**Interfaces:**
- Produces: `VoucherKind` type, `getVoucherKinds()` function

- [ ] **Step 1: 在 items.ts 中添加 VoucherKind 类型和 getVoucherKinds 函数**

在 `ShipConfigUpdate` 接口之后，`API 函数` 注释块之前，插入：

```typescript
// ═══════════════════════════════════════════════════════════════
// 卡种
// ═══════════════════════════════════════════════════════════════

/** 卡种（VoucherKindSchema） */
export interface VoucherKind {
  id: number
  name: string
  desc: string | null
  prefix_credit: string | null
  prefix_secret: string | null
  secretsCount: number | null
}
```

在 `refreshItems` 函数之后（文件末尾 `}` 之前），添加：

```typescript
/** 获取卡种列表 — GET /api/voucher.list */
export async function getVoucherKinds(): Promise<VoucherKind[]> {
  return fetchApi<VoucherKind[]>("/api/voucher.list")
}
```

- [ ] **Step 2: 验证类型编译**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
确认 `VoucherKind` 和 `getVoucherKinds` 没有新增错误（错误计数仅来自已知的 22 个调用方错误）。

- [ ] **Step 3: Commit**

```bash
git add lib/api/items.ts
git commit -m "feat: add VoucherKind type and getVoucherKinds API"
```

---

### Task 2: 更新 config.ts — 类型与常量

**Files:**
- Modify: `components/items/config.ts`

**Interfaces:**
- Produces: `ConfigField`（更新）, `FIELD_LABELS`（更新）, `STAGE_LABELS`（新增）, `PLACEHOLDERS`（精简）, `formatPublishTime`（修复）

- [ ] **Step 1: 重写 config.ts**

用以下内容完全替换文件：

```typescript
import type { ShipConfig, ShipByVoucher } from "@/lib/api/items"

// ═══════════════════════════════════════════════════════════════
// 配置字段类型
// ═══════════════════════════════════════════════════════════════

/** ShipConfig 的三个 stage */
export type ShipStage = 'shipment' | 'shipconfirm' | 'evaluation'

/** 弹窗可编辑的字段（ShipConfig 三字段 + 保留的文本字段） */
export type ConfigField = ShipStage | 'ai_reply_item_prompt' | 'sendCode'

export const FIELD_LABELS: Record<ConfigField, string> = {
  shipment: "付款后发货",
  shipconfirm: "收货后赠送",
  evaluation: "评价后赠送",
  ai_reply_item_prompt: "AI系统提示词",
  sendCode: "指令码",
}

export const STAGE_LABELS: Record<ShipStage, string> = {
  shipment: "付款后发货",
  shipconfirm: "收货后赠送",
  evaluation: "评价后赠送",
}

// ═══════════════════════════════════════════════════════════════
// 占位符
// ═══════════════════════════════════════════════════════════════

export const PLACEHOLDERS: { label: string; value: string }[] = [
  { label: "分段符", value: "{分段符}" },
  // 后续按需扩展：
  // { label: "订单号", value: "{订单号}" },
  // { label: "卡券信息", value: "{卡券信息}" },
]

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/** 判断 ShipConfig 是否有配置 */
export function hasShipConfig(config: ShipConfig | null | undefined): boolean {
  if (!config) return false
  if (config.byEntirety === null) return false
  if (config.byEntirety === true) return config.entirety !== null
  return Object.keys(config.skus).length > 0
}

/** 获取 SKU 的配置（从 config.skus 中查找） */
export function getSkuConfig(config: ShipConfig, skuid: number): ShipByVoucher | null {
  return config.skus[skuid] ?? null
}

/** 格式化发布时间 — ISO 8601 字符串 → yyyy/MM/dd HH:mm */
export function formatPublishTime(isoString: string | null): string {
  if (!isoString) return "-"
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return "-"
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** 商品状态标签 */
export function statusLabel(status: number): { text: string; color: string } {
  switch (status) {
    case 0:
      return { text: "在售", color: "bg-green-100 text-green-700" }
    case -2:
      return { text: "已下架", color: "bg-gray-100 text-gray-500" }
    case 1:
      return { text: "已售出", color: "bg-red-100 text-red-600" }
    default:
      return { text: "未知", color: "bg-gray-100 text-gray-500" }
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep "config.ts"
```
确认无新增错误。注意：依赖 config.ts 的其他文件可能因 `ConfigField` 类型变化而报警，这是预期行为，在后续 Task 中修复。

- [ ] **Step 3: Commit**

```bash
git add components/items/config.ts
git commit -m "refactor: update config.ts types and constants for ShipConfig"
```

---

### Task 3: 修复 useItemsFilters — 移除 chipsToFilters 依赖

**Files:**
- Modify: `hooks/useItemsFilters.ts`

**Interfaces:**
- Consumes: `ItemFilters` from `lib/api/items`（已存在）
- Produces: `filterState`, `onFilterChange`, `filters`, `page`, `pageSize`, `setPage`（接口不变）

- [ ] **Step 1: 重写 useItemsFilters.ts**

完全替换文件内容：

```typescript
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useDebounce } from "@/hooks/useDebounce"
import type { ItemFilters } from "@/lib/api/items"

// ═══════════════════════════════════════════════════════════════
// 筛选状态（chips 字段暂留，后续 Phase 移除芯片搜索 UI）
// ═══════════════════════════════════════════════════════════════

interface SearchChipData {
  field: string
  value: string
}

export interface ItemsFilterState {
  uid?: string
  status: number
  chips: SearchChipData[]        // 暂留，后续 Phase 移除
  orderBy: string | null
  asc: boolean
  page: number
}

/**
 * 商品管理页 — 筛选/搜索/排序/分页状态
 */
export function useItemsFilters() {
  const [filterState, setFilterState] = useState<ItemsFilterState>({
    status: 0,
    chips: [],
    orderBy: null,
    asc: false,
    page: 1,
  })
  const pageSize = 20

  const debouncedState = useDebounce(filterState, 400)

  const filters: ItemFilters = useMemo(() => {
    return {
      uid: debouncedState.uid,
      status: debouncedState.status,
      order_by: debouncedState.orderBy ?? undefined,
      asc: debouncedState.asc,
    }
  }, [debouncedState])

  // 筛选变化时回到第 1 页
  const prevFilterKey = useRef<string>("")
  const filterKey = JSON.stringify({
    uid: debouncedState.uid,
    status: debouncedState.status,
    orderBy: debouncedState.orderBy,
    asc: debouncedState.asc,
  })

  useEffect(() => {
    if (prevFilterKey.current && prevFilterKey.current !== filterKey) {
      setFilterState((prev) => ({ ...prev, page: 1 }))
    }
    prevFilterKey.current = filterKey
  }, [filterKey])

  const onFilterChange = (
    updater: (prev: ItemsFilterState) => ItemsFilterState,
  ) => {
    setFilterState(updater)
  }

  const page = filterState.page
  const setPage = (p: number) => {
    setFilterState((prev) => ({ ...prev, page: p }))
  }

  return {
    filterState,
    onFilterChange,
    filters,
    page,
    pageSize,
    setPage,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -E "useItemsFilters|ItemsFilterState"
```
确认无 `chipsToFilters` 相关错误。

- [ ] **Step 3: Commit**

```bash
git add hooks/useItemsFilters.ts
git commit -m "refactor: remove chipsToFilters dependency from useItemsFilters"
```

---

### Task 4: 适配 useItemsData — ShopItem 泛型

**Files:**
- Modify: `hooks/useItemsData.ts`

**Interfaces:**
- Consumes: `listItems`, `ItemFilters` from `lib/api/items`
- Produces: `data` (now `ShopItem[]`), `totalItems`, `totalPages`, plus existing accounts/keywords

- [ ] **Step 1: 更新 useItemsData.ts**

当前代码已经导入 `listItems` 和 `ItemFilters`，这两个在新 API 中已存在且签名兼容。主要修改：`getAccountNames` 的返回类型，以及明确 `data` 指向 `listData?.items`（已是 ShopItem[]）。

无需实质性代码变更——现有 `useItemsData.ts` 代码已经兼容 `ShopItemListResponse` 结构（`{ items, total }`）。

验证一下文件是否无需改动：

```bash
npx tsc --noEmit 2>&1 | grep "useItemsData"
```

如果无错误，跳过修改直接 commit。

- [ ] **Step 2: 确认无需变更并 commit**

```bash
git add hooks/useItemsData.ts
git commit -m "refactor: verify useItemsData compatible with ShopItem API"
```

---

### Task 5: 适配 useItemMutations — ShopItem 类型 + shipConfig mutation

**Files:**
- Modify: `hooks/useItemMutations.ts`

**Interfaces:**
- Consumes: `updateItem`, `refreshItems`, `shelvesItem`, `offlineItem`, `updateItemShipConfig`, `ShopItem`, `ShopItemListResponse`, `ShipByVoucher` from `lib/api/items`
- Produces: `updateMutation`, `shelfMutation`, `handleToggle`, `handleRefresh`, `isRefreshing`, `shipConfigMutation`

- [ ] **Step 1: 重写 useItemMutations.ts**

完全替换文件内容：

```typescript
"use client"

import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  updateItem,
  refreshItems,
  shelvesItem,
  offlineItem,
  updateItemShipConfig,
  type ShopItem,
  type ShopItemListResponse,
  type ShipByVoucher,
} from "@/lib/api/items"
import { useToast } from '@/components/ui/Toaster'

/**
 * 商品管理页 — 变更操作层
 */
export function useItemMutations() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: number; data: Record<string, unknown> }) =>
      updateItem(gid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  const shelfMutation = useMutation({
    mutationFn: ({ gid, uid, action }: { gid: number; uid: string; action: "shelves" | "offline" }) =>
      action === "shelves" ? shelvesItem(gid, uid) : offlineItem(gid, uid),
    onSuccess: (updated, { action }) => {
      queryClient.setQueriesData<ShopItemListResponse>({ queryKey: ["items"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((it) => (it.gid === updated.gid ? { ...it, ...updated } : it)),
        }
      })
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: action === "shelves" ? "上架成功" : "下架成功", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "操作失败", description: e.message, variant: "error" })
    },
  })

  /** ShipConfig 保存 mutation */
  const shipConfigMutation = useMutation({
    mutationFn: ({ gid, stage, byEntirety, voucher }: {
      gid: number
      stage: 'shipment' | 'shipconfirm' | 'evaluation'
      byEntirety: boolean
      voucher: ShipByVoucher
    }) => updateItemShipConfig(gid, { stage, byEntirety, voucher }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: "配置已保存", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "保存失败", description: e.message, variant: "error" })
    },
  })

  const handleToggle = useCallback(
    (item: ShopItem, field: "auto_reply" | "auto_ship" | "auto_ai_reply" | "auto_restock") => {
      const gid = item.gid
      updateMutation.mutate({ gid, data: { [field]: !item[field] } })
    },
    [updateMutation],
  )

  const handleRefresh = useCallback(
    async (uid: string | undefined) => {
      if (!uid) {
        addToast({ title: "刷新失败", description: "请先选择账号", variant: "error" })
        return
      }
      setIsRefreshing(true)
      try {
        const result = await refreshItems(uid)
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ["items"] })
        } else {
          addToast({ title: "刷新失败", description: result.message, variant: "error" })
        }
      } catch (e) {
        addToast({
          title: "刷新失败",
          description: e instanceof Error ? e.message : "刷新失败",
          variant: "error",
        })
      } finally {
        setIsRefreshing(false)
      }
    },
    [queryClient, addToast],
  )

  return {
    updateMutation,
    shelfMutation,
    shipConfigMutation,
    handleToggle,
    handleRefresh,
    isRefreshing,
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep "useItemMutations"
```
确认无新增错误。

- [ ] **Step 3: Commit**

```bash
git add hooks/useItemMutations.ts
git commit -m "refactor: adapt useItemMutations to ShopItem, add shipConfigMutation"
```

---

### Task 6: 创建 ConfigStatusCell

**Files:**
- Create: `components/items/parts/ConfigStatusCell.tsx`

**Interfaces:**
- Produces: `ConfigStatusCell` component

- [ ] **Step 1: 创建 ConfigStatusCell.tsx**

```typescript
"use client"

interface ConfigStatusCellProps {
  hasConfig: boolean
  onClick: () => void
}

/** 表格中显示配置状态的单元格 */
export function ConfigStatusCell({ hasConfig, onClick }: ConfigStatusCellProps) {
  return (
    <button
      onClick={onClick}
      className={`text-xs hover:underline ${
        hasConfig ? 'text-blue-600' : 'text-gray-400'
      }`}
      title={hasConfig ? '已配置，点击修改' : '未配置，点击配置'}
    >
      {hasConfig ? '已配置' : '未配置'}
    </button>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep "ConfigStatusCell"
```

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/ConfigStatusCell.tsx
git commit -m "feat: add ConfigStatusCell component"
```

---

### Task 7: 创建 ShipConfigModal

**Files:**
- Create: `components/items/parts/ShipConfigModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `components/ui/overlay/Modal`, `ShipByVoucher`, `VoucherKind` from `lib/api/items`, `STAGE_LABELS`, `PLACEHOLDERS` from `../config`
- Produces: `ShipConfigModal` component

- [ ] **Step 1: 创建 ShipConfigModal.tsx**

```typescript
"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/overlay/Modal"
import type { ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { STAGE_LABELS, PLACEHOLDERS } from "../config"

interface ShipConfigModalProps {
  open: boolean
  onClose: () => void
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  gid: number
  title: string
  skuInfo?: { skuid: number; values: string }
  currentConfig: ShipByVoucher | null
  byEntirety: boolean
  voucherKinds: VoucherKind[]
  onBackToSku?: () => void
  onSave: (data: ShipByVoucher) => Promise<void>
}

export function ShipConfigModal({
  open,
  onClose,
  stage,
  gid: _gid,
  title,
  skuInfo,
  currentConfig,
  byEntirety,
  voucherKinds,
  onBackToSku,
  onSave,
}: ShipConfigModalProps) {
  const [kind, setKind] = useState<'DIRECT' | 'VOUCHER'>(
    currentConfig?.kind ?? 'DIRECT'
  )
  const [voucherkindid, setVoucherkindid] = useState<number | null>(
    currentConfig?.voucherkindid ?? null
  )
  const [useinstructions, setUseinstructions] = useState(
    currentConfig?.useinstructions ?? ''
  )
  const [saving, setSaving] = useState(false)

  const stageLabel = STAGE_LABELS[stage]

  const insertPlaceholder = (value: string) => {
    setUseinstructions((prev) => prev + value)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        kind,
        skuid: skuInfo?.skuid ?? null,
        voucherkindid: kind === 'VOUCHER' ? voucherkindid : null,
        useinstructions: useinstructions || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const selectedVoucher = voucherKinds.find((vk) => vk.id === voucherkindid)

  return (
    <Modal open={open} onClose={onClose} title={stageLabel} size="md">
      {/* 商品 / SKU 信息条 + 返回按钮 */}
      <div className="mb-4">
        {onBackToSku && (
          <button
            onClick={onBackToSku}
            className="text-xs text-blue-600 hover:underline mb-1 inline-block"
          >
            ← 返回SKU列表
          </button>
        )}
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500">商品:</span>
            <span className="font-medium text-gray-900 truncate">{title}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {skuInfo && <span>SKU: {skuInfo.values}</span>}
            <span>配置模式: {byEntirety ? '按商品' : '按SKU'}</span>
          </div>
        </div>
      </div>

      {/* 发货方式切换 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">发货方式</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind('DIRECT')}
            className={`h-10 text-sm rounded-lg border transition-colors ${
              kind === 'DIRECT'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            无卡配置
          </button>
          <button
            type="button"
            onClick={() => setKind('VOUCHER')}
            className={`h-10 text-sm rounded-lg border transition-colors ${
              kind === 'VOUCHER'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            卡密配置
          </button>
        </div>
      </div>

      {/* 卡种选择（仅 VOUCHER） */}
      {kind === 'VOUCHER' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            卡种
            {selectedVoucher?.desc && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({selectedVoucher.desc})
              </span>
            )}
          </label>
          <select
            value={voucherkindid ?? ''}
            onChange={(e) => setVoucherkindid(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">选择卡种</option>
            {voucherKinds.map((vk) => (
              <option key={vk.id} value={vk.id}>
                {vk.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 使用说明 / 发货内容 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          使用说明（发货内容）
        </label>
        <textarea
          value={useinstructions}
          onChange={(e) => setUseinstructions(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          placeholder="输入发货内容..."
        />
      </div>

      {/* 占位符选择器 */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">点击插入占位符：</div>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => insertPlaceholder(p.value)}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 whitespace-nowrap active:scale-95 transition-all"
              title={p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="flex-1 h-10 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-10 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep "ShipConfigModal"
```

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/ShipConfigModal.tsx
git commit -m "feat: add ShipConfigModal for shipment/shipconfirm/evaluation config"
```

---

### Task 8: 创建 SkuConfigModal

**Files:**
- Create: `components/items/parts/SkuConfigModal.tsx`

**Interfaces:**
- Consumes: `Modal` from `components/ui/overlay/Modal`, `ItemSKU`, `ShipConfig` from `lib/api/items`, `STAGE_LABELS` from `../config`, `ShipConfigModal` from `./ShipConfigModal`
- Produces: `SkuConfigModal` component

- [ ] **Step 1: 创建 SkuConfigModal.tsx**

```typescript
"use client"

import { useState } from "react"
import { Modal } from "@/components/ui/overlay/Modal"
import type { ItemSKU, ShipConfig, ShipByVoucher, VoucherKind } from "@/lib/api/items"
import { STAGE_LABELS, getSkuConfig } from "../config"
import { ShipConfigModal } from "./ShipConfigModal"

interface SkuConfigModalProps {
  open: boolean
  onClose: () => void
  gid: number
  title: string
  stage: 'shipment' | 'shipconfirm' | 'evaluation'
  skus: ItemSKU[]
  config: ShipConfig
  voucherKinds: VoucherKind[]
  onSaveSku: (data: ShipByVoucher) => Promise<void>       // 保存 SKU 级配置
  onSaveEntirety: (data: ShipByVoucher) => Promise<void>  // 保存商品级配置
  onConfigSaved: () => void
}

/** SKU 规格值拼接，如 "红色 / XL" */
function skuValuesLabel(sku: ItemSKU): string {
  return sku.values.map((v) => v.value).join(' / ')
}

/** 格式化价格（单位分 → 元） */
function fmtSkuPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(0)}`
}

export function SkuConfigModal({
  open,
  onClose,
  gid,
  title,
  stage,
  skus,
  config,
  voucherKinds,
  onConfigSaved,
}: SkuConfigModalProps) {
  const stageLabel = STAGE_LABELS[stage]

  // viewMode: 'sku' = 显示 SKU 列表, 'entirety' = 编辑商品级配置
  const [viewMode, setViewMode] = useState<'sku' | 'entirety'>('sku')

  // activeSku: 当前选中要配置的 SKU（null = 未选中，驱动 ShipConfigModal 打开）
  // 特殊值: activeSku === ENTIRETY_TOKEN 表示"按商品配置"模式
  const [activeSku, setActiveSku] = useState<ItemSKU | null>(null)
  const [showEntiretyConfig, setShowEntiretyConfig] = useState(false)

  const handleSkuClick = (sku: ItemSKU) => {
    setActiveSku(sku)
  }

  const handleSwitchToEntirety = () => {
    setShowEntiretyConfig(true)
  }

  const handleBackToSku = () => {
    setShowEntiretyConfig(false)
    setActiveSku(null)
    setViewMode('sku')
    onConfigSaved()
  }

  const handleSaveSku = async (data: ShipByVoucher): Promise<void> => {
    await onSaveSku(data)
    setActiveSku(null)
    onConfigSaved()
  }

  const handleSaveEntirety = async (data: ShipByVoucher): Promise<void> => {
    await onSaveEntirety(data)
    setShowEntiretyConfig(false)
    onConfigSaved()
  }

  return (
    <>
      <Modal open={open && !activeSku && !showEntiretyConfig} onClose={onClose} title={`${stageLabel} - SKU 明细`} size="md">
        {/* 商品信息条 */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">商品:</span>
            <span className="font-medium text-gray-900 truncate">{title}</span>
          </div>
        </div>

        {/* 按商品 / 按SKU 切换 */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={handleSwitchToEntirety}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              viewMode === 'entirety'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            按商品配置
          </button>
          <button
            type="button"
            onClick={() => setViewMode('sku')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              viewMode === 'sku'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            按SKU配置
          </button>
        </div>

        {/* SKU 列表 */}
        {viewMode === 'sku' && (
          <div className="space-y-1">
            {skus.map((sku) => {
              const skuConfig = getSkuConfig(config, sku.skuid)
              const hasConfig = skuConfig !== null
              return (
                <button
                  key={sku.skuid}
                  onClick={() => handleSkuClick(sku)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-gray-800 truncate">
                      {skuValuesLabel(sku)}
                    </span>
                    <span className="text-sm text-orange-600 font-medium flex-shrink-0">
                      {fmtSkuPrice(sku.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${hasConfig ? 'text-blue-600' : 'text-gray-400'}`}>
                      {hasConfig
                        ? (skuConfig!.kind === 'VOUCHER' ? '已配置(卡密)' : '已配置(无卡)')
                        : '未配置'
                      }
                    </span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Modal>

      {/* SKU 级配置弹窗 */}
      {activeSku && (
        <ShipConfigModal
          open={!!activeSku}
          onClose={() => { setActiveSku(null); onConfigSaved() }}
          stage={stage}
          gid={gid}
          title={title}
          skuInfo={{ skuid: activeSku.skuid, values: skuValuesLabel(activeSku) }}
          currentConfig={getSkuConfig(config, activeSku.skuid)}
          byEntirety={false}
          voucherKinds={voucherKinds}
          onBackToSku={() => { setActiveSku(null); onConfigSaved() }}
          onSave={handleSaveSku}
        />
      )}

      {/* 商品级配置弹窗 */}
      {showEntiretyConfig && (
        <ShipConfigModal
          open={showEntiretyConfig}
          onClose={() => { setShowEntiretyConfig(false); onConfigSaved() }}
          stage={stage}
          gid={gid}
          title={title}
          currentConfig={config.byEntirety === true ? config.entirety : null}
          byEntirety={true}
          voucherKinds={voucherKinds}
          onBackToSku={handleBackToSku}
          onSave={handleSaveEntirety}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep "SkuConfigModal"
```

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/SkuConfigModal.tsx
git commit -m "feat: add SkuConfigModal for multi-SKU product config"
```

---

### Task 9: 适配 ShelfActions + SendCodeEditor + ItemRow — ShopItem

**Files:**
- Modify: `components/items/parts/ShelfActions.tsx`
- Modify: `components/items/parts/SendCodeEditor.tsx`
- Modify: `components/items/views/ItemRow.tsx`

**Interfaces:**
- Consumes: `ShopItem` from `lib/api/items`
- Produces: Updated component Props

- [ ] **Step 1: 适配 ShelfActions.tsx**

修改导入和类型引用——将 `Item` 替换为 `ShopItem`，移除 `getShelfState` 导入（已删除）：

```typescript
"use client"

import { useState } from "react"
import type { ShopItem } from "@/lib/api/items"
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'

interface ShelfActionsProps {
  item: ShopItem
  variant: "desktop" | "mobile"
  pending: boolean
  onShelve: (item: ShopItem) => void
  onOffline: (item: ShopItem) => void
}

/** 判断上架/下架按钮可用性 */
function getShelfState(item: ShopItem) {
  // status: 0=在售, -2=已下架, 1=已售出
  const isPro = item.account.isPro
  return {
    canShelve: !isPro && (item.status === -2 || item.status === 1),
    canOffline: !isPro && item.status === 0,
    shelveDisabledReason: isPro ? "Pro 账号不支持上架" : undefined,
    offlineDisabledReason: isPro ? "Pro 账号不支持下架" : undefined,
  }
}

export function ShelfActions({ item, variant, pending, onShelve, onOffline }: ShelfActionsProps) {
  const [confirm, setConfirm] = useState<"shelve" | "offline" | null>(null)
  const state = getShelfState(item)

  const handleConfirm = () => {
    if (confirm === "shelve") onShelve(item)
    else if (confirm === "offline") onOffline(item)
    setConfirm(null)
  }

  const dialog = (
    <ConfirmDialog
      open={confirm !== null}
      onOpenChange={(o) => !o && setConfirm(null)}
      title={confirm === "shelve" ? "确认上架吗？" : "确认下架吗？"}
      description={
        confirm === "shelve"
          ? (
            <>
              1. 当前功能仅支持单规格商品<br />
              2. 可能导致上架前后不一致<br />
            </>
          )
          : (
              <>
                1. 下架后该商品将停止售卖<br />
                2. 再次上架时仅支持单规格商品, 可能导致上架前后不一致<br />
              </>
            )
      }
      confirmLabel={confirm === "shelve" ? "上架" : "下架"}
      loading={pending}
      onConfirm={handleConfirm}
    />
  )

  if (variant === "mobile") {
    const showShelve = item.status === -2 || item.status === 1
    const showOffline = item.status === 0
    if (!showShelve && !showOffline) return null
    return (
      <>
        {showShelve && (
          <button
            type="button"
            disabled={!state.canShelve || pending}
            title={state.shelveDisabledReason}
            onClick={() => setConfirm("shelve")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              state.canShelve
                ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
                : "text-gray-300 bg-gray-100 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
            }`}
          >
            上架
          </button>
        )}
        {showOffline && (
          <button
            type="button"
            disabled={!state.canOffline || pending}
            title={state.offlineDisabledReason}
            onClick={() => setConfirm("offline")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              state.canOffline
                ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
                : "text-gray-300 bg-gray-100 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
            }`}
          >
            下架
          </button>
        )}
        {dialog}
      </>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={!state.canShelve || pending}
        title={state.shelveDisabledReason}
        onClick={() => setConfirm("shelve")}
        className={`text-xs ${
          state.canShelve
            ? "text-green-600 dark:text-green-400 hover:underline"
            : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
        }`}
      >
        上架
      </button>
      <button
        type="button"
        disabled={!state.canOffline || pending}
        title={state.offlineDisabledReason}
        onClick={() => setConfirm("offline")}
        className={`text-xs ${
          state.canOffline
            ? "text-green-600 dark:text-green-400 hover:underline"
            : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
        }`}
      >
        下架
      </button>
      {dialog}
    </span>
  )
}
```

- [ ] **Step 2: 适配 SendCodeEditor.tsx**

`sendCode` 现在在 `item.config?.sendCode`。修改 gid 类型为 `number`（ShopItem 中 gid 是 number）。

修改 Props 中的 `gid: string` → `gid: number`：

在文件头修改接口：

```typescript
interface SendCodeEditorProps {
  gid: number  // was: string
  sendCode: string | null
  variant: "cell" | "row"
  onUpdateField: (gid: number, field: "sendCode", value: string) => void
  hasValue?: boolean
}
```

hook 中的 gid 类型同步修改：`gid: number`。

- [ ] **Step 3: 适配 ItemRow.tsx**

ItemRow 目前未被 ItemsTab 直接使用（ItemsTab 用 DataTable），但被其他文件可能 import `ITEMS_GRID_COLS`。更新 ItemRow 的导入从 `Item` 改为 `ShopItem`，更新 `ITEMS_GRID_COLS` 为适配新列数。

当前表格是 13 列（`'2fr 1.5fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'`）。新的列布局去掉旧的三个文本框列，改为三个 ConfigStatusCell 列，列数不变。

保持 `ITEMS_GRID_COLS` 不变（仍为 13 列）或简化。更新所有 `Item` 引用为 `ShopItem`，移除旧的 `item.price`、`item.deliveryContent` 等字段引用。

- [ ] **Step 4: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -E "ShelfActions|SendCodeEditor|ItemRow"
```

- [ ] **Step 5: Commit**

```bash
git add components/items/parts/ShelfActions.tsx components/items/parts/SendCodeEditor.tsx components/items/views/ItemRow.tsx
git commit -m "refactor: adapt ShelfActions, SendCodeEditor, ItemRow to ShopItem"
```

---

### Task 10: 适配 ItemsTab — 完整 ShopItem 迁移 + 集成新弹窗

**Files:**
- Modify: `components/items/ItemsTab.tsx`

**Interfaces:**
- Consumes: `ShopItem` from `lib/api/items`, `ShipStage`, `hasShipConfig` from `./config`, `ShipConfigModal`, `SkuConfigModal`, `ConfigStatusCell`
- Produces: Updated `ItemsTab` component

- [ ] **Step 1: 重写 ItemsTab.tsx**

这是最大最关键的改动。核心变化：

1. 所有 `Item` → `ShopItem`
2. `gid` 类型从 `string` → `number`
3. 三个配置列改为 `ConfigStatusCell` + 点击逻辑
4. 集成 `ShipConfigModal` / `SkuConfigModal` 弹窗状态管理
5. 价格列 → `item.reservePrice`
6. 自动发货 → `item.auto_ship`
7. sendCode → `item.config?.sendCode`
8. 引入 `shipConfigMutation` from `useItemMutations`
9. 引入 `useQuery` 获取 `voucherKinds`

由于 ItemsTab.tsx 改动很大（约 400 行），建议完全重写。关键结构：

```typescript
"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bot, Truck, Upload } from "lucide-react"
import type { ShopItem, ItemSKU, ShipConfig, ShipByVoucher } from "@/lib/api/items"
import { getVoucherKinds } from "@/lib/api/items"
import type { ShipStage } from "@/components/items/config"
import { hasShipConfig, formatPublishTime, STAGE_LABELS } from "@/components/items/config"
import { ITEMS_GRID_COLS } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/RulesItemsingleDrawer"
import { IconToggle } from "@/components/items/parts/IconToggle"
import { SendCodeEditor } from "@/components/items/parts/SendCodeEditor"
import { ShelfActions } from "@/components/items/parts/ShelfActions"
import { ConfigStatusCell } from "@/components/items/parts/ConfigStatusCell"
import { ShipConfigModal } from "@/components/items/parts/ShipConfigModal"
import { SkuConfigModal } from "@/components/items/parts/SkuConfigModal"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { Pagination } from '@/components/ui/data/Pagination'
import { DataTable, type DataTableColumn } from '@/components/ui/data/DataTable'

interface ItemsTabProps {
  isMobile: boolean
  data: ShopItem[] | undefined
  isLoading: boolean
  error: unknown
  itemKeywordCounts: Record<string, number>
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onRetry: () => void
  onToggle: (item: ShopItem, field: string) => void
  updateMutation: { mutate: (args: { gid: number; data: Record<string, unknown> }) => void }
  shelfMutation: {
    mutate: (args: { gid: number; uid: string; action: "shelves" | "offline" }) => void
    isPending: boolean
    variables?: { gid: number; uid: string; action: "shelves" | "offline" }
  }
  shipConfigMutation: {
    mutate: (args: {
      gid: number
      stage: 'shipment' | 'shipconfirm' | 'evaluation'
      byEntirety: boolean
      voucher: ShipByVoucher
    }) => void
    isPending: boolean
  }
  orderBy: string | null
  asc: boolean
  onSortChange: (field: string) => void
}

/** 判断是否为多规格商品 */
function isMultiSku(item: ShopItem): boolean {
  return item.skus !== null && item.skus.length > 1
}

export function ItemsTab({
  isMobile,
  data,
  isLoading,
  error,
  itemKeywordCounts,
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onRetry,
  onToggle,
  updateMutation,
  shelfMutation,
  shipConfigMutation,
  orderBy,
  asc,
  onSortChange,
}: ItemsTabProps) {
  // 弹窗状态
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [keywordItem, setKeywordItem] = useState<ShopItem | null>(null)

  // ShipConfig 弹窗状态
  const [shipConfigStage, setShipConfigStage] = useState<ShipStage | null>(null)
  const [shipConfigItem, setShipConfigItem] = useState<ShopItem | null>(null)
  // null = 未选中 SKU（即按商品配置或单规格商品）
  const [shipConfigSku, setShipConfigSku] = useState<ItemSKU | null>(null)

  // 是否要显示 SkuConfigModal（多规格商品的中间层）
  const [skuModalStage, setSkuModalStage] = useState<ShipStage | null>(null)
  const [skuModalItem, setSkuModalItem] = useState<ShopItem | null>(null)

  // 卡种列表
  const { data: voucherKinds = [] } = useQuery({
    queryKey: ["voucherKinds"],
    queryFn: getVoucherKinds,
    staleTime: 5 * 60 * 1000,
  })

  const isShelfPending = (item: ShopItem) =>
    shelfMutation.isPending && shelfMutation.variables?.gid === item.gid

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [page])

  const handleSortChange = (field: string | null) => {
    if (field === null) {
      if (orderBy) onSortChange(orderBy)
    } else {
      onSortChange(field)
    }
  }

  // 点击配置列 → 判断打开哪个弹窗
  const handleConfigClick = (item: ShopItem, stage: ShipStage) => {
    setShipConfigStage(stage)
    setShipConfigItem(item)
    setShipConfigSku(null)

    if (isMultiSku(item)) {
      // 多规格 → 先开 SKU 明细弹窗
      setSkuModalStage(stage)
      setSkuModalItem(item)
    }
  }

  // 从 SkuConfigModal 保存 SKU 级配置（闭包捕获 skuModalItem/stage）
  const handleSaveSkuConfig = async (skuData: ShipByVoucher): Promise<void> => {
    return new Promise((resolve) => {
      if (!skuModalItem || !skuModalStage) { resolve(); return }
      shipConfigMutation.mutate(
        { gid: skuModalItem.gid, stage: skuModalStage, byEntirety: false, voucher: skuData },
        { onSuccess: () => resolve(), onError: () => resolve() }
      )
    })
  }

  // 从 SkuConfigModal 保存商品级配置（闭包捕获 skuModalItem/stage）
  const handleSaveEntiretyConfig = async (skuData: ShipByVoucher): Promise<void> => {
    return new Promise((resolve) => {
      if (!skuModalItem || !skuModalStage) { resolve(); return }
      shipConfigMutation.mutate(
        { gid: skuModalItem.gid, stage: skuModalStage, byEntirety: true, voucher: skuData },
        { onSuccess: () => resolve(), onError: () => resolve() }
      )
    })
  }

  // 构建表格列定义
  const columns: DataTableColumn<ShopItem>[] = [
    {
      key: 'title',
      header: '商品信息',
      sortable: true,
      className: 'col-span-2 min-w-0',
      render: (item) => (
        <div className="min-w-0">
          <span
            className="text-left block w-full text-sm text-gray-800 dark:text-gray-200 leading-snug truncate"
            title={item.title || '无标题'}
          >
            {item.title || '无标题'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-gray-400 text-xs">
            <span title={item.account.uid} className="truncate">{item.account.name}</span>
            <span className="text-gray-300">|</span>
            <span title={String(item.gid)} className="min-w-[85px] truncate">{item.gid}</span>
            <span className="text-gray-300">|</span>
            <ShelfActions
              item={item}
              variant="desktop"
              pending={isShelfPending(item)}
              onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
              onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: '价格',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-orange-600 font-semibold text-xs">{item.reservePrice || '-'}</span>
      ),
    },
    {
      key: 'publishTime',
      header: '发布时间',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="text-xs text-gray-500">{formatPublishTime(item.publishTime)}</span>
      ),
    },
    {
      key: 'auto_ai_reply',
      header: 'AI回复',
      align: 'center',
      render: (item) => (
        <IconToggle
          active={item.auto_ai_reply}
          activeClass="text-purple-500 bg-purple-50"
          title={item.auto_ai_reply ? 'AI回复：开' : 'AI回复：关'}
          onClick={() => onToggle(item, 'auto_ai_reply')}
        >
          <Bot className="w-4 h-4" />
        </IconToggle>
      ),
    },
    {
      key: 'auto_ship',
      header: '自动发货',
      align: 'center',
      render: (item) => (
        <IconToggle
          active={item.auto_ship}
          activeClass="text-green-500 bg-green-50"
          title={item.auto_ship ? '自动发货：开' : '自动发货：关'}
          onClick={() => onToggle(item, 'auto_ship')}
        >
          <Truck className="w-4 h-4" />
        </IconToggle>
      ),
    },
    {
      key: 'shipment',
      header: '付款后发货',
      align: 'center',
      render: (item) => {
        const hasConfig = item.config ? hasShipConfig(item.config.shipment) : false
        return <ConfigStatusCell hasConfig={hasConfig} onClick={() => handleConfigClick(item, 'shipment')} />
      },
    },
    {
      key: 'shipconfirm',
      header: '收货后赠送',
      align: 'center',
      render: (item) => {
        const hasConfig = item.config ? hasShipConfig(item.config.shipconfirm) : false
        return <ConfigStatusCell hasConfig={hasConfig} onClick={() => handleConfigClick(item, 'shipconfirm')} />
      },
    },
    {
      key: 'evaluation',
      header: '评价后赠送',
      align: 'center',
      render: (item) => {
        const hasConfig = item.config ? hasShipConfig(item.config.evaluation) : false
        return <ConfigStatusCell hasConfig={hasConfig} onClick={() => handleConfigClick(item, 'evaluation')} />
      },
    },
    {
      key: 'keywordCount',
      header: '关键词回复',
      align: 'center',
      render: (item) => {
        const count = itemKeywordCounts[item.gid] || 0
        return (
          <button
            onClick={() => setKeywordItem(item)}
            className={`text-xs font-medium ${
              count > 0 ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {count > 0 ? `${count}条规则` : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'aiReplyItemPrompt',
      header: 'AI提示词',
      align: 'center',
      render: (item) => {
        const value = item.config?.ai_prompt || ''
        const hasValue = value.trim().length > 0
        return (
          <button
            onClick={() => {/* TODO: ai_prompt 后续适配 */}}
            className={`text-xs ${hasValue ? 'text-blue-600' : 'text-gray-400'} hover:underline`}
          >
            {hasValue ? '已配置' : '未配置'}
          </button>
        )
      },
    },
    {
      key: 'auto_restock',
      header: '自动上架',
      align: 'center',
      render: (item) => {
        const disabled = item.account.isPro
        return (
          <IconToggle
            active={item.auto_restock}
            activeClass="text-teal-500 bg-teal-50"
            disabled={disabled}
            title={disabled ? 'Pro 账号不支持自动上架' : item.auto_restock ? '自动上架：开' : '自动上架：关'}
            onClick={() => { if (!disabled) onToggle(item, 'auto_restock') }}
          >
            <Upload className="w-4 h-4" />
          </IconToggle>
        )
      },
    },
    {
      key: 'sendCode',
      header: '指令码',
      align: 'center',
      render: (item) => (
        <SendCodeEditor
          gid={item.gid}
          sendCode={item.config?.sendCode ?? null}
          variant="cell"
          onUpdateField={(gid, _field, value) =>
            updateMutation.mutate({ gid, data: { sendCode: value } })
          }
        />
      ),
    },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!!error && !isLoading && (
        <ErrorBanner
          message={`加载商品列表失败: ${String(error)}`}
          variant="banner"
          onRetry={onRetry}
        />
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <EmptyState title="暂无商品" description="没有找到符合条件的商品" />
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <>
          <div ref={listRef} className="flex-1 overflow-auto hidden md:block min-h-[200px]">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(item) => String(item.gid)}
              gridTemplateColumns={ITEMS_GRID_COLS}
              stickyHeader
              orderBy={orderBy}
              asc={asc}
              onSortChange={handleSortChange}
            />
          </div>

          <div className="flex-1 overflow-auto md:hidden pb-3 space-y-2 min-h-[200px]">
            {data.map((item) => (
              <MobileProductCard
                key={item.gid}
                item={item}
                keywordCount={itemKeywordCounts[item.gid] || 0}
                onToggle={onToggle}
                onEdit={() => setEditingItem(item)}
                onKeywordClick={() => setKeywordItem(item)}
                onConfigClick={(stage) => handleConfigClick(item, stage as ShipStage)}
                onSendCodeChange={(gid, value) => updateMutation.mutate({ gid, data: { sendCode: value } })}
                onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
                onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
                shelfPending={isShelfPending(item)}
              />
            ))}
          </div>
        </>
      )}

      <Pagination page={page} total={totalItems} pageSize={pageSize} onChange={onPageChange} />

      {/* 单规格 / 直接配置 → ShipConfigModal */}
      {shipConfigStage && shipConfigItem && !isMultiSku(shipConfigItem) && (
        <ShipConfigModal
          open
          onClose={() => { setShipConfigStage(null); setShipConfigItem(null) }}
          stage={shipConfigStage}
          gid={shipConfigItem.gid}
          title={shipConfigItem.title}
          currentConfig={(() => {
            const cfg = shipConfigItem.config?.[shipConfigStage]
            if (!cfg || cfg.byEntirety !== true) return null
            return cfg.entirety
          })()}
          byEntirety={true}
          voucherKinds={voucherKinds}
          onSave={handleSaveEntiretyConfig}
        />
      )}

      {/* 多规格 → SkuConfigModal（中间层） */}
      {skuModalStage && skuModalItem && (
        <SkuConfigModal
          open
          onClose={() => { setSkuModalStage(null); setSkuModalItem(null) }}
          gid={skuModalItem.gid}
          title={skuModalItem.title}
          stage={skuModalStage}
          skus={skuModalItem.skus!}
          config={skuModalItem.config?.[skuModalStage] ?? {
            byEntirety: null,
            entirety: null,
            skus: {} as Record<number, ShipByVoucher>,
          }}
          voucherKinds={voucherKinds}
          onSaveSku={handleSaveSkuConfig}
          onSaveEntirety={handleSaveEntiretyConfig}
          onConfigSaved={() => {
            // 保存后刷新列表（shipConfigMutation.onSuccess 已 invalidate）
          }}
        />
      )}

      {/* 编辑商品 */}
      {editingItem && (
        <ItemEditDrawer
          item={editingItem as any}  // TODO: ItemEditDrawer 后续适配
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复 */}
      {keywordItem && (
        <KeywordDrawer
          item={keywordItem as any}  // TODO: KeywordDrawer 后续适配
          open={!!keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 更新 ItemsTab page.tsx — 传递 shipConfigMutation**

在 `useItemsPage.ts` 中从 `useItemMutations` 解构出 `shipConfigMutation` 并传递给 ItemsTab：

```typescript
const {
  updateMutation,
  shelfMutation,
  shipConfigMutation,
  handleToggle,
  handleRefresh: refreshFn,
  isRefreshing,
} = useItemMutations()
```

在 return 中添加 `shipConfigMutation`。

- [ ] **Step 4: 更新 ItemsTab page.tsx — 传递 shipConfigMutation**

在 `app/dashboard/items/page.tsx` 的 `ItemsPageContent` 中：
- 从 `useItemsPage` 解构 `shipConfigMutation`
- 传给 `<ItemsTab shipConfigMutation={shipConfigMutation} />`

- [ ] **Step 5: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep -E "ItemsTab|page\.tsx|SkuConfigModal" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add components/items/ItemsTab.tsx components/items/parts/SkuConfigModal.tsx hooks/useItemsPage.ts app/dashboard/items/page.tsx
git commit -m "feat: integrate ShipConfigModal/SkuConfigModal into ItemsTab with full ShopItem migration"
```

---

### Task 11: 适配 MobileProductCard — 三个配置字段

**Files:**
- Modify: `components/items/views/MobileProductCard.tsx`

**Interfaces:**
- Consumes: `ShopItem` from `lib/api/items`, `ShipStage` from `../config`, `hasShipConfig` from `../config`

- [ ] **Step 1: 更新 MobileProductCard.tsx**

关键变更：
1. `Item` → `ShopItem`
2. `item.price` → `item.reservePrice`
3. `item.deliveryContent/receiptAfter/positiveReviewAfter` → `item.config?.shipment/shipconfirm/evaluation`
4. `item.auto_delivery` → `item.auto_ship`
5. `item.sendCode` → `item.config?.sendCode`
6. `item.ai_reply_item_prompt` → `item.config?.ai_prompt`
7. `onConfigClick` 参数从 `ConfigField` 改为 `ShipStage`
8. `onToggle` 的 `"auto_delivery"` → `"auto_ship"`

修改 `ConfigEntry.key` 为 `ShipStage` 类型，调整 `allConfigs` 数组：

```typescript
const allConfigs: ConfigEntry[] = [
  { key: "shipment", label: "付款后发货", icon: "📝", 
    hasValue: item.config ? hasShipConfig(item.config.shipment) : false },
  { key: "shipconfirm", label: "收货后赠送", icon: "🎁", 
    hasValue: item.config ? hasShipConfig(item.config.shipconfirm) : false },
  { key: "evaluation", label: "评价后赠送", icon: "⭐", 
    hasValue: item.config ? hasShipConfig(item.config.evaluation) : false },
  { key: "ai_reply_item_prompt" as any, label: "AI提示词", icon: "💬", 
    hasValue: (item.config?.ai_prompt || "").trim().length > 0 },
  { key: "keyword" as any, label: "关键词回复", icon: "🔑", 
    hasValue: keywordCount > 0 },
  { key: "sendCode" as any, label: "指令码", icon: "⌨️", 
    hasValue: !!(item.config?.sendCode && item.config.sendCode.trim().length > 0) },
]
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit 2>&1 | grep "MobileProductCard"
```

- [ ] **Step 3: Commit**

```bash
git add components/items/views/MobileProductCard.tsx
git commit -m "refactor: adapt MobileProductCard to ShopItem with ShipConfig fields"
```

---

### Task 12: 适配 ConfigDrawer — 保留给非 ShipConfig 字段

**Files:**
- Modify: `components/items/drawers/ConfigDrawer.tsx`

**Interfaces:**
- Consumes: `ShopItem` from `lib/api/items`, `ConfigField` from `../config`

- [ ] **Step 1: 更新 ConfigDrawer.tsx**

将 `Item` → `ShopItem`。移除 `item.price` 引用，改用 `item.reservePrice`。该弹窗仍用于 `ai_reply_item_prompt` 和 `sendCode` 的旧式文本编辑（作为降级路径）。

关键改动：
```typescript
import type { ShopItem } from "@/lib/api/items"
// item.price → item.reservePrice
// item[field] 改为从 config 中读取（仅 ai_prompt 和 sendCode）
```

- [ ] **Step 2: 验证最终编译**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
确认错误数显著减少（目标：仅余不在本次范围的调用方错误）。

- [ ] **Step 3: Commit**

```bash
git add components/items/drawers/ConfigDrawer.tsx
git commit -m "refactor: adapt ConfigDrawer to ShopItem"
```

---

### Task 13: 最终验证 + 功能回归

**Files:**
- 所有已修改文件

- [ ] **Step 1: 完整类型检查**

```bash
npx tsc --noEmit 2>&1 | tail -30
```

记录剩余错误列表，确认全部属于"不在本次范围"的文件（如 `RuleBindingPanel.tsx`、`ItemEditDrawer.tsx` 等）。

- [ ] **Step 2: 构建验证**

```bash
npm run build 2>&1 | tail -20
```

确认构建成功。

- [ ] **Step 3: 视觉检查清单**

在开发服务器中验证：
- [ ] 桌面端表格三个配置列显示"已配置/未配置"状态
- [ ] 单规格商品点击 → 直接打开 ShipConfigModal
- [ ] 多规格商品点击 → 打开 SkuConfigModal（SKU 明细）
- [ ] SKU 明细中切换"按商品配置" → 打开 ShipConfigModal
- [ ] ShipConfigModal 中"无卡配置/卡密配置"切换正常
- [ ] 卡密配置时卡种下拉显示正常
- [ ] 使用说明文本编辑 + 占位符插入正常
- [ ] 保存后列表刷新，状态更新
- [ ] 移动端卡片视图适配正常

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup for ship config refactor"
```
