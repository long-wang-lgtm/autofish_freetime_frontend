"use client"

import { useState, type ReactNode } from "react"

interface CollapsiblePanelProps {
  title: string
  /** 折叠态标题栏右侧显示的计数 badge */
  badge?: number
  /** 面板图标（emoji），默认无 */
  icon?: string
  defaultExpanded?: boolean
  onExpand?: () => void
  children: ReactNode
}

export function CollapsiblePanel({
  title,
  badge,
  icon,
  defaultExpanded = false,
  onExpand,
  children,
}: CollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && onExpand) onExpand()
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 标题栏 — 点击切换展开/收起 */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xs font-medium text-gray-600 truncate">
          {icon && <span className="mr-1.5">{icon}</span>}
          {title}
        </span>
        <span className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!expanded && badge != null && badge > 0 && (
            <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* 内容区 */}
      {expanded && <div className="border-t border-gray-100">{children}</div>}
    </div>
  )
}
