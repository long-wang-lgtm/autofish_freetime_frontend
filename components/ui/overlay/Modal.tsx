'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// ============================================================
// Modal — 居中弹窗外壳（阻断式，遮罩不关闭）
// ============================================================

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  /** sm=384px | md=448px | lg=512px | xl=672px，默认 md */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 覆盖弹窗容器 className（常用于自定义 max-w） */
  className?: string
  /** 覆盖默认 max-height，默认 90vh */
  maxHeight?: string
  children: ReactNode
  /** 底部操作区，传入后渲染 border-t 分隔的固定底部 */
  footer?: ReactNode
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  className,
  maxHeight = '90vh',
  children,
  footer,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${SIZE_CLASSES[size]} flex flex-col ${className ?? ''}`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 — 可滚动 */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* 底部操作区 */}
        {footer && (
          <div className="border-t border-gray-100 px-4 py-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
