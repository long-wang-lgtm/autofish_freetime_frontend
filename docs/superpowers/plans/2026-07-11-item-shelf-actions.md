# 商品上架 / 下架操作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在商品管理页的桌面端表格与移动端卡片中，新增「上架 / 下架」操作按钮，按商品/账号状态控制可用性，操作前确认，成功后列表状态即时更新。

**Architecture:** 抽独立组件 `ShelfActions`（桌面/移动共用，`variant` 区分）承载按钮 + 确认框；可用性判断收敛到纯函数 `getShelfState`；统一 `shelfMutation` 处理请求，成功后 `setQueriesData` merge 就地更新 + `invalidateQueries` 后台重拉。数据流：`useItemMutations → useItemsPage → page.tsx → ItemsTab / MobileProductCard`。

**Tech Stack:** Next.js 14 + React 18 + TypeScript + @tanstack/react-query v5 + Tailwind CSS v3。

**验证说明：** 本项目无自动化测试基建（无 jest/vitest/playwright）。每个 Task 用 `npm run type-check` 验证类型正确，最后统一 `npm run lint` + `npm run build` + 手动验证。这是对 TDD 循环的项目化适配。

**参考 spec：** `docs/superpowers/specs/2026-07-11-item-shelf-actions-design.md`

---

## 文件结构

| 文件 | 职责 | 改动 |
|------|------|------|
| `lib/api/items.ts` | 商品 API + 类型 | 新增 `shelvesItem`/`offlineItem` 接口函数、`ShelfState` 类型、`getShelfState` 纯函数 |
| `hooks/useItemMutations.ts` | 变更操作层 | 新增 `shelfMutation` |
| `components/items/parts/ShelfActions.tsx` | 上架/下架按钮组 + 确认框 | **新建** |
| `hooks/useItemsPage.ts` | 页面组合 hook | 透传 `shelfMutation` |
| `app/dashboard/items/page.tsx` | 页面装配 | 传 `shelfMutation` 给 `ItemsTab` |
| `components/items/ItemsTab.tsx` | 桌面表格 + 移动列表调度 | props 加 `shelfMutation`；第99行渲染 `ShelfActions`（desktop）；移动列表透传回调 |
| `components/items/views/MobileProductCard.tsx` | 移动端卡片 | props 加 `onShelve`/`onOffline`/`shelfPending`；信息栏渲染 `ShelfActions`（mobile） |

---

## Task 1: API 接口函数与可用性工具

**Files:**
- Modify: `lib/api/items.ts`（在 `updateItem` 函数之后追加）

- [ ] **Step 1: 追加两个接口函数与可用性工具**

在 `lib/api/items.ts` 中 `export async function updateItem(...)` 之后（约第 197 行后）追加：

```ts
/** 上架商品 — POST /api/items/shelves?gid=&uid=（gid/uid 走 query，返回更新后的商品对象） */
export async function shelvesItem(gid: string, uid: string): Promise<Item> {
  const params = new URLSearchParams({ gid, uid })
  return fetchApi<Item>(`/api/items/shelves?${params.toString()}`, {
    method: "POST",
  })
}

/** 下架商品 — POST /api/items/offline?gid=&uid= */
export async function offlineItem(gid: string, uid: string): Promise<Item> {
  const params = new URLSearchParams({ gid, uid })
  return fetchApi<Item>(`/api/items/offline?${params.toString()}`, {
    method: "POST",
  })
}

/** 上架/下架按钮可用性 */
export interface ShelfState {
  canShelve: boolean             // 上架是否可点
  canOffline: boolean            // 下架是否可点
  shelveDisabledReason?: string  // 上架禁用时的 tooltip
  offlineDisabledReason?: string // 下架禁用时的 tooltip
}

/**
 * 根据商品状态与账号状态，计算上架/下架按钮可用性。
 * 优先级：账号未启用 > 商品状态分派 > 未知兜底。
 * account.status === 1 表示账号已启用（与后端 `!= 1` 判据同源）。
 * item.status: 0=在售, -2=已下架, 1=已售出。
 */
export function getShelfState(item: Item): ShelfState {
  if (item.account.status !== 1) {
    const reason = "账号未启用，无法操作"
    return { canShelve: false, canOffline: false, shelveDisabledReason: reason, offlineDisabledReason: reason }
  }
  switch (item.status) {
    case 0: // 在售
      return { canShelve: false, canOffline: true, shelveDisabledReason: "商品在售中" }
    case -2: // 已下架
      return { canShelve: true, canOffline: false, offlineDisabledReason: "商品已下架" }
    case 1: // 已售出
      return { canShelve: true, canOffline: false, offlineDisabledReason: "商品已售出" }
    default: // 未知状态兜底
      return { canShelve: false, canOffline: false, shelveDisabledReason: "商品状态未知", offlineDisabledReason: "商品状态未知" }
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `npm run type-check`
Expected: 无错误（纯新增，`Item`/`fetchApi` 已在文件内可用）

- [ ] **Step 3: Commit**

```bash
git add lib/api/items.ts
git commit -m "feat: 新增商品上架/下架 API 与可用性工具 getShelfState"
```

---

## Task 2: shelfMutation 变更操作

**Files:**
- Modify: `hooks/useItemMutations.ts`

- [ ] **Step 1: 扩展 import**

将 `hooks/useItemMutations.ts` 第 5 行的 import 改为：

```ts
import { updateItem, refreshItems, shelvesItem, offlineItem, type Item, type ItemListResponse } from "@/lib/api/items"
```

- [ ] **Step 2: 新增 shelfMutation**

在 `updateMutation` 定义之后（约第 28 行后）追加：

```ts
  const shelfMutation = useMutation({
    mutationFn: ({ gid, uid, action }: { gid: string; uid: string; action: "shelves" | "offline" }) =>
      action === "shelves" ? shelvesItem(gid, uid) : offlineItem(gid, uid),
    onSuccess: (updated, { action }) => {
      // 就地 merge 更新所有 ["items", ...] 列表缓存（merge 而非替换，防返回字段不全丢字段）
      queryClient.setQueriesData<ItemListResponse>({ queryKey: ["items"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((it) => (it.gid === updated.gid ? { ...it, ...updated } : it)),
        }
      })
      // 后台重拉，校正状态筛选结果与统计
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: action === "shelves" ? "上架成功" : "下架成功", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "操作失败", description: e.message, variant: "error" })
    },
  })
```

- [ ] **Step 3: 导出 shelfMutation**

在 `return { ... }` 中加入 `shelfMutation`：

```ts
  return {
    updateMutation,
    shelfMutation,
    handleToggle,
    handleRefresh,
    isRefreshing,
  }
```

- [ ] **Step 4: 类型检查**

Run: `npm run type-check`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add hooks/useItemMutations.ts
git commit -m "feat: 新增 shelfMutation 处理上架/下架并即时更新缓存"
```

---

## Task 3: ShelfActions 组件

**Files:**
- Create: `components/items/parts/ShelfActions.tsx`

- [ ] **Step 1: 新建组件文件**

创建 `components/items/parts/ShelfActions.tsx`：

```tsx
"use client"

import { useState } from "react"
import { getShelfState, type Item } from "@/lib/api/items"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"

interface ShelfActionsProps {
  item: Item
  variant: "desktop" | "mobile"
  pending: boolean                 // 该行是否正在请求（锁定按钮 + 确认框 loading）
  onShelve: (item: Item) => void
  onOffline: (item: Item) => void
}

export function ShelfActions({ item, variant, pending, onShelve, onOffline }: ShelfActionsProps) {
  const [confirm, setConfirm] = useState<"shelve" | "offline" | null>(null)
  const state = getShelfState(item)

  const handleConfirm = () => {
    if (confirm === "shelve") onShelve(item)
    else if (confirm === "offline") onOffline(item)
    setConfirm(null)
  }

  // 确认框（桌面/移动共用；variant="default" 中性样式）
  const dialog = (
    <ConfirmDialog
      open={confirm !== null}
      onOpenChange={(o) => !o && setConfirm(null)}
      title={confirm === "shelve" ? "确认上架" : "确认下架"}
      description={
        confirm === "shelve"
          ? "当前功能仅支持单规格商品，且可能有未发现的异常，确认上架吗？"
          : "下架后该商品将停止售卖，确认下架吗？"
      }
      confirmLabel={confirm === "shelve" ? "上架" : "下架"}
      loading={pending}
      onConfirm={handleConfirm}
    />
  )

  if (variant === "mobile") {
    // 移动端：只渲染与当前状态相关的单个按钮
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
                ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
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
                ? "text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-800"
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

  // 桌面端：两个按钮都显示（禁用不可用者）
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={!state.canShelve || pending}
        title={state.shelveDisabledReason}
        onClick={() => setConfirm("shelve")}
        className={`text-xs ${
          state.canShelve
            ? "text-blue-600 dark:text-blue-400 hover:underline"
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
            ? "text-gray-600 dark:text-gray-300 hover:underline"
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

- [ ] **Step 2: 类型检查**

Run: `npm run type-check`
Expected: 无错误（`getShelfState`/`Item` 来自 Task 1，`ConfirmDialog` 已存在）

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/ShelfActions.tsx
git commit -m "feat: 新增 ShelfActions 上架/下架按钮组件（桌面/移动共用）"
```

---

## Task 4: 桌面端接线（透传 + 第99行渲染）

**Files:**
- Modify: `hooks/useItemsPage.ts`
- Modify: `app/dashboard/items/page.tsx`
- Modify: `components/items/ItemsTab.tsx`

> 这三个文件必须一起改，否则中间态类型检查会因缺 prop 报错。

- [ ] **Step 1: useItemsPage 透传 shelfMutation**

`hooks/useItemsPage.ts` 中，把变更操作解构（约第 42-47 行）改为包含 `shelfMutation`：

```ts
  const {
    updateMutation,
    shelfMutation,
    handleToggle,
    handleRefresh: refreshFn,
    isRefreshing,
  } = useItemMutations()
```

并在 `return { ... }` 的「变更操作」区块加入 `shelfMutation`：

```ts
    // 变更操作
    updateMutation,
    shelfMutation,
    handleToggle,
    handleRefresh,
```

- [ ] **Step 2: page.tsx 解构并传入**

`app/dashboard/items/page.tsx` 中，从 `useItemsPage()` 解构处（约第 27 行 `updateMutation,` 后）加入 `shelfMutation`：

```ts
    updateMutation,
    shelfMutation,
```

并在 `<ItemsTab ... />`（约第 83 行 `updateMutation={updateMutation}` 后）加入：

```tsx
          updateMutation={updateMutation}
          shelfMutation={shelfMutation}
```

- [ ] **Step 3: ItemsTab 接收 prop + 渲染桌面按钮**

在 `components/items/ItemsTab.tsx`：

(a) 顶部 import 加入 ShelfActions：

```ts
import { ShelfActions } from "@/components/items/parts/ShelfActions"
```

(b) `ItemsTabProps` 接口中，`updateMutation` 定义之后加入 `shelfMutation`：

```ts
  updateMutation: { mutate: (args: { gid: string; data: Record<string, unknown> }) => void }
  shelfMutation: {
    mutate: (args: { gid: string; uid: string; action: "shelves" | "offline" }) => void
    isPending: boolean
    variables?: { gid: string; uid: string; action: "shelves" | "offline" }
  }
```

(c) 函数参数解构（约第 53 行 `updateMutation,` 后）加入 `shelfMutation,`：

```ts
  updateMutation,
  shelfMutation,
```

(d) 在组件体内（约第 61 行 `mobileConfig` state 之后）加入 pending 判定 helper：

```ts
  // — 上架/下架：仅锁定当前正在请求的那一行 —
  const isShelfPending = (item: Item) =>
    shelfMutation.isPending && shelfMutation.variables?.gid === item.gid
```

(d2) 顶部 import 补充 `useState` 已有；确认 `Item` 类型已 import（文件已 `import type { Item } from "@/lib/api/items"`）。

(e) 替换 `title` 列 render 中的副信息行（当前第 94-100 行的 `<div className="flex items-center gap-1 mt-0.5 ...">...</div>`）为：

```tsx
          <div className="flex items-center gap-1.5 mt-0.5 text-gray-400 text-xs">
            <span title={item.gid} className="min-w-[85px] truncate">{item.gid}</span>
            <span className="text-gray-300">|</span>
            <span title={item.account.uid} className="truncate max-w-[80px]">{item.account.name}</span>
            <span className="text-gray-300">|</span>
            <ShelfActions
              item={item}
              variant="desktop"
              pending={isShelfPending(item)}
              onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
              onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
            />
          </div>
```

> 注意：原容器整体带 `truncate`，改为把 `truncate` 下放到 `gid` / 账号名的子 `span`，容器本身不再 truncate，避免裁掉按钮。

- [ ] **Step 4: 类型检查**

Run: `npm run type-check`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add hooks/useItemsPage.ts app/dashboard/items/page.tsx components/items/ItemsTab.tsx
git commit -m "feat: 商品桌面表格第99行接入上架/下架按钮"
```

---

## Task 5: 移动端接线

**Files:**
- Modify: `components/items/ItemsTab.tsx`（移动列表处透传回调）
- Modify: `components/items/views/MobileProductCard.tsx`

- [ ] **Step 1: ItemsTab 给 MobileProductCard 透传回调**

在 `components/items/ItemsTab.tsx` 移动端列表（当前第 335-346 行 `<MobileProductCard ... />`）中，追加三个 prop：

```tsx
              <MobileProductCard
                key={item.gid}
                item={item}
                keywordCount={itemKeywordCounts[item.gid] || 0}
                onToggle={onToggle}
                onEdit={() => setEditingItem(item)}
                onKeywordClick={() => setKeywordItem(item)}
                onConfigClick={(field) => setMobileConfig({ item, field })}
                onSendCodeChange={(gid, value) => updateMutation.mutate({ gid, data: { sendCode: value } })}
                onShelve={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "shelves" })}
                onOffline={(it) => shelfMutation.mutate({ gid: it.gid, uid: it.account.uid, action: "offline" })}
                shelfPending={isShelfPending(item)}
              />
```

- [ ] **Step 2: MobileProductCard 接收 props + 渲染移动按钮**

在 `components/items/views/MobileProductCard.tsx`：

(a) 顶部 import 加入 ShelfActions：

```ts
import { ShelfActions } from "@/components/items/parts/ShelfActions"
```

(b) `MobileProductCardProps` 接口末尾（`onSendCodeChange` 之后）加入：

```ts
  onShelve: (item: Item) => void
  onOffline: (item: Item) => void
  shelfPending: boolean
```

(c) 函数参数解构（`onSendCodeChange,` 之后）加入：

```ts
  onShelve,
  onOffline,
  shelfPending,
```

(d) 在信息栏 `<div className="px-4 pb-3 flex items-center gap-1.5 ...">`（当前第 106-118 行）的最后一个 `<span>`（发布时间）之后、该 `</div>` 之前，加入（**不加前置 `|`**，避免未知状态 `ShelfActions` 返回 null 时分隔符孤立）：

```tsx
        <ShelfActions
          item={item}
          variant="mobile"
          pending={shelfPending}
          onShelve={onShelve}
          onOffline={onOffline}
        />
```

- [ ] **Step 3: 类型检查**

Run: `npm run type-check`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add components/items/ItemsTab.tsx components/items/views/MobileProductCard.tsx
git commit -m "feat: 商品移动端卡片接入上架/下架按钮"
```

---

## Task 6: 构建校验与手动验证

**Files:** 无（仅校验）

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 无新增 error（既有 warning 可忽略）

- [ ] **Step 2: 生产构建**

Run: `npm run build`
Expected: 构建成功，`/dashboard/items` 路由正常编译

- [ ] **Step 3: 手动验证（启动 `npm run dev`，逐项核对）**

- [ ] 在售商品（status=0）：桌面「上架」置灰禁用、「下架」可点；点下架 → 弹中性确认框 → 确认后 status 变已下架，按钮可用性翻转
- [ ] 已下架商品（status=-2）：「下架」禁用、「上架」可点；点上架 → 确认框展示「当前功能仅支持单规格商品，且可能有未发现的异常」文案 → 确认后 status 变在售
- [ ] 已售出商品（status=1）：「下架」禁用、「上架」可点
- [ ] 账号未启用（account.status≠1）：两个按钮均禁用，hover 显示「账号未启用，无法操作」
- [ ] 请求进行中：按钮锁定 + 确认框 loading，无法重复点击
- [ ] 失败场景（如后端 403）：toast 显示后端 detail
- [ ] 按状态筛选（如只看「在售」）时下架某商品，后台重拉后该行从列表消失
- [ ] 移动端：只显示与当前状态相关的单个按钮，点击区适中可正常点按，行为与桌面一致

- [ ] **Step 4: 最终提交（如有未提交的格式化改动）**

```bash
git add -A
git commit -m "chore: 上架/下架功能构建校验通过"
```

---

## 自查记录（Self-Review）

- **Spec 覆盖**：接口(Task1)、可用性规则(Task1)、shelfMutation+缓存(Task2)、ShelfActions 组件(Task3)、桌面接入(Task4)、移动接入(Task5)、确认框文案(Task3)、视觉规范(Task3)、边界兜底(Task1/Task3)、手动验证(Task6) — 均有对应任务。
- **占位符扫描**：无 TBD/TODO，每个代码步骤含完整代码。
- **类型一致性**：`shelfMutation.mutate({ gid, uid, action })` 签名在 Task2 定义、Task4/Task5 调用一致；`getShelfState`/`ShelfState`/`ShelfActionsProps` 命名前后一致；`onShelve`/`onOffline`/`shelfPending` 在 ItemsTab 传入与 MobileProductCard 接收一致。
