'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import {
  opportunityExtract,
  opportunityDraftList,
  opportunityDraftDelete,
  type OpportunityItem,
  type OpportunityParams,
  type OpportunitySummary,
} from '@/lib/api/batch-publish'

const opportunitySchema = z.object({
  name: z.string().min(1, '请输入商机名称').max(100, '名称最多 100 字'),
})

type OpportunityFormValues = z.infer<typeof opportunitySchema>

/** 提交值 = 表单三字段 + 提炼相关字段（summary/source_url/draft_id） */
export type OpportunitySubmitValues = OpportunityFormValues & {
  summary?: OpportunitySummary | null
  source_url?: string | null
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

interface OpportunityFormProps {
  defaultValues?: Partial<OpportunityItem> | null
  onSubmit: (values: OpportunitySubmitValues) => void
  isPending: boolean
  submitLabel: string
}

export function OpportunityForm({ defaultValues, onSubmit, isPending, submitLabel }: OpportunityFormProps) {
  const router = useRouter()
  const toast = useToast()
  const isEditMode = !!defaultValues?.id

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
    },
  })

  // ---- 来源切换 ----
  const [sourceTab, setSourceTab] = useState<SourceType>('text')
  const [urlInput, setUrlInput] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // ---- 提炼流程 ----
  const [extracting, setExtracting] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- 提炼结果（落库后确认/放弃） ----
  const [draftId, setDraftId] = useState<number | null>(null)
  const [summary, setSummary] = useState<OpportunitySummary | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<string | null>(null)

  // ---- 文章 / 关键词（提炼结果与手工编辑共用；文章为单个字段，首行=标题） ----
  const [article, setArticle] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')

  // ---- 刷新恢复 ----
  const [draftCount, setDraftCount] = useState(0)

  // 挂载时检查未确认草稿（静默失败，不阻塞表单）
  useEffect(() => {
    let cancelled = false
    opportunityDraftList()
      .then((res) => {
        if (!cancelled && res.drafts.length > 0) setDraftCount(res.drafts.length)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // 编辑已有商机时，从 defaultValues 预填文章/关键词与原始资料链接
  useEffect(() => {
    if (defaultValues?.summary?.article) {
      setArticle(defaultValues.summary.article)
      setKeywords(defaultValues.summary.keywords ?? [])
    }
    if (defaultValues?.source_url) {
      setSourceUrl(defaultValues.source_url)
    }
  }, [defaultValues?.summary, defaultValues?.source_url])

  // 组件卸载时清除提炼超时计时器
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
    setArticle('')
    setKeywords([])
    setSourceUrl(null)
    setSourceFile(null)
    setDraftCount(0)
  }, [])

  /** 提炼完成后把结果填进编辑区 */
  const applySummary = useCallback(
    (resultSummary: OpportunitySummary, newDraftId: number, srcUrl: string | null, fileName: string | null) => {
      setDraftId(newDraftId)
      setSummary(resultSummary)
      setArticle(resultSummary.article)
      setKeywords(resultSummary.keywords ?? [])
      setSourceUrl(srcUrl)
      setSourceFile(fileName)
      // 商机名称默认取 article 首行标题（可改）
      const firstLine = resultSummary.article.trim().split('\n')[0]?.trim() ?? ''
      setValue('name', firstLine || resultSummary.article)
    },
    [setValue]
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

    // 已有未确认草稿则先删除，避免残留（删除失败交由后端 24h 惰性清理）
    if (draftId != null) {
      try {
        await opportunityDraftDelete(draftId)
      } catch {
        // 忽略
      }
    }

    setExtracting(true)

    // 120 秒超时提示（不中止请求，draft 已落库可稍后恢复）
    timeoutRef.current = setTimeout(() => {
      toast.addToast({ title: '提炼较慢，可稍后回来查看草稿', variant: 'info' })
    }, EXTRACT_TIMEOUT_MS)

    try {
      const result =
        sourceTab === 'url'
          ? await opportunityExtract('url', { source_url: urlInput.trim() })
          : sourceTab === 'file'
            ? await opportunityExtract('file', { file: file! })
            : await opportunityExtract('text', { content: '' })

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
      toast.addToast({ title: '提炼完成，请确认后保存', variant: 'success' })
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('配置 AI 模型')) {
        toast.addToast({
          title: '未配置 AI 模型',
          description: '请先在设置页配置 AI 模型后再试',
          variant: 'warning',
          action: { label: '去设置', onClick: () => router.push('/dashboard/settings') },
        })
      } else {
        toast.addToast({ title: '提炼失败，可切换手工编辑', description: msg, variant: 'error' })
      }
    } finally {
      setExtracting(false)
    }
  }, [extracting, sourceTab, urlInput, file, draftId, applySummary, toast, router])

  // ---- 放弃提炼结果（删 draft 后清空） ----
  const handleDiscard = useCallback(async () => {
    if (draftId == null) return
    try {
      await opportunityDraftDelete(draftId)
      toast.addToast({ title: '已放弃该提炼结果', variant: 'info' })
      setValue('name', '')
      clearExtractResult()
    } catch {
      toast.addToast({ title: '放弃失败，请稍后重试', variant: 'error' })
    }
  }, [draftId, clearExtractResult, toast, setValue])

  // ---- 刷新恢复最近一条草稿 ----
  const handleRecover = useCallback(async () => {
    try {
      const res = await opportunityDraftList()
      const latest = res.drafts[0]
      if (!latest) return
      applySummary(
        latest.summary,
        latest.draft_id,
        latest.source_url ?? null,
        latest.source_type === 'file' ? '已上传文档' : null
      )
      setDraftCount(0)
    } catch {
      toast.addToast({ title: '恢复失败，请稍后重试', variant: 'error' })
    }
  }, [applySummary, toast])

  // ---- 提交：名称 + 提炼字段 ----
  const handleFormSubmit = handleSubmit((values) => {
    const hasSummary = article.trim() || keywords.length > 0
    onSubmit({
      ...values,
      summary: hasSummary ? { article: article.trim(), keywords } : null,
      source_url: sourceUrl,
      draft_id: draftId ?? undefined,
    })
  })

  // 渲染分支
  const showResultArea = !isEditMode && draftId != null && summary != null
  const showManualFields = isEditMode || sourceTab === 'text'
  const effectiveSubmitLabel = draftId != null ? '保存商机' : submitLabel

  // ---- 通用字段组 ----
  const nameField = (
    <div>
      <label className="text-sm font-medium text-gray-700">
        商机名称 <span className="text-red-500">*</span>
      </label>
      <input
        {...register('name')}
        maxLength={100}
        className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="如：日系简约风手机壳"
      />
      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
    </div>
  )

  /** 原始资料链接 — 编辑已有商机时展示可编辑 input（新建态在提炼结果区仅展示） */
  const sourceUrlField = isEditMode && (
    <div>
      <label className="text-sm font-medium text-gray-700">原始资料链接</label>
      <input
        value={sourceUrl ?? ''}
        onChange={(e) => setSourceUrl(e.target.value || null)}
        placeholder="粘贴原始资料链接（选填）"
        className="mt-1 w-full h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  const summaryFields = (
    <>
      <div>
        <label className="text-sm font-medium text-gray-700">文章</label>
        <textarea
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          rows={6}
          className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="第一行是标题，下面是正文：把事实说清楚——这是什么、怎么使用等"
        />
        <p className="text-xs text-gray-400 mt-1">第一行为标题，正文紧随其后（summary 整体一个字段）</p>
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

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* 刷新恢复横幅 */}
      {draftCount > 0 && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-sm text-amber-700">有 {draftCount} 条未确认的提炼结果</span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleRecover}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              恢复
            </button>
            <button
              type="button"
              onClick={() => setDraftCount(0)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {/* 三来源切换（编辑已有商机时隐藏） */}
      {!isEditMode && (
        <div>
          <label className="text-sm font-medium text-gray-700">商机来源</label>
          <div className="mt-1 flex gap-1">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSourceTab(tab.key)}
                className={`px-3 h-8 text-sm font-medium rounded-full transition-colors ${
                  sourceTab === tab.key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 链接导入输入区 */}
      {!isEditMode && sourceTab === 'url' && (
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
      {!isEditMode && sourceTab === 'file' && (
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

      {/* 提炼结果区（已落库，可安全刷新） */}
      {showResultArea ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-4">
          <span className="text-xs font-medium text-gray-500">✨ 提炼结果（已落库，可安全刷新）</span>
          {originalInfo}
          {nameField}
          {summaryFields}
        </div>
      ) : showManualFields ? (
        <div className="space-y-4">
          {nameField}
          {sourceUrlField}
          {summaryFields}
        </div>
      ) : null}

      {/* 底部操作 */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
        {showResultArea && (
          <button
            type="button"
            onClick={handleDiscard}
            className="h-10 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            放弃
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || extracting}
          className="h-10 px-5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? '保存中...' : effectiveSubmitLabel}
        </button>
      </div>
    </form>
  )
}
