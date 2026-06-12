'use client'

import { useAuth } from '@/stores/auth.store'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface HeaderProps {
  /** 可选的中间区域内容，用于放置面包屑、操作按钮等 */
  children?: React.ReactNode
}

export default function Header({ children }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
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

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setDropdownOpen(false)
    try {
      await logout()
      toast.success('已成功退出登录')
      window.location.href = '/login'
    } catch (error) {
      toast.error('退出登录失败')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSettings = () => {
    setDropdownOpen(false)
    router.push('/dashboard/settings')
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U'
  const displayName = user?.username || '未登录'

  return (
    <header className="h-14 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* 左侧：品牌标识 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-base font-semibold text-gray-900 hidden sm:inline">
            闲逸通
          </span>
        </div>

        {/* 中间：可扩展区域 */}
        <div className="flex-1 flex items-center justify-center px-4">
          {children}
        </div>

        {/* 管理员入口 */}
        {user?.role === 'administrators' && (
          <button
            onClick={() => router.push('/dashboard/administrators')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
            title="管理员"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            管理员
          </button>
        )}

        {/* 右侧：用户信息 + 下拉菜单 */}
        <div className="flex-shrink-0 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* 头像 */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-medium text-white shadow-sm">
              {userInitial}
            </div>
            {/* 用户名 */}
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">
              {displayName}
            </span>
            {/* 下拉箭头 */}
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 hidden sm:block ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 下拉菜单 */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-150">
              {/* 用户信息区 */}
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.role === 'administrators' ? '管理员' : '用户'}
                </p>
              </div>

              {/* 设置 */}
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </button>

              {/* 退出登录 */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
