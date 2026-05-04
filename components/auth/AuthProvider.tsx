'use client'

import { ReactNode, useEffect } from 'react'
import { useAuth } from '@/stores/auth.store'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading, checkAuth } = useAuth()

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-gray-600">正在检查登录状态...</p>
      </div>
    )
  }

  return <>{children}</>
}