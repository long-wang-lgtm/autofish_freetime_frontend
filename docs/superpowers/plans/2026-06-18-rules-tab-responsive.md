# RulesTab 响应式布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 RulesTab 添加移动端响应式支持，新建 MobileRuleCard 组件，桌面端保持 RuleTable 不变。

**Architecture:** toggle/delete 逻辑从 RuleTable 提升到 RulesTab，桌面和移动端通过 props 共享。移动端统计区改为横向滚动 pill 行，规则列表用卡片替代表格。

**Tech Stack:** Next.js + React + Tailwind CSS v3 + TypeScript

---

### Task 1: 新建 MobileRuleCard 组件

**Files:**
- Create: `components/items/views/MobileRuleCard.tsx`

- [ ] **Step 1: 创建 MobileRuleCard 组件**

```tsx
"use client"

import type { KeywordRule } from "@/lib/api/keywords"
import { getDisplayKeyword } from "@/lib/api/keywords"

interface MobileRuleCardProps {
  rule: KeywordRule
  onToggleEnabled: (rule: KeywordRule) => void
  onEdit: (rule: KeywordRule) => void
  onDelete: (rule: KeywordRule) => void
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
  const keyword = getDisplayKeyword(rule)
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
            className={`px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-colors ${
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
          className={`text-sm font-bold flex-shrink-0 ${
            disabled ? "text-gray-400" : "text-gray-700"
          }`}
        >
          #{rule.priority}
        </span>
      </div>

      {/* 信息行：匹配方式 · 回复类型 */}
      <div className="px-3 pb-1 flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
        <span className="bg-gray-100 text-gray-500 px-1.5 py-px rounded">
          {matchTypeLabels[rule.match_type] || rule.match_type}
        </span>
        <span className="text-gray-300">·</span>
        <span>{replyTypeLabels[rule.reply_type] || rule.reply_type}</span>
      </div>

      {/* 回复预览 */}
      <div
        className={`px-3 pb-2 text-[11px] leading-tight truncate ${
          disabled ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {rule.reply_content || "（无回复内容）"}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
        {/* 关联标签 */}
        {rule.linked_items > 0 && (
          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-px rounded">
            📦{rule.linked_items}商品
          </span>
        )}
        {rule.linked_groups > 0 && (
          <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-px rounded">
            📁{rule.linked_groups}组
          </span>
        )}
        {rule.linked_items === 0 && rule.linked_groups === 0 && (
          <span className="text-[10px] text-gray-400">无关联</span>
        )}
        <span className="flex-1" />
        <button
          onClick={() => onEdit(rule)}
          className="px-3 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          编辑
        </button>
        <button
          onClick={() => onDelete(rule)}
          className="px-3 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: 无新增错误（MobileRuleCard 尚未被引用，不会报错）

- [ ] **Step 3: Commit**

```bash
git add components/items/views/MobileRuleCard.tsx
git commit -m "feat: add MobileRuleCard component for responsive rule display"
```

---

### Task 2: RuleTable — toggle/delete 逻辑提升到 props

**Files:**
- Modify: `components/items/rules/RuleTable.tsx`

将 `handleToggleEnabled` 和 `handleDelete` 从内部实现改为 props 回调，移除 `useQueryClient`、`useToast`、`updateKeywordRule`、`deleteKeywordRule` 导入。

- [ ] **Step 1: 修改 RuleTable props 和实现**

修改 `RuleTableProps` 接口，添加 `onToggleEnabled` 和 `onDelete` props：

```tsx
interface RuleTableProps {
  rules: KeywordRule[]
  onEdit: (rule: KeywordRule) => void
  onToggleEnabled: (rule: KeywordRule) => void   // 新增
  onDelete: (rule: KeywordRule) => void           // 新增
  toggling: string | null                          // 新增：当前正在切换的 rule_id
  deleting: string | null                          // 新增：当前正在删除的 rule_id
  className?: string
}
```

组件内部移除 `useQueryClient`、`useToast`，移除 `handleToggleEnabled`、`handleDelete` 函数实现，改为直接调用 props：

```tsx
export function RuleTable({
  rules,
  onEdit,
  onToggleEnabled,
  onDelete,
  toggling,
  deleting,
  className,
}: RuleTableProps) {
  // 移除: const queryClient = useQueryClient()
  // 移除: const { addToast } = useToast()
  // 移除: const [loading, setLoading] = useState<string | null>(null)
  // 移除: handleToggleEnabled 函数体
  // 移除: handleDelete 函数体

  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  // ... toggleExpand 保持不变
```

模板中将原先的 `loading === 'toggle-${rule.rule_id}'` 替换为 `toggling === rule.rule_id`，将 `loading === 'delete-${rule.rule_id}'` 替换为 `deleting === rule.rule_id`。按钮 onClick 改为调用 props：

- 启用/禁用按钮: `onClick={() => onToggleEnabled(rule)}`
- 删除按钮: `onClick={() => onDelete(rule)}`
- 移除 disabled 条件中的 `loading === ...`，改为 `toggling === rule.rule_id` / `deleting === rule.rule_id`

完整修改后的文件：

```tsx
"use client"

import { useState } from "react"
import {
  KeywordRule,
  getDisplayKeyword,
} from "@/lib/api/keywords"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface RuleTableProps {
  rules: KeywordRule[]
  onEdit: (rule: KeywordRule) => void
  onToggleEnabled: (rule: KeywordRule) => void
  onDelete: (rule: KeywordRule) => void
  toggling: string | null
  deleting: string | null
  className?: string
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

  const replyTypeLabels: Record<string, string> = {
    predefined: "预定义关键词",
    custom: "自定义关键词",
  }

  const matchTypeLabels: Record<string, string> = {
    exact: "精确匹配",
    fuzzy: "模糊匹配",
    regex: "正则匹配",
  }

  const [expandedRule, setExpandedRule] = useState<string | null>(null)

  const toggleExpand = (ruleId: string) => {
    setExpandedRule(expandedRule === ruleId ? null : ruleId)
  }

  return (
    <div className={["bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden", className].filter(Boolean).join(" ")}>
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
              <tr key={rule.rule_id} className={rule.enabled ? "" : "bg-gray-50"}>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                      rule.enabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.enabled ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {replyTypeLabels[rule.reply_type] || rule.reply_type}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {getDisplayKeyword(rule)}
                  </div>
                  {rule.reply_type === "custom" && rule.keyword && (
                    <div className="text-xs text-gray-500 font-mono">
                      {rule.keyword.length > 20 ? rule.keyword.slice(0, 20) + "..." : rule.keyword}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-700 max-w-xs truncate">
                    {rule.reply_content || "-"}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {rule.reply_type === "custom"
                    ? matchTypeLabels[rule.match_type] || rule.match_type
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {rule.priority}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleExpand(rule.rule_id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {rule.linked_items > 0 && (
                      <span className="mr-2">商品: {rule.linked_items}</span>
                    )}
                    {rule.linked_groups > 0 && (
                      <span>商品组: {rule.linked_groups}</span>
                    )}
                    {(rule.linked_items > 0 || rule.linked_groups > 0) && (
                      <span className="ml-1 text-xs">
                        {expandedRule === rule.rule_id ? "▲" : "▼"}
                      </span>
                    )}
                    {rule.linked_items === 0 && rule.linked_groups === 0 && (
                      <span className="text-gray-400">无关联</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(rule)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      编辑
                    </button>

                    <button
                      onClick={() => onToggleEnabled(rule)}
                      disabled={toggling === rule.rule_id}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        rule.enabled
                          ? "bg-orange-100 hover:bg-orange-200 text-orange-700"
                          : "bg-green-100 hover:bg-green-200 text-green-700"
                      } disabled:opacity-50`}
                    >
                      {toggling === rule.rule_id ? (
                        <LoadingSpinner size="sm" />
                      ) : rule.enabled ? (
                        "禁用"
                      ) : (
                        "启用"
                      )}
                    </button>

                    <button
                      onClick={() => onDelete(rule)}
                      disabled={deleting === rule.rule_id}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    >
                      {deleting === rule.rule_id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        "删除"
                      )}
                    </button>
                  </div>
                </td>
              </tr>
              {/* 展开的关联详情 */}
              {expandedRule === rule.rule_id &&
                (rule.linked_item_list.length > 0 || rule.linked_group_list.length > 0) && (
                  <tr key={`${rule.rule_id}-expanded`}>
                    <td colSpan={8} className="px-4 py-3 bg-blue-50">
                      <div className="text-xs text-gray-500 mb-2">关联详情：</div>
                      {rule.linked_item_list.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">关联商品：</div>
                          <div className="flex flex-wrap gap-1">
                            {rule.linked_item_list.map((item) => (
                              <span
                                key={item.item_id}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                              >
                                {item.title} (¥{item.price})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {rule.linked_group_list.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">关联商品组：</div>
                          <div className="flex flex-wrap gap-1">
                            {rule.linked_group_list.map((group) => (
                              <span
                                key={group.group_id}
                                className="px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                              >
                                {group.group_name}
                              </span>
                            ))}
                          </div>
                        </div>
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

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: RuleTable 的调用方（RulesTab）会报缺少新 props——这会在 Task 3 修复。

- [ ] **Step 3: Commit**

```bash
git add components/items/rules/RuleTable.tsx
git commit -m "refactor: lift toggle/delete logic from RuleTable to props"
```

---

### Task 3: RulesTab — 添加 isMobile 支持 + 移动端分支

**Files:**
- Modify: `components/items/RulesTab.tsx`

- [ ] **Step 1: 重写 RulesTab**

添加 `isMobile` prop，将 toggle/delete 逻辑提升到 RulesTab（从 RuleTable 移过来），添加移动端统计 pill 行和 MobileRuleCard 列表：

```tsx
"use client"

import { useState, useCallback } from "react"
import type { KeywordRule } from "@/lib/api/keywords"
import { updateKeywordRule, deleteKeywordRule } from "@/lib/api/keywords"
import { RuleTable } from "@/components/items/rules/RuleTable"
import { MobileRuleCard } from "@/components/items/views/MobileRuleCard"
import RuleDrawer from "@/components/items/drawers/RuleItemsAllDrawer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/toaster"

interface RulesTabProps {
  isMobile: boolean
  keywordRules: KeywordRule[]
  rulesStats: { total: number; enabled: number; disabled: number; linkedItems: number; linkedGroups: number }
  keywordsLoading: boolean
  keywordsError: unknown
}

const DESKTOP_STAT_CARDS = [
  { key: "total",        label: "规则总数",   color: "text-gray-900", bg: "bg-gray-50" },
  { key: "enabled",      label: "已启用",     color: "text-green-600", bg: "bg-green-50" },
  { key: "disabled",     label: "已禁用",     color: "text-gray-600", bg: "bg-gray-50" },
  { key: "linkedItems",  label: "关联商品",   color: "text-blue-600", bg: "bg-blue-50" },
  { key: "linkedGroups", label: "关联商品组", color: "text-purple-600", bg: "bg-purple-50" },
] as const

const MOBILE_STAT_PILLS = [
  { key: "total",        label: "总数",   color: "text-gray-900" },
  { key: "enabled",      label: "启用",   color: "text-green-600" },
  { key: "disabled",     label: "禁用",   color: "text-gray-600" },
  { key: "linkedItems",  label: "商品",   color: "text-blue-600" },
  { key: "linkedGroups", label: "组",     color: "text-purple-600" },
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

  // — 抽屉状态 —
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)

  // — toggle/delete loading 状态 —
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleToggleEnabled = useCallback(async (rule: KeywordRule) => {
    setToggling(rule.rule_id)
    try {
      await updateKeywordRule(rule.rule_id, { enabled: !rule.enabled })
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

  const handleDelete = useCallback(async (rule: KeywordRule) => {
    if (!confirm(`确定要删除此规则吗？`)) return
    setDeleting(rule.rule_id)
    try {
      await deleteKeywordRule(rule.rule_id)
      addToast({
        title: "已删除",
        description: "规则已删除",
      })
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
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* 统计信息 */}
      {isMobile ? (
        <div className="flex gap-2 px-2 py-2 overflow-x-auto border-b border-gray-100">
          {MOBILE_STAT_PILLS.map(({ key, label, color }) => (
            <div
              key={key}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 flex-shrink-0"
            >
              <span className={`text-sm font-bold ${color}`}>{rulesStats[key]}</span>
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
          {DESKTOP_STAT_CARDS.map(({ key, label, color, bg }) => (
            <div key={key} className={`${bg} border border-gray-200 rounded-lg p-3`}>
              <div className={`text-2xl font-bold ${color}`}>{rulesStats[key]}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="text-sm text-gray-500">
          {rulesStats.total === 0
            ? "暂无规则"
            : isMobile
              ? `共 ${rulesStats.total} 条规则`
              : `共 ${rulesStats.total} 条规则，按优先级降序排列`}
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
      {!keywordsLoading && !keywordsError && rulesStats.total > 0 && (
        <>
          {/* 桌面端表格 */}
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
          {/* 移动端卡片列表 */}
          {isMobile && (
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-2">
              {keywordRules.map((rule) => (
                <MobileRuleCard
                  key={rule.rule_id}
                  rule={rule}
                  onToggleEnabled={handleToggleEnabled}
                  onEdit={setEditingRule}
                  onDelete={handleDelete}
                  toggling={toggling === rule.rule_id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* 创建规则 */}
      {showCreateForm && (
        <RuleDrawer
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
      {/* 编辑规则 */}
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

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: 如果 page.tsx 还没传 isMobile，会报错——Task 4 修复。

- [ ] **Step 3: Commit**

```bash
git add components/items/RulesTab.tsx
git commit -m "feat: add mobile responsive layout to RulesTab"
```

---

### Task 4: page.tsx — 传递 isMobile 给 RulesTab

**Files:**
- Modify: `app/dashboard/items/page.tsx`

- [ ] **Step 1: 向 RulesTab 传递 isMobile**

修改第 79-86 行的 `<RulesTab>` 调用，添加 `isMobile={isMobile}`：

```tsx
{activeTab === "rules" && (
  <RulesTab
    isMobile={isMobile}
    keywordRules={keywordRules}
    rulesStats={rulesStats}
    keywordsLoading={keywordsLoading}
    keywordsError={keywordsError}
  />
)}
```

文件其余部分不变。

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit --pretty 2>&1
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/items/page.tsx
git commit -m "feat: pass isMobile prop to RulesTab"
```

---

### Task 5: 最终 TypeScript 检查

- [ ] **Step 1: 全量类型检查**

```bash
npx tsc --noEmit --pretty 2>&1
```

Expected: zero errors.

- [ ] **Step 2: 确认无未使用导入**

```bash
npx tsc --noEmit --pretty 2>&1 | grep -i "unused\|not found\|cannot find"
```

Expected: no output.

---

### Task 6: Commit 最终确认

- [ ] **Step 1: 查看变更摘要**

```bash
git diff --stat HEAD
```

- [ ] **Step 2: 如有遗漏文件，补充提交**
