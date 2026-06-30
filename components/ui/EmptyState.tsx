'use client'

import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md'
}

export function EmptyState({ icon, title, description, action, size = 'md' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-gray-200 shadow-sm ${
        size === 'md' ? 'p-6' : 'p-4'
      }`}
    >
      {icon ?? (
        <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )}
      <p className={`font-medium ${size === 'md' ? 'text-base font-semibold text-gray-800' : 'text-sm text-gray-700'}`}>
        {title}
      </p>
      {description && (
        <p className={`mt-1 ${size === 'md' ? 'text-sm text-gray-500' : 'text-xs text-gray-400'}`}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 h-10 py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
