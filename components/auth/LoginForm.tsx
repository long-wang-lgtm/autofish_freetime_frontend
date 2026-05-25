'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginData, loginSchema } from '@/lib/utils/validation'
import { toast } from 'sonner'

interface LoginFormProps {
  onSubmit: (data: LoginData) => Promise<void>
  isLoading: boolean
}

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone_or_email: '',
      password: '',
    },
  })

  const handleFormSubmit = async (data: LoginData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // 错误已在store中处理
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label htmlFor="phone_or_email" className="block text-sm font-medium text-gray-700">
          手机号或邮箱
        </label>
        <div className="mt-1">
          <input
            id="phone_or_email"
            type="text"
            autoComplete="tel"
            placeholder="请输入手机号或邮箱"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('phone_or_email')}
            disabled={isLoading}
          />
          {errors.phone_or_email && (
            <p className="mt-1 text-sm text-red-600">{errors.phone_or_email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          密码
        </label>
        <div className="mt-1">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      </div>
    </form>
  )
}