'use client'

import { useAuth } from '@/stores/auth.store'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

export default function Header() {
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success('已成功退出登录')
    } catch (error) {
      toast.error('退出登录失败')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              闲鱼自动化管理后台
            </Link>
            <nav className="ml-10 flex space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                仪表板
              </Link>
              <Link
                href="/dashboard/accounts"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                账号管理
              </Link>
              <Link
                href="/dashboard/items"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                商品管理
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                设置
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{user?.username}</span>
              <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                {user?.role === 'admin' ? '管理员' : '用户'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? '退出中...' : '退出登录'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}