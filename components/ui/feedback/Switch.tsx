'use client'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  /** 关联外部 label 用；不传时整行即按钮，无需 htmlFor */
  id?: string
}

/**
 * 开关 —— 切换后立即生效的布尔控件。
 *
 * 整行是一个 <button>，标签在按钮内部：这样点文字也能切换，且不必用 htmlFor
 * 指向非表单元素（对 button 用 htmlFor 是无效关联）。
 *
 * 开关本身不携带「是否需要二次确认」的语义 —— 危险操作由调用方在 onChange 里弹
 * ConfirmDialog，不要在这里加确认态。
 */
export function Switch({ checked, onChange, label, disabled = false, id }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-left w-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </button>
  )
}
