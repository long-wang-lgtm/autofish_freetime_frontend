'use client'

import React from 'react'

interface ErrorBannerProps {
  message: string
  variant: 'banner' | 'inline'
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ message, variant, onRetry, onDismiss }: ErrorBannerProps) {
  const isBanner = variant === 'banner'

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 ${
        isBanner
          ? 'bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm'
          : 'bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600'
      }`}
    >
      {/* Error icon */}
      <svg className={`flex-shrink-0 ${isBanner ? 'w-5 h-5 text-red-500' : 'w-4 h-4 text-red-400'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <div className="flex-1 min-w-0">
        <p>{message}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-red-700 font-medium hover:text-red-800 transition-colors whitespace-nowrap"
          >
            重试
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors"
            aria-label="关闭错误提示"
          >
            <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
