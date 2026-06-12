'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const adminNavItems: NavItem[] = [
  {
    label: '管理首页',
    path: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: '用户管理',
    path: '/admin/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

interface AdminSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(path)
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

      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transition-all duration-300 flex flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* 管理标识区 */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-semibold truncate text-amber-400">管理员面板</span>
            </div>
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

        {/* 管理导航 */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {adminNavItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 底部：返回用户区 */}
        <div className="border-t border-gray-700 p-3">
          <Link
            href="/dashboard/accounts"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-400 hover:bg-gray-700 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
            title="返回用户区"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            {!collapsed && <span>返回用户区</span>}
          </Link>
        </div>
      </aside>

      {/* 移动端菜单按钮 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 p-2 bg-gray-900 text-white rounded-lg lg:hidden shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  )
}
