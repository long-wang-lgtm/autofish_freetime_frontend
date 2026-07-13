'use client'

import React from 'react'

type ColorKey = 'green' | 'red' | 'amber' | 'gray'

interface StatusConfig {
  label: string
  color: ColorKey
}

interface StatusBadgeProps {
  status: string | number
  config: Record<string | number, StatusConfig>
  size?: 'sm' | 'md'
}

const colorClasses: Record<ColorKey, { dot: string; text: string; bg: string }> = {
  green:  { dot: 'bg-green-500',  text: 'text-green-600',  bg: 'bg-green-50' },
  red:    { dot: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-50' },
  amber:  { dot: 'bg-amber-500',  text: 'text-amber-600',  bg: 'bg-amber-50' },
  gray:   { dot: 'bg-gray-400',   text: 'text-gray-500',   bg: 'bg-gray-100' },
}

export function StatusBadge({ status, config, size = 'md' }: StatusBadgeProps) {
  const item = config[status]
  if (!item) return null

  const cls = colorClasses[item.color]

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${cls.bg} ${cls.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cls.dot}`} aria-hidden="true" />
      {item.label}
    </span>
  )
}
