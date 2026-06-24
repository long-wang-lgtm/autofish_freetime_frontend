'use client'

import { useAuth } from '@/stores/auth.store'
import { redirect } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) redirect('/login')

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 右侧区域：顶部栏 + 主内容 */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* 顶部栏：用户信息 + 可扩展区域 */}
        <Header />

        {/* 主内容区域 */}
        <main className="flex-1 min-h-0 p-4 lg:p-6 max-lg:pt-0 max-lg:px-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}