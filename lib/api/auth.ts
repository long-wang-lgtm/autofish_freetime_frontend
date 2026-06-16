import { LoginData, RegisterData } from '@/lib/utils/validation'
import { getAccessToken } from '@/lib/utils/auth'
import { API_BASE_URL } from '@/lib/utils/api'

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

export interface ApiError {
  success: boolean
  error: string
  details?: Record<string, string>
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.error || `请求失败: ${response.status}`)
  }
  return response.json()
}

export const authApi = {
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse<LoginResponse>(response)
  },

  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const body = { ...data, email: data.email || undefined }
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return handleResponse<RegisterResponse>(response)
  },

  getCurrentUser: async (): Promise<UserInfo> => {
    const token = getAccessToken()
    if (!token) throw new Error('未找到访问令牌')

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await handleResponse<GetCurrentUserResponse>(response)
    return json.data
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const token = getAccessToken()
    if (!token) throw new Error('未找到访问令牌')

    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    return handleResponse(response)
  },

  refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    return handleResponse(response)
  },
}