'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useToast } from '@/components/ui/Toaster'
import { updateOpportunity } from '@/lib/api/batch-publish'
import { resolveSummaryBadge } from '@/components/batch-publish/shared/constants'
import type { OpportunityItem } from '@/lib/api/batch-publish'

/**
 * 商机资料卡（常驻）— summary 有无都渲染
 *
 * - 无 summary：未提炼空态卡（徽章 + 说明 + [✏️ 去提炼] + source_url 展示）
 * - 有 summary：完整资料卡（标题/正文/关键词/📎/判定区 👍👎）+ [✏️ 重新提炼]
 * - 两种形态右上都有 [✏️ 编辑]（L6）→ PC 原地展开编辑态，移动端 BottomSheet
 * - 编辑字段精简：name + 文章单 textarea + 关键词 + 原始资料链接；description/price 不维护
 * - 清空已提炼 summary 需二次确认（M7①）
 */

/** article = 「标题行 + 正文」，拆成标题行与正文两段展示 */
function splitArticle(article: string): { title: string; body: string } {
  const lines = article.trim().split('\n')
  return { title: lines[0]?.trim() ?? '', body: lines.slice(1).join('\n').trim() }
}

interface OpportunitySummaryCardProps {
  opportunity: OpportunityItem
  reviewPending: boolean
  onReview: (status: 'operator_verified' | 'rejected') => void
  onReExtract: () => void
  /** 递增 token：rejected 徽章点击后 MaterialWorkspace 传入，触发判定区滚动聚焦 */
  focusReviewKey?: number
}

export function OpportunitySummaryCard({
  opportunity,
  reviewPending,
  onReview,
  onReExtract,
  focusReviewKey,
}: OpportunitySummaryCardProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const toast = useToast()

  const summary = opportunity.summary
  const hasSummary = !!summary?.article
  const badge = resolveSummaryBadge(opportunity)
  const isRejected = opportunity.summary_status === 'rejected'
  const isVerified = opportunity.summary_status === 'operator_verified'
  const split = hasSummary ? splitArticle(summary.article) : null

  // ---- 判定区滚动聚焦（rejected 徽章点击） ----
  const reviewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focusReviewKey && focusReviewKey > 0) {
      const timer = setTimeout(() => {
        reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [focusReviewKey])

  // ---- 编辑态 ----
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editArticle, setEditArticle] = useState('')
  const [editKeywords, setEditKeywords] = useState<string[]>([])
  const [editKeywordInput, setEditKeywordInput] = useState('')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const startEditing = useCallback(() => {
    setEditName(opportunity.name)
    setEditArticle(opportunity.summary?.article ?? '')
    setEditKeywords(opportunity.summary?.keywords ?? [])
    setEditKeywordInput('')
    setEditSourceUrl(opportunity.source_url ?? '')
    setEditing(true)
  }, [opportunity])

  // 切换商机时退出编辑态
  useEffect(() => {
    setEditing(false)
  }, [opportunity.id])

  const addKeyword = useCallback(() => {
    const kw = editKeywordInput.trim()
    if (!kw) return
    if (editKeywords.includes(kw)) return
    setEditKeywords((prev) => [...prev, kw])
    setEditKeywordInput('')
  }, [editKeywordInput, editKeywords])

  const removeKeyword = useCallback((index: number) => {
    setEditKeywords((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ---- 保存（直接编辑维护：不重置提炼判定状态） ----
  const saveMutation = useMutation({
    mutationFn: (values: { name: string; article: string; keywords: string[]; source_url: string | null }) =>
      updateOpportunity(opportunity.id, {
        name: values.name,
        summary: values.article.trim() || values.keywords.length > 0
          ? { article: values.article.trim(), keywords: values.keywords }
          : null,
        source_url: values.source_url,
      }),
    onSuccess: () => {
      toast.addToast({ title: '商机已更新', variant: 'success' })
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `保存失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const doSave = useCallback(() => {
    saveMutation.mutate({
      name: editName.trim() || opportunity.name,
      article: editArticle,
      keywords: editKeywords,
      source_url: editSourceUrl.trim() || null,
    })
  }, [saveMutation, editName, editArticle, editKeywords, editSourceUrl, opportunity.name])

  const handleSaveClick = () => {
    const hasContent = editArticle.trim() || editKeywords.length > 0
    const originalHasSummary = !!opportunity.summary?.article
    // M7①：清空全部文章字段且原 summary 非空 → 二次确认
    if (!hasContent && originalHasSummary) {
      setClearConfirmOpen(true)
      return
    }
    doSave()
  }

  // ---- 编辑态表单（PC 内联 / 移动 BottomSheet 共用） ----
  const editorForm = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">
          商机名称 <span className="text-red-500">*</span>
        </label>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          maxLength={100}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="商机名称"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">文章</label>
        <textarea
          value={editArticle}
          onChange={(e) => setEditArticle(e.target.value)}
          rows={6}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="第一行是标题，下面是正文：把事实说清楚——这是什么、怎么使用等"
        />
        <p className="text-xs text-gray-400 mt-1">第一行为标题，正文紧随其后（summary 整体一个字段）</p>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">关键词</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {editKeywords.map((kw, i) => (
            <span
              key={`${kw}-${i}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(i)}
                aria-label={`删除关键词 ${kw}`}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <input
          value={editKeywordInput}
          onChange={(e) => setEditKeywordInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addKeyword()
            }
          }}
          placeholder="输入关键词后回车添加"
          className="mt-2 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">原始资料链接</label>
        <input
          value={editSourceUrl}
          onChange={(e) => setEditSourceUrl(e.target.value)}
          placeholder="粘贴原始资料链接（选填）"
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <p className="text-xs text-gray-400">直接编辑保存不会改变提炼判定状态</p>

      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saveMutation.isPending}
          className="h-10 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saveMutation.isPending || !editName.trim()}
          className="h-10 px-5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? '保存中...' : '保存修改'}
        </button>
      </div>
    </div>
  )

  // ---- 展示态内容 ----
  const displayContent = hasSummary && split ? (
    <>
      {/* 文章标题 */}
      {split.title && (
        <div className="text-sm text-gray-800">
          <span className="text-xs text-gray-400">文章标题：</span>
          <span className="font-medium">{split.title}</span>
        </div>
      )}

      {/* 正文 */}
      {split.body && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{split.body}</p>
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
        ref={reviewRef}
        className={`rounded-lg border px-3 py-2.5 space-y-2 scroll-mt-4 ${
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
    </>
  ) : (
    <>
      {/* 无 summary 空态 */}
      <div className="text-sm text-gray-500 leading-relaxed">
        该商机尚未提炼，提炼后可解锁文章角度策略选项（创建素材时）。点击「去提炼」进入三来源提炼流程。
      </div>
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
    </>
  )

  // ---- 编辑态渲染：PC 原地展开 / 移动 BottomSheet ----
  if (editing) {
    if (isMobile) {
      return (
        <div className="border-b border-gray-200 flex-shrink-0 bg-white">
          <BottomSheet
            open={editing}
            onClose={() => setEditing(false)}
            title="编辑商机"
            subtitle={opportunity.name}
            heightRatio={0.9}
          >
            <div className="p-4">{editorForm}</div>
          </BottomSheet>
          <ConfirmDialog
            open={clearConfirmOpen}
            onOpenChange={(open) => { if (!open) setClearConfirmOpen(false) }}
            title="清空文章内容"
            description="清空后将重置为未提炼，此操作不可撤销。确定要清空吗？"
            confirmLabel="清空"
            variant="danger"
            onConfirm={() => {
              setClearConfirmOpen(false)
              doSave()
            }}
          />
        </div>
      )
    }
    return (
      <div className="border-b border-gray-200 px-4 py-4 flex-shrink-0 bg-white">
        {editorForm}
        <ConfirmDialog
          open={clearConfirmOpen}
          onOpenChange={(open) => { if (!open) setClearConfirmOpen(false) }}
          title="清空文章内容"
          description="清空后将重置为未提炼，此操作不可撤销。确定要清空吗？"
          confirmLabel="清空"
          variant="danger"
          onConfirm={() => {
            setClearConfirmOpen(false)
            doSave()
          }}
        />
      </div>
    )
  }

  return (
    <div className="border-b border-gray-200 px-4 py-4 space-y-3 flex-shrink-0 bg-white">
      {/* 头部：商机名 + 提炼状态徽章 + 编辑/提炼入口 */}
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
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={startEditing}
            className="h-8 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ✏️ 编辑
          </button>
          <button
            onClick={onReExtract}
            className="h-8 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {hasSummary ? '✏️ 重新提炼' : '✏️ 去提炼'}
          </button>
        </div>
      </div>

      {displayContent}
    </div>
  )
}
