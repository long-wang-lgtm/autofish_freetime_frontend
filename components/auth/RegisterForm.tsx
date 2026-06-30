'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterData, registerSchema } from '@/lib/utils/validation'
import { useState } from 'react'

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>
  isLoading: boolean
}

export function RegisterForm({ onSubmit, isLoading }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '',
      username: '',
      email: '',
      password: '',
      confirm_password: '',
    },
  })

  const password = watch('password')

  const handleFormSubmit = async (data: RegisterData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      // 错误已在store中处理
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          手机号 *
        </label>
        <div className="mt-1">
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('phone')}
            disabled={isLoading}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">11位手机号码</p>
        </div>
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          用户名 *
        </label>
        <div className="mt-1">
          <input
            id="username"
            type="text"
            autoComplete="username"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('username')}
            disabled={isLoading}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">3-50个字符，只能包含字母、数字和下划线</p>
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          邮箱 (可选)
        </label>
        <div className="mt-1">
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('email')}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          密码 *
        </label>
        <div className="mt-1 relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('password')}
            disabled={isLoading}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '隐藏' : '显示'}
          </button>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">至少8个字符，必须包含字母和数字</p>
        </div>
      </div>

      <div>
        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
          确认密码 *
        </label>
        <div className="mt-1 relative">
          <input
            id="confirm_password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...register('confirm_password')}
            disabled={isLoading}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? '隐藏' : '显示'}
          </button>
          {errors.confirm_password && (
            <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>
          )}
          {password && watch('confirm_password') === password && (
            <p className="mt-1 text-xs text-green-600">✓ 密码匹配</p>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p>注册即表示您同意我们的服务条款和隐私政策。</p>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '注册中...' : '注册账户'}
        </button>
      </div>
    </form>
  )
}