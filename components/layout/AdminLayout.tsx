'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/stores/auth.store'
import { redirect, useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { toast } from 'sonner'
import AdminSidebar from '@/components/layout/AdminSidebar'
import { isAdminRole } from '@/lib/constants/admin'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) redirect('/login')

  if (!isAdminRole(user?.role)) {
    redirect('/dashboard')
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    try {
      await logout()
      toast.success('已退出登录')
      window.location.href = '/login'
    } catch {
      toast.error('退出登录失败')
    }
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'A'
  const displayName = user?.username || '管理员'

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      {/* 右侧区域：顶栏 + 主内容 */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* 管理顶栏 */}
        <header className="h-10 lg:h-12 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="h-full px-3 lg:px-6 flex items-center justify-between">
            {/* 左侧：汉堡菜单 + 系统名称 */}
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              <button
                onClick={() => setSidebarMobileOpen(true)}
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="打开菜单"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-md bg-amber-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm lg:text-base font-semibold text-gray-900">闲逸通 - 管理员</span>
            </div>

            {/* 右侧：返回用户区 + 用户信息 */}
            <div className="flex-shrink-0 flex items-center gap-1.5 lg:gap-2">
              <button
                onClick={() => router.push('/dashboard/accounts')}
                className="flex items-center gap-1 lg:gap-1.5 px-3 lg:px-3 py-1 text-xs lg:text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                <span className="hidden sm:inline">返回用户区</span>
              </button>

              {/* 用户信息下拉 */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 lg:gap-2 px-1.5 lg:px-3 py-1 lg:py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-medium text-white shadow-sm">
                    {userInitial}
                  </div>
                  <span className="text-xs lg:text-sm font-medium text-gray-700 hidden sm:inline">
                    {displayName}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 hidden sm:block ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-150">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">管理员</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 主内容区域 */}
        <main className="flex-1 min-h-0 p-1 lg:p-6 overflow-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
