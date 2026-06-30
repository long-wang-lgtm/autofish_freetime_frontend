"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "default"
  loading?: boolean
  triggerRef?: React.RefObject<HTMLElement>
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  variant = "default",
  loading = false,
  triggerRef,
  onConfirm,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Animate in/out
  useEffect(() => {
    if (open) {
      setVisible(true)
      // Small delay so the initial render (opacity-0) gets committed, then transition kicks in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
    }
  }, [open])

  // Focus management: save current focus on open, restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      // Move focus into dialog after mount
      const timer = setTimeout(() => {
        dialogRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      // Restore focus to triggerRef or previously saved element
      const restore =
        triggerRef?.current ?? previousFocusRef.current
      if (restore && typeof restore.focus === "function") {
        restore.focus()
      }
    }
  }, [open, triggerRef])

  // Prevent background scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // Focus trap: Tab cycles between cancel and confirm buttons
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onOpenChange(false)
        return
      }

      if (e.key === "Tab") {
        const dialog = dialogRef.current
        if (!dialog) return

        const focusableElements = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onOpenChange]
  )

  if (!mounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        open && visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => !loading && onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative bg-white rounded-xl shadow-lg p-6 max-w-sm w-[calc(100%-2rem)] transition-all duration-200 ${
          open && visible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95"
        }`}
      >
        {/* Title */}
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>

        {/* Description */}
        <p className="text-sm text-gray-500 mt-2">{description}</p>

        {/* Button row */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-10 py-2 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-10 py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "处理中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
