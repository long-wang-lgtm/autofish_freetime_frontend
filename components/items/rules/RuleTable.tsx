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
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      编辑
                    </button>

                    <button
                      onClick={() => onToggleEnabled(rule)}
                      disabled={toggling === rule.rule_id}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
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
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg"
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
                                className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg"
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
