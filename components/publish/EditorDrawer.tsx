'use client'
import { type PublishedItem } from '@/lib/api/publish-items'
import { Sheet } from '@/components/ui/Sheet'
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
  return (
    <Sheet open={item !== null} onClose={onClose} width="500px">
      {item ? (
        <EditorPanel
          item={item}
          accounts={accounts}
          onSaveStatusChange={onSaveStatusChange}
          onItemChange={onItemChange}
          onClose={onClose}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          选择一个素材开始编辑
        </div>
      )}
    </Sheet>
  )
}
