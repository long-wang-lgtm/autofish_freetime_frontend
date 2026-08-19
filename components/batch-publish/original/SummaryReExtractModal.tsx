'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/overlay/Modal'
import { BottomSheet } from '@/components/ui/overlay/Sheet'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  opportunityExtract,
  opportunityDraftDelete,
  type OpportunityItem,
  type OpportunitySummary,
} from '@/lib/api/batch-publish'

/**
 * 商机重新提炼弹窗（轻量提炼弹窗，复用 T1 OpportunityForm 提炼逻辑风格）
 *
 * 三来源 pill（手工编辑/链接导入/文档上传）→ 开始提炼（url/file）→ 提炼结果落 draft →
 * 确认后由父组件调 opportunity.update 带 draft_id 覆盖 summary；放弃则删 draft。
 * 手工编辑模式下直接改文章/关键词，无 draft。
 */

/** 提交值 = 名称 + 提炼结果 + 来源 + draft_id（确认动作） */
export interface ReExtractSubmitValues {
  name: string
  summary: OpportunitySummary | null
  source_url: string | null
  draft_id?: number
}

type SourceType = 'text' | 'url' | 'file'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB（与后端一致，前端校验非安全边界）
const EXTRACT_TIMEOUT_MS = 120_000

const SOURCE_TABS: { key: SourceType; label: string }[] = [
  { key: 'text', label: '手工编辑' },
  { key: 'url', label: '链接导入' },
  { key: 'file', label: '文档上传' },
]

/** article = 「标题行 + 正文」，表单拆成两个字段展示/编辑 */
function splitArticle(article: string): { title: string; body: string } {
  const lines = article.trim().split('\n')
  return { title: lines[0]?.trim() ?? '', body: lines.slice(1).join('\n').trim() }
}

function joinArticle(title: string, body: string): string {
  const t = title.trim()
  const b = body.trim()
  if (t && b) return `${t}\n${b}`
  return t || b
}

interface SummaryReExtractModalProps {
  open: boolean
  onClose: () => void
  opportunity: OpportunityItem
  /** 提交中（父组件调 updateOpportunity 带 draft_id 覆盖 summary） */
  isPending: boolean
  onSubmit: (values: ReExtractSubmitValues) => void
}

export function SummaryReExtractModal({ open, onClose, opportunity, isPending, onSubmit }: SummaryReExtractModalProps) {
  const isMobile = useIsMobile()
  const toast = useToast()

  // v6 3.3：标题按 summary 有无显示「去提炼 / 重新提炼」
  const modalTitle = opportunity.summary?.article ? '重新提炼' : '去提炼'

  // 初始值预填：名称、现有 summary 拆分的文章/关键词、现有来源链接
  const initialSplit = opportunity.summary ? splitArticle(opportunity.summary.article) : { title: '', body: '' }

  const [sourceTab, setSourceTab] = useState<SourceType>('text')
  const [urlInput, setUrlInput] = useState(opportunity.source_url ?? '')
  const [file, setFile] = useState<File | null>(null)

  const [extracting, setExtracting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [draftId, setDraftId] = useState<number | null>(null)
  const [summary, setSummary] = useState<OpportunitySummary | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(opportunity.source_url ?? null)
  const [sourceFile, setSourceFile] = useState<string | null>(null)

  const [name, setName] = useState(opportunity.name)
  const [articleTitle, setArticleTitle] = useState(initialSplit.title)
  const [articleBody, setArticleBody] = useState(initialSplit.body)
  const [keywords, setKeywords] = useState<string[]>(opportunity.summary?.keywords ?? [])
  const [keywordInput, setKeywordInput] = useState('')

  // 卸载时清除提炼超时计时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const clearExtractResult = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setDraftId(null)
    setSummary(null)
    const split = opportunity.summary ? splitArticle(opportunity.summary.article) : { title: '', body: '' }
    setArticleTitle(split.title)
    setArticleBody(split.body)
    setKeywords(opportunity.summary?.keywords ?? [])
    setSourceUrl(opportunity.source_url ?? null)
    setSourceFile(null)
  }, [opportunity])

  /** 提炼完成后把结果填进编辑区 */
  const applySummary = useCallback(
    (resultSummary: OpportunitySummary, newDraftId: number, srcUrl: string | null, fileName: string | null) => {
      const { title, body } = splitArticle(resultSummary.article)
      setDraftId(newDraftId)
      setSummary(resultSummary)
      setArticleTitle(title)
      setArticleBody(body)
      setKeywords(resultSummary.keywords ?? [])
      setSourceUrl(srcUrl)
      setSourceFile(fileName)
      if (title) setName(title)
    },
    []
  )

  // ---- 文件选择（前端 ≤10MB 校验，超限即时拒绝不发起请求） ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_FILE_SIZE) {
      toast.addToast({ title: '文件过大，最大支持 10MB', variant: 'error' })
      e.target.value = ''
      setFile(null)
      return
    }
    setFile(f)
  }

  // ---- 关键词 chips ----
  const addKeyword = useCallback(() => {
    const kw = keywordInput.trim()
    if (!kw) return
    if (keywords.includes(kw)) return
    setKeywords((prev) => [...prev, kw])
    setKeywordInput('')
  }, [keywordInput, keywords])

  const removeKeyword = useCallback((index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ---- 开始提炼 ----
  const handleExtract = useCallback(async () => {
    if (extracting) return
    if (sourceTab === 'url' && !urlInput.trim()) {
      toast.addToast({ title: '请先粘贴文档链接', variant: 'warning' })
      return
    }
    if (sourceTab === 'file' && !file) {
      toast.addToast({ title: '请先选择文件', variant: 'warning' })
      return
    }

    // 已有未确认草稿则先删除，避免残留
    if (draftId != null) {
      try {
        await opportunityDraftDelete(draftId)
      } catch {
        // 忽略
      }
    }

    setExtracting(true)

    timeoutRef.current = setTimeout(() => {
      toast.addToast({ title: '提炼较慢，可稍后回来查看草稿', variant: 'info' })
    }, EXTRACT_TIMEOUT_MS)

    try {
      const result =
        sourceTab === 'url'
          ? await opportunityExtract('url', { source_url: urlInput.trim() })
          : await opportunityExtract('file', { file: file! })

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      applySummary(
        result.summary,
        result.draft_id,
        sourceTab === 'url' ? urlInput.trim() : null,
        sourceTab === 'file' ? file!.name : null
      )
      toast.addToast({ title: '提炼完成，请确认后覆盖', variant: 'success' })
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      const msg = err instanceof Error ? err.message : String(err)
      toast.addToast({ title: '提炼失败，可切换手工编辑', description: msg, variant: 'error' })
    } finally {
      setExtracting(false)
    }
  }, [extracting, sourceTab, urlInput, file, draftId, applySummary, toast])

  // ---- 放弃提炼结果（删 draft 后清空） ----
  const handleDiscard = useCallback(async () => {
    if (draftId == null) return
    try {
      await opportunityDraftDelete(draftId)
      toast.addToast({ title: '已放弃该提炼结果', variant: 'info' })
      clearExtractResult()
    } catch {
      toast.addToast({ title: '放弃失败，请稍后重试', variant: 'error' })
    }
  }, [draftId, clearExtractResult, toast])

  // ---- 提交 ----
  const handleSubmit = () => {
    const hasSummary = articleTitle.trim() || articleBody.trim() || keywords.length > 0
    onSubmit({
      name: name.trim() || opportunity.name,
      summary: hasSummary ? { article: joinArticle(articleTitle, articleBody), keywords } : null,
      source_url: sourceUrl,
      draft_id: draftId ?? undefined,
    })
  }

  const showResultArea = draftId != null && summary != null
  const showManualFields = sourceTab === 'text' || showResultArea

  const originalInfo = (sourceUrl || sourceFile) && (
    <div className="flex items-start gap-1.5 text-xs text-gray-500">
      <span className="flex-shrink-0">📎 原始资料：</span>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline min-w-0 break-all"
        >
          {sourceUrl}
        </a>
      ) : (
        <span className="min-w-0 break-all">{sourceFile}</span>
      )}
    </div>
  )

  const nameField = (
    <div>
      <label className="text-sm font-medium text-gray-700">商机名称</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="商机名称"
      />
    </div>
  )

  const summaryFields = (
    <>
      <div>
        <label className="text-sm font-medium text-gray-700">文章标题</label>
        <input
          value={articleTitle}
          onChange={(e) => setArticleTitle(e.target.value)}
          maxLength={100}
          className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="这是什么，一句话"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">正文</label>
        <textarea
          value={articleBody}
          onChange={(e) => setArticleBody(e.target.value)}
          rows={5}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="把事实说清楚：功能、怎么使用等"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">关键词</label>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {keywords.map((kw, i) => (
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
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
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
    </>
  )

  const content = (
    <div className="space-y-4">
      {/* 三来源切换 */}
      <div>
        <label className="text-sm font-medium text-gray-700">提炼来源</label>
        <div className="mt-1 flex gap-1">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSourceTab(tab.key)}
              disabled={extracting}
              className={`px-3 h-8 text-sm font-medium rounded-full transition-colors disabled:opacity-50 ${
                sourceTab === tab.key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 链接导入输入区 */}
      {sourceTab === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={extracting}
              placeholder="粘贴公开可读的云文档链接（飞书/腾讯/语雀等）"
              className="flex-1 h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleExtract}
              disabled={extracting}
              className="h-10 px-4 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              {extracting && <LoadingSpinner size="sm" className="!border-white/40 !border-t-white" />}
              {extracting ? '提炼中...' : '✨ 开始提炼'}
            </button>
          </div>
          <p className="text-xs text-gray-400">仅支持公开可读的云文档，需登录的文档无法导入</p>
        </div>
      )}

      {/* 文档上传输入区 */}
      {sourceTab === 'file' && (
        <div className="space-y-2">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={extracting}
            className="block w-full text-sm text-gray-500 file:mr-3 file:h-10 file:px-4 file:py-2 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 file:rounded-lg file:border-0 hover:file:bg-gray-200 disabled:opacity-50"
          />
          {file && (
            <p className="text-xs text-gray-500">
              已选择：{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MB）
            </p>
          )}
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting}
            className="h-10 px-4 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {extracting && <LoadingSpinner size="sm" className="!border-white/40 !border-t-white" />}
            {extracting ? '提炼中...' : '✨ 开始提炼'}
          </button>
        </div>
      )}

      {/* 可编辑结果区（提炼落库后可安全刷新） */}
      {showManualFields ? (
        <div className="space-y-4">
          {showResultArea && (
            <span className="text-xs font-medium text-gray-500">✨ 提炼结果（已落库，可安全刷新）</span>
          )}
          {originalInfo}
          {nameField}
          {summaryFields}
        </div>
      ) : null}
    </div>
  )

  const footer = (
    <div className="flex justify-end gap-2">
      {showResultArea && (
        <button
          onClick={handleDiscard}
          disabled={isPending || extracting}
          className="h-10 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          放弃
        </button>
      )}
      <button
        onClick={handleSubmit}
        disabled={isPending || extracting}
        className="h-10 px-5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isPending ? '覆盖中...' : draftId != null ? '覆盖提炼结果' : '保存修改'}
      </button>
    </div>
  )

  if (!open) return null

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={onClose} title={modalTitle} subtitle={opportunity.name} footer={footer}>
        <div className="p-4">{content}</div>
      </BottomSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="lg" footer={footer}>
      <p className="text-sm text-gray-500 mb-4">{opportunity.name}</p>
      {content}
    </Modal>
  )
}
