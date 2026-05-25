'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/stores/auth.store'

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
    label: '关键词规则',
    path: '/dashboard/rules',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: '商品发布',
    path: '/dashboard/publish',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    children: [
      { label: '商品发布', path: '/dashboard/publish' },
      { label: '选品监控', path: '/dashboard/publish/selection' },
    ],
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
  const { user, logout } = useAuth()

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

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
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

      {/* 侧边栏 */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo 区域 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {!collapsed && (
            <span className="text-lg font-bold truncate">闲鱼自动化</span>
          )}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* 用户信息区域 */}
        <div className="border-t border-gray-700 p-4">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-xs text-gray-400">{user?.role === 'admin' ? '管理员' : '用户'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors flex justify-center"
              title="退出登录"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-30 p-2 bg-gray-900 text-white rounded-lg lg:hidden"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  )
}