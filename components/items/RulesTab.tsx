"use client"

import { useState, useCallback } from "react"
import type { KeywordRule } from "@/lib/api/keywords"
import { updateKeywordRule, deleteKeywordRule } from "@/lib/api/keywords"
import { RuleTable } from "@/components/items/rules/RuleTable"
import { MobileRuleCard } from "@/components/items/views/MobileRuleCard"
import { RuleDrawer } from "@/components/items/drawers/RuleItemsAllDrawer"
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
  { key: "total",        label: "总数", color: "text-gray-900" },
  { key: "enabled",      label: "启用", color: "text-green-600" },
  { key: "disabled",     label: "禁用", color: "text-gray-600" },
  { key: "linkedItems",  label: "商品", color: "text-blue-600" },
  { key: "linkedGroups", label: "组",   color: "text-purple-600" },
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
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* 统计信息 + 操作（移动端合并为一行，节约横屏垂直空间） */}
      {isMobile ? (
        <div className="flex items-center gap-1.5 px-3 py-1 border-b border-gray-100">
          <div className="flex gap-1.5 overflow-x-auto flex-shrink min-w-0">
            {MOBILE_STAT_PILLS.map(({ key, label, color }) => (
              <div
                key={key}
                className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 flex-shrink-0"
              >
                <span className={`text-xs font-semibold ${color}`}>{rulesStats[key]}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-[4px]" />
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex-shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
            {DESKTOP_STAT_CARDS.map(({ key, label, color, bg }) => (
              <div key={key} className={`${bg} border border-gray-200 rounded-xl p-3`}>
                <div className={`text-2xl font-semibold ${color}`}>{rulesStats[key]}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end px-4 py-3 border-b border-gray-100">
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
