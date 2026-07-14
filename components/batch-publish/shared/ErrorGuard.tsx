'use client'

import type { ReactNode } from 'react'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'

interface ErrorGuardParams {
  error: unknown
  isLoading: boolean
  hasData: boolean
  onRetry: () => void
}

/**
 * 列表页错误守卫——当 error 存在、非 loading 态、且无数据时，
 * 返回 ErrorBanner（banner 变体）。其余情况返回 null。
 *
 * 消除 MaterialsTab / MonitorTab 中复制的 8 行 ErrorBanner 守卫代码。
 *
 * 用法：
 *   const guard = renderErrorGuard({ error, isLoading, hasData: data.length > 0, onRetry: () => refetch() })
 *   if (guard) return guard
 */
export function renderErrorGuard({ error, isLoading, hasData, onRetry }: ErrorGuardParams): ReactNode {
  if (error && !isLoading && !hasData) {
    return (
      <ErrorBanner
        variant="banner"
        message={`加载失败：${(error as Error)?.message || '未知错误'}`}
        onRetry={onRetry}
      />
    )
  }
  return null
}
