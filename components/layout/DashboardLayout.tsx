'use client'

import { useState } from 'react'
import { useAuth } from '@/stores/auth.store'
import { redirect } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) redirect('/login')

  return (
    <div className="h-screen bg-gray-50 overflow-hidden flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      {/* 右侧区域：顶部栏 + 主内容 */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        <Header onMenuClick={() => setSidebarMobileOpen(true)} />

        <main className="flex-1 min-h-0 p-1 lg:p-2 overflow-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
