'use client'

import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/stores/auth.store'
import Link from 'next/link'
import { useEffect } from 'react'

export default function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth()

  // 已登录则跳转到账号管理页
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard/accounts'
    }
  }, [isAuthenticated])

  const handleLogin = async (data: Parameters<typeof login>[0]) => {
    await login(data)
    window.location.href = '/dashboard/accounts'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-gray-900">闲逸通智能回复自动发货系统</h2>
          <p className="mt-2 text-sm text-gray-600">请登录您的账户</p>
        </div>

        <LoginForm
          onSubmit={handleLogin}
          isLoading={isLoading}
        />

        <div className="text-center text-sm">
          <Link href="/register" className="text-blue-600 hover:text-blue-500">
            还没有账户？立即注册
          </Link>
        </div>
      </div>
    </div>
  )
}