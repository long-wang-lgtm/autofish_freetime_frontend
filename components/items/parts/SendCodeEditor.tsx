"use client"

import { useState, useRef, useEffect, useCallback } from "react"

// ——— 模块私有 hook（从 useSendCodeEdit.ts 内联合并） ———
function useSendCodeEdit(
  gid: string,
  sendCode: string | null,
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim()
    const current = sendCode || ""
    if (trimmed !== current) {
      onUpdateField(gid, "sendCode", trimmed)
    }
    setEditing(false)
  }, [editValue, sendCode, gid, onUpdateField])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave()
      } else if (e.key === "Escape") {
        setEditing(false)
      }
    },
    [handleSave]
  )

  const startEdit = useCallback(() => {
    setEditValue(sendCode || "")
    setEditing(true)
  }, [sendCode])

  return { editing, editValue, setEditValue, inputRef, handleSave, handleKeyDown, startEdit }
}

// ——— SendCodeEditor 组件 ———
interface SendCodeEditorProps {
  gid: string
  sendCode: string | null
  variant: "cell" | "row"
  onUpdateField: (gid: string, field: "sendCode", value: string) => void
  /** variant="row" 时用于 display 模式的 hasValue（可选，避免重复计算） */
  hasValue?: boolean
}

export function SendCodeEditor({
  gid,
  sendCode,
  variant,
  onUpdateField,
  hasValue: propHasValue,
}: SendCodeEditorProps) {
  const { editing, editValue, setEditValue, inputRef, handleSave, handleKeyDown, startEdit } =
    useSendCodeEdit(gid, sendCode, onUpdateField)

  const actualHasValue = propHasValue ?? !!(sendCode && sendCode.trim().length > 0)

  // --- 编辑态（两种 variant 共享 hook，UI 不同） ---
  if (editing) {
    if (variant === "cell") {
      return (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full text-center text-xs px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      )
    }
    // variant === "row"
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-gray-600">⌨️ 指令码</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-16 text-center text-xs px-1.5 py-1 border border-blue-400 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
    )
  }

  // --- 展示态 ---
  if (variant === "cell") {
    const hasValue = sendCode && sendCode.trim().length > 0
    return (
      <button
        onClick={startEdit}
        className={`w-full text-xs text-center hover:underline ${
          hasValue ? "text-gray-700" : "text-gray-400"
        }`}
        title="此配置仅作为买家时生效"
      >
        {hasValue ? sendCode.trim() : "-"}
      </button>
    )
  }
  // variant === "row"
  return (
    <button
      onClick={startEdit}
      title="指令码 — 仅买家时生效"
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
    >
      <span className={actualHasValue ? "text-gray-600" : "text-gray-400"}>⌨️ 指令码</span>
      <span className="flex items-center gap-1">
        <span
          className={`text-xs max-w-[100px] truncate ${
            actualHasValue ? "text-gray-700 font-mono" : "text-gray-400"
          }`}
        >
          {actualHasValue ? (sendCode || "").trim() : "未配置"}
        </span>
        <svg
          className="w-4 h-4 text-gray-300 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}
