'use client'

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

function DefaultIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-gray-300 mx-auto"
    >
      <rect
        x="4"
        y="14"
        width="40"
        height="28"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M4 20L20.5 28.5C22.8 29.8 25.2 29.8 27.5 28.5L44 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 14V8C16 6.34 17.34 5 19 5H29C30.66 5 32 6.34 32 8V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="34"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={
        'rounded-xl border border-gray-200 shadow-sm text-center flex flex-col items-center justify-center ' +
        (size === 'md' ? 'p-6' : 'p-4')
      }
    >
      {icon ?? <DefaultIcon />}
      <h3
        className={
          size === 'md'
            ? 'text-base font-semibold text-gray-800 mt-4'
            : 'text-sm font-medium text-gray-700 mt-3'
        }
      >
        {title}
      </h3>
      {description && (
        <p
          className={
            size === 'md'
              ? 'text-sm text-gray-500 mt-1.5'
              : 'text-xs text-gray-400 mt-1'
          }
        >
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="h-10 py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium mt-4"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
