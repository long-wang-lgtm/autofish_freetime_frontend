'use client'

import { useAuth } from '@/stores/auth.store'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'

interface HeaderProps {
  /** 可选的中间区域内容，用于放置面包屑、操作按钮等 */
  children?: React.ReactNode
}

export default function Header({ children }: HeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
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
    <header
      className={
        isMobile
          ? 'absolute top-0 right-0 z-20'
          : 'h-11 lg:h-14 max-lg:[@media(max-height:500px)]:h-10 bg-white border-b border-gray-200 shadow-sm flex-shrink-0'
      }
    >
      <div
        className={
          isMobile
            ? 'flex items-center gap-1.5 p-1'
            : 'h-full px-3 lg:px-6 max-lg:[@media(max-height:500px)]:px-2 flex items-center justify-between'
        }
      >
        {/* 左侧品牌标识 — 移动端隐藏 */}
        {!isMobile && (
          <div className="flex items-center gap-2 lg:gap-3 max-lg:[@media(max-height:500px)]:gap-1.5 flex-shrink-0">
            <div className="w-6 h-6 lg:w-7 lg:h-7 max-lg:[@media(max-height:500px)]:w-5 max-lg:[@media(max-height:500px)]:h-5 rounded-md bg-blue-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 max-lg:[@media(max-height:500px)]:w-3 max-lg:[@media(max-height:500px)]:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {/* PC: 完整品牌名 */}
            <span className="hidden lg:inline text-base font-semibold text-gray-900">
              闲逸通
            </span>
            {/* 移动端: 简短品牌名 */}
            <span className="inline lg:hidden text-xs font-semibold text-gray-900 max-lg:[@media(max-height:500px)]:text-[11px]">
              逸
            </span>
          </div>
        )}

        {/* 中间可扩展区域 — 移动端隐藏 */}
        {!isMobile && (
          <div className="flex-1 flex items-center justify-center px-2 lg:px-4 max-lg:[@media(max-height:500px)]:px-1.5">
            {children}
          </div>
        )}

        {/* 管理员按钮 — 移动端隐藏，入口移入下拉菜单 */}
        {!isMobile && user?.role === 'administrators' && (
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1 lg:gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 max-lg:[@media(max-height:500px)]:px-1.5 max-lg:[@media(max-height:500px)]:py-0.5 text-xs lg:text-sm max-lg:[@media(max-height:500px)]:text-[11px] font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1.5 lg:mr-2 max-lg:[@media(max-height:500px)]:mr-1 max-lg:min-h-11 max-lg:[@media(max-height:500px)]:min-h-10"
            title="管理员"
          >
            <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 max-lg:[@media(max-height:500px)]:w-3 max-lg:[@media(max-height:500px)]:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="hidden lg:inline">管理员</span>
            <span className="lg:hidden max-lg:[@media(max-height:500px)]:hidden">管理</span>
          </button>
        )}

        {/* 移动端 Logo 小方块 — 点击进管理员页 */}
        {isMobile && user?.role === 'administrators' && (
          <button
            onClick={() => router.push('/admin')}
            className="min-h-11 min-w-11 w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center"
            title="管理员"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        )}

        {/* 右侧：用户信息 + 下拉菜单 */}
        <div className="flex-shrink-0 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={
              isMobile
                ? 'min-h-11 min-w-11 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-medium text-white shadow-sm'
                : 'flex items-center gap-1.5 lg:gap-2 max-lg:[@media(max-height:500px)]:gap-1 px-1.5 py-1 lg:px-2 lg:py-1.5 max-lg:[@media(max-height:500px)]:px-1 max-lg:[@media(max-height:500px)]:py-0.5 rounded-lg hover:bg-gray-100 transition-colors max-lg:min-h-11 max-lg:[@media(max-height:500px)]:min-h-10'
            }
          >
            {isMobile ? (
              userInitial
            ) : (
              <>
                {/* 头像 */}
                <div className="w-6 h-6 lg:w-7 lg:h-7 max-lg:[@media(max-height:500px)]:w-5 max-lg:[@media(max-height:500px)]:h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs max-lg:[@media(max-height:500px)]:text-[10px] font-medium text-white shadow-sm">
                  {userInitial}
                </div>
                {/* 用户名 */}
                <span className="text-xs lg:text-sm font-medium text-gray-700 max-lg:[@media(max-height:500px)]:hidden">
                  {displayName}
                </span>
                {/* 下拉箭头 */}
                <svg
                  className={`w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400 transition-transform duration-200 max-lg:[@media(max-height:500px)]:hidden ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {/* 下拉菜单 */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 lg:mt-1.5 w-40 lg:w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 origin-top-right duration-150">
              {/* 用户信息区 */}
              <div className="px-2.5 lg:px-3 py-2 lg:py-2.5 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.role === 'administrators' ? '管理员' : '用户'}
                </p>
              </div>

              {/* 管理员入口 — 仅移动端 + 管理员角色显示 */}
              {isMobile && user?.role === 'administrators' && (
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/admin') }}
                  className="w-full flex items-center gap-2 lg:gap-2.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors max-lg:min-h-[44px]"
                >
                  <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  管理员
                </button>
              )}

              {/* 设置 */}
              <button
                onClick={handleSettings}
                className="w-full flex items-center gap-2 lg:gap-2.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors max-lg:min-h-[44px]"
              >
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </button>

              {/* 退出登录 */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2 lg:gap-2.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 max-lg:min-h-[44px]"
              >
                <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
