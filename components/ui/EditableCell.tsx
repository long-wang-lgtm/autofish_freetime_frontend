'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

export interface EditableCellProps {
  value: string | number
  type?: 'text' | 'number'
  onSave: (newValue: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function EditableCell({
  value,
  type = 'text',
  onSave,
  disabled = false,
  className,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 外部 value 变更时同步 draft（非编辑态）
  useEffect(() => {
    if (!editing) {
      setDraft(String(value))
    }
  }, [value, editing])

  // 进入编辑态时 focus
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(async () => {
    const trimmed = draft.trim()
    if (trimmed === String(value)) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch {
      // 失败时恢复原值，让用户看到错误 toast 后手动 Esc
      setDraft(String(value))
    } finally {
      setSaving(false)
    }
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setDraft(String(value))
    setEditing(false)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (disabled) {
    return (
      <span className={cn('text-gray-400 cursor-not-allowed', className)}>
        {value}
      </span>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        disabled={saving}
        className={cn(
          'w-full h-8 px-2 py-1 text-sm border border-blue-400 rounded',
          'ring-2 ring-blue-500 outline-none',
          'bg-white dark:bg-gray-800',
          saving && 'opacity-50 cursor-wait',
          className,
        )}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-pointer inline-block min-w-[2rem] px-1 py-0.5 rounded',
        'hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors',
        'text-sm text-gray-700 dark:text-gray-300',
        className,
      )}
      title="点击编辑"
    >
      {value}
    </span>
  )
}
