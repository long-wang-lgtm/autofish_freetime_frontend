# 错误处理项目特定模式

---

## 1. ErrorBoundary 组件

项目自实现的 React Error Boundary（class 组件）：

```tsx
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
          <p className="text-lg font-semibold text-gray-700">页面出现异常</p>
          <p className="text-sm text-gray-500">{this.state.error?.message ?? '未知错误'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

> 代码位置：`components/ui/error-boundary.tsx`
>
> 放置位置：DashboardLayout 和 AdminLayout 的 `{children}` 必须由 ErrorBoundary 包裹。

---

## 2. 401 拦截 → 清除 Token → 跳转登录页

当 API 返回 401 时，前端执行两步操作：

1. `clearTokens()` — 清除 localStorage 中的 token
2. `window.location.href = '/login'` — 强制跳转登录页

> 代码位置：`lib/utils/api.ts` 的 `fetchApi` 函数中。
