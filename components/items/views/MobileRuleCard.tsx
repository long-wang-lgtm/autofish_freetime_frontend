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
            className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 transition-colors ${
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

      {/* 信息行：匹配方式 · 回复类型 */}
      <div className="px-3 pb-1 flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
        <span className="bg-gray-100 text-gray-500 px-1.5 py-px rounded">
          {matchTypeLabels[rule.match_type] || rule.match_type}
        </span>
        <span className="text-gray-300">·</span>
        <span>{replyTypeLabels[rule.reply_type] || rule.reply_type}</span>
      </div>

      {/* 回复预览 */}
      <div
        className={`px-3 pb-3 text-sm leading-tight truncate ${
          disabled ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {rule.reply_content || "（无回复内容）"}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
        {/* 关联标签 */}
        {rule.linked_items > 0 && (
          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-px rounded">
            📦{rule.linked_items}商品
          </span>
        )}
        {rule.linked_groups > 0 && (
          <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-px rounded">
            📁{rule.linked_groups}组
          </span>
        )}
        {rule.linked_items === 0 && rule.linked_groups === 0 && (
          <span className="text-xs text-gray-400">无关联</span>
        )}
        <span className="flex-1" />
        <button
          onClick={() => onEdit(rule)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          编辑
        </button>
        <button
          onClick={() => onDelete(rule)}
          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  )
}
