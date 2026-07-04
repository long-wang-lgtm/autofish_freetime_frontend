'use client'

import { cn } from '@/lib/utils'

interface SearchToolbarProps {
  children: React.ReactNode
  className?: string
}

export function SearchToolbar({ children, className }: SearchToolbarProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4',
        className,
      )}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {children}
      </div>
    </div>
  )
}
