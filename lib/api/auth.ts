import { LoginData, RegisterData } from '@/lib/utils/validation'
import { getAccessToken } from '@/lib/utils/auth'
import { fetchApi } from '@/lib/utils/api'

/**
 * 获取认证头信息
 * 用于API请求的Authorization头
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = getAccessToken()
  if (!token) {
    throw new Error('未找到访问令牌，请先登录')
  }
  return {
    Authorization: `Bearer ${token}`,
  }
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    user: {
      username: string
      email: string | null
      role: 'user' | 'administrators'
      last_login: string
    }
  }
}

export interface RegisterResponse {
  success: boolean
  message: string
  data: {
    user_id: string
    username: string
    email: string | null
    role: string
    created_at: string
  }
}

/** /api/auth/me 返回的 data 字段 */
export interface UserInfo {
  username: string
  last_login: string
  is_active: boolean
  role: 'user' | 'administrators'
}

/** /api/auth/me 完整响应 */
export interface GetCurrentUserResponse {
  success: boolean
  message: string
  data: UserInfo
}

export const authApi = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    return fetchApi<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    })
  },

  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const body = JSON.stringify({ ...data, email: data.email || undefined })
    return fetchApi<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body,
      skipAuth: true,
    })
  },

  getCurrentUser: async (): Promise<UserInfo> => {
    const json = await fetchApi<GetCurrentUserResponse>('/api/auth/me')
    return json.data
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    return fetchApi('/api/auth/logout', { method: 'POST' })
  },

  refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
    return fetchApi('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      skipAuth: true,
    })
  },
}