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
