'use client'

import { useState, useRef, useEffect } from 'react'
import type { SearchField } from '@/lib/api/items'

interface SearchChipProps {
  field: SearchField
  value: string
  label: string
  onRemove: () => void
  onChange: (newValue: string) => void
}

export function SearchChip({ field, value, label, onRemove, onChange }: SearchChipProps) {
  // 新创建的芯片（value 为空）自动进入编辑模式
  const [editing, setEditing] = useState(!value)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const confirm = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onChange(trimmed)
    }
    if (!trimmed) {
      onRemove()
    }
    setEditing(false)
  }

  const cancel = () => {
    if (!value) {
      // 空值芯片取消 → 直接删除
      onRemove()
      return
    }
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-blue-50 border border-blue-200">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') cancel()
          }}
          onBlur={confirm}
          className="w-24 bg-transparent text-blue-700 outline-none text-sm"
        />
        <button
          type="button"
          onClick={confirm}
          className="p-0.5 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-100"
          aria-label="确认"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200">
      <span className="font-medium flex-shrink-0">{label}:</span>
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className="max-w-[120px] truncate text-blue-700 hover:text-blue-900"
        title="点击修改"
      >
        {value}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 flex-shrink-0"
        aria-label={`移除 ${label} 筛选`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}
