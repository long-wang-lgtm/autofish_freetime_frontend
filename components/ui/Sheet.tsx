"use client"

import { type ReactNode, useEffect, useRef } from "react"

// ============================================================
// Sheet — 桌面端侧边抽屉（右侧滑入）
// ============================================================

// ============================================================
// BottomSheet — 移动端底部抽屉（底部滑入）
// ============================================================


interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  width?: string
  children: ReactNode
  /** 点击遮罩是否关闭，默认 true */
  closeOnBackdrop?: boolean
}

export function Sheet({ open, onClose, title, width = "500px", closeOnBackdrop = true, children }: SheetProps) {
  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* 侧栏面板 — 右侧滑入 */}
      <div
        className={`fixed right-0 top-0 h-full bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width }}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 — 可滚动 */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  )
}


interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  /** 底部操作按钮区 */
  footer?: ReactNode
  /** 高度占屏幕比例，默认 0.9 (90%) */
  heightRatio?: number
  /** 点击遮罩是否关闭，默认 true */
  closeOnBackdrop?: boolean
}

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  heightRatio = 0.9,
  closeOnBackdrop = true,
}: BottomSheetProps) {
  const startY = useRef(0)
  const currentY = useRef(0)

  // 阻止背景滚动
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

  // 下拉关闭手势
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    if (currentY.current - startY.current > 80) {
      onClose()
    }
  }

  const maybeTouchHandlers = closeOnBackdrop
    ? { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd }
    : {}

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/40 z-50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* 底部面板 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl flex flex-col transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: `${heightRatio * 100}vh` }}
        {...maybeTouchHandlers}
      >
        {/* 拖拽手柄 */}
        {closeOnBackdrop && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* 标题栏 */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-5 pt-2 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="flex-1 min-w-0 mr-4">
              {title && (
                <h3 className="text-base font-semibold text-gray-900 truncate">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 — 可滚动 */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* 底部操作区 */}
        {footer && (
          <div className="border-t border-gray-100 px-5 py-3 flex-shrink-0">{footer}</div>
        )}
      </div>
    </>
  )
}
