"use client"

interface IconToggleProps {
  active: boolean
  activeClass: string
  disabled?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}

export function IconToggle({
  active,
  activeClass,
  disabled,
  title,
  onClick,
  children,
}: IconToggleProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
        disabled
          ? "text-gray-300 bg-gray-50 cursor-not-allowed"
          : active
          ? activeClass
          : "text-gray-400 bg-gray-50"
      }`}
    >
      {children}
    </button>
  )
}
