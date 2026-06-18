"use client"

import { useState } from "react"
import type { KeywordRule } from "@/lib/api/keywords"
import { RuleTable } from "@/components/items/rules/RuleTable"
import RuleDrawer from "@/components/items/drawers/RuleDrawer"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface RulesTabProps {
  keywordRules: KeywordRule[]
  rulesStats: { total: number; enabled: number; disabled: number; linkedItems: number; linkedGroups: number }
  keywordsLoading: boolean
  keywordsError: unknown
}

const STAT_CARDS = [
  { key: "total",        label: "规则总数",   color: "text-gray-900" },
  { key: "enabled",      label: "已启用",     color: "text-green-600" },
  { key: "disabled",     label: "已禁用",     color: "text-gray-600" },
  { key: "linkedItems",  label: "关联商品",   color: "text-blue-600" },
  { key: "linkedGroups", label: "关联商品组", color: "text-purple-600" },
] as const

export function RulesTab({
  keywordRules,
  rulesStats,
  keywordsLoading,
  keywordsError,
}: RulesTabProps) {
  // — 抽屉状态（内部管理）——
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* 统计信息 */}
      <div className="grid grid-cols-5 gap-3 p-4 border-b border-gray-100">
        {STAT_CARDS.map(({ key, label, color }) => (
          <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className={`text-2xl font-bold ${color}`}>{rulesStats[key]}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="text-sm text-gray-500">
          {rulesStats.total === 0
            ? "暂无规则"
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
        <RuleTable
          className="border-0 rounded-none shadow-none"
          rules={keywordRules}
          onEdit={setEditingRule}
        />
      )}

      {/* ==== 抽屉（内部调度）==== */}

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
