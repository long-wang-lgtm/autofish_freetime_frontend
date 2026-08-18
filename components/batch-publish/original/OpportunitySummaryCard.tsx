'use client'

import type { OpportunityItem } from '@/lib/api/batch-publish'

/**
 * 商机资料卡（5.2）— 商机 summary 非空才渲染
 *
 * - 提炼质量徽章四态：ai_draft 灰 / user_confirmed 绿 / operator_verified 深绿 / rejected 红
 * - 👍/👎 提炼质量判定（opportunity.summary.review，所有用户可用）
 * - [✏️ 重新提炼] 入口（走 extract → 新 draft → 确认后覆盖 summary）
 * - 资料卡只展示文章（标题 + 正文 + 关键词）+ 原始资料外链，无营销区块（策略在素材层 produceState.brief）
 */

/** summary_status 徽章四态 */
const SUMMARY_STATUS_BADGES: Record<string, { label: string; cls: string; dotCls: string }> = {
  ai_draft:          { label: 'AI 提炼，未过目',   cls: 'bg-gray-100 text-gray-500',   dotCls: 'bg-gray-400' },
  user_confirmed:    { label: '用户已确认',       cls: 'bg-green-50 text-green-600',  dotCls: 'bg-green-500' },
  operator_verified: { label: '已验证',           cls: 'bg-green-100 text-green-800', dotCls: 'bg-green-700' },
  rejected:          { label: '不合格，需重提炼', cls: 'bg-red-50 text-red-600',      dotCls: 'bg-red-500' },
}

/** article = 「标题行 + 正文」，拆成标题行与正文两段 */
function splitArticle(article: string): { title: string; body: string } {
  const lines = article.trim().split('\n')
  return { title: lines[0]?.trim() ?? '', body: lines.slice(1).join('\n').trim() }
}

interface OpportunitySummaryCardProps {
  opportunity: OpportunityItem
  reviewPending: boolean
  onReview: (status: 'operator_verified' | 'rejected') => void
  onReExtract: () => void
}

export function OpportunitySummaryCard({
  opportunity,
  reviewPending,
  onReview,
  onReExtract,
}: OpportunitySummaryCardProps) {
  const summary = opportunity.summary
  if (!summary) return null

  const { title, body } = splitArticle(summary.article)
  const badge =
    SUMMARY_STATUS_BADGES[opportunity.summary_status ?? 'user_confirmed'] ??
    SUMMARY_STATUS_BADGES.user_confirmed
  const isRejected = opportunity.summary_status === 'rejected'
  const isVerified = opportunity.summary_status === 'operator_verified'

  return (
    <div className="border-b border-gray-200 px-4 py-4 space-y-3 flex-shrink-0 bg-white">
      {/* 头部：商机名 + 提炼质量徽章 + 重新提炼 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{opportunity.name}</h4>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${badge.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotCls}`} aria-hidden="true" />
            {badge.label}
          </span>
        </div>
        <button
          onClick={onReExtract}
          className="h-8 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
        >
          ✏️ 重新提炼
        </button>
      </div>

      {/* 文章标题 */}
      {title && (
        <div className="text-sm text-gray-800">
          <span className="text-xs text-gray-400">文章标题：</span>
          <span className="font-medium">{title}</span>
        </div>
      )}

      {/* 正文 */}
      {body && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{body}</p>
      )}

      {/* 关键词 chips */}
      {summary.keywords && summary.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.keywords.map((kw, i) => (
            <span
              key={`${kw}-${i}`}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 原始资料外链 */}
      {opportunity.source_url && (
        <div className="text-xs text-gray-500 flex items-start gap-1 min-w-0">
          <span className="flex-shrink-0">📎 原始资料：</span>
          <a
            href={opportunity.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline min-w-0 break-all"
          >
            {opportunity.source_url}
          </a>
        </div>
      )}

      {/* 提炼质量判定 — rejected 时红框高亮聚焦 */}
      <div
        className={`rounded-lg border px-3 py-2.5 space-y-2 ${
          isRejected ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50/60'
        }`}
      >
        <p className="text-xs font-medium text-gray-500">提炼质量判定</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-700">文章提炼准确吗？</span>
          <button
            onClick={() => onReview('operator_verified')}
            disabled={reviewPending}
            className={`h-8 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              isVerified ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            👍 准确
          </button>
          <button
            onClick={() => onReview('rejected')}
            disabled={reviewPending}
            className={`h-8 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
              isRejected ? 'bg-red-100 text-red-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            👎 不合格
          </button>
        </div>
        {isRejected && (
          <p className="text-xs text-red-600">
            该提炼被判为不合格，建议重新提炼。
            <button onClick={onReExtract} className="ml-1 text-blue-600 hover:underline">
              去重新提炼 →
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
