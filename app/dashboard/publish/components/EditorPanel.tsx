'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updatePublishedItem, type PublishedItem } from '@/lib/api/publish-items'

interface EditorPanelProps {
  item: PublishedItem | null
  accounts: { uid: string; name: string }[]
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void
  onItemChange?: (item: PublishedItem) => void
}

export function EditorPanel({ item, accounts, onSaveStatusChange, onItemChange }: EditorPanelProps) {
  const [description, setDescription] = useState('')
  const [coverPlanPrompt, setCoverPlanPrompt] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [coverWidth, setCoverWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('editor_cover_width')
      return stored ? parseInt(stored) : 160
    }
    return 160
  })
  const coverRef = useRef<HTMLDivElement>(null)

  const handleCoverWidthResize = useCallback((delta: number) => {
    setCoverWidth(prev => {
      const next = Math.max(80, Math.min(300, prev + delta))
      localStorage.setItem('editor_cover_width', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    if (item) {
      setDescription(item.description)
      setCoverPlanPrompt(item.cover_plan_prompt)
      setSaveStatus('idle')
    }
  }, [item?.id])

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
        选择一个发布实例开始编辑
      </div>
    )
  }

  return (
    <div className="flex gap-3 p-3 h-full min-h-0 overflow-hidden">

      {/* 右：改写 + 封面两栏 */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0 h-full overflow-hidden">
        <div className="flex-1 flex gap-2 min-h-0 h-full overflow-hidden">
          {/* 改写内容 */}
          <div className="flex-1 flex flex-col gap-1 min-w-0 min-h-0 h-full">
            <label className="text-xs text-gray-500 uppercase flex-shrink-0">改写内容</label>
            <textarea
              value={description}
              onChange={e => handleDescriptionChange(e.target.value)}
              className="flex-1 w-full p-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[120px]"
              placeholder="输入改写内容..."
            />
          </div>
          {/* 封面规划 */}
          <div className="flex-1 flex flex-col gap-1 min-w-0 min-h-0 h-full">
            <label className="text-xs text-gray-500 uppercase flex-shrink-0">封面规划</label>
            <textarea
              value={coverPlanPrompt}
              onChange={e => handleCoverPlanPromptChange(e.target.value)}
              className="flex-1 w-full p-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[120px]"
              placeholder="输入封面规划..."
            />
          </div>
        </div>
        {/* 保存状态 */}
        <div className="flex justify-end">
          <span className={
            'text-xs' +
            (saveStatus === 'idle' ? ' text-gray-300' : saveStatus === 'saving' ? ' text-blue-500' : saveStatus === 'saved' ? ' text-green-500' : ' text-red-500')
          }>
            {saveStatus === 'idle' ? '未更改' : saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存失败'}
          </span>
        </div>
      </div>

      {/* 宽度拖拽条 */}
      <div
        className="w-1 flex-shrink-0 bg-gray-200 hover:bg-blue-400 cursor-col-resize rounded transition-colors"
        onMouseDown={e => {
          e.preventDefault()
          const startX = e.clientX
          const startW = coverWidth
          const onMove = (ev: MouseEvent) => {
            handleCoverWidthResize(ev.clientX - startX)
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
        title="拖拽调整宽度"
      />

      {/* 左：封面图 — 可调宽度 */}
      <div
        ref={coverRef}
        className="flex-shrink-0 flex flex-col gap-2 h-full overflow-hidden"
        style={{ width: coverWidth }}
      >
        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden min-h-0">
          {item.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover_image.startsWith('data:') ? item.cover_image : 'data:image/jpeg;base64,' + item.cover_image}
              alt="封面"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>
          )}
        </div>
        <button className="w-full bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700 flex-shrink-0">
          重新生成封面
        </button>
      </div>

    </div>
  )
}
