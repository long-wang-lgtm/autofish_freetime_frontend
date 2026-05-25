'use client'

import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuth } from '@/stores/auth.store'
import Link from 'next/link'
import { useEffect } from 'react'

export default function RegisterPage() {
  const { register, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard/accounts'
    }
  }, [isAuthenticated])

  const handleRegister = async (data: Parameters<typeof register>[0]) => {
    await register(data)
    window.location.href = '/dashboard/accounts'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">闲鱼自动化管理后台</h2>
          <p className="mt-2 text-sm text-gray-600">创建新账户</p>
        </div>

        <RegisterForm
          onSubmit={handleRegister}
          isLoading={isLoading}
        />

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            已有账户？立即登录
          </Link>
        </div>
      </div>
    </div>
  )
}