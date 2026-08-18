'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import {
  listCreativePrompts,
  saveCreativePrompt,
  resetCreativePrompt,
  CreativePrompt,
  CreativePromptKey,
} from '@/lib/api/batch-publish'

/** prompt_key 白名单展示顺序 */
const PROMPT_ORDER: CreativePromptKey[] = ['Rewrite', 'CoverPlan']

/** prompt_key → 模板名称 */
const PROMPT_LABELS: Record<CreativePromptKey, string> = {
  Rewrite: '改写模板',
  CoverPlan: '封面规划模板',
}

/** prompt_key → 模板说明 */
const PROMPT_DESCRIPTIONS: Record<CreativePromptKey, string> = {
  Rewrite: 'AI 改写商品描述时使用的提示词模板',
  CoverPlan: 'AI 规划封面图时使用的提示词模板',
}

interface CreativePromptBlockProps {
  isMobile: boolean
}

export function CreativePromptBlock({ isMobile }: CreativePromptBlockProps) {
  const queryClient = useQueryClient()

  // 编辑弹窗状态
  const [editingKey, setEditingKey] = useState<CreativePromptKey | null>(null)
  const [editContent, setEditContent] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['creative-prompts'],
    queryFn: listCreativePrompts,
  })

  const prompts = [...(data?.items ?? [])].sort(
    (a, b) => PROMPT_ORDER.indexOf(a.prompt_key) - PROMPT_ORDER.indexOf(b.prompt_key)
  )

  // 保存 mutation — 保存后来源变 custom，刷新列表
  const saveMutation = useMutation({
    mutationFn: (payload: { promptKey: CreativePromptKey; content: string }) =>
      saveCreativePrompt(payload.promptKey, payload.content),
    onSuccess: () => {
      toast.success('模板已保存')
      queryClient.invalidateQueries({ queryKey: ['creative-prompts'] })
      closeDrawer()
    },
    onError: (err) => {
      toast.error(`保存失败：${err instanceof Error ? err.message : '请稍后重试'}`)
    },
  })

  // 恢复默认 mutation — 仅 source=custom 时可触发
  const resetMutation = useMutation({
    mutationFn: (promptKey: CreativePromptKey) => resetCreativePrompt(promptKey),
    onSuccess: () => {
      toast.success('已恢复默认模板')
      queryClient.invalidateQueries({ queryKey: ['creative-prompts'] })
    },
    onError: (err) => {
      toast.error(`恢复默认失败：${err instanceof Error ? err.message : '请稍后重试'}`)
    },
  })

  const openDrawer = (prompt: CreativePrompt) => {
    setEditingKey(prompt.prompt_key)
    setEditContent(prompt.content)
  }

  const closeDrawer = () => {
    setEditingKey(null)
    setEditContent('')
  }

  const handleSave = async () => {
    if (!editingKey || !editContent.trim()) return
    await saveMutation.mutateAsync({ promptKey: editingKey, content: editContent })
  }

  const handleReset = async (promptKey: CreativePromptKey) => {
    await resetMutation.mutateAsync(promptKey)
  }

  const editingTitle = editingKey ? `编辑${PROMPT_LABELS[editingKey]}` : '编辑创作模板'

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* 区块标题 */}
        <div className={`flex items-center justify-between border-b border-gray-100 ${isMobile ? 'px-4 pt-3 pb-3' : 'px-6 pt-4 pb-4'}`}>
          <div>
            <h3 className="text-base font-semibold text-gray-900">创作模板</h3>
            <p className="text-xs text-gray-500 mt-0.5">配置「改写」「封面规划」使用的 AI 提示词模板</p>
          </div>
        </div>

        {/* 模板卡片区 */}
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <LoadingSpinner size="md" />
          </div>
        ) : isError ? (
          <div className={isMobile ? 'p-3' : 'p-6'}>
            <ErrorBanner
              variant="inline"
              message={error instanceof Error ? error.message : '模板加载失败，请重试'}
              onRetry={() => refetch()}
            />
          </div>
        ) : prompts.length === 0 ? (
          <div className={isMobile ? 'p-3' : 'p-6'}>
            <EmptyState icon="📝" title="暂无创作模板" description="模板列表为空，请稍后重试" />
          </div>
        ) : (
          <div className={isMobile ? 'p-3 space-y-3' : 'p-6 grid grid-cols-2 gap-4'}>
            {prompts.map((prompt) => (
              <TemplateCard
                key={prompt.prompt_key}
                prompt={prompt}
                isMobile={isMobile}
                resetPending={resetMutation.isPending}
                onEdit={() => openDrawer(prompt)}
                onReset={() => handleReset(prompt.prompt_key)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 — 桌面侧边 / 移动端底部 */}
      {isMobile ? (
        <BottomSheet
          open={editingKey !== null}
          onClose={closeDrawer}
          title={editingTitle}
          footer={
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !editContent.trim()}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
            </div>
          }
        >
          <div className="p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {editingKey ? `${PROMPT_LABELS[editingKey]}内容` : '模板内容'}
            </label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={14}
              placeholder="请输入模板内容"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical font-mono leading-relaxed"
            />
            <p className="text-xs text-gray-400">
              {editingKey && prompts.find((p) => p.prompt_key === editingKey)?.source === 'default'
                ? '当前使用默认模板，保存后将基于默认模板创建自定义模板'
                : '保存后该模板将变为「用户自定义」'}
            </p>
          </div>
        </BottomSheet>
      ) : (
        <Sheet open={editingKey !== null} onClose={closeDrawer} title={editingTitle} width="600px">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingKey ? `${PROMPT_LABELS[editingKey]}内容` : '模板内容'}
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={20}
                  placeholder="请输入模板内容"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical font-mono leading-relaxed"
                />
                <p className="mt-2 text-xs text-gray-400">
                  {editingKey && prompts.find((p) => p.prompt_key === editingKey)?.source === 'default'
                    ? '当前使用默认模板，保存后将基于默认模板创建自定义模板'
                    : '保存后该模板将变为「用户自定义」'}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !editContent.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saveMutation.isPending ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}

interface TemplateCardProps {
  prompt: CreativePrompt
  isMobile: boolean
  resetPending: boolean
  onEdit: () => void
  onReset: () => void
}

/** 单个模板入口卡片 — 内容预览 + 来源徽章 + 编辑/恢复默认 */
function TemplateCard({ prompt, isMobile, resetPending, onEdit, onReset }: TemplateCardProps) {
  const isCustom = prompt.source === 'custom'

  return (
    <div className={`border border-gray-200 rounded-xl flex flex-col gap-3 ${isMobile ? 'p-3' : 'p-4'}`}>
      {/* 标题 + 来源徽章 */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{PROMPT_LABELS[prompt.prompt_key]}</div>
          <div className="text-xs text-gray-500 truncate mt-0.5">{PROMPT_DESCRIPTIONS[prompt.prompt_key]}</div>
        </div>
        {isCustom ? (
          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex-shrink-0">
            用户自定义
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 flex-shrink-0">
            使用默认模板
          </span>
        )}
      </div>

      {/* 当前生效内容预览（最多 6 行省略） */}
      <pre className="flex-1 min-h-0 text-xs text-gray-600 leading-relaxed line-clamp-6 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 overflow-hidden">
        {prompt.content || '（空）'}
      </pre>

      {/* 操作行 */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          编辑
        </button>
        {isCustom && (
          <button
            onClick={onReset}
            disabled={resetPending}
            className="px-3 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetPending ? '恢复中...' : '恢复默认'}
          </button>
        )}
      </div>
    </div>
  )
}
