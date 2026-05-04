'use client'

import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuth } from '@/stores/auth.store'
import Link from 'next/link'

export default function RegisterPage() {
  const { register, isLoading } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">闲鱼自动化管理后台</h2>
          <p className="mt-2 text-sm text-gray-600">创建新账户</p>
        </div>

        <RegisterForm
          onSubmit={register}
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