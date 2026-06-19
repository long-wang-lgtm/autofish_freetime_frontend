'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 可展开的子导航配置
interface ChildItem {
  label: string
  path: string
}

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  children?: ChildItem[]
}

// 导航菜单配置
const navItems: NavItem[] = [
  {
    label: '账号管理',
    path: '/dashboard/accounts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: '商品管理',
    path: '/dashboard/items',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: '商品发布',
    path: '/dashboard/publish',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    label: '选品监控',
    path: '/dashboard/selection',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: '设置',
    path: '/dashboard/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// 判断当前路径是否是某个导航项的子路径
function isChildOfPath(pathname: string, parentPath: string): boolean {
  return pathname === parentPath || pathname.startsWith(parentPath + '/')
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const pathname = usePathname()

  // FAB 拖拽定位（移动端）
  const fabPosRef = useRef({ right: 16, bottom: 16 })
  const [fabPos, setFabPos] = useState({ right: 16, bottom: 16 })
  const dragStart = useRef({ x: 0, y: 0, right: 0, bottom: 0 })
  const dragDist = useRef(0)
  const dragging = useRef(false)

  // 从 localStorage 恢复 FAB 位置
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-fab-pos')
    if (saved) {
      try {
        const pos = JSON.parse(saved)
        const clamped = clampFabPos(pos.right, pos.bottom)
        setFabPos(clamped)
        fabPosRef.current = clamped
      } catch { /* ignore corrupt data */ }
    }
  }, [])

  const clampFabPos = (right: number, bottom: number) => ({
    right: Math.max(0, Math.min(right, window.innerWidth - 48)),
    bottom: Math.max(0, Math.min(bottom, window.innerHeight - 48)),
  })

  const handleFabPointerDown = (clientX: number, clientY: number) => {
    dragging.current = true
    dragDist.current = 0
    dragStart.current = {
      x: clientX,
      y: clientY,
      right: fabPosRef.current.right,
      bottom: fabPosRef.current.bottom,
    }
  }

  const handleFabPointerMove = (clientX: number, clientY: number) => {
    if (!dragging.current) return
    const deltaX = dragStart.current.x - clientX
    const deltaY = dragStart.current.y - clientY
    dragDist.current = Math.abs(deltaX) + Math.abs(deltaY)
    const newPos = clampFabPos(
      dragStart.current.right + deltaX,
      dragStart.current.bottom + deltaY,
    )
    fabPosRef.current = newPos
    setFabPos({ ...newPos })
  }

  const handleFabPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    localStorage.setItem('sidebar-fab-pos', JSON.stringify(fabPosRef.current))
  }

  // 全局鼠标移动/释放监听（鼠标可能移出按钮）
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleFabPointerMove(e.clientX, e.clientY)
    const onMouseUp = () => handleFabPointerUp()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])


  // 切换展开/收起
  const toggleExpand = (path: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // 判断项是否激活（用于高亮）
  const isItemActive = (item: NavItem): boolean => {
    if (item.children) {
      return isChildOfPath(pathname, item.path) || pathname.startsWith(item.path + '/')
    }
    return pathname === item.path || pathname.startsWith(item.path + '/')
  }

  // 判断子项是否激活
  const isChildActive = (childPath: string): boolean => {
    return pathname === childPath
  }


  // 渲染单个导航项
  const renderNavItem = (item: NavItem) => {
    const hasChildren = item.children && item.children.length > 0
    const isActive = isItemActive(item)
    const isExpanded = expandedItems.has(item.path)

    if (collapsed) {
      return (
        <li key={item.path}>
          {hasChildren ? (
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => toggleExpand(item.path)}
              title={item.label}
            >
              <span className="flex-shrink-0">{item.icon}</span>
            </div>
          ) : (
            <Link
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              title={item.label}
            >
              <span className="flex-shrink-0">{item.icon}</span>
            </Link>
          )}
        </li>
      )
    }

    return (
      <li key={item.path}>
        {hasChildren ? (
          <>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => toggleExpand(item.path)}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate flex-1">{item.label}</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* 子导航 */}
            {isExpanded && (
              <ul className="ml-4 mt-1 space-y-0.5 border-l border-gray-700 pl-3">
                {item.children!.map((child) => {
                  const isChildAct = isChildActive(child.path)
                  return (
                    <li key={child.path}>
                      <Link
                        href={child.path}
                        onClick={() => setMobileOpen(false)}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                          isChildAct
                            ? 'bg-blue-600/20 text-blue-400 font-medium'
                            : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        ) : (
          <Link
            href={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </Link>
        )}
      </li>
    )
  }

  return (
    <>
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 - 移动端从右侧滑入，桌面端固定左侧 */}
      <aside
        className={`fixed top-0 right-0 lg:left-0 lg:right-auto h-full bg-gray-900 text-white z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo 区域 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {!collapsed && (
            <span className="text-lg font-bold truncate">闲逸通</span>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 max-lg:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
              />
            </svg>
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => renderNavItem(item))}
          </ul>
        </nav>

        {/* 底部留空 - 后续可放置其他控件 */}
        <div className="border-t border-gray-700 p-3" />
      </aside>

      {/* 移动端浮动菜单按钮 — 右下角，支持拖拽调整位置 */}
      <button
        onClick={() => {
          if (dragDist.current < 5) setMobileOpen(true)
        }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          handleFabPointerDown(t.clientX, t.clientY)
        }}
        onTouchMove={(e) => {
          const t = e.touches[0]
          handleFabPointerMove(t.clientX, t.clientY)
        }}
        onTouchEnd={handleFabPointerUp}
        onMouseDown={(e) => {
          handleFabPointerDown(e.clientX, e.clientY)
        }}
        className="fixed z-40 p-2.5 bg-gray-900/90 backdrop-blur-sm text-white rounded-full lg:hidden shadow-lg shadow-gray-900/20 active:scale-95 transition-transform select-none"
        style={{
          right: fabPos.right,
          bottom: fabPos.bottom,
          touchAction: 'none',
        }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  )
}