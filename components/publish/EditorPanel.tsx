'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updatePublishedItem, type PublishedItem, imageDisplayUrl } from '@/lib/api/publish-items'
import { ImageLightbox } from './ImageLightbox'

interface EditorPanelProps {
  item: PublishedItem | null
  accounts: { uid: string; name: string }[]
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void
  onItemChange?: (item: PublishedItem) => void
  onClose?: () => void
}

export function EditorPanel({ item, accounts, onSaveStatusChange, onItemChange, onClose }: EditorPanelProps) {
  const [description, setDescription] = useState('')
  const [coverPlanPrompt, setCoverPlanPrompt] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevItemIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (item) {
      // 只在切换到不同素材时才重置状态和表单
      const isNewItem = prevItemIdRef.current !== item.id
      prevItemIdRef.current = item.id

      const focusedEl = document.activeElement
      const isEditing = focusedEl instanceof HTMLTextAreaElement && focusedEl.closest('.editor-panel')
      if (!isEditing || focusedEl?.getAttribute('data-field') !== 'description') {
        setDescription(prev => prev !== item.description ? item.description : prev)
      }
      if (!isEditing || focusedEl?.getAttribute('data-field') !== 'cover_plan_prompt') {
        setCoverPlanPrompt(prev => prev !== item.cover_plan_prompt ? item.cover_plan_prompt : prev)
      }
      if (isNewItem) {
        setSaveStatus('idle')
      }
    }
  }, [item])

  const saveMutation = useMutation({
    mutationFn: (data: { description?: string; cover_plan_prompt?: string }) =>
      updatePublishedItem(item!.id, data),
    onSuccess: (updated) => {
      setSaveStatus('saved')
      onSaveStatusChange?.('saved')
      onItemChange?.(updated)
    },
    onError: () => {
      setSaveStatus('error')
      onSaveStatusChange?.('error')
    },
  })

  const scheduleSave = useCallback((patch: { description?: string; cover_plan_prompt?: string }) => {
    if (!item) return
    setSaveStatus('saving')
    onSaveStatusChange?.('saving')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate(patch)
    }, 500)
  }, [item, saveMutation, onSaveStatusChange])

  const handleDescriptionChange = (desc: string) => {
    setDescription(desc)
    scheduleSave({ description: desc })
  }

  const handleCoverPlanPromptChange = (prompt: string) => {
    setCoverPlanPrompt(prompt)
    scheduleSave({ cover_plan_prompt: prompt })
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        选择一个素材开始编辑
      </div>
    )
  }

  return (
    <div className="editor-panel flex flex-col h-full overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium text-gray-700 truncate">
          {item.title || '素材编辑'}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0 ml-2"
          >
            ✕
          </button>
        )}
      </div>

      {/* 图片缩略图条 — compact，全部展示 */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto">
          {item.images && item.images.length > 0 ? (
            item.images.map((img, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.md5 || idx}
                src={imageDisplayUrl(img)}
                alt={`素材图${idx + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-400 hover:scale-105 transition-all flex-shrink-0"
                onClick={() => setLightboxSrc(imageDisplayUrl(img))}
              />
            ))
          ) : (
            <div className="w-16 h-16 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl text-gray-300">📷</span>
            </div>
          )}
          <button className="flex-shrink-0 text-sm text-gray-400 hover:text-blue-500 transition-colors ml-1 whitespace-nowrap">
            重新生成
          </button>
        </div>
      </div>

      {/* 改写内容 — 视觉重心 */}
      <div className="flex-1 flex flex-col gap-1 px-4 pt-3 pb-1 min-h-0">
        <label className="text-xs text-gray-500 uppercase flex-shrink-0">改写内容</label>
        <textarea
          value={description}
          data-field="description"
          onChange={e => handleDescriptionChange(e.target.value)}
          className="flex-1 w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-0 leading-relaxed"
          placeholder="输入改写内容..."
        />
      </div>

      {/* 封面规划 — 视觉重心 */}
      <div className="flex-1 flex flex-col gap-1 px-4 pt-3 pb-1 min-h-0">
        <label className="text-xs text-gray-500 uppercase flex-shrink-0">封面规划</label>
        <textarea
          value={coverPlanPrompt}
          data-field="cover_plan_prompt"
          onChange={e => handleCoverPlanPromptChange(e.target.value)}
          className="flex-1 w-full p-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-0 leading-relaxed"
          placeholder="输入封面规划..."
        />
      </div>

      {/* 保存状态 */}
      <div className="flex justify-end px-4 py-2 flex-shrink-0">
        <span className={
          'text-xs' +
          (saveStatus === 'idle' ? ' text-gray-300' : saveStatus === 'saving' ? ' text-blue-500' : saveStatus === 'saved' ? ' text-green-500' : ' text-red-500')
        }>
          {saveStatus === 'idle' ? '未更改' : saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存失败'}
        </span>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}
