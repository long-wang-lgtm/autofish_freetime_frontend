"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listKeywordRules, KeywordRule, getDisplayKeyword } from "@/lib/api/keywords"
import { RuleForm } from "@/components/rules/RuleForm"
import { RuleTable } from "@/components/rules/RuleTable"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function RulesPage() {
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["keywords"],
    queryFn: listKeywordRules,
    refetchInterval: 30000,
  })

  const stats = {
    total: data?.rules.length || 0,
    enabled: data?.rules.filter((r) => r.enabled).length || 0,
    disabled: data?.rules.filter((r) => !r.enabled).length || 0,
    linkedItems: data?.rules.reduce((sum, r) => sum + r.linked_items, 0) || 0,
    linkedGroups: data?.rules.reduce((sum, r) => sum + r.linked_groups, 0) || 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">关键词规则</h1>
        <p className="text-sm text-gray-500 mt-1">
          管理自动回复关键词规则，匹配买家消息并自动发送预设回复
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">规则总数</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
          <div className="text-xs text-gray-500">已启用</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-gray-600">{stats.disabled}</div>
          <div className="text-xs text-gray-500">已禁用</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.linkedItems}</div>
          <div className="text-xs text-gray-500">关联商品</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{stats.linkedGroups}</div>
          <div className="text-xs text-gray-500">关联商品组</div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {data?.rules.length === 0
            ? "暂无规则"
            : `共 ${data?.rules.length} 条规则，按优先级降序排列`}
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

      {/* 规则列表 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          加载规则列表失败: {String(error)}
        </div>
      )}

      {!isLoading && !error && data && data.rules.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无规则</h3>
          <p className="text-sm text-gray-500 mb-4">
            点击上方"创建规则"按钮添加您的第一条关键词回复规则
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            创建规则
          </button>
        </div>
      )}

      {!isLoading && !error && data && data.rules.length > 0 && (
        <RuleTable
          rules={data.rules}
          onEdit={setEditingRule}
        />
      )}

      {/* 创建规则表单 */}
      {showCreateForm && (
        <RuleForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}

      {/* 编辑规则表单 */}
      {editingRule && (
        <RuleForm
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={() => setEditingRule(null)}
        />
      )}
    </div>
  )
}
