'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updatePublishedItem, type PublishedItem } from '@/lib/api/publish-items'

interface EditorPanelProps {
  item: PublishedItem | null
  accounts: { uid: string; name: string }[]
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void
}

export function EditorPanel({ item, accounts, onSaveStatusChange }: EditorPanelProps) {
  const [accountUid, setAccountUid] = useState('')
  const [description, setDescription] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (item) {
      setAccountUid(item.account_uid)
      setDescription(item.description)
      setSaveStatus('idle')
    }
  }, [item?.id])

  const saveMutation = useMutation({
    mutationFn: (data: { account_uid?: string; description?: string }) =>
      updatePublishedItem(item!.id, data),
    onSuccess: () => {
      setSaveStatus('saved')
      onSaveStatusChange?.('saved')
    },
    onError: () => {
      setSaveStatus('error')
      onSaveStatusChange?.('error')
    },
  })

  const scheduleSave = useCallback((patch: { account_uid?: string; description?: string }) => {
    if (!item) return
    setSaveStatus('saving')
    onSaveStatusChange?.('saving')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate(patch)
    }, 500)
  }, [item, saveMutation, onSaveStatusChange])

  const handleAccountChange = (uid: string) => {
    setAccountUid(uid)
    scheduleSave({ account_uid: uid })
  }

  const handleDescriptionChange = (desc: string) => {
    setDescription(desc)
    scheduleSave({ description: desc })
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        选择一个发布实例开始编辑
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* 左：封面图 */}
      <div className="w-48 flex-shrink-0 p-3 border-r bg-gray-50">
        {item.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_image.startsWith('data:') ? item.cover_image : `data:image/jpeg;base64,${item.cover_image}`}
            alt="封面"
            className="w-full object-cover rounded-lg"
          />
        ) : (
          <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-4xl text-gray-300">
            📷
          </div>
        )}
      </div>

      {/* 右：账号 + 内容 */}
      <div className="flex-1 flex flex-col p-4 gap-3 min-w-0">
        {/* 账号下拉 */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500 flex-shrink-0">账号：</label>
          <select
            value={accountUid}
            onChange={e => handleAccountChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">选择账号</option>
            {accounts.map(acc => (
              <option key={acc.uid} value={acc.uid}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* 改写内容 textarea */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-sm text-gray-500 mb-1">改写内容：</label>
          <textarea
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="输入改写内容..."
          />
        </div>

        {/* 保存状态 */}
        <div className="flex items-center justify-end gap-2">
          <span className={`
            text-xs
            ${saveStatus === 'idle' ? 'text-gray-300' : ''}
            ${saveStatus === 'saving' ? 'text-blue-500' : ''}
            ${saveStatus === 'saved' ? 'text-green-500' : ''}
            ${saveStatus === 'error' ? 'text-red-500' : ''}
          `}>
            {saveStatus === 'idle' && '未更改'}
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'saved' && '已保存'}
            {saveStatus === 'error' && '保存失败'}
          </span>
        </div>
      </div>
    </div>
  )
}
