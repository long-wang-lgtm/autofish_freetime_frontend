'use client'

import { useState, useRef, useEffect } from 'react'
import { fmtPrice } from '@/lib/utils/format'

interface InlineEditCellProps {
  value: number | null | undefined
  onSave: (value: number) => void
  isSaving?: boolean
  placeholder?: string
  formatDisplay?: (v: number) => string
  step?: number
  min?: number
}

/**
 * Generic inline edit cell: click → number input → blur/Enter to save.
 * Designed for price cells but reusable for any numeric field.
 */
export function InlineEditCell({
  value, onSave, isSaving = false,
  placeholder = '-',
  formatDisplay = (v: number) => fmtPrice(v),
  step = 0.01, min = 0,
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleStartEdit = () => {
    if (isSaving) return
    setEditValue(value != null ? String(value) : '')
    setEditing(true)
  }

  const handleSave = () => {
    const num = parseFloat(editValue)
    if (!isNaN(num) && num >= min) {
      onSave(num)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
      if (inputRef.current) inputRef.current.select()
    } else if (e.key === 'Escape') {
      setEditValue(value != null ? String(value) : '')
      setEditing(false)
    }
  }

  if (isSaving) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        step={step}
        min={min}
        className="w-full h-8 px-2 py-1 text-sm border border-blue-400 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      onClick={handleStartEdit}
      className={`text-sm tabular-nums cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 transition-colors ${
        value != null ? 'text-gray-700' : 'text-gray-400'
      }`}
    >
      {value != null ? formatDisplay(value) : placeholder}
    </span>
  )
}
