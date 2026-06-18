"use client"

import { useState } from "react"
import { useKeywords } from "@/hooks/useKeywords"
import type { KeywordRule } from "@/lib/api/keywords"
import { RuleForm } from "@/components/rules/RuleForm"
import { RuleTable } from "@/components/rules/RuleTable"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const STAT_CARDS = [
  { key: "total", label: "规则总数",   color: "text-gray-900" },
  { key: "enabled", label: "已启用",   color: "text-green-600" },
  { key: "disabled", label: "已禁用",  color: "text-gray-600" },
  { key: "linkedItems", label: "关联商品", color: "text-blue-600" },
  { key: "linkedGroups", label: "关联商品组", color: "text-purple-600" },
] as const

export default function RulesPage() {
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { rules, isLoading, error, stats } = useKeywords()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">关键词规则</h1>
        <p className="text-sm text-gray-500 mt-1">管理自动回复关键词规则，匹配买家消息并自动发送预设回复</p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-5 gap-3">
        {STAT_CARDS.map(({ key, label, color }) => (
          <div key={key} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className={`text-2xl font-bold ${color}`}>{stats[key]}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {rules.length === 0 ? "暂无规则" : `共 ${rules.length} 条规则，按优先级降序排列`}
        </div>
        <button onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          创建规则
        </button>
      </div>

      {/* 规则列表 / 加载 / 错误 / 空 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          加载规则列表失败: {String(error)}
        </div>
      )}
      {!isLoading && !error && rules.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
          <p className="text-sm text-gray-500 mb-4">点击上方"创建规则"按钮添加您的第一条关键词回复规则</p>
          <button onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors">
            创建规则
          </button>
        </div>
      )}
      {!isLoading && !error && rules.length > 0 && (
        <RuleTable rules={rules} onEdit={setEditingRule} />
      )}

      {showCreateForm && <RuleForm onClose={() => setShowCreateForm(false)} onSuccess={() => setShowCreateForm(false)} />}
      {editingRule && <RuleForm rule={editingRule} onClose={() => setEditingRule(null)} onSuccess={() => setEditingRule(null)} />}
    </div>
  )
}
