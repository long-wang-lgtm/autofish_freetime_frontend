'use client'
import { useRef } from 'react'
import { type PublishedItem } from '@/lib/api/publish-items'
import { EditorPanel } from './EditorPanel'

interface EditorDrawerProps {
  item: PublishedItem | null
  accounts: { uid: string; name: string }[]
  onSaveStatusChange: (status: 'idle' | 'saving' | 'saved' | 'error') => void
  onItemChange: (item: PublishedItem) => void
  onClose: () => void
}

export function EditorDrawer({
  item,
  accounts,
  onSaveStatusChange,
  onItemChange,
  onClose,
}: EditorDrawerProps) {
  const isOpen = item !== null
  // 保持 EditorPanel 始终挂载，避免图片重复请求
  const lastItemRef = useRef<PublishedItem | null>(null)
  if (item) lastItemRef.current = item

  const displayItem = item || lastItemRef.current

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 抽屉 — 始终挂载内容，translate-x 控制显隐 */}
      <div
        className={`fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <EditorPanel
          item={displayItem}
          accounts={accounts}
          onSaveStatusChange={onSaveStatusChange}
          onItemChange={onItemChange}
          onClose={onClose}
        />
      </div>
    </>
  )
}
