"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** 面板宽度，默认 w-96 (384px) */
  width?: string
  children: React.ReactNode
}

/**
 * 右侧滑入面板 — 通用外壳
 *
 * 提供遮罩层 + 右侧滑入动画 + 标题栏 + 可滚动内容区。
 * 点击遮罩层自动关闭，内容区自行填充 children。
 */
export function SlidePanel({ open, onClose, title, subtitle, width = "w-96", children }: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // 点击遮罩关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 transition-colors duration-200 ${
        open ? "bg-black/30" : "pointer-events-none bg-transparent"
      }`}
    >
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full ${width} bg-white shadow-2xl transform transition-transform duration-250 ${
          open ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* 标题栏 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold truncate">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
