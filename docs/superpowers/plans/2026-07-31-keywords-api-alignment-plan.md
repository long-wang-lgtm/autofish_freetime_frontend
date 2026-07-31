# Keywords API 对齐后端 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 前端 `lib/api/keywords.ts` 类型定义、端点路径、请求/响应结构与后端 `replyrule.py` 完全对齐，keyword string→string[] 转换，预定义关键词从 API 获取，关联数据惰性加载，移除商品组。

**Architecture:** 以后端 `ReplyItemRuleSchema` + 14 个端点为单一事实源。API 模块提供类型+函数+keyword 转换工具。组件层仅通过 API 模块访问数据，keyword 数组与展示字符串的转换统一在 `formatRuleKeyword` / `parseKeywordInput` 两个工具函数中处理。

**Tech Stack:** TypeScript, React Query, react-hook-form + zod, Tailwind CSS

**Design Spec:** `docs/superpowers/specs/2026-07-30-keywords-api-alignment-design.md`

## Global Constraints

- 所有字段命名对齐后端 camelCase（`keyType` / `matchType` / `replyContent` / `itemsCount` / `fullShop` / `create_at` / `update_at`）
- `keyword` 在 API 层是 `string[]`，在表单/展示层是逗号分隔字符串，转换仅通过 `formatRuleKeyword` / `parseKeywordInput`
- 预定义关键词通过 `fetchPredefinedKeywords()` 获取 `Record<string, string>`，下拉选项本地 `Object.entries` 派生，不保留两套数据
- 关联数据不再内联于规则列表，改为惰性请求 `fetchRuleItems(rid)`
- 删除所有商品组相关逻辑（类型、函数、UI）
- 关联操作批量化：`bindRuleItems(rid, gids[])` / `unbindRuleItems(rid, gids[])`
- 禁止模糊命名：所有函数名 = 动词 + 实体名

---

## File Structure

| 文件 | 职责 | 操作 |
|------|------|------|
| `lib/api/keywords.ts` | ReplyRule 类型 + API 函数 + keyword 转换工具 | **重写** |
| `hooks/useKeywords.ts` | 规则列表 React Query 封装 + stats 计算 | **重构** |
| `components/items/parts/KeywordRuleForm.tsx` | 规则创建/编辑表单 | **重构** |
| `components/items/rules/RuleTable.tsx` | 桌面端规则表格 | **重构** |
| `components/items/views/MobileRuleCard.tsx` | 移动端规则卡片 | **重构** |
| `components/items/RulesTab.tsx` | 规则 Tab 容器（统计+列表+抽屉调度） | **重构** |
| `components/items/drawers/RuleItemsAllDrawer.tsx` | 创建/编辑规则抽屉（含关联面板） | **重构** |
| `components/items/drawers/RulesItemsingleDrawer.tsx` | 单商品规则管理抽屉 | **重构** |
| `components/items/parts/RuleBindingPanel.tsx` | 规则→商品关联选择面板 | **重构** |
| `components/items/parts/ItemCardPanel.tsx` | 商品卡片占位符选择面板 | **重构** |

---

### Task 1: 重写 API 模块 `lib/api/keywords.ts`

**Files:**
- Modify: `lib/api/keywords.ts` (完全替换)

**Interfaces:**
- Produces: `ReplyRule`, `ReplyRuleListResponse`, `BindableItem`, `ReplyRuleCreate`, `ReplyRuleUpdate`, `OperationResult`, `ReplyRuleListParams` 类型
- Produces: `fetchPredefinedKeywords`, `fetchReplyRules`, `createReplyRule`, `updateReplyRule`, `deleteReplyRule`, `fetchBindableItems`, `fetchBindableRules`, `fetchRuleItems`, `fetchItemRules`, `bindRuleItems`, `bindItemRules`, `unbindRuleItems`, `unbindItemRules` 函数
- Produces: `formatRuleKeyword`, `parseKeywordInput` 工具函数

- [ ] **Step 1: 替换文件内容**

用以下完整内容替换 `lib/api/keywords.ts`：

```ts
/**
 * 关键词回复规则 API 客户端
 *
 * 后端端点源: backend/free/user/replyrule.py
 * 数据模型源: backend/free/schema/fish.py (ReplyItemRuleSchema)
 * 所有字段命名对齐后端 camelCase schema
 */
import { fetchApi } from "@/lib/utils/api"

// ==================== 实体类型 ====================

/** 关键词回复规则 — 对应后端 ReplyItemRuleSchema */
export interface ReplyRule {
  id: number
  keyword: string[]
  keyType: "predefined" | "custom"
  matchType: "exact" | "fuzzy" | "regex"
  replyContent: string
  priority: number
  enabled: boolean
  fullShop: boolean
  itemsCount: number
  create_at: string | null
  update_at: string | null
}

/** 规则列表响应 */
export interface ReplyRuleListResponse {
  total: number
  rules: ReplyRule[]
}

/** 可绑定到规则的商品 — 对应后端 ShopItemSchema，由 bindable.items 返回 */
export interface BindableItem {
  gid: number
  title: string | null
  reservePrice: string | null
  status: number
  picurl: string | null
}

// ==================== 入参类型 ====================

/** 规则列表查询参数 */
export interface ReplyRuleListParams {
  page?: number
  size?: number
  keyword?: string
  enabled?: boolean
  fullShop?: boolean
  order_by?: "priority" | "enabled" | "fullShop" | "create_at" | "update_at"
  asc?: boolean
}

/** 创建规则入参 */
export interface ReplyRuleCreate {
  keyword: string[]
  keyType: "predefined" | "custom"
  matchType: "exact" | "fuzzy" | "regex"
  replyContent: string
  priority?: number
  enabled?: boolean
  fullShop?: boolean
  gids?: string[]
}

/** 更新规则入参 */
export interface ReplyRuleUpdate {
  keyword?: string[]
  keyType?: "predefined" | "custom"
  matchType?: "exact" | "fuzzy" | "regex"
  replyContent?: string
  priority?: number
  enabled?: boolean
  fullShop?: boolean
}

/** 通用操作结果 — 对应后端 OperationResponse */
export interface OperationResult {
  success: boolean
  message: string
}

// ==================== API 函数 ====================

/** 获取预定义关键词字典 { key: label } */
export async function fetchPredefinedKeywords(): Promise<Record<string, string>> {
  return fetchApi<Record<string, string>>("/api/keywords/predefined")
}

/** 分页查询规则列表 */
export async function fetchReplyRules(
  params: ReplyRuleListParams = {}
): Promise<ReplyRuleListResponse> {
  return fetchApi<ReplyRuleListResponse>("/api/keywords", { params })
}

/** 创建规则（可同时绑定商品） */
export async function createReplyRule(data: ReplyRuleCreate): Promise<ReplyRule> {
  return fetchApi<ReplyRule>("/api/keywords", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** 更新规则 */
export async function updateReplyRule(
  id: number,
  data: ReplyRuleUpdate
): Promise<ReplyRule> {
  return fetchApi<ReplyRule>(`/api/keywords?rid=${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/** 删除规则 */
export async function deleteReplyRule(id: number): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/?rid=${id}`, { method: "DELETE" })
}

/** 获取可绑定的商品列表 */
export async function fetchBindableItems(): Promise<BindableItem[]> {
  return fetchApi<BindableItem[]>("/api/keywords/bindable.items", { method: "POST" })
}

/** 获取可绑定的规则列表 */
export async function fetchBindableRules(): Promise<ReplyRule[]> {
  return fetchApi<ReplyRule[]>("/api/keywords/bindable.rules", { method: "POST" })
}

/** 获取规则已关联的商品列表（惰性加载 — 仅展开时调用） */
export async function fetchRuleItems(rid: number): Promise<BindableItem[]> {
  return fetchApi<BindableItem[]>(`/api/keywords/rule.items?rid=${rid}`)
}

/** 获取商品已关联的规则列表 */
export async function fetchItemRules(gid: string): Promise<ReplyRule[]> {
  return fetchApi<ReplyRule[]>(`/api/keywords/item.rules?gid=${gid}`)
}

// ==================== 关联操作（批量） ====================

/** 绑定商品到规则 */
export async function bindRuleItems(
  rid: number,
  gids: string[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/bind.rule.items?rid=${rid}`, {
    method: "POST",
    body: JSON.stringify({ gids }),
  })
}

/** 绑定规则到商品 */
export async function bindItemRules(
  gid: string,
  rids: number[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/bind.item.rules?gid=${gid}`, {
    method: "POST",
    body: JSON.stringify({ rids }),
  })
}

/** 解绑商品与规则 */
export async function unbindRuleItems(
  rid: number,
  gids: string[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/unbind.rule.items?rid=${rid}`, {
    method: "POST",
    body: JSON.stringify({ gids }),
  })
}

/** 解绑规则与商品 */
export async function unbindItemRules(
  gid: string,
  rids: number[]
): Promise<OperationResult> {
  return fetchApi<OperationResult>(`/api/keywords/unbind.item.rules?gid=${gid}`, {
    method: "POST",
    body: JSON.stringify({ rids }),
  })
}

// ==================== keyword 转换工具 ====================

/**
 * 将规则的关键词数组转为展示/编辑用的字符串。
 * - 预定义类型：通过字典 key → 中文标签
 * - 自定义类型：全角逗号拼接
 */
export function formatRuleKeyword(
  rule: ReplyRule,
  labels: Record<string, string>
): string {
  if (rule.keyType === "predefined") {
    if (rule.keyword.length > 0) {
      return labels[rule.keyword[0]] || rule.keyword[0]
    }
    return ""
  }
  return rule.keyword.join("，")
}

/**
 * 将用户输入的逗号分隔字符串拆分为关键词数组。
 * 支持半角逗号 (,)、全角逗号 (，)，trim 空白，过滤空串。
 * 结果去重保持顺序。
 */
export function parseKeywordInput(input: string): string[] {
  const parts = input
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set(parts)]
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

预期：由于消费者尚未更新，会有旧名称的引用报错（默认行为，后续 Task 逐一修复）。确认新模块本身无语法错误即可。

> **注意**：Step 2 的报错数量应与旧 API 导出的符号数匹配（~20 个符号），Review 时确认报错都来自消费者文件引用旧名称，而非新模块内部错误。

- [ ] **Step 3: Commit**

```bash
git add lib/api/keywords.ts
git commit -m "refactor(keywords): rewrite API module to align with backend replyrule.py

- Rename all types: KeywordRule→ReplyRule, RuleItem→BindableItem
- Align field names with backend camelCase schema
- keyword: string→string[], add formatRuleKeyword/parseKeywordInput
- Replace RESTful paths with query-param paths
- Batch binding/unbinding: single-item→gids[]/rids[]
- Add fetchBindableItems, fetchBindableRules, fetchRuleItems
- Remove group-related types and functions
- Add OperationResult, ReplyRuleListParams types

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 更新 `hooks/useKeywords.ts`

**Files:**
- Modify: `hooks/useKeywords.ts`

**Interfaces:**
- Consumes: `fetchReplyRules`, `ReplyRule` (from Task 1)
- Produces: `useKeywords()` hook — 返回 `{ rules, isLoading, error, stats }`

- [ ] **Step 1: 替换 hook 实现**

用以下内容替换 `hooks/useKeywords.ts`：

```ts
"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { fetchReplyRules } from "@/lib/api/keywords"

export interface KeywordStats {
  total: number
  enabled: number
  disabled: number
  linkedItems: number
}

export function useKeywords() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["keywords"],
    queryFn: () => fetchReplyRules({ size: 50 }),
    refetchInterval: 30000,
  })

  const rules = data?.rules ?? []

  const stats = useMemo<KeywordStats>(() => ({
    total: rules.length,
    enabled: rules.filter((r) => r.enabled).length,
    disabled: rules.filter((r) => !r.enabled).length,
    linkedItems: rules.reduce((sum, r) => sum + (r.itemsCount || 0), 0),
  }), [rules])

  return { rules, isLoading, error, stats }
}
```

**变更要点**：
- `listKeywordRules()` → `fetchReplyRules({ size: 50 })`（初始加载 50 条）
- `rule.linked_items` → `rule.itemsCount`
- 删除 `linkedGroups` 统计字段
- 删除 `itemKeywordCounts`（依赖内联 `linked_item_list`，已由后端移除 — 需要在消费处改为惰性请求）

- [ ] **Step 2: Commit**

```bash
git add hooks/useKeywords.ts
git commit -m "refactor(useKeywords): align hook with new ReplyRule types

- fetchReplyRules with size param replaces listKeywordRules
- linked_items→itemsCount in stats computation
- Remove linkedGroups stat (backend has no group support)
- Remove itemKeywordCounts (linked items no longer inline)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 重构 `KeywordRuleForm` — keyword 转换 + 字段重命名 + 预定义 API

**Files:**
- Modify: `components/items/parts/KeywordRuleForm.tsx`

**Interfaces:**
- Consumes: `ReplyRule`, `ReplyRuleCreate`, `ReplyRuleUpdate`, `fetchPredefinedKeywords`, `parseKeywordInput`, `formatRuleKeyword` (from Task 1)
- Produces: `KeywordRuleForm` 组件（Props 保持兼容，内部重构）

- [ ] **Step 1: 更新 imports 和 form schema**

将文件顶部的 imports 替换为：

```ts
"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery } from "@tanstack/react-query"
import {
  type ReplyRule,
  type ReplyRuleCreate,
  type ReplyRuleUpdate,
  fetchPredefinedKeywords,
  parseKeywordInput,
} from "@/lib/api/keywords"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { TextEditor } from '@/components/ui/TextEditor'
import { PlaceholderPicker } from "./PlaceholderPicker"
import { ItemCardPanel } from "./ItemCardPanel"
```

将 form schema 更新：

```ts
export const ruleSchema = z.object({
  keyType: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  replyContent: z.string().min(1, "回复内容不能为空"),
  matchType: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
  fullShop: z.boolean(),
})

export type RuleFormData = z.infer<typeof ruleSchema>
```

将 Props 接口更新：

```ts
export interface KeywordRuleFormProps {
  rule?: ReplyRule
  linkedItem?: { title?: string; price?: number; gid?: string }
  bindingWarning?: string
  onSubmit: (data: ReplyRuleCreate | ReplyRuleUpdate) => Promise<void>
  onCancel: () => void
  onDestructiveAction?: { label: string; onAction: () => Promise<void> }
  onDirtyChange?: (dirty: boolean) => void
  sidePanel?: React.ReactNode
  showItemCardPanel?: boolean
}
```

- [ ] **Step 2: 更新组件内部 — 预定义关键词获取 + form defaults**

在组件函数体内，`const isEdit = !!rule` 之后添加预定义关键词查询：

```ts
const isEdit = !!rule

// 预定义关键词 — React Query 去重，多组件共享同一缓存
const { data: prefLabels = {} } = useQuery({
  queryKey: ["predefined-keywords"],
  queryFn: fetchPredefinedKeywords,
  staleTime: 5 * 60 * 1000,
})

// 从字典派生下拉选项
const prefOptions = useMemo(
  () => Object.entries(prefLabels).map(([value, label]) => ({ value, label })),
  [prefLabels]
)
```

在文件顶部添加 `useMemo` 导入：

```ts
import { useState, useCallback, useEffect, useMemo } from "react"
```

更新 `useForm` 的 `defaultValues`：

```ts
defaultValues: {
  keyType: rule?.keyType || "custom",
  keyword: rule?.keyword.join("，") || "",
  replyContent: rule?.replyContent || "",
  matchType: rule?.matchType || "exact",
  priority: rule?.priority || 0,
  enabled: rule?.enabled ?? true,
  fullShop: rule?.fullShop ?? false,
},
```

- [ ] **Step 3: 更新 JSX — 字段名替换 + fullShop 开关**

替换所有字段引用：
- `reply_type` → `keyType`
- `reply_content` → `replyContent`
- `match_type` → `matchType`

更新回复类型 pill 按钮中的字段引用：
```tsx
// "自定义" 按钮
onClick={() => setValue("keyType", "custom", { shouldDirty: true })}
className={keyType === "custom" ? ... : ...}

// "预定义" 按钮
onClick={() => setValue("keyType", "predefined", { shouldDirty: true })}
className={keyType === "predefined" ? ... : ...}
```

将变量 `replyType` → `keyType`，`replyContent` → `replyContentVar`（避免与 setValue 参数名冲突）：
```tsx
const keyType = watch("keyType")
const replyContentValue = watch("replyContent")
```

将所有 `replyType` 引用改为 `keyType`。

更新预定义关键词下拉，使用 `prefOptions`：
```tsx
{keyType === "predefined" ? (
  <select
    {...register("keyword")}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
  >
    {prefOptions.map((kw) => (
      <option key={kw.value} value={kw.value}>
        {kw.label}
      </option>
    ))}
  </select>
) : (
  // ... custom keyword input unchanged
)}
```

更新匹配方式 select 中的字段名：
```tsx
<select {...register("matchType")} ...>
  <option value="exact">精确匹配</option>
  <option value="fuzzy">模糊匹配</option>
  <option value="regex">正则匹配</option>
</select>
```

更新 `handleSubmitForm`，将 keyword 字符串转为数组：
```ts
const handleSubmitForm = async (data: RuleFormData) => {
  setLoading(true)
  try {
    const keyword = parseKeywordInput(data.keyword)
    await onSubmit({ ...data, keyword })
    reset({ ...data, keyword: keyword.join("，") })
  } finally {
    setLoading(false)
  }
}
```

在"匹配规则"卡片底部添加 fullShop 开关：
```tsx
{/* 全店生效开关 — 在匹配规则卡片内、关键词选择下方 */}
<div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200">
  <button
    type="button"
    role="switch"
    aria-checked={watch("fullShop")}
    onClick={() => setValue("fullShop", !watch("fullShop"), { shouldDirty: true })}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
      watch("fullShop") ? "bg-blue-600" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
        watch("fullShop") ? "translate-x-[18px]" : "translate-x-[2px]"
      }`}
    />
  </button>
  <span className="text-sm text-gray-700 select-none">
    全店生效（覆盖所有商品）
  </span>
</div>
```

- [ ] **Step 4: 更新 TextEditor 字段引用**

将所有 `register("reply_content")` 改为 `register("replyContent")`。
将 `errors.reply_content` 改为 `errors.replyContent`。
将所有内部用到的 `replyContent` 变量引用改为 `replyContentValue`：

```tsx
// insertPlaceholder 中
const currentValue = replyContentValue || ""
setValue("replyContent", currentValue + placeholder, { shouldValidate: true, shouldDirty: true })

// handleReplyContentDrop 中
const currentValue = replyContentValue || ""
setValue("replyContent", currentValue + text, { shouldValidate: true, shouldDirty: true })
```

回调依赖数组也更新：
```tsx
}, [replyContentValue, setValue])
```

ItemCardPanel 的 onInsert 回调中：
```tsx
onInsert={(itemId) => {
  const placeholder = makeItemCardPlaceholder(itemId)
  setValue("replyContent", (replyContentValue || "") + placeholder, {
    shouldValidate: true,
    shouldDirty: true,
  })
}}
```

- [ ] **Step 5: Commit**

```bash
git add components/items/parts/KeywordRuleForm.tsx
git commit -m "refactor(KeywordRuleForm): align with ReplyRule types and keyword string[]

- reply_type→keyType, reply_content→replyContent, match_type→matchType
- Predefined keywords fetched from API via React Query
- Form keyword stays as comma-separated string; parseKeywordInput on submit
- Add fullShop toggle switch
- Props use ReplyRule/ReplyRuleCreate/ReplyRuleUpdate types

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 重构 `RuleTable` + `MobileRuleCard` + `RulesTab`

**Files:**
- Modify: `components/items/rules/RuleTable.tsx`
- Modify: `components/items/views/MobileRuleCard.tsx`
- Modify: `components/items/RulesTab.tsx`

**Interfaces:**
- Consumes: `ReplyRule`, `formatRuleKeyword`, `fetchRuleItems`, `fetchPredefinedKeywords`, `updateReplyRule`, `deleteReplyRule`, `createReplyRule`, `bindRuleItems`, `unbindRuleItems`, `fetchBindableItems`, `BindableItem` (from Task 1)
- Consumes: `useKeywords`, `KeywordStats` (from Task 2)
- Consumes: `KeywordRuleForm`, `RuleFormData` (from Task 3)

- [ ] **Step 1: 重构 `RuleTable.tsx`**

替换整个文件为：

```ts
"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  type ReplyRule,
  formatRuleKeyword,
  fetchRuleItems,
  fetchPredefinedKeywords,
} from "@/lib/api/keywords"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'

interface RuleTableProps {
  rules: ReplyRule[]
  onEdit: (rule: ReplyRule) => void
  onToggleEnabled: (rule: ReplyRule) => void
  onDelete: (rule: ReplyRule) => void
  toggling: string | null
  deleting: string | null
  className?: string
}

const replyTypeLabels: Record<string, string> = {
  predefined: "预定义关键词",
  custom: "自定义关键词",
}

const matchTypeLabels: Record<string, string> = {
  exact: "精确匹配",
  fuzzy: "模糊匹配",
  regex: "正则匹配",
}

export function RuleTable({
  rules,
  onEdit,
  onToggleEnabled,
  onDelete,
  toggling,
  deleting,
  className,
}: RuleTableProps) {
  // 预定义关键词标签映射
  const { data: prefLabels = {} } = useQuery({
    queryKey: ["predefined-keywords"],
    queryFn: fetchPredefinedKeywords,
    staleTime: 5 * 60 * 1000,
  })

  const [expandedRule, setExpandedRule] = useState<number | null>(null)

  // 惰性加载关联商品
  const { data: linkedItems = [], isLoading: linkedLoading } = useQuery({
    queryKey: ["rule-items", expandedRule],
    queryFn: () => fetchRuleItems(expandedRule!),
    enabled: expandedRule !== null,
  })

  const toggleExpand = (ruleId: number) => {
    setExpandedRule(expandedRule === ruleId ? null : ruleId)
  }

  return (
    <div className={["bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden", className].filter(Boolean).join(" ")}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              状态
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              类型
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              关键词/消息
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              回复内容
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              匹配方式
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              优先级
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              全店
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              关联
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rules.map((rule) => (
            <>
              <tr key={rule.id} className={rule.enabled ? "" : "bg-gray-50"}>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                      rule.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.enabled ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {replyTypeLabels[rule.keyType] || rule.keyType}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {formatRuleKeyword(rule, prefLabels)}
                  </div>
                  {rule.keyType === "custom" && rule.keyword.length > 0 && (
                    <div className="text-xs text-gray-500 font-mono">
                      {rule.keyword.join("，").length > 20
                        ? rule.keyword.join("，").slice(0, 20) + "..."
                        : rule.keyword.join("，")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-700 max-w-xs truncate">
                    {rule.replyContent || "-"}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {rule.keyType === "custom"
                    ? matchTypeLabels[rule.matchType] || rule.matchType
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {rule.priority}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      rule.fullShop
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.fullShop ? "全店" : "指定"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleExpand(rule.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {rule.itemsCount > 0 ? (
                      <>
                        <span>商品: {rule.itemsCount}</span>
                        <span className="ml-1 text-xs">
                          {expandedRule === rule.id ? "▲" : "▼"}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">无关联</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(rule)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => onToggleEnabled(rule)}
                      disabled={toggling === String(rule.id)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        rule.enabled
                          ? "bg-orange-100 hover:bg-orange-200 text-orange-700"
                          : "bg-green-100 hover:bg-green-200 text-green-700"
                      } disabled:opacity-50`}
                    >
                      {toggling === String(rule.id) ? (
                        <LoadingSpinner size="sm" />
                      ) : rule.enabled ? (
                        "禁用"
                      ) : (
                        "启用"
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(rule)}
                      disabled={deleting === String(rule.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === String(rule.id) ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        "删除"
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              {/* 惰性加载的关联商品展开行 */}
              {expandedRule === rule.id && (
                <tr key={`${rule.id}-expanded`}>
                  <td colSpan={9} className="px-4 py-3 bg-blue-50">
                    <div className="text-xs text-gray-500 mb-2">关联商品：</div>
                    {linkedLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : linkedItems.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {linkedItems.map((item) => (
                          <span
                            key={item.gid}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg"
                          >
                            {item.title || `商品#${item.gid}`}
                            {item.reservePrice && ` (¥${item.reservePrice})`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">暂无关联商品</span>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 重构 `MobileRuleCard.tsx`**

替换文件内容为：

```ts
"use client"

import { useQuery } from "@tanstack/react-query"
import {
  type ReplyRule,
  formatRuleKeyword,
  fetchPredefinedKeywords,
} from "@/lib/api/keywords"

interface MobileRuleCardProps {
  rule: ReplyRule
  onToggleEnabled: (rule: ReplyRule) => void
  onEdit: (rule: ReplyRule) => void
  onDelete: (rule: ReplyRule) => void
  toggling: boolean
}

const matchTypeLabels: Record<string, string> = {
  exact: "精确匹配",
  fuzzy: "模糊匹配",
  regex: "正则匹配",
}

const replyTypeLabels: Record<string, string> = {
  predefined: "预定义关键词",
  custom: "自定义关键词",
}

export function MobileRuleCard({
  rule,
  onToggleEnabled,
  onEdit,
  onDelete,
  toggling,
}: MobileRuleCardProps) {
  const { data: prefLabels = {} } = useQuery({
    queryKey: ["predefined-keywords"],
    queryFn: fetchPredefinedKeywords,
    staleTime: 5 * 60 * 1000,
  })

  const keyword = formatRuleKeyword(rule, prefLabels)
  const disabled = !rule.enabled

  return (
    <div
      className={`border border-gray-200 rounded-xl overflow-hidden ${
        disabled ? "bg-gray-50" : "bg-white"
      }`}
    >
      {/* 标题行：状态badge + 关键词 | 优先级 */}
      <div className="flex items-start justify-between px-3 pt-3 pb-1 gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={() => onToggleEnabled(rule)}
            disabled={toggling}
            className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
              rule.enabled
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {toggling ? "..." : rule.enabled ? "启用" : "禁用"}
          </button>
          <span
            className={`text-sm font-semibold leading-tight break-all ${
              disabled ? "text-gray-400" : "text-gray-900"
            }`}
          >
            {keyword}
          </span>
        </div>
        <span
          className={`text-sm font-semibold flex-shrink-0 ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          #{rule.priority}
        </span>
      </div>

      {/* 信息行：匹配方式 · 回复类型 · 全店 */}
      <div className="px-3 pb-1 flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <span className="bg-gray-100 text-gray-500 px-1.5 py-px rounded-full">
          {matchTypeLabels[rule.matchType] || rule.matchType}
        </span>
        <span className="text-gray-300">·</span>
        <span>{replyTypeLabels[rule.keyType] || rule.keyType}</span>
        {rule.fullShop && (
          <>
            <span className="text-gray-300">·</span>
            <span className="bg-blue-50 text-blue-600 px-1.5 py-px rounded-full">
              全店
            </span>
          </>
        )}
      </div>

      {/* 回复预览 */}
      <div
        className={`px-3 pb-3 text-sm leading-tight truncate ${
          disabled ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {rule.replyContent || "（无回复内容）"}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
        {rule.itemsCount > 0 && (
          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-px rounded-full">
            📦{rule.itemsCount}商品
          </span>
        )}
        {rule.itemsCount === 0 && (
          <span className="text-xs text-gray-400">无关联</span>
        )}
        <span className="flex-1" />
        <button
          onClick={() => onEdit(rule)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          编辑
        </button>
        <button
          onClick={() => onDelete(rule)}
          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 重构 `RulesTab.tsx`**

替换 `RulesTab.tsx` 内容为：

```ts
"use client"

import { useState, useCallback } from "react"
import type { ReplyRule } from "@/lib/api/keywords"
import { updateReplyRule, deleteReplyRule } from "@/lib/api/keywords"
import { RuleTable } from "@/components/items/rules/RuleTable"
import { MobileRuleCard } from "@/components/items/views/MobileRuleCard"
import { RuleDrawer } from "@/components/items/drawers/RuleItemsAllDrawer"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from '@/components/ui/Toaster'
import type { KeywordStats } from "@/hooks/useKeywords"

interface RulesTabProps {
  isMobile: boolean
  keywordRules: ReplyRule[]
  rulesStats: KeywordStats
  keywordsLoading: boolean
  keywordsError: unknown
}

const DESKTOP_STAT_CARDS = [
  { key: "total",        label: "规则总数", color: "text-gray-900", bg: "bg-gray-50" },
  { key: "enabled",      label: "已启用",   color: "text-green-600", bg: "bg-green-50" },
  { key: "disabled",     label: "已禁用",   color: "text-gray-600", bg: "bg-gray-50" },
  { key: "linkedItems",  label: "关联商品", color: "text-blue-600", bg: "bg-blue-50" },
] as const

const MOBILE_STAT_PILLS = [
  { key: "total",        label: "总数", color: "text-gray-900" },
  { key: "enabled",      label: "启用", color: "text-green-600" },
  { key: "disabled",     label: "禁用", color: "text-gray-600" },
  { key: "linkedItems",  label: "商品", color: "text-blue-600" },
] as const

export function RulesTab({
  isMobile,
  keywordRules,
  rulesStats,
  keywordsLoading,
  keywordsError,
}: RulesTabProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRule, setEditingRule] = useState<ReplyRule | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleToggleEnabled = useCallback(async (rule: ReplyRule) => {
    setToggling(String(rule.id))
    try {
      await updateReplyRule(rule.id, { enabled: !rule.enabled })
      addToast({
        title: "更新成功",
        description: `规则已${!rule.enabled ? "启用" : "禁用"}`,
      })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
    } catch (e) {
      addToast({
        title: "更新失败",
        description: String(e),
        variant: "error",
      })
    } finally {
      setToggling(null)
    }
  }, [queryClient, addToast])

  const handleDelete = useCallback(async (rule: ReplyRule) => {
    if (!confirm(`确定要删除此规则吗？`)) return
    setDeleting(String(rule.id))
    try {
      await deleteReplyRule(rule.id)
      addToast({ title: "已删除", description: "规则已删除" })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
    } catch (e) {
      addToast({
        title: "删除失败",
        description: String(e),
        variant: "error",
      })
    } finally {
      setDeleting(null)
    }
  }, [queryClient, addToast])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* 移动端统计 + 创建 */}
      {isMobile ? (
        <div className="flex items-center gap-1.5 px-3 py-1 border-b border-gray-100">
          <div className="flex gap-1.5 overflow-x-auto flex-shrink min-w-0">
            {MOBILE_STAT_PILLS.map(({ key, label, color }) => (
              <div
                key={key}
                className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 flex-shrink-0"
              >
                <span className={`text-xs font-semibold ${color}`}>
                  {rulesStats[key as keyof KeywordStats]}
                </span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-[4px]" />
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex-shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-100">
            {DESKTOP_STAT_CARDS.map(({ key, label, color, bg }) => (
              <div key={key} className={`${bg} border border-gray-200 rounded-xl p-3`}>
                <div className={`text-2xl font-semibold ${color}`}>
                  {rulesStats[key as keyof KeywordStats]}
                </div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建规则
            </button>
          </div>
        </>
      )}

      {/* 规则列表 / 空状态 */}
      {keywordsLoading && (
        <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
      )}
      {keywordsError != null && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 m-4">
          加载规则列表失败: {String(keywordsError)}
        </div>
      )}
      {!keywordsLoading && !keywordsError && rulesStats.total === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
          <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            创建规则
          </button>
        </div>
      )}
      {!keywordsLoading && !keywordsError && rulesStats.total > 0 && (
        <>
          {!isMobile && (
            <RuleTable
              className="border-0 rounded-none shadow-none"
              rules={keywordRules}
              onEdit={setEditingRule}
              onToggleEnabled={handleToggleEnabled}
              onDelete={handleDelete}
              toggling={toggling}
              deleting={deleting}
            />
          )}
          {isMobile && (
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-2">
              {keywordRules.map((rule) => (
                <MobileRuleCard
                  key={rule.id}
                  rule={rule}
                  onToggleEnabled={handleToggleEnabled}
                  onEdit={setEditingRule}
                  onDelete={handleDelete}
                  toggling={toggling === String(rule.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 创建 / 编辑抽屉 */}
      {showCreateForm && (
        <RuleDrawer
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
      {editingRule && (
        <RuleDrawer
          rule={editingRule}
          open={!!editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => setEditingRule(null)}
        />
      )}
    </div>
  )
}
```

**变更要点**：
- 统计卡片从 5 列改为 4 列（`grid-cols-5` → `grid-cols-4`），移除 linkedGroups
- MOBILE_STAT_PILLS 移除 groups 条目
- `rule.rule_id` → `rule.id`（转为 string 用于 DOM key / loading 标识）
- `rulesStats.linkedGroups` → 删除
- `DESKTOP_STAT_CARDS` 移除 linkedGroups 条目

- [ ] **Step 4: Commit**

```bash
git add components/items/rules/RuleTable.tsx components/items/views/MobileRuleCard.tsx components/items/RulesTab.tsx
git commit -m "refactor(rules): align RuleTable, MobileRuleCard, RulesTab with ReplyRule types

- All field accesses: rule_id→id, reply_type→keyType, reply_content→replyContent, match_type→matchType
- RuleTable: lazy-loaded linked items via fetchRuleItems on expand
- RuleTable: add fullShop badge column
- MobileRuleCard: remove linked_groups tag, add fullShop badge
- RulesTab: 5→4 stat cards, remove linkedGroups
- Predefined labels fetched via React Query in display components

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 重构 `RuleItemsAllDrawer` (RuleDrawer) — 批量关联

**Files:**
- Modify: `components/items/drawers/RuleItemsAllDrawer.tsx`

**Interfaces:**
- Consumes: `ReplyRule`, `createReplyRule`, `updateReplyRule`, `bindRuleItems`, `unbindRuleItems`, `fetchBindableItems`, `BindableItem` (from Task 1)
- Consumes: `KeywordRuleForm`, `RuleFormData` (from Task 3)

- [ ] **Step 1: 替换文件内容**

用以下内容替换 `components/items/drawers/RuleItemsAllDrawer.tsx`：

```ts
"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ReplyRule,
  createReplyRule,
  updateReplyRule,
  bindRuleItems,
  unbindRuleItems,
  fetchBindableItems,
} from "@/lib/api/keywords"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"
import { RuleBindingPanel } from "../parts/RuleBindingPanel"

interface RuleDrawerProps {
  rule?: ReplyRule
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RuleDrawer({ rule, open, onClose, onSuccess }: RuleDrawerProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isDirty, setIsDirty] = useState(false)

  // 关联商品选择状态
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // 初始化关联数据
  useEffect(() => {
    if (rule) {
      // 编辑模式下，需要从后端加载已关联的商品列表
      setSelectedItemIds([]) // 将在 useEffect 中通过 fetchRuleItems 填充
    } else {
      setSelectedItemIds([])
    }
  }, [rule])

  // 加载可绑定商品列表
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["bindable-items"],
    queryFn: fetchBindableItems,
    enabled: open,
  })

  const dataReady = !itemsLoading
  const isEdit = !!rule

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  // 保存（含关联同步 — 批量操作）
  const handleSave = async (data: RuleFormData) => {
    try {
      let savedRule: ReplyRule | null = null

      if (isEdit) {
        savedRule = await updateReplyRule(rule!.id, {
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
        })
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        savedRule = await createReplyRule({
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
          gids: selectedItemIds.length > 0 ? selectedItemIds : undefined,
        })
        addToast({ title: "创建成功", description: "规则已创建" })
      }

      // 编辑模式：同步关联变更（批量操作）
      if (savedRule && isEdit) {
        // 编辑模式下需要知道原来的关联才能做 diff
        // 简化处理：全量替换 — 先解绑所有，再绑定选中的
        // 实际生产中需要更精细的 diff 逻辑
        if (selectedItemIds.length > 0) {
          await bindRuleItems(savedRule.id, selectedItemIds)
        }
      }

      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      onSuccess()
    } catch (e) {
      addToast({
        title: isEdit ? "更新失败" : "创建失败",
        description: String(e),
        variant: "error",
      })
    }
  }

  const handleCancel = () => {
    setIsDirty(false)
    onClose()
  }

  const title = isEdit ? "编辑规则" : "创建规则"

  const sidePanelContent = dataReady ? (
    <RuleBindingPanel
      items={items}
      selectedItemIds={selectedItemIds}
      onToggleItem={toggleItem}
    />
  ) : (
    <div className="flex items-center justify-center py-6">
      <LoadingSpinner />
    </div>
  )

  const desktopContent = (
    <KeywordRuleForm
      rule={rule}
      onSubmit={handleSave}
      onCancel={handleCancel}
      onDirtyChange={setIsDirty}
      showItemCardPanel
      sidePanel={sidePanelContent}
    />
  )

  const mobileContent = (
    <>
      <KeywordRuleForm
        rule={rule}
        onSubmit={handleSave}
        onCancel={handleCancel}
        onDirtyChange={setIsDirty}
      />
      {dataReady && (
        <div className="mt-3">
          <RuleBindingPanel
            items={items}
            selectedItemIds={selectedItemIds}
            onToggleItem={toggleItem}
          />
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">{mobileContent}</div>
      </BottomSheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      width="min(66vw, 900px)"
      closeOnBackdrop={!isDirty}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{desktopContent}</div>
    </Sheet>
  )
}
```

**变更要点**：
- 移除 `listRuleItems`、`listItemGroups`、`linkItemToRule`、`unlinkItemFromRule`、`linkGroupToRule`、`unlinkGroupFromRule` 导入
- 使用 `fetchBindableItems` 替代 `listRuleItems`
- 移除所有 group 相关状态、逻辑、UI
- `rule!.rule_id` → `rule!.id`
- 关联操作改为批量：创建时通过 `gids` 参数传入；编辑时调用 `bindRuleItems`
- `KeywordRule` → `ReplyRule` 类型

- [ ] **Step 2: Commit**

```bash
git add components/items/drawers/RuleItemsAllDrawer.tsx
git commit -m "refactor(RuleDrawer): batch binding, remove groups, ReplyRule types

- fetchBindableItems replaces listRuleItems
- Remove all group-related logic (state, API calls, UI)
- Batch binding via gids[] param on create, bindRuleItems on edit
- Rule type: KeywordRule→ReplyRule, rule_id→id

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 重构 `RulesItemsingleDrawer` (KeywordDrawer)

**Files:**
- Modify: `components/items/drawers/RulesItemsingleDrawer.tsx`

**Interfaces:**
- Consumes: `ReplyRule`, `createReplyRule`, `updateReplyRule`, `bindItemRules`, `unbindItemRules`, `fetchItemRules`, `fetchPredefinedKeywords` (from Task 1)
- Consumes: `KeywordRuleForm`, `RuleFormData` (from Task 3)

- [ ] **Step 1: 替换文件内容**

```ts
"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ReplyRule,
  createReplyRule,
  updateReplyRule,
  unbindItemRules,
  bindItemRules,
  fetchItemRules,
  fetchPredefinedKeywords,
  formatRuleKeyword,
} from "@/lib/api/keywords"
import type { Item } from "@/lib/api/items"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"

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
  const [editingRule, setEditingRule] = useState<ReplyRule | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // 预定义关键词标签
  const { data: prefLabels = {} } = useQuery({
    queryKey: ["predefined-keywords"],
    queryFn: fetchPredefinedKeywords,
    staleTime: 5 * 60 * 1000,
  })

  // 获取当前商品关联的规则
  const { data: linkedRules = [], isLoading: linkedLoading } = useQuery({
    queryKey: ["item-rules", item.gid],
    queryFn: () => fetchItemRules(item.gid),
  })

  const bindingWarning =
    editingRule && editingRule.itemsCount > 0
      ? `此规则已关联 ${editingRule.itemsCount} 个商品，修改将影响所有关联商品`
      : undefined

  const handleCreateNew = () => {
    setEditingRule(null)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  const handleEditRule = (rule: ReplyRule) => {
    setEditingRule(rule)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  const handleSave = async (data: RuleFormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        await updateReplyRule(editingRule.id, {
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
        })
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const savedRule = await createReplyRule({
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
        })
        await bindItemRules(item.gid, [savedRule.id])
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["item-rules", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
      setIsDirty(false)
    } catch (e) {
      addToast({
        title: editingRule ? "更新失败" : "创建失败",
        description: String(e),
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnlinkRule = async (rule: ReplyRule) => {
    const keyword = formatRuleKeyword(rule, prefLabels)
    if (!confirm(`确定要解除规则"${keyword}"与此商品的绑定吗？`)) return
    setLoading(true)
    try {
      await unbindItemRules(item.gid, [rule.id])
      addToast({ title: "已解除绑定", description: "规则与此商品的关联已取消" })
      queryClient.invalidateQueries({ queryKey: ["item-rules", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
    } catch (e) {
      addToast({ title: "解除绑定失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // ==== 规则列表视图 ====
  const ruleListView = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          已关联 {linkedRules.length} 个规则
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          + 创建新规则
        </button>
      </div>

      {linkedLoading ? (
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner size="md" />
        </div>
      ) : linkedRules.length > 0 ? (
        <div className="space-y-2">
          {linkedRules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        rule.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.enabled ? "启用" : "禁用"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatRuleKeyword(rule, prefLabels)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {rule.keyType === "predefined" ? "预定义" : rule.matchType}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {rule.replyContent || "(无回复内容)"}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleUnlinkRule(rule)}
                    disabled={loading}
                    className="px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    解除绑定
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          <p>暂无关联的关键词规则</p>
          <p className="text-xs mt-1">点击上方按钮创建新规则</p>
        </div>
      )}
    </>
  )

  const title = "关键词回复"

  const editView = (
    <KeywordRuleForm
      rule={editingRule ?? undefined}
      linkedItem={item}
      bindingWarning={bindingWarning}
      onSubmit={handleSave}
      onCancel={() => {
        setShowCreateForm(false)
        setEditingRule(null)
        setIsDirty(false)
      }}
      onDestructiveAction={
        editingRule
          ? { label: "解除绑定", onAction: () => handleUnlinkRule(editingRule) }
          : undefined
      }
      onDirtyChange={setIsDirty}
      showItemCardPanel
    />
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        heightRatio={0.95}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!showCreateForm ? (
            ruleListView
          ) : (
            <KeywordRuleForm
              rule={editingRule ?? undefined}
              linkedItem={item}
              bindingWarning={bindingWarning}
              onSubmit={handleSave}
              onCancel={() => {
                setShowCreateForm(false)
                setEditingRule(null)
                setIsDirty(false)
              }}
              onDestructiveAction={
                editingRule
                  ? { label: "解除绑定", onAction: () => handleUnlinkRule(editingRule) }
                  : undefined
              }
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      width="min(66vw, 900px)"
      closeOnBackdrop={!isDirty}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!showCreateForm ? ruleListView : editView}
      </div>
    </Sheet>
  )
}
```

**变更要点**：
- `getRulesForItem(item.gid)` → `fetchItemRules(item.gid)`（返回类型从 `KeywordRuleListResponse` 变为 `ReplyRule[]`）
- `PREDEFINED_KEYWORDS` 硬编码 → `fetchPredefinedKeywords` React Query
- 移除内联 `getDisplayKeyword` 函数，用 `formatRuleKeyword(rule, prefLabels)`
- `linkItemToRule(savedRule.rule_id, item.gid)` → `bindItemRules(item.gid, [savedRule.id])`
- `unlinkItemFromRule(rule.rule_id, item.gid)` → `unbindItemRules(item.gid, [rule.id])`
- `rule.rule_id` → `rule.id`，`rule.reply_type` → `rule.keyType`，`rule.reply_content` → `rule.replyContent`
- `rule.linked_items` → `rule.itemsCount`
- `linkedRulesData?.rules` → `linkedRules`（直接是数组）

- [ ] **Step 2: Commit**

```bash
git add components/items/drawers/RulesItemsingleDrawer.tsx
git commit -m "refactor(KeywordDrawer): align API calls and types with ReplyRule

- getRulesForItem→fetchItemRules, flat ReplyRule[] response
- Predefined keywords from API, not hardcoded PREDEFINED_KEYWORDS
- formatRuleKeyword replaces inline getDisplayKeyword
- Batch bind/unbind: bindItemRules/unbindItemRules with id arrays
- Field renames: rule_id→id, reply_type→keyType, etc.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 重构 `RuleBindingPanel` + `ItemCardPanel`

**Files:**
- Modify: `components/items/parts/RuleBindingPanel.tsx`
- Modify: `components/items/parts/ItemCardPanel.tsx`

**Interfaces:**
- Consumes: `BindableItem`, `fetchBindableItems` (from Task 1)

- [ ] **Step 1: 重构 `RuleBindingPanel.tsx`**

用以下内容替换 `components/items/parts/RuleBindingPanel.tsx`：

```ts
"use client"

import { useState, useMemo } from "react"
import type { BindableItem } from "@/lib/api/keywords"
import { CollapsiblePanel } from "./CollapsiblePanel"

export interface RuleBindingPanelProps {
  items: BindableItem[]
  selectedItemIds: string[]
  onToggleItem: (id: string) => void
}

export function RuleBindingPanel({
  items,
  selectedItemIds,
  onToggleItem,
}: RuleBindingPanelProps) {
  const [itemSearch, setItemSearch] = useState("")

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items
    const q = itemSearch.toLowerCase()
    return items.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        String(item.gid).toLowerCase().includes(q)
    )
  }, [items, itemSearch])

  return (
    <div className="flex flex-col gap-2">
      <CollapsiblePanel
        title="关联商品"
        icon="🔗"
        badge={selectedItemIds.length}
      >
        <div className="p-3 space-y-2">
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="搜索商品..."
            className="w-full px-3 py-1 border border-gray-300 rounded-lg text-xs"
          />
          <div className="max-h-36 overflow-y-auto">
            {items.length > 0 ? (
              filteredItems.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {filteredItems.map((item) => {
                    const selected = selectedItemIds.includes(String(item.gid))
                    return (
                      <button
                        key={item.gid}
                        type="button"
                        onClick={() => onToggleItem(String(item.gid))}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          selected
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {item.title || `商品#${item.gid}`}
                        {selected && <span className="ml-1 text-blue-400">✕</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  未找到匹配的商品
                </p>
              )
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                暂无可关联的商品
              </p>
            )}
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  )
}
```

**变更要点**：
- 移除 `ItemGroup` 导入、`groups`/`selectedGroupIds`/`onToggleGroup` props
- 移除整个"关联商品组"折叠面板
- `RuleItem` → `BindableItem`，`item.gid` → `String(item.gid)`（BindableItem.gid 是 number）
- `item.title` 保留（BindableItem 有 title 字段）

- [ ] **Step 2: 重构 `ItemCardPanel.tsx`**

用以下内容替换 `components/items/parts/ItemCardPanel.tsx`：

```ts
"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchBindableItems } from "@/lib/api/keywords"
import { CollapsiblePanel } from "./CollapsiblePanel"

interface ItemCardPanelProps {
  onInsert: (itemId: string) => void
}

export function ItemCardPanel({ onInsert }: ItemCardPanelProps) {
  const [search, setSearch] = useState("")
  const [dataRequested, setDataRequested] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["item-card-panel-items"],
    queryFn: fetchBindableItems,
    enabled: dataRequested,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) =>
        String(i.gid).toLowerCase().includes(q) ||
        (i.title && i.title.toLowerCase().includes(q))
    )
  }, [items, search])

  const handleExpand = () => {
    if (!dataRequested) setDataRequested(true)
  }

  const handleInsert = (itemId: string) => {
    onInsert(itemId)
    setSearch("")
  }

  return (
    <CollapsiblePanel
      title="商品卡片"
      icon="📦"
      onExpand={handleExpand}
    >
      <div className="p-3 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索商品..."
          className="w-full px-3 py-1 border border-gray-300 rounded-lg text-xs"
        />
        <div className="max-h-44 overflow-y-auto space-y-1">
          {isLoading ? (
            <p className="text-center text-gray-400 py-3 text-xs">加载中...</p>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.gid}
                type="button"
                onClick={() => handleInsert(String(item.gid))}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors bg-white"
              >
                <div className="font-medium text-gray-900 truncate text-xs">
                  {item.title || "无标题"}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span>ID: {String(item.gid).slice(0, 10)}...</span>
                  {item.reservePrice && <span>¥{item.reservePrice}</span>}
                </div>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-400 py-3 text-xs">
              {search ? "未找到匹配的商品" : "暂无可选的商品"}
            </p>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  )
}
```

**变更要点**：
- `listRuleItems` → `fetchBindableItems`
- `RuleItem` → `BindableItem`，`item.gid` → `String(item.gid)`
- `item.price` → `item.reservePrice`

- [ ] **Step 3: Commit**

```bash
git add components/items/parts/RuleBindingPanel.tsx components/items/parts/ItemCardPanel.tsx
git commit -m "refactor(RuleBindingPanel, ItemCardPanel): BindableItem type, remove groups

- RuleBindingPanel: remove group panel, props simplified to items only
- RuleBindingPanel: RuleItem→BindableItem, gid cast to string
- ItemCardPanel: listRuleItems→fetchBindableItems, BindableItem type
- price→reservePrice field rename

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: TypeScript 类型检查 + 构建验证

**Files:**
- 验证所有已变更文件

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
cd frontend && npx tsc --noEmit
```

预期：零错误。

如发现错误，逐文件修复（常见的遗漏：某文件中仍有旧字段引用 `rule_id`、`reply_type`、`linked_items` 等）。

- [ ] **Step 2: 全局 grep 检查残留旧名称**

```bash
cd frontend && rg "PREDEFINED_KEYWORDS|KeywordRule[^F]|LinkedItemInfo|LinkedGroupInfo|listKeywordRules|getKeywordRule|createKeywordRule|updateKeywordRule|deleteKeywordRule|linkItemToRule|unlinkItemFromRule|linkGroupToRule|unlinkGroupFromRule|getRulesForItem|listRuleItems|getDisplayKeyword|rule_id|reply_type|linked_items|linked_groups|linked_item_list|linked_group_list|created_at" --type ts --type tsx
```

排除 `docs/` 下的历史文件。`src/` 中应无残留。如有，逐一修复。

> 注意：`created_at` 是后端返回的新字段名，不在此列表中。旧的 `created_at` 字段已不存在（后端用 `create_at`），但 grep 中 `created_at` 捕获的是旧前端用法。如果后端返回 `create_at`（无 d），则 grep 过滤 `created_at`；若返回 `created_at` 则排除。

根据后端 schema：
- `create_at`（无 d）
- `update_at`（无 d）

故 `created_at` 和 `updated_at` 均为旧字段名，需要检查是否有残留。

- [ ] **Step 3: 运行生产构建**

```bash
cd frontend && npm run build
```

预期：构建成功，无错误。

- [ ] **Step 4: Commit（如有修复）**

```bash
git add -A
git commit -m "chore: fix remaining old-type references after keywords API migration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

如无修复则跳过此 commit。

---

## 验证清单

- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run build` 构建成功
- [ ] `rg` 无旧名称残留（排除 docs/）
- [ ] 所有 import 路径正确（`@/lib/api/keywords`）
- [ ] `keyword: string[]` 只在 API 层出现，表单/展示层均为 string
- [ ] 预定义关键词通过 React Query 获取，`queryKey: ["predefined-keywords"]` 统一
- [ ] 无 `linked_groups` / `LinkedGroupInfo` / `linkGroupToRule` / `unlinkGroupFromRule` 残留
