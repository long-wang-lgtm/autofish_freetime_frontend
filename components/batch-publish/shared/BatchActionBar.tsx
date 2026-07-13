'use client'

interface BatchActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }[]
}

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function BatchActionBar({ selectedCount, onClear, actions }: BatchActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg -mx-1">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">
          已选{' '}
          <span className="text-blue-600 font-semibold">{selectedCount}</span>{' '}
          项
        </span>
        <button
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          取消选择
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              variantStyles[action.variant || 'primary']
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
