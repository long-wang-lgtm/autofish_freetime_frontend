'use client'

import { useAuth } from '@/stores/auth.store'
import { redirect } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Sidebar from '@/components/layout/Sidebar'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* 主内容区域 - 左侧留出sidebar宽度，填满剩余空间 */}
      <main
        className={`transition-all duration-300 p-4 lg:p-6 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* 移除最大宽度限制，让内容区域填满可用空间 */}
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  )
}