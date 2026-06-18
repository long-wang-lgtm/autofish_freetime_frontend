# 侧边栏布局优化 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 KeywordRuleForm 布局为紧凑两列 + 折叠面板，统一 KeywordDrawer/RuleDrawer 宽度，修正关键词绑定语义。

**Architecture:** KeywordRuleForm 内部重构为「匹配规则」+「回复内容」两个紧凑卡片，回复类型改为 pill 切换、优先级/启用开关嵌入卡片头部。右列面板通过新增 CollapsiblePanel 和 ItemCardPanel 组件实现折叠逻辑。RuleBindingPanel 折叠化后从 form children 移到 Drawer 右列。

**Tech Stack:** React + TypeScript + react-hook-form + zod + Tailwind CSS v3

---

### 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `components/items/parts/CollapsiblePanel.tsx` | 新建 | 通用折叠面板容器 |
| `components/items/parts/ItemCardPanel.tsx` | 新建 | 商品卡片选择面板（从 KeywordRuleForm 提取） |
| `components/items/parts/KeywordRuleForm.tsx` | 修改 | 重构表单布局，紧凑两卡片 |
| `components/items/parts/RuleBindingPanel.tsx` | 修改 | 包裹 CollapsiblePanel，移除全选按钮 |
| `components/items/drawers/KeywordDrawer.tsx` | 修改 | 宽度统一、解绑语义、布局适配 |
| `components/items/drawers/RuleDrawer.tsx` | 修改 | 右列三面板布局 |

---

### Task 1: CollapsiblePanel — 通用折叠面板组件

**Files:**
- Create: `components/items/parts/CollapsiblePanel.tsx`

- [ ] **Step 1: 创建 CollapsiblePanel 组件**

```tsx
"use client"

import { useState, type ReactNode } from "react"

interface CollapsiblePanelProps {
  title: string
  /** 折叠态标题栏右侧显示的计数 badge */
  badge?: number
  /** 面板图标（emoji），默认无 */
  icon?: string
  defaultExpanded?: boolean
  onExpand?: () => void
  children: ReactNode
}

export function CollapsiblePanel({
  title,
  badge,
  icon,
  defaultExpanded = false,
  onExpand,
  children,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && onExpand) onExpand()
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 标题栏 — 点击切换展开/收起 */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xs font-medium text-gray-600 truncate">
          {icon && <span className="mr-1.5">{icon}</span>}
          {title}
        </span>
        <span className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!expanded && badge != null && badge > 0 && (
            <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* 内容区 */}
      {expanded && (
        <div className="border-t border-gray-100">{children}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: 提交**

```bash
git add components/items/parts/CollapsiblePanel.tsx
git commit -m "feat: add CollapsiblePanel component for collapsible sidebar panels

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: KeywordRuleForm — 表单布局重构

**Files:**
- Modify: `components/items/parts/KeywordRuleForm.tsx`

- [ ] **Step 1: 重写 KeywordRuleForm 组件**

用以下完整内容替换 `KeywordRuleForm.tsx`：

```tsx
"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeywordRule, listRuleItems, PREDEFINED_KEYWORDS } from "@/lib/api/keywords"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PlaceholderPicker } from "./PlaceholderPicker"

const makeItemCardPlaceholder = (itemId: string) => `[ITEM:${itemId}]`

export const ruleSchema = z.object({
  reply_type: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  reply_content: z.string().min(1, "回复内容不能为空"),
  match_type: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
})

export type RuleFormData = z.infer<typeof ruleSchema>

export interface KeywordRuleFormProps {
  rule?: KeywordRule
  linkedItem?: { title?: string; price?: number; gid?: string }
  bindingWarning?: string
  onSubmit: (data: RuleFormData) => Promise<void>
  onCancel: () => void
  onDestructiveAction?: { label: string; onAction: () => Promise<void> }
  onDirtyChange?: (dirty: boolean) => void
  /** 右侧折叠面板区域，由父 Drawer 注入 */
  sidePanel?: React.ReactNode
}

export function KeywordRuleForm({
  rule,
  linkedItem,
  bindingWarning,
  onSubmit,
  onCancel,
  onDestructiveAction,
  onDirtyChange,
  sidePanel,
}: KeywordRuleFormProps) {
  const isEdit = !!rule
  const [loading, setLoading] = useState(false)
  const [destructiveLoading, setDestructiveLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      reply_type: rule?.reply_type || "custom",
      keyword: rule?.keyword || "",
      reply_content: rule?.reply_content || "",
      match_type: rule?.match_type || "exact",
      priority: rule?.priority || 0,
      enabled: rule?.enabled ?? true,
    },
  })

  const replyType = watch("reply_type")
  const replyContent = watch("reply_content")

  // Dirty state tracking
  const isDirty = Object.keys(dirtyFields).length > 0
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Insert placeholder via PlaceholderPicker or drag-drop
  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const currentValue = replyContent || ""
      setValue("reply_content", currentValue + placeholder, { shouldValidate: true, shouldDirty: true })
    },
    [replyContent, setValue]
  )

  // Handle drop into reply content textarea
  const handleReplyContentDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const text = e.dataTransfer.getData("text/plain")
      if (text && (text.startsWith("[ITEM:") || text.startsWith("{"))) {
        const currentValue = replyContent || ""
        setValue("reply_content", currentValue + text, { shouldValidate: true, shouldDirty: true })
      }
    },
    [replyContent, setValue]
  )

  const handleSubmitForm = async (data: RuleFormData) => {
    setLoading(true)
    try {
      await onSubmit(data)
      reset(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  const handleDestructive = async () => {
    if (!onDestructiveAction) return
    setDestructiveLoading(true)
    try {
      await onDestructiveAction.onAction()
    } finally {
      setDestructiveLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="flex-1 min-h-0 flex flex-col">
      {/* 顶部：启用开关（左上角） */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={watch("enabled")}
          onClick={() => setValue("enabled", !watch("enabled"), { shouldDirty: true })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
            watch("enabled") ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              watch("enabled") ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </button>
        <span className="text-sm text-gray-700 select-none">启用</span>
      </div>

      {/* 主体：左列表单 + 右列面板 */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* 左列 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 🔑 匹配规则卡片 */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700">匹配规则</span>
                {/* 回复类型 pill 切换 */}
                <div className="flex gap-0.5 bg-blue-100 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setValue("reply_type", "custom", { shouldDirty: true })}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                      replyType === "custom"
                        ? "bg-white text-blue-700 font-medium shadow-sm"
                        : "text-blue-500 hover:text-blue-700"
                    }`}
                  >
                    自定义
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("reply_type", "predefined", { shouldDirty: true })}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                      replyType === "predefined"
                        ? "bg-white text-blue-700 font-medium shadow-sm"
                        : "text-blue-500 hover:text-blue-700"
                    }`}
                  >
                    预定义
                  </button>
                </div>
              </div>
              {/* 优先级 */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-gray-400">优先级</label>
                <input
                  type="number"
                  {...register("priority", { valueAsNumber: true })}
                  className="w-[42px] px-1.5 py-0.5 border border-gray-300 rounded text-xs text-center"
                />
              </div>
            </div>

            {/* 关键词 / 匹配方式 或 预定义选择 */}
            {replyType === "predefined" ? (
              <select
                {...register("keyword")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {PREDEFINED_KEYWORDS.map((kw) => (
                  <option key={kw.value} value={kw.value}>
                    {kw.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-3">
                <div className="flex-[5]">
                  <label className="block text-[11px] text-gray-500 mb-1">关键词</label>
                  <input
                    {...register("keyword")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="例如: 多少钱 / 价格"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-[11px] text-gray-500 mb-1">匹配方式</label>
                  <select
                    {...register("match_type")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="exact">精确匹配</option>
                    <option value="fuzzy">模糊匹配</option>
                    <option value="regex">正则匹配</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 💬 回复内容卡片 */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3">
            <label className="block text-xs font-semibold text-purple-700 mb-2">
              回复内容 <span className="text-red-500">*</span>
            </label>

            {/* 占位符工具栏 */}
            <PlaceholderPicker onInsert={insertPlaceholder} draggable />

            {/* Textarea */}
            <div className="mt-2">
              <textarea
                {...register("reply_content")}
                rows={5}
                onDrop={handleReplyContentDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none text-sm"
                placeholder="当消息匹配时，自动发送此回复内容"
              />
              {errors.reply_content && (
                <p className="mt-1 text-xs text-red-500">{errors.reply_content.message}</p>
              )}
              <p className="mt-1 text-[11px] text-gray-400">
                占位符格式：{"{占位符名称}"}，商品卡片格式：[ITEM:商品ID]
              </p>
            </div>
          </div>

          {/* 关联商品信息 / 警告 */}
          {linkedItem && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
              <div className="text-xs text-green-700">
                <span className="font-medium">关联商品：</span>
                {linkedItem.title || "无标题"}
                {linkedItem.price != null && ` (¥${linkedItem.price})`}
              </div>
            </div>
          )}
          {bindingWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <div className="text-xs text-amber-700">{bindingWarning}</div>
            </div>
          )}
        </div>

        {/* 右列面板 */}
        {sidePanel && (
          <div className="w-[220px] flex-shrink-0 flex flex-col gap-2">
            {sidePanel}
          </div>
        )}
      </div>

      {/* 底部按钮栏 */}
      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100 flex-shrink-0">
        {onDestructiveAction && (
          <button
            type="button"
            onClick={handleDestructive}
            disabled={destructiveLoading || loading}
            className="px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50"
          >
            {destructiveLoading ? "处理中..." : onDestructiveAction.label}
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {isEdit ? "保存" : "创建"}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: 0 errors.

- [ ] **Step 3: 提交**

```bash
git add components/items/parts/KeywordRuleForm.tsx
git commit -m "refactor: compact KeywordRuleForm layout with pill toggle, card grouping, sidePanel slot

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: ItemCardPanel — 商品卡片选择面板

**Files:**
- Create: `components/items/parts/ItemCardPanel.tsx`

- [ ] **Step 1: 创建 ItemCardPanel 组件**

```tsx
"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { listRuleItems } from "@/lib/api/keywords"
import { CollapsiblePanel } from "./CollapsiblePanel"

interface ItemCardPanelProps {
  onInsert: (itemId: string) => void
}

export function ItemCardPanel({ onInsert }: ItemCardPanelProps) {
  const [search, setSearch] = useState("")
  const [dataRequested, setDataRequested] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["item-card-panel-items"],
    queryFn: listRuleItems,
    enabled: dataRequested,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) =>
        i.gid.toLowerCase().includes(q) ||
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
      <div className="p-2 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索商品..."
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs"
        />
        <div className="max-h-44 overflow-y-auto space-y-1">
          {isLoading ? (
            <p className="text-center text-gray-400 py-3 text-xs">加载中...</p>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.gid}
                type="button"
                onClick={() => handleInsert(item.gid)}
                className="w-full text-left p-2 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors bg-white"
              >
                <div className="font-medium text-gray-900 truncate text-xs">
                  {item.title || "无标题"}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  <span>ID: {item.gid.slice(0, 10)}...</span>
                  <span>¥{item.price}</span>
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

- [ ] **Step 2: 类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: 提交**

```bash
git add components/items/parts/ItemCardPanel.tsx
git commit -m "feat: add ItemCardPanel — collapsible item card picker for sidebar

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: RuleBindingPanel — 折叠化

**Files:**
- Modify: `components/items/parts/RuleBindingPanel.tsx`

- [ ] **Step 1: 重写 RuleBindingPanel，包裹 CollapsiblePanel**

```tsx
"use client"

import { useState, useMemo } from "react"
import type { RuleItem } from "@/lib/api/keywords"
import type { ItemGroup } from "@/lib/api/items"
import { CollapsiblePanel } from "./CollapsiblePanel"

export interface RuleBindingPanelProps {
  items: RuleItem[]
  groups: ItemGroup[]
  selectedItemIds: string[]
  selectedGroupIds: string[]
  onToggleItem: (id: string) => void
  onToggleGroup: (id: string) => void
}

export default function RuleBindingPanel({
  items,
  groups,
  selectedItemIds,
  selectedGroupIds,
  onToggleItem,
  onToggleGroup,
}: RuleBindingPanelProps) {
  const [itemSearch, setItemSearch] = useState("")
  const [groupSearch, setGroupSearch] = useState("")

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items
    const q = itemSearch.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.gid.toLowerCase().includes(q)
    )
  }, [items, itemSearch])

  const filteredGroups = useMemo(() => {
    if (!groupSearch) return groups
    const q = groupSearch.toLowerCase()
    return groups.filter((group) =>
      group.groupName.toLowerCase().includes(q)
    )
  }, [groups, groupSearch])

  return (
    <div className="flex flex-col gap-2">
      {/* 关联商品 */}
      <CollapsiblePanel
        title="关联商品"
        icon="🔗"
        badge={selectedItemIds.length}
      >
        <div className="p-2 space-y-2">
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="搜索商品..."
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs"
          />
          <div className="max-h-36 overflow-y-auto">
            {items.length > 0 ? (
              filteredItems.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {filteredItems.map((item) => {
                    const selected = selectedItemIds.includes(item.gid)
                    return (
                      <button
                        key={item.gid}
                        type="button"
                        onClick={() => onToggleItem(item.gid)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selected
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {item.title || item.gid.slice(0, 10)}
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

      {/* 关联商品组 */}
      <CollapsiblePanel
        title="关联商品组"
        icon="📁"
        badge={selectedGroupIds.length}
      >
        <div className="p-2 space-y-2">
          <input
            type="text"
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            placeholder="搜索商品组..."
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs"
          />
          <div className="max-h-36 overflow-y-auto">
            {groups.length > 0 ? (
              filteredGroups.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {filteredGroups.map((group) => {
                    const selected = selectedGroupIds.includes(group.groupId)
                    return (
                      <button
                        key={group.groupId}
                        type="button"
                        onClick={() => onToggleGroup(group.groupId)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selected
                            ? "bg-purple-100 text-purple-700 border border-purple-300"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {group.groupName}
                        {selected && <span className="ml-1 text-purple-400">✕</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  未找到匹配的商品组
                </p>
              )
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                暂无可关联的商品组
              </p>
            )}
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: 提交**

```bash
git add components/items/parts/RuleBindingPanel.tsx
git commit -m "refactor: collapse RuleBindingPanel with CollapsiblePanel, remove select-all

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: KeywordDrawer — 宽度统一 + 解绑语义 + 布局适配

**Files:**
- Modify: `components/items/drawers/KeywordDrawer.tsx`
- Modify: `lib/api/keywords.ts` (确认 `unlinkItemFromRule` 是否存在)

- [ ] **Step 1: 检查 unlinkItemFromRule API 是否存在**

先确认 `unlinkItemFromRule` 是否在 `@/lib/api/keywords` 中导出：

```bash
cd "E:\.project\autofish_freetime\frontend" && grep -n "unlinkItemFromRule" lib/api/keywords.ts
```

如果存在则跳过此步骤。如果不存在，则需要添加 API 函数。

- [ ] **Step 2: 重写 KeywordDrawer**

```tsx
"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type KeywordRule,
  createKeywordRule,
  updateKeywordRule,
  unlinkItemFromRule,
  linkItemToRule,
  PREDEFINED_KEYWORDS,
  getRulesForItem,
} from "@/lib/api/keywords"
import type { Item } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"
import { ItemCardPanel } from "../parts/ItemCardPanel"

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
  const [isDirty, setIsDirty] = useState(false)

  const { data: linkedRulesData, isLoading: linkedLoading } = useQuery({
    queryKey: ["keywords", "item", item.gid],
    queryFn: () => getRulesForItem(item.gid),
  })

  const bindingWarning =
    editingRule && editingRule.linked_items > 0
      ? `此规则已关联 ${editingRule.linked_items} 个商品，修改将影响所有关联商品`
      : undefined

  const handleCreateNew = () => {
    setEditingRule(null)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  const handleEditRule = (rule: KeywordRule) => {
    setEditingRule(rule)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  const handleSave = async (data: RuleFormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        await updateKeywordRule(editingRule.rule_id, data)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const savedRule = await createKeywordRule(data)
        await linkItemToRule(savedRule.rule_id, item.gid)
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
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

  // 解除绑定（替代原来的删除）
  const handleUnlinkRule = async (rule: KeywordRule) => {
    if (!confirm(`确定要解除规则"${rule.keyword}"与此商品的绑定吗？`)) return
    setLoading(true)
    try {
      await unlinkItemFromRule(rule.rule_id, item.gid)
      addToast({ title: "已解除绑定", description: "规则与此商品的关联已取消" })
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
    } catch (e) {
      addToast({ title: "解除绑定失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 插入商品卡片占位符到回复内容
  const insertItemCard = useCallback(
    (itemId: string) => {
      const placeholder = `[ITEM:${itemId}]`
      // ItemCardPanel 的 onInsert 已经在 KeywordRuleForm 外部
      // 这里通过在 sidePanel 中包裹 ItemCardPanel，但 insert 回调需要穿透到 form
      // 解决方案：使用 ref 或状态提升
      // 此处选择简单方案：ItemCardPanel 放在 sidePanel 内，
      // 通过 window-level event 或直接操作 DOM textarea
      // 实际实现：让 ItemCardPanel 通过 form 组件暴露的 setValue 来插入
      // 由于 KeywordRuleForm 在内部管理 form state，
      // 我们在 KeywordDrawer 层面无法直接操作 textarea
      // 调整为：ItemCardPanel 通过一个 ref 回调来处理
    },
    []
  )

  // 规则列表视图
  const ruleListView = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          已关联 {linkedRulesData?.total || 0} 个规则
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + 创建新规则
        </button>
      </div>

      {linkedLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : linkedRulesData?.rules && linkedRulesData.rules.length > 0 ? (
        <div className="space-y-2">
          {linkedRulesData.rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        rule.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.enabled ? "启用" : "禁用"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {rule.reply_type === "predefined"
                        ? PREDEFINED_KEYWORDS.find((k) => k.value === rule.keyword)?.label || rule.keyword
                        : rule.keyword}
                    </span>
                    <span className="text-xs text-gray-400">
                      {rule.reply_type === "predefined" ? "预定义" : rule.match_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {rule.reply_content || "(无回复内容)"}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleUnlinkRule(rule)}
                    disabled={loading}
                    className="px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                  >
                    解除绑定
                  </button>
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
    </>
  )

  const title = "关键词回复"
  const subtitle = `为商品「${item.title || item.gid.slice(0, 10)}...」配置关键词自动回复`

  // 编辑表单 — 右列仅 ItemCardPanel
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
      sidePanel={<ItemCardPanel onInsert={insertItemCard} />}
    />
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        heightRatio={0.95}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!showCreateForm ? ruleListView : editView}
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

- [ ] **Step 3: 处理 ItemCardPanel insert 穿透问题**

`ItemCardPanel` 需要将 `[ITEM:xxx]` 插入到 `KeywordRuleForm` 内部的 textarea。但 `ItemCardPanel` 现在是 sidePanel 的一部分，无法直接操作 form 内部的 `setValue`。

**解决方案**：给 `KeywordRuleForm` 添加 `onInsertItemCard?: (itemId: string) => void` prop，内部包装 `insertItemCard` 逻辑。或者更简单：`KeywordRuleForm` 内部仍然保留 `insertItemCard` 逻辑，由 `ItemCardPanel` 通过 props 回调穿透。

实际上，最简单的方案是 `ItemCardPanel` 只负责 UI 和选择，`onInsert` 回调由 `KeywordRuleForm` 内部处理。即 `KeywordRuleForm` 内部渲染 `ItemCardPanel` 作为 sidePanel 的一部分，这样它可以直接访问 `setValue`。

调整 `KeywordRuleForm` — 在 `sidePanel` 区域，如果调用方传了 `sidePanel` 就渲染，但 `ItemCardPanel` 的 `onInsert` 由 `KeywordRuleForm` 内部提供。这需要移除 `sidePanel` 的通用性，或者改为更明确的 prop。

**选择方案**：新增 `KeywordRuleForm` prop `showItemCardPanel?: boolean`，当为 true 时在右列渲染 `ItemCardPanel`，`onInsert` 由 form 内部绑定。这样 `KeywordDrawer` 传 `showItemCardPanel`，`RuleDrawer` 不传（用自定义 sidePanel）。

修改 `KeywordRuleForm` 接口：

在 `KeywordRuleFormProps` 中添加：
```tsx
/** 是否在右列显示商品卡片面板（KeywordDrawer 使用） */
showItemCardPanel?: boolean
```

在组件内部的右列渲染逻辑中：
```tsx
{sidePanel ? (
  <div className="w-[220px] flex-shrink-0 flex flex-col gap-2">
    {sidePanel}
  </div>
) : showItemCardPanel ? (
  <div className="w-[200px] flex-shrink-0 flex flex-col gap-2">
    <ItemCardPanel onInsert={(id) => {
      const placeholder = makeItemCardPlaceholder(id)
      const current = watch("reply_content") || ""
      setValue("reply_content", current + placeholder, { shouldValidate: true, shouldDirty: true })
    }} />
  </div>
) : null}
```

并且在文件顶部 import `ItemCardPanel`。

更新后的 `KeywordRuleFormProps`：
```tsx
export interface KeywordRuleFormProps {
  rule?: KeywordRule
  linkedItem?: { title?: string; price?: number; gid?: string }
  bindingWarning?: string
  onSubmit: (data: RuleFormData) => Promise<void>
  onCancel: () => void
  onDestructiveAction?: { label: string; onAction: () => Promise<void> }
  onDirtyChange?: (dirty: boolean) => void
  /** 右侧折叠面板区域，由父 Drawer 注入（RuleDrawer 用于关联面板） */
  sidePanel?: React.ReactNode
  /** 是否显示右列商品卡片面板（KeywordDrawer 使用） */
  showItemCardPanel?: boolean
}
```

然后 `KeywordDrawer` 只需传 `showItemCardPanel`，不需要手动传 `sidePanel`。

- [ ] **Step 4: 更新 KeywordRuleForm 以支持 showItemCardPanel**

编辑 `components/items/parts/KeywordRuleForm.tsx`：
- 在 import 区域添加：`import { ItemCardPanel } from "./ItemCardPanel"`
- 在 Props 接口中添加 `showItemCardPanel?: boolean`
- 在右列渲染逻辑处替换为上述带 `showItemCardPanel` 的逻辑

- [ ] **Step 5: 类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 6: 提交**

```bash
git add components/items/drawers/KeywordDrawer.tsx components/items/parts/KeywordRuleForm.tsx
git commit -m "refactor: KeywordDrawer unified width, unlink semantics, ItemCardPanel integration

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: RuleDrawer — 右列三面板布局

**Files:**
- Modify: `components/items/drawers/RuleDrawer.tsx`

- [ ] **Step 1: 重写 RuleDrawer 布局**

```tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type KeywordRule,
  createKeywordRule,
  updateKeywordRule,
  linkItemToRule,
  unlinkItemFromRule,
  linkGroupToRule,
  unlinkGroupFromRule,
  listRuleItems,
} from "@/lib/api/keywords"
import { listItemGroups } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"
import RuleBindingPanel from "../parts/RuleBindingPanel"

interface RuleDrawerProps {
  rule?: KeywordRule
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function RuleDrawer({ rule, open, onClose, onSuccess }: RuleDrawerProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isDirty, setIsDirty] = useState(false)

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  // 初始化关联数据
  useEffect(() => {
    if (rule) {
      setSelectedItemIds(rule.linked_item_list.map((i) => i.item_id))
      setSelectedGroupIds(rule.linked_group_list.map((g) => g.group_id))
    } else {
      setSelectedItemIds([])
      setSelectedGroupIds([])
    }
  }, [rule])

  // 数据加载
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["rule-drawer-items"],
    queryFn: listRuleItems,
    enabled: open,
  })

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["rule-drawer-groups"],
    queryFn: listItemGroups,
    enabled: open,
  })

  const groups = groupsData?.groups ?? []
  const dataReady = !itemsLoading && !groupsLoading
  const isEdit = !!rule

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const handleSave = async (data: RuleFormData) => {
    try {
      let createdRule: KeywordRule | null = null

      if (isEdit) {
        createdRule = await updateKeywordRule(rule!.rule_id, {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        })
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        createdRule = await createKeywordRule({
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        })
        addToast({ title: "创建成功", description: "规则已创建" })
      }

      if (createdRule) {
        const currentItems = rule?.linked_item_list.map((i) => i.item_id) || []
        for (const itemId of selectedItemIds) {
          if (!currentItems.includes(itemId)) {
            await linkItemToRule(createdRule.rule_id, itemId)
          }
        }
        for (const itemId of currentItems) {
          if (!selectedItemIds.includes(itemId)) {
            await unlinkItemFromRule(createdRule.rule_id, itemId)
          }
        }

        const currentGroups = rule?.linked_group_list.map((g) => g.group_id) || []
        for (const groupId of selectedGroupIds) {
          if (!currentGroups.includes(groupId)) {
            await linkGroupToRule(createdRule.rule_id, groupId)
          }
        }
        for (const groupId of currentGroups) {
          if (!selectedGroupIds.includes(groupId)) {
            await unlinkGroupFromRule(createdRule.rule_id, groupId)
          }
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

  // 右列面板（仅桌面端）— ItemCardPanel 由 showItemCardPanel 自动渲染
  const sidePanelContent = dataReady ? (
    <RuleBindingPanel
      items={items}
      groups={groups}
      selectedItemIds={selectedItemIds}
      selectedGroupIds={selectedGroupIds}
      onToggleItem={toggleItem}
      onToggleGroup={toggleGroup}
    />
  ) : (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner />
    </div>
  )

  const innerContent = (
    <KeywordRuleForm
      rule={rule}
      onSubmit={handleSave}
      onCancel={handleCancel}
      onDirtyChange={setIsDirty}
      showItemCardPanel
      sidePanel={sidePanelContent}
    />
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">{innerContent}</div>
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{innerContent}</div>
    </Sheet>
  )
}
```

**注意**：RuleDrawer 同时传了 `showItemCardPanel` 和 `sidePanel`。需要调整 `KeywordRuleForm` 的逻辑 — 当两者同时存在时，`sidePanel` 应该在 `showItemCardPanel` 下方追加，而非替换。

修改 KeywordRuleForm 的右列渲染逻辑：
```tsx
{/* 右列面板 */}
{(showItemCardPanel || sidePanel) && (
  <div className="w-[220px] flex-shrink-0 flex flex-col gap-2">
    {showItemCardPanel && (
      <ItemCardPanel onInsert={(id) => {
        const placeholder = makeItemCardPlaceholder(id)
        setValue("reply_content", (watch("reply_content") || "") + placeholder, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }} />
    )}
    {sidePanel}
  </div>
)}
```

- [ ] **Step 2: 类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: 提交**

```bash
git add components/items/drawers/RuleDrawer.tsx components/items/parts/KeywordRuleForm.tsx
git commit -m "refactor: RuleDrawer right-column three-panel layout with collapsible binding

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 移动端适配 + 收尾

**Files:**
- Modify: `components/items/drawers/KeywordDrawer.tsx`
- Modify: `components/items/drawers/RuleDrawer.tsx`

- [ ] **Step 1: 移动端 BottomSheet 布局调整**

移动端使用 BottomSheet（已有），内容区为单列。折叠面板在移动端自然变为底部 accordion 列表。无需额外改动 — `CollapsiblePanel` 在任何宽度下都正常工作。`KeywordRuleForm` 的 `flex-row` 右列在移动端可能需要处理，但移动端 BottomSheet 宽度有限，`w-[220px]` 的右列会挤压表单。

**解决方案**：移动端不渲染右列面板。在 `KeywordRuleForm` 中通过 CSS 控制，或在 Drawer 层面条件渲染。

最简单方案：移动端不传 `showItemCardPanel` 和 `sidePanel`，折叠面板改为在表单下方以 accordion 形式渲染。

在 `KeywordDrawer` 中：

```tsx
// 移动端：不传 sidePanel 和 showItemCardPanel
// 折叠面板在 BottomSheet 中以独立 accordion 渲染
```

在 `RuleDrawer` 中同理。

更新 `KeywordDrawer` 移动端 editView：
```tsx
const editViewMobile = (
  <KeywordRuleForm
    rule={editingRule ?? undefined}
    linkedItem={item}
    bindingWarning={bindingWarning}
    onSubmit={handleSave}
    onCancel={() => { ... }}
    onDestructiveAction={editingRule ? { label: "解除绑定", onAction: () => handleUnlinkRule(editingRule) } : undefined}
    onDirtyChange={setIsDirty}
    // 移动端不传 showItemCardPanel 和 sidePanel
  />
)
```

移动端自己渲染独立 accordion 面板（如果需要的话）。

但由于移动端的 BottomSheet 已经 `overflow-y-auto`，右列面板只是在这个滚动容器内。`220px` 固定宽度会挤压表单。最简单的处理：在 KeywordRuleForm 内部，当窗口宽度 < 768px（md breakpoint）时隐藏右列，改为在 form 底部渲染。

实际上更简单的方案：在 `KeywordRuleForm.tsx` 的右列 div 上添加 `hidden md:flex`，这样移动端自动隐藏。移动端通过 BottomSheet 自己的 accordion 列表来处理折叠面板。

但移动端的折叠面板内容（ItemCardPanel、RuleBindingPanel）也需要可见。思路：移动端在 form 下方以独立区块渲染这些面板。

**最终方案**：
- KeywordRuleForm 右列面板加 `hidden md:flex`，移动端自动隐藏
- 移动端 BottomSheet 内自行渲染折叠面板（独立于 KeywordRuleForm）
- 这需要 Drawer 在移动端分支中额外渲染面板

这个逻辑在 KeywordDrawer 和 RuleDrawer 的移动端分支中处理。

- [ ] **Step 2: 更新 KeywordDrawer 移动端**

```tsx
// 在 KeywordDrawer 组件中，移动端 BottomSheet 的 children:
if (isMobile) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      heightRatio={0.95}
      closeOnBackdrop={!isDirty}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!showCreateForm ? (
          ruleListView
        ) : (
          <>
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
              // 移动端：不传 showItemCardPanel / sidePanel
            />
            {/* 移动端独立折叠面板 */}
            <div className="mt-3">
              <ItemCardPanel onInsert={insertItemCard} />
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 3: 更新 RuleDrawer 移动端**

同理，在 RuleDrawer 移动端分支中渲染折叠面板列表。

- [ ] **Step 4: KeywordRuleForm 右列添加 `hidden md:flex`**

修改 `KeywordRuleForm.tsx` 右列 div：
```tsx
{(showItemCardPanel || sidePanel) && (
  <div className="hidden md:flex w-[220px] flex-shrink-0 flex-col gap-2">
    ...
  </div>
)}
```

- [ ] **Step 5: 全量类型检查**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty 2>&1
```

Expected: 0 errors.

- [ ] **Step 6: 提交**

```bash
git add components/items/drawers/KeywordDrawer.tsx components/items/drawers/RuleDrawer.tsx components/items/parts/KeywordRuleForm.tsx
git commit -m "refactor: mobile responsive sidebar — hide right column, accordion panels below form

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: 最终验证与收尾

- [ ] **Step 1: 全量 type check**

```bash
cd "E:\.project\autofish_freetime\frontend" && npx tsc --noEmit --pretty
```

- [ ] **Step 2: 确认所有改动文件**

```bash
cd "E:\.project\autofish_freetime\frontend" && git diff --stat master
```

- [ ] **Step 3: 检查未使用的 import**

确认移除的 import（`deleteKeywordRule` 从 KeywordDrawer 移除，`selectAll` 相关从 RuleBindingPanel/RuleDrawer 移除等）。

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "chore: final cleanup for sidebar layout optimization

Co-Authored-By: Claude <noreply@anthropic.com>"
```
