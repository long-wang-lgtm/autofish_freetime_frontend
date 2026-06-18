# 商品管理页代码结构整理 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 1036 行 page.tsx + 5 个平铺组件文件，重构为 `config.ts` + `parts/`(6) + `views/`(2) + `drawers/`(3) + `FilterBar.tsx` 的分层结构，不改功能不增功能。

**Architecture:** 四阶段推进：① 创建纯新文件（搬运，不影响现有代码）→ ② 组装复合组件（仍不影响现有代码）→ ③ 修改 page.tsx 切换导入（改代码）→ ④ 删除已被替代的旧文件。每步 `npx tsc --noEmit` 验证。

**Tech Stack:** Next.js + React + TypeScript + Tailwind CSS v3 + react-hook-form + zod

---

## 分阶段概览

| 阶段 | 任务 | 风险 | 核心原则 |
|------|------|------|----------|
| 一：奠基 | Task 1-3（新建 7 个纯新文件） | 无 | 创建独立文件，零外部消费 |
| 二：组装 | Task 4-8（新建 3 drawer + FilterBar + ItemRow） | 无 | 依赖阶段一产物，仍未被 page.tsx 引用 |
| 三：切换 | Task 9-11（改 MobileProductCard + page.tsx） | **中** | 全量 import 替换，删内联组件 |
| 四：清理 | Task 12（删 4 个旧文件） | 低 | tsc 验证后删除 |

---

## 阶段一：奠基 — config.ts + 6 个 parts/ 文件

### Task 1: 创建 `config.ts`（纯数据，零依赖）

**Files:**
- Create: `components/items/config.ts`

- [ ] **Step 1: 写入 config.ts**

```ts
// components/items/config.ts

export type ConfigField =
  | "deliveryContent"
  | "receiptAfter"
  | "positiveReviewAfter"
  | "ai_reply_item_prompt"
  | "sendCode"

export const FIELD_LABELS: Record<ConfigField, string> = {
  deliveryContent: "付款后发货内容",
  receiptAfter: "收货后赠送内容",
  positiveReviewAfter: "评价后赠送内容",
  ai_reply_item_prompt: "AI系统提示词",
  sendCode: "指令码",
}

export const PLACEHOLDERS = [
  { label: "订单号", value: "{订单号}" },
  { label: "商品标题", value: "{商品标题}" },
  { label: "价格", value: "{价格}" },
  { label: "数量", value: "{数量}" },
  { label: "使用说明", value: "{使用说明}" },
  { label: "商家编码", value: "{商家编码}" },
  { label: "卡种/卡券方案名称", value: "{卡种/卡券方案名称}" },
  { label: "卡券信息", value: "{卡券信息}" },
  { label: "分段符", value: "{分段符}" },
  { label: "Sku属性名", value: "{Sku属性名}" },
  { label: "充值账号", value: "{充值账号}" },
  { label: "拍下时间", value: "{拍下时间}" },
  { label: "付款时间", value: "{付款时间}" },
  { label: "当前时间", value: "{当前时间}" },
  { label: "买家留言", value: "{买家留言}" },
]

export function formatPublishTime(timestamp: string | null): string {
  if (!timestamp) return "-"
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

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
npx tsc --noEmit
```

---

### Task 2: 创建 `parts/` 下 6 个文件（第 1-3 个：IconToggle, SortIcon, useSendCodeEdit）

**Files:**
- Create: `components/items/parts/IconToggle.tsx`
- Create: `components/items/parts/SortIcon.tsx`
- Create: `components/items/parts/useSendCodeEdit.ts`

- [ ] **Step 1: 写入 IconToggle.tsx**（来源：MobileProductCard.tsx:247-278）

```tsx
// components/items/parts/IconToggle.tsx

interface IconToggleProps {
  active: boolean
  activeClass: string
  disabled?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}

export function IconToggle({
  active,
  activeClass,
  disabled,
  title,
  onClick,
  children,
}: IconToggleProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
        disabled
          ? "text-gray-300 bg-gray-50 cursor-not-allowed"
          : active
          ? activeClass
          : "text-gray-400 bg-gray-50"
      }`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: 写入 SortIcon.tsx**（来源：page.tsx:35-44）

```tsx
// components/items/parts/SortIcon.tsx

interface SortIconProps {
  field: string
  sortField: string | null
  sortDirection: "asc" | "desc" | null
}

export function SortIcon({ field, sortField, sortDirection }: SortIconProps) {
  if (sortField !== field) {
    return <span className="text-gray-300">↕</span>
  }
  return sortDirection === "asc" ? (
    <span className="text-blue-600">↑</span>
  ) : (
    <span className="text-blue-600">↓</span>
  )
}
```

- [ ] **Step 3: 写入 useSendCodeEdit.ts**（提取 SendCodeCell + SendCodeRow 公共编辑逻辑）

```ts
// components/items/parts/useSendCodeEdit.ts
"use client"

import { useState, useRef, useEffect, useCallback } from "react"

export function useSendCodeEdit(
  gid: string,
  sendCode: string | null,
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim()
    const current = sendCode || ""
    if (trimmed !== current) {
      onUpdateField(gid, "sendCode", trimmed)
    }
    setEditing(false)
  }, [editValue, sendCode, gid, onUpdateField])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave()
      } else if (e.key === "Escape") {
        setEditing(false)
      }
    },
    [handleSave]
  )

  const startEdit = useCallback(() => {
    setEditValue(sendCode || "")
    setEditing(true)
  }, [sendCode])

  return { editing, editValue, setEditValue, inputRef, handleSave, handleKeyDown, startEdit }
}
```

- [ ] **Step 4: 验证编译**

```bash
npx tsc --noEmit
```

---

### Task 3: 创建 `parts/` 剩余 3 个文件（SendCodeEditor, PlaceholderPicker, RefreshButton）

**Files:**
- Create: `components/items/parts/SendCodeEditor.tsx`
- Create: `components/items/parts/PlaceholderPicker.tsx`
- Create: `components/items/parts/RefreshButton.tsx`

- [ ] **Step 1: 写入 SendCodeEditor.tsx**（合并 SendCodeCell + SendCodeRow）

```tsx
// components/items/parts/SendCodeEditor.tsx
"use client"

import { useSendCodeEdit } from "./useSendCodeEdit"

interface SendCodeEditorProps {
  gid: string
  sendCode: string | null
  variant: "cell" | "row"
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
  /** variant="row" 时用于 display 模式的 hasValue */
  hasValue?: boolean
}

export function SendCodeEditor({
  gid,
  sendCode,
  variant,
  onUpdateField,
  hasValue: propHasValue,
}: SendCodeEditorProps) {
  const { editing, editValue, setEditValue, inputRef, handleSave, handleKeyDown, startEdit } =
    useSendCodeEdit(gid, sendCode, onUpdateField)

  const actualHasValue = propHasValue ?? !!(sendCode && sendCode.trim().length > 0)

  // --- 编辑态（两种 variant 共享） ---
  if (editing) {
    if (variant === "cell") {
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full text-center text-xs px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )
    }
    // variant === "row"
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-gray-600">⌨️ 指令码</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-16 text-center text-xs px-1.5 py-1 border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    )
  }

  // --- 展示态 ---
  if (variant === "cell") {
    const hasValue = sendCode && sendCode.trim().length > 0
    return (
      <button
        onClick={startEdit}
        className={`w-full text-xs text-center hover:underline ${hasValue ? "text-gray-700" : "text-gray-400"}`}
        title="此配置仅作为买家时生效"
      >
        {hasValue ? sendCode.trim() : "-"}
      </button>
    )
  }
  // variant === "row"
  return (
    <button
      onClick={startEdit}
      title="指令码 — 仅买家时生效"
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
    >
      <span className={actualHasValue ? "text-gray-600" : "text-gray-400"}>⌨️ 指令码</span>
      <span className="flex items-center gap-1">
        <span
          className={`text-xs max-w-[100px] truncate ${
            actualHasValue ? "text-gray-700 font-mono" : "text-gray-400"
          }`}
        >
          {actualHasValue ? (sendCode || "").trim() : "未配置"}
        </span>
        {/* ChevronRight icon inline */}
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}
```

- [ ] **Step 2: 写入 PlaceholderPicker.tsx**（占位符标签列表，被所有抽屉共用）

```tsx
// components/items/parts/PlaceholderPicker.tsx
"use client"

import { PLACEHOLDERS } from "../config"

interface PlaceholderPickerProps {
  onInsert: (placeholder: string) => void
  /** PC 端启用拖拽插入，移动端仅点击 */
  draggable?: boolean
}

export function PlaceholderPicker({ onInsert, draggable = false }: PlaceholderPickerProps) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">{draggable ? "点击或拖拽占位符到文本框：" : "点击插入占位符："}</div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {PLACEHOLDERS.map((p) => (
          <button
            key={p.value}
            type="button"
            draggable={draggable}
            onDragStart={
              draggable
                ? (e) => e.dataTransfer.setData("text/plain", p.value)
                : undefined
            }
            onClick={() => onInsert(p.value)}
            className={`px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 whitespace-nowrap transition-all ${
              draggable ? "cursor-grab" : "active:scale-95"
            }`}
            title={p.value}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 写入 RefreshButton.tsx**（来源：page.tsx:46-99，纯搬运，不改 props 接口）

```tsx
// components/items/parts/RefreshButton.tsx
"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { refreshItems } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface RefreshButtonProps {
  uid?: string
  onSuccess: () => void
  onError: (msg: string) => void
}

export function RefreshButton({ uid, onSuccess, onError }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!uid) {
      onError("请先选择账号")
      return
    }
    setIsRefreshing(true)
    try {
      const result = await refreshItems(uid)
      if (result.success) {
        onSuccess()
      } else {
        onError(result.message)
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "刷新失败")
    } finally {
      setIsRefreshing(false)
    }
  }

  const disabled = !uid || isRefreshing

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={disabled}
      title={!uid ? "请先选择账号" : "从闲鱼刷新商品列表"}
      className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
        disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 text-white"
      }`}
    >
      {isRefreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
      {isRefreshing ? "刷新中..." : "刷新商品"}
    </button>
  )
}
```

- [ ] **Step 4: 验证编译**

```bash
npx tsc --noEmit
```

---

## 阶段二：组装 — 3 个 drawers + FilterBar + ItemRow（5 个新文件）

### Task 4: 创建 `drawers/ConfigDrawer.tsx`（合并 ConfigModal + MobileConfigSheet）

**Files:**
- Create: `components/items/drawers/ConfigDrawer.tsx`

- [ ] **Step 1: 写入 ConfigDrawer.tsx**

```tsx
// components/items/drawers/ConfigDrawer.tsx
"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"
import { Sheet } from "@/components/ui/Sheet"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { ConfigField, FIELD_LABELS } from "../config"
import { PlaceholderPicker } from "../parts/PlaceholderPicker"

interface ConfigDrawerProps {
  open: boolean
  item: Item
  field: ConfigField
  onClose: () => void
  onSave: (gid: string, field: ConfigField, value: string) => void
}

export function ConfigDrawer({ open, item, field, onClose, onSave }: ConfigDrawerProps) {
  const isMobile = useIsMobile()
  const [localValue, setLocalValue] = useState(item[field] || "")

  const insertPlaceholder = (value: string) => {
    setLocalValue((prev) => prev + value)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text) setLocalValue((prev) => prev + text)
  }

  const handleSave = () => {
    onSave(item.gid, field, localValue)
    onClose()
  }

  const title = FIELD_LABELS[field] || "配置"

  const content = (
    <div className="p-4 space-y-4">
      {/* 商品信息 — 内联渲染 */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500">商品:</span>
          <span className="font-medium text-gray-900 truncate">{item.title || "无标题"}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>ID: {item.gid}</span>
          <span>账号: {item.account.name}</span>
          <span>价格: ¥{item.price}</span>
        </div>
      </div>

      {/* 占位符选择器 — PC 端支持拖拽，移动端仅点击 */}
      <PlaceholderPicker onInsert={insertPlaceholder} draggable={!isMobile} />

      {/* 文本输入 */}
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onDrop={isMobile ? undefined : handleDrop}
        onDragOver={isMobile ? undefined : (e) => e.preventDefault()}
        rows={isMobile ? 5 : 6}
        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        placeholder="输入内容..."
      />
    </div>
  )

  const footer = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
        className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        取消
      </button>
      <button
        onClick={handleSave}
        className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        保存
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        subtitle={`${item.title || "无标题"} · ¥${item.price}`}
        footer={footer}
      >
        {content}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} width="480px">
      {content}
      <div className="border-t px-4 py-3">{footer}</div>
    </Sheet>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

---

### Task 5: 创建 `drawers/ItemEditDrawer.tsx`（改造 ItemForm，容器换抽屉）

**Files:**
- Create: `components/items/drawers/ItemEditDrawer.tsx`

- [ ] **Step 1: 写入 ItemEditDrawer.tsx**

```tsx
// components/items/drawers/ItemEditDrawer.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Item, ItemUpdate, updateItem } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { useQueryClient } from "@tanstack/react-query"
import { Sheet } from "@/components/ui/Sheet"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { useIsMobile } from "@/hooks/useIsMobile"

const itemSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  remark: z.string().optional(),
  auto_reply: z.boolean().optional(),
  auto_ai_reply: z.boolean().optional(),
  auto_delivery: z.boolean().optional(),
  deliveryType: z.string().optional(),
  deliveryContent: z.string().optional(),
  receiptAfter: z.string().optional(),
  positiveReviewAfter: z.string().optional(),
  default_reply_content: z.string().optional(),
  ai_reply_item_prompt: z.string().optional(),
})

type FormData = z.infer<typeof itemSchema>

interface ItemEditDrawerProps {
  item: Item
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ItemEditDrawer({ item, open, onClose, onSuccess }: ItemEditDrawerProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [showDeliveryConfig, setShowDeliveryConfig] = useState(false)
  const [showAiConfig, setShowAiConfig] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: item.title || "",
      description: item.description || "",
      remark: item.remark || "",
      auto_reply: item.auto_reply || false,
      auto_ai_reply: item.auto_ai_reply || false,
      auto_delivery: item.auto_delivery || false,
      deliveryType: item.deliveryType || "无卡",
      deliveryContent: item.deliveryContent || "",
      receiptAfter: item.receiptAfter || "",
      positiveReviewAfter: item.positiveReviewAfter || "",
      default_reply_content: item.default_reply_content || "",
      ai_reply_item_prompt: item.ai_reply_item_prompt || "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const updateData: ItemUpdate = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.remark !== undefined) updateData.remark = data.remark
      if (data.auto_reply !== undefined) updateData.auto_reply = data.auto_reply
      if (data.auto_ai_reply !== undefined) updateData.auto_ai_reply = data.auto_ai_reply
      if (data.auto_delivery !== undefined) updateData.auto_delivery = data.auto_delivery
      if (data.deliveryType !== undefined) updateData.deliveryType = data.deliveryType
      if (data.deliveryContent !== undefined) updateData.deliveryContent = data.deliveryContent
      if (data.receiptAfter !== undefined) updateData.receiptAfter = data.receiptAfter
      if (data.positiveReviewAfter !== undefined) updateData.positiveReviewAfter = data.positiveReviewAfter
      if (data.default_reply_content !== undefined) updateData.default_reply_content = data.default_reply_content
      if (data.ai_reply_item_prompt !== undefined) updateData.ai_reply_item_prompt = data.ai_reply_item_prompt

      await updateItem(item.gid, updateData)
      addToast({ title: "更新成功", description: `商品 ${data.title || item.gid} 已更新` })
      queryClient.invalidateQueries({ queryKey: ["items"] })
      onSuccess()
    } catch (e) {
      addToast({ title: "更新失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 表单内容（与 ItemForm 完全一致，不改逻辑）
  const formContent = (
    <form className="p-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* 商品信息 — 只读 */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">商品ID:</span>
            <span className="ml-2 font-mono">{item.gid}</span>
          </div>
          <div>
            <span className="text-gray-500">账号ID:</span>
            <span className="ml-2">{item.account.uid}</span>
          </div>
          <div>
            <span className="text-gray-500">价格:</span>
            <span className="ml-2 text-orange-600 font-medium">¥{item.price}</span>
          </div>
          <div>
            <span className="text-gray-500">状态:</span>
            <span className="ml-2">
              {item.status === 0 ? "在售" : item.status === 1 ? "已下架" : "已售出"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品标题</label>
          <input
            {...register("title")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="商品标题"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <input
            {...register("remark")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="可选备注信息"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
        <textarea
          {...register("description")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="商品描述"
        />
      </div>

      {/* 自动功能配置 */}
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-900 mb-3">自动功能配置</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("auto_reply")}
              id="auto_reply"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto_reply" className="text-sm text-gray-700">启用自动回复</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("auto_ai_reply")}
              id="auto_ai_reply"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto_ai_reply" className="text-sm text-gray-700">使用AI自动回复</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("auto_delivery")}
              id="auto_delivery"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto_delivery" className="text-sm text-gray-700">启用自动发货</label>
          </div>
        </div>
      </div>

      {/* 默认回复内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">默认回复内容</label>
        <textarea
          {...register("default_reply_content")}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="未匹配关键词时的默认回复"
        />
      </div>

      {/* AI 配置 — 可折叠 */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAiConfig(!showAiConfig)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-medium text-gray-900">AI回复配置</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showAiConfig ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAiConfig && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品提示词</label>
              <textarea
                {...register("ai_reply_item_prompt")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="AI回复的商品相关提示词"
              />
            </div>
          </div>
        )}
      </div>

      {/* 发货配置 — 可折叠 */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowDeliveryConfig(!showDeliveryConfig)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-medium text-gray-900">发货配置</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showDeliveryConfig ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDeliveryConfig && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发货方式</label>
              <select
                {...register("deliveryType")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="无卡">无卡</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                发货内容（按{"{分段符}"}拆分，每条一条）
              </label>
              <textarea
                {...register("deliveryContent")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="例如: 亲，宝贝已发出哦~{分段符}请注意查收~"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">收货后赠送内容</label>
              <textarea
                {...register("receiptAfter")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="买家确认收货后自动发送"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">好评后赠送内容</label>
              <textarea
                {...register("positiveReviewAfter")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="买家好评后自动发送"
              />
            </div>
          </div>
        )}
      </div>
    </form>
  )

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        取消
      </button>
      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={loading}
        className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <LoadingSpinner size="sm" />}
        保存
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title="编辑商品"
        subtitle={item.title || item.gid}
        footer={footer}
        heightRatio={0.95}
      >
        {formContent}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="编辑商品" width="640px">
      {formContent}
      <div className="border-t px-4 py-3">{footer}</div>
    </Sheet>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

---

### Task 6: 创建 `drawers/KeywordDrawer.tsx`（改造 ItemKeywordModal，容器换抽屉 + PLACEHOLDERS 改用 config.ts + 商品选择器内联）

**Files:**
- Create: `components/items/drawers/KeywordDrawer.tsx`

- [ ] **Step 1: 写入 KeywordDrawer.tsx**

```tsx
// components/items/drawers/KeywordDrawer.tsx
"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  KeywordRule,
  KeywordRuleCreate,
  KeywordRuleUpdate,
  createKeywordRule,
  updateKeywordRule,
  deleteKeywordRule,
  linkItemToRule,
  PREDEFINED_KEYWORDS,
  getRulesForItem,
} from "@/lib/api/keywords"
import { listItems, Item } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet } from "@/components/ui/Sheet"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { PLACEHOLDERS } from "../config"
import { PlaceholderPicker } from "../parts/PlaceholderPicker"

const makeItemCardPlaceholder = (itemId: string) => `[ITEM:${itemId}]`

const ruleSchema = z.object({
  reply_type: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  reply_content: z.string().min(1, "回复内容不能为空"),
  match_type: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
})

type FormData = z.infer<typeof ruleSchema>

interface KeywordDrawerProps {
  item: Item
  open: boolean
  onClose: () => void
}

export function KeywordDrawer({ item, open, onClose }: KeywordDrawerProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [itemPickerSearch, setItemPickerSearch] = useState("")
  const [showItemPicker, setShowItemPicker] = useState(false)

  // 获取当前商品关联的规则
  const { data: linkedRulesData, isLoading: linkedLoading } = useQuery({
    queryKey: ["keywords", "item", item.gid],
    queryFn: () => getRulesForItem(item.gid),
  })

  // 获取全店商品列表（用于插入商品卡片）
  const { data: allItemsData } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems(),
  })

  // 商品选择器过滤
  const filteredPickerItems = useMemo(() => {
    if (!allItemsData) return []
    if (!itemPickerSearch.trim()) return allItemsData
    const search = itemPickerSearch.toLowerCase()
    return allItemsData.filter(
      (i) =>
        i.gid.toLowerCase().includes(search) ||
        (i.title && i.title.toLowerCase().includes(search)) ||
        (i.description && i.description.toLowerCase().includes(search))
    )
  }, [allItemsData, itemPickerSearch])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      reply_type: "custom",
      keyword: "",
      reply_content: "",
      match_type: "exact",
      priority: 0,
      enabled: true,
    },
  })

  const replyType = watch("reply_type")
  const replyContent = watch("reply_content")

  // 插入占位符
  const insertPlaceholder = useCallback((placeholder: string) => {
    const currentValue = replyContent || ""
    const newValue = currentValue + placeholder
    setValue("reply_content", newValue, { shouldValidate: true })
  }, [replyContent, setValue])

  // 插入商品卡片
  const insertItemCard = useCallback((itemId: string) => {
    const placeholder = makeItemCardPlaceholder(itemId)
    const currentValue = replyContent || ""
    const newValue = currentValue + placeholder
    setValue("reply_content", newValue, { shouldValidate: true })
    setShowItemPicker(false)
    setItemPickerSearch("")
  }, [replyContent, setValue])

  // 处理拖拽到回复内容
  const handleReplyContentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text && text.startsWith("[ITEM:")) {
      const currentValue = replyContent || ""
      setValue("reply_content", currentValue + text, { shouldValidate: true })
    }
  }, [replyContent, setValue])

  // 开始创建新规则
  const handleCreateNew = () => {
    setEditingRule(null)
    reset({ reply_type: "custom", keyword: "", reply_content: "", match_type: "exact", priority: 0, enabled: true })
    setShowCreateForm(true)
  }

  // 开始编辑规则
  const handleEditRule = (rule: KeywordRule) => {
    setEditingRule(rule)
    reset({
      reply_type: rule.reply_type,
      keyword: rule.keyword,
      reply_content: rule.reply_content,
      match_type: rule.match_type,
      priority: rule.priority,
      enabled: rule.enabled,
    })
    setShowCreateForm(true)
  }

  // 删除规则
  const handleDeleteRule = async (rule: KeywordRule) => {
    if (!confirm(`确定要删除规则"${rule.keyword}"吗？`)) return
    setLoading(true)
    try {
      await deleteKeywordRule(rule.rule_id)
      addToast({ title: "已删除", description: "规则已删除" })
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
    } catch (e) {
      addToast({ title: "删除失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 保存规则
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        const updateData: KeywordRuleUpdate = {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        }
        await updateKeywordRule(editingRule.rule_id, updateData)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const createData: KeywordRuleCreate = {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        }
        const savedRule = await createKeywordRule(createData)
        await linkItemToRule(savedRule.rule_id, item.gid)
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
      setShowCreateForm(false)
      setEditingRule(null)
    } catch (e) {
      addToast({ title: editingRule ? "更新失败" : "创建失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const getDisplayKeyword = (rule: KeywordRule) => {
    if (rule.reply_type === "predefined") {
      return PREDEFINED_KEYWORDS.find((k) => k.value === rule.keyword)?.label || rule.keyword
    }
    return rule.keyword
  }

  // ==== 商品选择器面板（内联，非嵌套弹窗）====
  const itemPickerPanel = showItemPicker && (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">插入商品卡片</span>
        <button
          type="button"
          onClick={() => { setShowItemPicker(false); setItemPickerSearch("") }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          收起
        </button>
      </div>
      <input
        type="text"
        value={itemPickerSearch}
        onChange={(e) => setItemPickerSearch(e.target.value)}
        placeholder="搜索商品..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        autoFocus
      />
      <div className="max-h-48 overflow-y-auto space-y-1.5">
        {filteredPickerItems.length > 0 ? (
          filteredPickerItems.map((i) => (
            <button
              key={i.gid}
              type="button"
              onClick={() => insertItemCard(i.gid)}
              className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-orange-300 transition-colors bg-white"
            >
              <div className="font-medium text-gray-900 truncate text-sm">{i.title || "无标题"}</div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>ID: {i.gid.slice(0, 12)}...</span>
                <span>¥{i.price}</span>
              </div>
            </button>
          ))
        ) : (
          <p className="text-center text-gray-400 py-4 text-sm">
            {itemPickerSearch ? "未找到匹配的商品" : "暂无可选的商品"}
          </p>
        )}
      </div>
    </div>
  )

  // ==== 规则列表视图 ====
  const ruleListView = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">已关联 {linkedRulesData?.total || 0} 个规则</div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + 创建新规则
        </button>
      </div>

      {linkedLoading ? (
        <div className="flex items-center justify-center py-8"><LoadingSpinner size="md" /></div>
      ) : linkedRulesData?.rules && linkedRulesData.rules.length > 0 ? (
        <div className="space-y-2">
          {linkedRulesData.rules.map((rule) => (
            <div key={rule.rule_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${rule.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {rule.enabled ? "启用" : "禁用"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{getDisplayKeyword(rule)}</span>
                    <span className="text-xs text-gray-400">{rule.reply_type === "predefined" ? "预定义" : rule.match_type}</span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">{rule.reply_content || "(无回复内容)"}</div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleEditRule(rule)} className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors">编辑</button>
                  <button onClick={() => handleDeleteRule(rule)} disabled={loading} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>暂无关联的关键词规则</p>
          <p className="text-xs mt-1">点击上方按钮创建新规则</p>
        </div>
      )}
    </div>
  )

  // ==== 创建/编辑规则表单 ====
  const ruleFormView = (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">{editingRule ? "编辑规则" : "创建新规则"}</h3>
        <button type="button" onClick={() => { setShowCreateForm(false); setEditingRule(null) }} className="text-xs text-gray-500 hover:text-gray-700">返回列表</button>
      </div>

      {/* 回复类型 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">回复类型</label>
        <select {...register("reply_type")} className="w-full px-3 py-2 border border-gray-300 rounded-md">
          <option value="custom">自定义关键词</option>
          <option value="predefined">预定义关键词</option>
        </select>
      </div>

      {/* 关键词 */}
      {replyType === "predefined" ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">预定义关键词</label>
          <select {...register("keyword")} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            {PREDEFINED_KEYWORDS.map((kw) => (
              <option key={kw.value} value={kw.value}>{kw.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
            <input {...register("keyword")} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="例如: 多少钱 / 价格" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">匹配类型</label>
            <select {...register("match_type")} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="exact">精确匹配</option>
              <option value="fuzzy">模糊匹配</option>
              <option value="regex">正则匹配</option>
            </select>
          </div>
        </div>
      )}

      {/* 优先级 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
        <input type="number" {...register("priority", { valueAsNumber: true })} className="w-32 px-3 py-2 border border-gray-300 rounded-md" />
        <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
      </div>

      {/* 回复内容 + 占位符 + 商品卡片选择器 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">回复内容 <span className="text-red-500">*</span></label>
          <button type="button" onClick={() => setShowItemPicker(!showItemPicker)} className="text-xs text-orange-600 hover:text-orange-800 font-medium">
            {showItemPicker ? "收起商品选择" : "+ 插入商品卡片"}
          </button>
        </div>

        {/* 占位符工具栏 */}
        <PlaceholderPicker onInsert={insertPlaceholder} draggable={!isMobile} />

        <div className="mt-2">
          <textarea
            {...register("reply_content")}
            rows={4}
            onDrop={handleReplyContentDrop}
            onDragOver={(e) => e.preventDefault()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
            placeholder="当消息匹配时，自动发送此回复内容"
          />
          {errors.reply_content && <p className="mt-1 text-xs text-red-500">{errors.reply_content.message}</p>}
          <p className="mt-1 text-xs text-gray-400">占位符格式：{"{占位符名称}"}，商品卡片格式：[ITEM:商品ID]</p>
        </div>

        {/* 内联商品选择器面板 */}
        {itemPickerPanel}
      </div>

      {/* 启用开关 */}
      <div className="flex items-center gap-2 mb-4">
        <input type="checkbox" {...register("enabled")} id="enabled_drawer" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
        <label htmlFor="enabled_drawer" className="text-sm text-gray-700">启用此规则</label>
      </div>

      {/* 关联商品提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-xs text-blue-700">
          <span className="font-medium">关联商品：</span>
          {item.title || "无标题"} (¥{item.price})
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => { setShowCreateForm(false); setEditingRule(null) }} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">取消</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2">
          {loading && <LoadingSpinner size="sm" />}
          {editingRule ? "保存" : "创建"}
        </button>
      </div>
    </form>
  )

  const title = "关键词回复"
  const subtitle = `为商品「${item.title || item.gid.slice(0, 10)}...」配置关键词自动回复`

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle} heightRatio={0.95}>
        <div className="flex-1 overflow-y-auto">
          {!showCreateForm ? ruleListView : ruleFormView}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} width="560px">
      <div className="flex-1 overflow-y-auto">
        {!showCreateForm ? ruleListView : ruleFormView}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

---

### Task 7: 创建 `FilterBar.tsx`（合并桌面筛选栏 + MobileFilterBar）

**Files:**
- Create: `components/items/FilterBar.tsx`

- [ ] **Step 1: 写入 FilterBar.tsx**

```tsx
// components/items/FilterBar.tsx
"use client"

import { useState } from "react"
import { SlidersHorizontal, X, RefreshCw } from "lucide-react"
import { AccountName } from "@/lib/api/accounts"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useIsMobile } from "@/hooks/useIsMobile"

interface FilterBarProps {
  accounts: AccountName[]
  searchInput: { uid: string; title: string; gid: string }
  statusFilter: number | undefined
  onSearchChange: (updater: (prev: { uid: string; title: string; gid: string }) => {
    uid: string; title: string; gid: string
  }) => void
  onStatusChange: (status: number | undefined) => void
  onRefresh: () => void
  onClear: () => void
  isRefreshing: boolean
  selectedUid?: string
  stats: { total: number; onSale: number; offSale: number; sold: number }
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onSortChange: (field: "title" | "price" | "publishTime" | "status") => void
}

export function FilterBar(props: FilterBarProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <FilterBarMobile {...props} />
  }
  return <FilterBarDesktop {...props} />
}

// ========== 桌面端 ==========

function FilterBarDesktop({
  accounts,
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClear,
  isRefreshing,
  selectedUid,
}: FilterBarProps) {
  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-end gap-3 flex-wrap">
        {/* 账号下拉框 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">账号</label>
          <select
            value={searchInput.uid}
            onChange={(e) => onSearchChange((prev) => ({ ...prev, uid: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">全部账号</option>
            {accounts.map((acc) => (
              <option key={acc.uid} value={acc.uid}>{acc.name}</option>
            ))}
          </select>
        </div>
        {/* 商品ID */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">商品ID</label>
          <input
            type="text"
            value={searchInput.gid}
            onChange={(e) => onSearchChange((prev) => ({ ...prev, gid: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="输入商品ID"
          />
        </div>
        {/* 商品标题 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-500 mb-1">商品标题</label>
          <input
            type="text"
            value={searchInput.title}
            onChange={(e) => onSearchChange((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="输入商品标题"
          />
        </div>
        {/* 状态下拉框 */}
        <div className="w-32">
          <label className="block text-xs text-gray-500 mb-1">商品状态</label>
          <select
            value={statusFilter ?? ""}
            onChange={(e) => onStatusChange(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          >
            <option value="">全部</option>
            <option value="0">在售</option>
            <option value="-2">已下架</option>
            <option value="1">已售出</option>
          </select>
        </div>
        {/* 刷新按钮 */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={!selectedUid || isRefreshing}
          title={!selectedUid ? "请先选择账号" : "从闲鱼刷新商品列表"}
          className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
            !selectedUid || isRefreshing
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isRefreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
          {isRefreshing ? "刷新中..." : "刷新商品"}
        </button>
        {/* 清空按钮 */}
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md"
        >
          清空筛选
        </button>
      </div>
    </div>
  )
}

// ========== 移动端（来源：MobileFilterBar.tsx，逻辑完全保留） ==========

function FilterBarMobile({
  accounts,
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onClear,
  isRefreshing,
  selectedUid,
  stats,
  sortField,
  sortDirection,
  onSortChange,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const hiddenFilterCount = (searchInput.title ? 1 : 0) + (searchInput.gid ? 1 : 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 顶部栏：账号 + 状态 + 更多筛选 + 刷新 */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <select
          value={searchInput.uid}
          onChange={(e) => onSearchChange((prev) => ({ ...prev, uid: e.target.value }))}
          className="flex-1 min-w-0 px-2.5 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 truncate"
        >
          <option value="">全部账号</option>
          {accounts.map((acc) => (
            <option key={acc.uid} value={acc.uid}>{acc.name}</option>
          ))}
        </select>

        <select
          value={statusFilter ?? ""}
          onChange={(e) => onStatusChange(e.target.value ? Number(e.target.value) : undefined)}
          className="w-20 px-2 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-shrink-0"
        >
          <option value="">全部</option>
          <option value="0">在售</option>
          <option value="-2">已下架</option>
          <option value="1">已售出</option>
        </select>

        <button
          onClick={() => setExpanded(!expanded)}
          className={`relative flex-shrink-0 p-2 rounded-lg border transition-colors ${
            expanded || hiddenFilterCount > 0
              ? "bg-blue-50 border-blue-200 text-blue-600"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hiddenFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center">
              {hiddenFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={onRefresh}
          disabled={!selectedUid || isRefreshing}
          title={!selectedUid ? "请先选择账号" : "从闲鱼刷新商品列表"}
          className={`flex-shrink-0 p-2 rounded-lg border transition-colors ${
            !selectedUid || isRefreshing
              ? "bg-gray-50 border-gray-200 text-gray-400"
              : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
          }`}
        >
          {isRefreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* 统计条 + 排序 */}
      <div className="flex items-center gap-3 px-3 pb-2 text-xs text-gray-500">
        <span>共 <span className="font-semibold text-gray-900">{stats.total}</span> 件</span>
        <span className="text-gray-300">|</span>
        <span>在售 <span className="font-medium text-green-600">{stats.onSale}</span></span>
        <span className="text-gray-300">|</span>
        <span>已下架 <span className="font-medium text-gray-500">{stats.offSale}</span></span>
        <span className="text-gray-300">|</span>
        <span>已售出 <span className="font-medium text-red-500">{stats.sold}</span></span>

        <div className="ml-auto flex items-center gap-1">
          <SortChip label="标题" field="title" sortField={sortField} sortDirection={sortDirection} onClick={() => onSortChange("title")} />
          <SortChip label="价格" field="price" sortField={sortField} sortDirection={sortDirection} onClick={() => onSortChange("price")} />
          <SortChip label="时间" field="publishTime" sortField={sortField} sortDirection={sortDirection} onClick={() => onSortChange("publishTime")} />
        </div>
      </div>

      {/* 展开的筛选面板 */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">商品标题</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInput.title}
                  onChange={(e) => onSearchChange((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="搜索标题..."
                  className="w-full pl-2.5 pr-6 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {searchInput.title && (
                  <button
                    onClick={() => onSearchChange((prev) => ({ ...prev, title: "" }))}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">商品ID</label>
              <input
                type="text"
                value={searchInput.gid}
                onChange={(e) => onSearchChange((prev) => ({ ...prev, gid: e.target.value }))}
                placeholder="输入ID"
                className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
          {hiddenFilterCount > 0 && (
            <button
              onClick={() => { onClear(); setExpanded(false) }}
              className="w-full py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              清空全部筛选
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** 排序标签（MobileFilterBar 内部组件，保留在 FilterBar 内） */
function SortChip({
  label,
  field,
  sortField,
  sortDirection,
  onClick,
}: {
  label: string
  field: string
  sortField: string | null
  sortDirection: "asc" | "desc" | null
  onClick: () => void
}) {
  const isActive = sortField === field
  return (
    <button
      onClick={onClick}
      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
        isActive ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
      {isActive && (sortDirection === "asc" ? "↑" : "↓")}
    </button>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

---

### Task 8: 创建 `views/ItemRow.tsx`（提取桌面端表格行 + 内联 ConfigCell）

**Files:**
- Create: `components/items/views/ItemRow.tsx`

- [ ] **Step 1: 写入 ItemRow.tsx**

```tsx
// components/items/views/ItemRow.tsx
"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"
import { Bot, Truck, Upload } from "lucide-react"
import { ConfigField, formatPublishTime } from "../config"
import { IconToggle } from "../parts/IconToggle"
import { SendCodeEditor } from "../parts/SendCodeEditor"
import { ConfigDrawer } from "../drawers/ConfigDrawer"

interface ItemRowProps {
  item: Item
  isEven: boolean
  onToggle: (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => void
  onEdit: () => void
  onKeywordClick: () => void
  keywordCount: number
  onUpdateField: (gid: string, field: ConfigField, value: string) => void
}

export function ItemRow({
  item,
  isEven,
  onToggle,
  onEdit,
  onKeywordClick,
  keywordCount,
  onUpdateField,
}: ItemRowProps) {
  const [configField, setConfigField] = useState<ConfigField | null>(null)

  return (
    <>
      <div
        className={`grid gap-2 px-4 py-2 items-center text-xs border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
          isEven ? "bg-white" : "bg-gray-50/30"
        }`}
        style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
      >
        {/* 商品信息 */}
        <div className="col-span-2 min-w-0">
          <button
            onClick={onEdit}
            className="text-left hover:text-blue-600 hover:underline truncate block w-full"
            title={item.title || "无标题"}
          >
            {item.title || "无标题"}
          </button>
          <div className="flex items-center gap-1 mt-0.5 text-gray-400 truncate text-[11px]">
            <span title={item.gid} className="min-w-[85px]">{item.gid}</span>
            <span className="text-gray-300">|</span>
            <span title={item.account.uid} className="truncate">{item.account.name}</span>
          </div>
        </div>

        {/* 价格 */}
        <div className="col-span-1 text-right">
          <span className="text-orange-600 font-semibold">¥{item.price}</span>
        </div>

        {/* 发布时间 */}
        <div className="col-span-1 text-center text-[11px] text-gray-500">
          {formatPublishTime(item.publishTime)}
        </div>

        {/* 浏览/想要/收藏 */}
        <div className="col-span-1 text-center text-[11px] leading-tight">
          <div>{item.lookCount} / <span className="text-red-400">{item.wantCount}</span> / {item.collectCount}</div>
          <div className="text-gray-400">
            {item.collectCount > 0 ? (item.wantCount / item.collectCount).toFixed(1) : "-"}
          </div>
        </div>

        {/* auto_reply 列已被移除（之前已注释掉），此处不渲染 */}

        {/* AI回复开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <IconToggle
            active={item.auto_ai_reply}
            activeClass="text-purple-500 bg-purple-50"
            title={item.auto_ai_reply ? "AI回复：开" : "AI回复：关"}
            onClick={() => onToggle(item, "auto_ai_reply")}
          >
            <Bot className="w-4 h-4" />
          </IconToggle>
        </div>

        {/* 自动发货开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <IconToggle
            active={item.auto_delivery}
            activeClass="text-green-500 bg-green-50"
            title={item.auto_delivery ? "自动发货：开" : "自动发货：关"}
            onClick={() => onToggle(item, "auto_delivery")}
          >
            <Truck className="w-4 h-4" />
          </IconToggle>
        </div>

        {/* 付款后发货 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.deliveryContent}
            onClick={() => setConfigField("deliveryContent")}
          />
        </div>

        {/* 收货后 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.receiptAfter}
            onClick={() => setConfigField("receiptAfter")}
          />
        </div>

        {/* 评价后 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.positiveReviewAfter}
            onClick={() => setConfigField("positiveReviewAfter")}
          />
        </div>

        {/* 关键词回复 */}
        <div className="col-span-1 text-center">
          <button
            onClick={onKeywordClick}
            className={`text-xs hover:underline ${keywordCount > 0 ? "text-orange-600" : "text-gray-400"}`}
            title="关键词回复"
          >
            {keywordCount > 0 ? `${keywordCount}条规则` : "未配置"}
          </button>
        </div>

        {/* AI提示词 */}
        <div className="col-span-1 text-center">
          <ConfigCell
            value={item.ai_reply_item_prompt}
            onClick={() => setConfigField("ai_reply_item_prompt")}
          />
        </div>

        {/* 自动上架 */}
        <div className="col-span-1 flex items-center justify-center">
          <IconToggle
            active={item.auto_restock}
            activeClass="text-teal-500 bg-teal-50"
            disabled={item.account.isPro && !item.auto_restock}
            title={
              item.account.isPro && !item.auto_restock
                ? "Pro账号无法开启自动上架"
                : item.auto_restock
                ? "自动上架：开"
                : "自动上架：关"
            }
            onClick={() => {
              if (item.account.isPro && !item.auto_restock) return
              onToggle(item, "auto_restock")
            }}
          >
            <Upload className="w-4 h-4" />
          </IconToggle>
        </div>

        {/* 指令码 */}
        <div className="col-span-1 text-center">
          <SendCodeEditor
            gid={item.gid}
            sendCode={item.sendCode}
            variant="cell"
            onUpdateField={onUpdateField}
          />
        </div>
      </div>

      {/* 配置抽屉 */}
      {configField && (
        <ConfigDrawer
          open={!!configField}
          item={item}
          field={configField}
          onClose={() => setConfigField(null)}
          onSave={(gid, field, value) => {
            onUpdateField(gid, field, value)
            setConfigField(null)
          }}
        />
      )}
    </>
  )
}

// ====== 内部组件：ConfigCell（仅 ItemRow 使用） ======

function ConfigCell({ value, onClick }: { value: string; onClick: () => void }) {
  const hasValue = value && value.trim().length > 0
  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[2.5rem] max-h-[2.5rem] text-xs px-1 flex items-center justify-center text-center hover:underline ${
        hasValue ? "text-blue-600" : "text-gray-400"
      }`}
      title={value || "点击配置"}
    >
      {hasValue ? (
        <span className="text-center">闲鱼消息<br />无需物流发货</span>
      ) : (
        "未配置"
      )}
    </button>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

---

## 阶段三：切换 — 修改现有文件

### Task 9: 修改 `MobileProductCard.tsx` → 移动 + 用新导入

**Files:**
- Modify: `components/items/MobileProductCard.tsx` (最终移到 `views/`，先原地修改)

> 注意：文件路径不变（暂不移动），仅替换 import 来源 + 删除内部重复定义。

- [ ] **Step 1: 替换 import + 删除重复定义**

在 `components/items/MobileProductCard.tsx` 中做以下修改：

**删除** 第 1-8 行（顶部）：
```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Item } from "@/lib/api/items"
import { Bot, Truck, Upload, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"

type ConfigField = "deliveryContent" | "receiptAfter" | "positiveReviewAfter" | "ai_reply_item_prompt"

function formatPublishTime(timestamp: string | null): string {
  if (!timestamp) return "-"
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusLabel(status: number): { text: string; color: string } {
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

**替换为**：
```tsx
"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"
import { Bot, Truck, Upload, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { ConfigField, formatPublishTime, statusLabel } from "./config"
import { IconToggle } from "./parts/IconToggle"
import { SendCodeEditor } from "./parts/SendCodeEditor"
```

**删除** 第 247-278 行的 `IconToggle` 函数（整个函数定义）。

**删除** 第 317-386 行的 `SendCodeRow` 函数（整个函数定义）。

**修改** 第 88-125 行的 IconToggle 调用：
- `activeClass` prop → 保持不变（已匹配新接口）
- 确认 props 匹配 `parts/IconToggle` 接口（children 作为内容传入）

**修改** 第 164-170 行和第 220-226 行的 SendCodeRow 调用，替换为：
```tsx
<SendCodeEditor
  key={cfg.key}
  gid={item.gid}
  sendCode={item.sendCode}
  variant="row"
  hasValue={cfg.hasValue}
  onUpdateField={onSendCodeChange}
/>
```

**修改** `MobileProductCardProps` 接口：`onConfigClick` 的 field 类型从本地 `ConfigField` 改为从 `./config` 导入。

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

---

### Task 10: 修改 `page.tsx` — 全量 import 替换

**Files:**
- Modify: `app/dashboard/items/page.tsx`

> ⚠️ 核心风险步骤。保持 SQL/API/状态管理逻辑完全不动，仅替换 import 和组件引用。

- [ ] **Step 1: 重写 page.tsx**

```tsx
"use client"

import { useState, useCallback, useMemo, useEffect, Suspense } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listItems, Item, ItemFilters, updateItem } from "@/lib/api/items"
import { getAccountNames, AccountName } from "@/lib/api/accounts"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { listKeywordRules, KeywordRule } from "@/lib/api/keywords"
import { useDebounce } from "@/hooks/useDebounce"
import { useTabRouting } from "@/hooks/useTabRouting"
import { useIsMobile } from "@/hooks/useIsMobile"
import { TabBar } from "@/components/ui/Tab"
import { RuleTable } from "@/components/rules/RuleTable"
import { RuleForm } from "@/components/rules/RuleForm"

// 新导入 — 替换旧的内联组件和独立文件
import { ConfigField } from "@/components/items/config"
import { ItemRow } from "@/components/items/views/ItemRow"
import { MobileProductCard } from "@/components/items/views/MobileProductCard"
import { ConfigDrawer } from "@/components/items/drawers/ConfigDrawer"
import { ItemEditDrawer } from "@/components/items/drawers/ItemEditDrawer"
import { KeywordDrawer } from "@/components/items/drawers/KeywordDrawer"
import { FilterBar } from "@/components/items/FilterBar"

function ItemsPageContent() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [keywordItem, setKeywordItem] = useState<Item | null>(null)
  const [activeTab, setActiveTab] = useTabRouting(['items', 'rules'] as const, 'items')

  // 移动端配置编辑状态
  const [mobileConfig, setMobileConfig] = useState<{
    item: Item
    field: ConfigField
  } | null>(null)

  // 关键词规则状态
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [filters, setFilters] = useState<ItemFilters>({ status: 0 })

  // 账号列表查询
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccountNames,
  })

  // 搜索输入状态（用于 debounce）
  const [searchInput, setSearchInput] = useState({ uid: "", title: "", gid: "" })

  // Debounced filters
  const debouncedFilters = useDebounce(searchInput, 400)

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      uid: debouncedFilters.uid || undefined,
      title: debouncedFilters.title || undefined,
      gid: debouncedFilters.gid || undefined,
    }))
  }, [debouncedFilters])

  const { data, isLoading, error } = useQuery({
    queryKey: ["items", filters],
    queryFn: () => listItems(filters),
    refetchInterval: 30000,
  })

  const { data: keywordsData, isLoading: keywordsLoading, error: keywordsError } = useQuery({
    queryKey: ["keywords"],
    queryFn: listKeywordRules,
  })

  const itemKeywordCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (keywordsData?.rules) {
      for (const rule of keywordsData.rules) {
        for (const item of rule.linked_item_list) {
          counts[item.item_id] = (counts[item.item_id] || 0) + 1
        }
      }
    }
    return counts
  }, [keywordsData])

  const rulesStats = useMemo(() => {
    if (!keywordsData?.rules) return { total: 0, enabled: 0, disabled: 0, linkedItems: 0, linkedGroups: 0 }
    return {
      total: keywordsData.rules.length,
      enabled: keywordsData.rules.filter((r) => r.enabled).length,
      disabled: keywordsData.rules.filter((r) => !r.enabled).length,
      linkedItems: keywordsData.rules.reduce((sum, r) => sum + r.linked_items, 0),
      linkedGroups: keywordsData.rules.reduce((sum, r) => sum + r.linked_groups, 0),
    }
  }, [keywordsData])

  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Parameters<typeof updateItem>[1] }) =>
      updateItem(gid, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["items"] }) },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  const handleToggle = (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => {
    updateMutation.mutate({ gid: item.gid, data: { [field]: !item[field] } })
  }

  const handleClearFilters = () => {
    setSearchInput({ uid: "", title: "", gid: "" })
    setFilters({ status: 0 })
  }

  // 排序状态
  const [sortField, setSortField] = useState<"title" | "price" | "publishTime" | "status" | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)

  const handleSort = (field: "title" | "price" | "publishTime" | "status") => {
    if (sortField !== field) { setSortField(field); setSortDirection("asc") }
    else if (sortDirection === "asc") { setSortDirection("desc") }
    else { setSortField(null); setSortDirection(null) }
  }

  // 排序后的数据
  const sortedItems = useMemo(() => {
    if (!sortField || !sortDirection || !data) return data || []
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]
      if (sortField === "publishTime") { aVal = aVal ? Number(aVal) : 0; bVal = bVal ? Number(bVal) : 0 }
      else if (sortField === "price") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0 }
      else if (sortField === "status") { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0 }
      else { aVal = String(aVal || ""); bVal = String(bVal || "") }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [data, sortField, sortDirection])

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (!filters.uid) { addToast({ title: "刷新失败", description: "请先选择账号", variant: "error" }); return }
    setIsRefreshing(true)
    try {
      const { refreshItems } = await import("@/lib/api/items")
      const result = await refreshItems(filters.uid)
      if (result.success) { queryClient.invalidateQueries({ queryKey: ["items"] }) }
      else { addToast({ title: "刷新失败", description: result.message, variant: "error" }) }
    } catch (e) {
      addToast({ title: "刷新失败", description: e instanceof Error ? e.message : "刷新失败", variant: "error" })
    } finally { setIsRefreshing(false) }
  }, [filters.uid, queryClient, addToast])

  const stats = {
    total: data?.length || 0,
    onSale: data?.filter(i => i.status === 0).length || 0,
    offSale: data?.filter(i => i.status === 1).length || 0,
    sold: data?.filter(i => i.status === -2).length || 0,
  }

  return (
    <div className="flex flex-col min-h-0 h-full space-y-5">
      {/* Tab 栏 */}
      <TabBar
        tabs={[
          { key: "items", label: "商品管理" },
          { key: "rules", label: "回复规则" },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as "items" | "rules")}
        variant="overline"
      />

      {/* Tab 描述 */}
      <p className="text-sm text-gray-500 -mt-3">
        {activeTab === "items"
          ? "可配置功能：自动发货、发货配置、自动上架、自动回复规则绑定、AI回复、AI提示词"
          : "可配置功能：自动回复关键词规则，匹配买家消息并自动发送预设回复"}
      </p>

      {/* 商品管理 tab */}
      {activeTab === "items" && (
        <div className="flex-1 min-h-0 flex flex-col space-y-4">
          {/* 移动端筛选栏 — 使用 FilterBar */}
          {isMobile && (
            <FilterBar
              accounts={accountsData || []}
              searchInput={searchInput}
              statusFilter={filters.status}
              onSearchChange={setSearchInput}
              onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
              onRefresh={handleRefresh}
              onClear={handleClearFilters}
              isRefreshing={isRefreshing}
              selectedUid={filters.uid}
              stats={stats}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSort}
            />
          )}

          <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* 桌面端搜索表单 — 使用 FilterBar */}
            <div className="hidden md:block">
              <FilterBar
                accounts={accountsData || []}
                searchInput={searchInput}
                statusFilter={filters.status}
                onSearchChange={setSearchInput}
                onStatusChange={(status) => setFilters((prev) => ({ ...prev, status }))}
                onRefresh={handleRefresh}
                onClear={handleClearFilters}
                isRefreshing={isRefreshing}
                selectedUid={filters.uid}
                stats={stats}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSort}
              />
            </div>

            {/* 加载/错误/空状态 */}
            {isLoading && (
              <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
                加载商品列表失败: {String(error)}
              </div>
            )}
            {!isLoading && !error && data && data.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center m-4">
                <h3 className="text-lg font-medium text-gray-900 mb-1">暂无商品</h3>
                <p className="text-sm text-gray-500">没有找到符合条件的商品</p>
              </div>
            )}

            {!isLoading && !error && data && data.length > 0 && (
              <>
                {/* 桌面端表格 */}
                <div className="flex-1 overflow-auto hidden md:block" style={{ minHeight: "200px" }}>
                  {/* 表头 */}
                  <div
                    className="sticky top-0 z-10 grid gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600"
                    style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
                  >
                    <div className="col-span-2">
                      <button className="flex items-center gap-1 hover:text-blue-600" onClick={() => handleSort("title")}>
                        商品信息
                        {/* SortIcon 内联 — 避免多一层 import */}
                        {sortField === "title" ? (
                          <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </button>
                    </div>
                    <div className="col-span-1 text-right">
                      <button className="flex items-center gap-1 ml-auto hover:text-blue-600" onClick={() => handleSort("price")}>
                        价格
                        {sortField === "price" ? (
                          <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </button>
                    </div>
                    <div className="col-span-1 text-center">
                      <button className="flex items-center gap-1 mx-auto hover:text-blue-600" onClick={() => handleSort("publishTime")}>
                        发布时间
                        {sortField === "publishTime" ? (
                          <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </button>
                    </div>
                    <div className="col-span-1 text-center">数据</div>
                    <div className="col-span-1 text-center">AI回复</div>
                    <div className="col-span-1 text-center">自动发货</div>
                    <div className="col-span-1 text-center">付款后发货</div>
                    <div className="col-span-1 text-center">收货后赠送</div>
                    <div className="col-span-1 text-center">评价后赠送</div>
                    <div className="col-span-1 text-center">关键词回复</div>
                    <div className="col-span-1 text-center">AI提示词</div>
                    <div className="col-span-1 text-center">自动上架</div>
                    <div className="col-span-1 text-center">指令码</div>
                  </div>

                  {sortedItems.map((item, index) => (
                    <ItemRow
                      key={item.gid}
                      item={item}
                      isEven={index % 2 === 0}
                      onToggle={handleToggle}
                      onEdit={() => setEditingItem(item)}
                      onKeywordClick={() => setKeywordItem(item)}
                      keywordCount={itemKeywordCounts[item.gid] || 0}
                      onUpdateField={(gid, field, value) =>
                        updateMutation.mutate({ gid, data: { [field]: value } })
                      }
                    />
                  ))}
                </div>

                {/* 移动端卡片列表 */}
                <div className="flex-1 overflow-auto md:hidden px-1 pb-2 space-y-2.5" style={{ minHeight: "200px" }}>
                  {sortedItems.map((item) => (
                    <MobileProductCard
                      key={item.gid}
                      item={item}
                      keywordCount={itemKeywordCounts[item.gid] || 0}
                      onToggle={handleToggle}
                      onEdit={() => setEditingItem(item)}
                      onKeywordClick={() => setKeywordItem(item)}
                      onConfigClick={(field) => setMobileConfig({ item, field })}
                      onSendCodeChange={(gid, value) =>
                        updateMutation.mutate({ gid, data: { sendCode: value } })
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 关键词规则 tab — 完全不变 */}
      {activeTab === "rules" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{rulesStats.total}</div>
              <div className="text-xs text-gray-500">规则总数</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{rulesStats.enabled}</div>
              <div className="text-xs text-gray-500">已启用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-600">{rulesStats.disabled}</div>
              <div className="text-xs text-gray-500">已禁用</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{rulesStats.linkedItems}</div>
              <div className="text-xs text-gray-500">关联商品</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{rulesStats.linkedGroups}</div>
              <div className="text-xs text-gray-500">关联商品组</div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="text-sm text-gray-500">
              {keywordsData?.rules.length === 0
                ? "暂无规则"
                : `共 ${keywordsData?.rules.length} 条规则，按优先级降序排列`}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建规则
            </button>
          </div>

          {keywordsLoading && (
            <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
          )}
          {keywordsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
              加载规则列表失败: {String(keywordsError)}
            </div>
          )}
          {!keywordsLoading && !keywordsError && keywordsData && keywordsData.rules.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
              <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                创建规则
              </button>
            </div>
          )}
          {!keywordsLoading && !keywordsError && keywordsData && keywordsData.rules.length > 0 && (
            <RuleTable
              className="border-0 rounded-none shadow-none"
              rules={keywordsData.rules}
              onEdit={setEditingRule}
            />
          )}
        </div>
      )}

      {/* 编辑商品 — 响应式抽屉（取代 ItemForm 居中弹窗） */}
      {editingItem && (
        <ItemEditDrawer
          item={editingItem}
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* 关键词回复 — 响应式抽屉（取代 ItemKeywordModal 居中弹窗） */}
      {keywordItem && (
        <KeywordDrawer
          item={keywordItem}
          open={!!keywordItem}
          onClose={() => setKeywordItem(null)}
        />
      )}

      {/* 配置编辑 — 响应式抽屉（取代 ConfigModal + MobileConfigSheet） */}
      {mobileConfig && (
        <ConfigDrawer
          open={!!mobileConfig}
          item={mobileConfig.item}
          field={mobileConfig.field}
          onClose={() => setMobileConfig(null)}
          onSave={(gid, field, value) => {
            updateMutation.mutate({ gid, data: { [field]: value } })
            setMobileConfig(null)
          }}
        />
      )}

      {/* 创建/编辑规则表单 — 不变 */}
      {showCreateForm && (
        <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />
      )}
      {editingRule && (
        <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />
      )}
    </div>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <ItemsPageContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

**预期可能的类型错误及处理：**
- `MobileProductCard` 的 import 路径 — 如果文件尚未移动到 `views/`，先保持原路径 `@/components/items/MobileProductCard`
- `ConfigField` 类型不匹配 — 确保新旧类型定义一致
- `stats` 对象缺少 `autoReply`/`autoDelivery` 字段 — FilterBar 的 `FilterBarProps` 不需要这些字段（已移除）

---

### Task 11: 移动 `MobileProductCard.tsx` 到 `views/` 目录

**Files:**
- Move: `components/items/MobileProductCard.tsx` → `components/items/views/MobileProductCard.tsx`

> 验证 Task 10 通过后再执行此步骤。

- [ ] **Step 1: 移动文件 + 更新相对导入路径**

```bash
mv components/items/MobileProductCard.tsx components/items/views/MobileProductCard.tsx
```

- [ ] **Step 2: 更新 MobileProductCard.tsx 中的 import 路径**

原：
```tsx
import { ConfigField, formatPublishTime, statusLabel } from "./config"
import { IconToggle } from "./parts/IconToggle"
import { SendCodeEditor } from "./parts/SendCodeEditor"
```

改为：
```tsx
import { ConfigField, formatPublishTime, statusLabel } from "../config"
import { IconToggle } from "../parts/IconToggle"
import { SendCodeEditor } from "../parts/SendCodeEditor"
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit
```

---

## 阶段四：清理 — 删除已被替代的旧文件

### Task 12: 删除 4 个旧文件

**Files:**
- Delete: `components/items/MobileFilterBar.tsx`（已合并入 FilterBar.tsx）
- Delete: `components/items/MobileConfigSheet.tsx`（已合并入 ConfigDrawer.tsx）
- Delete: `components/items/ItemForm.tsx`（已改造为 ItemEditDrawer.tsx）
- Delete: `components/items/ItemKeywordModal.tsx`（已改造为 KeywordDrawer.tsx）

- [ ] **Step 1: 删除文件**

```bash
rm components/items/MobileFilterBar.tsx
rm components/items/MobileConfigSheet.tsx
rm components/items/ItemForm.tsx
rm components/items/ItemKeywordModal.tsx
```

- [ ] **Step 2: 最终验证编译**

```bash
npx tsc --noEmit
```

**预期：** 零错误。

- [ ] **Step 3: 手动检查 page.tsx 行数变化**

```bash
wc -l app/dashboard/items/page.tsx
```

**预期：** ~350 行（含 rules tab 部分），小于原 1036 行的 35%。

---

## 最终文件结构

```
components/items/
├── config.ts                          # 共享类型 + 常量 + 工具函数（~60 行）
│
├── parts/                             # 共享小组件（PC + 移动端通用）
│   ├── IconToggle.tsx                 # ~20 行
│   ├── SortIcon.tsx                   # ~15 行
│   ├── useSendCodeEdit.ts             # ~35 行
│   ├── SendCodeEditor.tsx             # ~100 行
│   ├── PlaceholderPicker.tsx          # ~35 行
│   └── RefreshButton.tsx              # ~55 行
│
├── views/                             # 平台专属渲染
│   ├── ItemRow.tsx                    # ~160 行（含 ConfigCell 内部组件）
│   └── MobileProductCard.tsx          # ~200 行（删除内部 IconToggle/SendCodeRow 后）
│
├── drawers/                           # 响应式抽屉
│   ├── ConfigDrawer.tsx               # ~90 行
│   ├── ItemEditDrawer.tsx             # ~230 行
│   └── KeywordDrawer.tsx              # ~350 行
│
└── FilterBar.tsx                      # ~200 行（含 Desktop + Mobile + SortChip）
```

**已删除的文件：** MobileFilterBar.tsx, MobileConfigSheet.tsx, ItemForm.tsx, ItemKeywordModal.tsx

---

## 风险矩阵

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| page.tsx 替换时类型不匹配 | 中 | 保持 ConfigField 类型一致；用 `import type` 区分类型/值导入 |
| MobileProductCard props 接口变更导致 MobileProductCard 渲染报错 | 中 | Task 10 保持旧 import 路径直到 Task 11 移动文件 |
| 删除旧文件后其他文件仍有残留引用 | 低 | tsc --noEmit 会捕获所有未解析的 import |
| BottomSheet vs Sheet 的 container 行为差异 | 低 | ItemEditDrawer 和 KeywordDrawer 已在设计文档中充分设计 |
| KeywordDrawer 商品选择器内联 vs 嵌套弹窗的 UX 差异 | 低 | 功能等价 — 搜索/过滤/点击插入逻辑完全不变 |

---

## 执行检查清单

完成后逐项确认：

- [ ] `npx tsc --noEmit` 零错误
- [ ] `components/items/` 目录结构符合目标文件结构
- [ ] page.tsx 行数降至 ~350 行以下（原 1036 行）
- [ ] PLACEHOLDERS 定义仅存在于 `config.ts` 一处
- [ ] ConfigField 类型定义仅存在于 `config.ts` 一处
- [ ] formatPublishTime 函数定义仅存在于 `config.ts` 一处（统一含年份）
- [ ] 所有 3 个居中弹窗已改为响应式抽屉（PC: Sheet, Mobile: BottomSheet）
- [ ] SendCode 编辑逻辑统一为 `useSendCodeEdit` hook + `SendCodeEditor` 组件
- [ ] 桌面端和移动端筛选栏统一为 `FilterBar` 组件
- [ ] IconToggle 统一使用 `parts/IconToggle`
- [ ] 旧文件 MobileFilterBar / MobileConfigSheet / ItemForm / ItemKeywordModal 已删除
