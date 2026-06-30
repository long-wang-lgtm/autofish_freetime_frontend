'use client'

import { ReactNode } from 'react'

export interface SidebarBaseProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onMobileClose: () => void
  /** 展开时 header 区域内容（品牌名/标题等） */
  headerExpanded: ReactNode
  /** 折叠时显示的图标 */
  headerIcon?: ReactNode
  /** 底部区域 */
  footer?: ReactNode
  /** 导航菜单 */
  children: ReactNode
}

export function SidebarBase({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
  headerExpanded,
  headerIcon,
  footer,
  children,
}: SidebarBaseProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* 侧边栏 - 移动端从左侧滑入，桌面端固定左侧 */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transition-transform duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header 区域 */}
        <div className="flex items-center justify-between h-10 lg:h-12 px-3 lg:px-4 border-b border-gray-700 flex-shrink-0">
          {collapsed ? (
            headerIcon && (
              <div className="flex items-center justify-center w-full">
                {headerIcon}
              </div>
            )
          ) : (
            <div className="truncate">{headerExpanded}</div>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  collapsed
                    ? 'M13 5l7 7-7 7M5 5l7 7-7 7'
                    : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'
                }
              />
            </svg>
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-3 lg:py-4 overflow-y-auto">{children}</nav>

        {/* 底部 */}
        {footer && (
          <div className="border-t border-gray-700 p-3 lg:p-3">{footer}</div>
        )}
      </aside>
    </>
  )
}
