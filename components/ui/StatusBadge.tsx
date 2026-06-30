'use client'

type ColorKey = 'green' | 'red' | 'amber' | 'gray'

interface StatusBadgeProps {
  status: string | number
  config: Record<string | number, { label: string; color: ColorKey }>
  size?: 'sm' | 'md'
}

const colorMap: Record<
  ColorKey,
  { dot: string; textBg: string }
> = {
  green: { dot: 'bg-green-500', textBg: 'text-green-600 bg-green-50' },
  red: { dot: 'bg-red-500', textBg: 'text-red-600 bg-red-50' },
  amber: { dot: 'bg-amber-500', textBg: 'text-amber-600 bg-amber-50' },
  gray: { dot: 'bg-gray-400', textBg: 'text-gray-500 bg-gray-100' },
}

export function StatusBadge({ status, config, size = 'md' }: StatusBadgeProps) {
  const entry = config[status]

  const colors = entry ? colorMap[entry.color] : colorMap.gray
  const label = entry?.label ?? '未知'

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${colors.textBg}`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
      />
      {label}
    </span>
  )
}
