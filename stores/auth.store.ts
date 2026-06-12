import { create } from 'zustand'
import { authApi } from '@/lib/api/auth'
import { LoginData, RegisterData } from '@/lib/utils/validation'
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/utils/auth'
import { toast } from 'sonner'

export interface User {
  username: string
  email: string | null
  role: 'administrators' | 'user'
  last_login: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // 操作方法
  login: (credentials: LoginData) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  refreshToken: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials: LoginData) => {
    try {
      const response = await authApi.login(credentials)
      const { access_token, refresh_token, user } = response.data

      // 存储令牌
      setTokens(access_token, refresh_token)

      // 更新状态
      set({
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
          last_login: user.last_login,
        },
        isAuthenticated: true,
        isLoading: false,
      })

      toast.success(response.message)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败'
      toast.error(errorMessage)
      throw error
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // 即使API调用失败也要清理本地存储
      console.warn('登出API调用失败:', error)
    } finally {
      // 清理本地存储
      clearTokens()

      // 重置状态
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })

      toast.success('已退出登录')
    }
  },

  register: async (data: RegisterData) => {
    try {
      const response = await authApi.register(data)
      toast.success(response.message)

      // 注册成功后自动登录
      await get().login({
        phone_or_email: data.phone,
        password: data.password,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败'
      toast.error(errorMessage)
      throw error
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        throw new Error('未找到刷新令牌')
      }

      const response = await authApi.refreshToken(refreshToken)
      setTokens(response.access_token, refreshToken)

      toast.success('令牌已刷新')
    } catch (error) {
      // 刷新失败，清理存储并重定向到登录页
      clearTokens()
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
      throw error
    }
  },

  checkAuth: async () => {
    const token = getAccessToken()
    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }

    try {
      const u = await authApi.getCurrentUser()
      set({
        user: {
          username: u.username,
          email: null,
          role: u.role,
          last_login: u.last_login || '',
        },
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      // 获取用户信息失败，清理存储
      clearTokens()
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setUser: (user: User | null) => set({ user }),
  setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
}))