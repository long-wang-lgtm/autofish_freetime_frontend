'use client'

import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** 无选中值时显示的占位项（值为空串） */
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * 下拉选择 —— 项目统一的 <select> 封装。
 *
 * 用原生 <select> 而非自绘弹层：原生在移动端会唤起系统滚轮，触控体验和可访问性
 * 都比自绘好，而这里没有多选 / 搜索 / 分组等原生覆盖不了的需求。
 *
 * 样式与输入框对齐（h-10 / text-sm / rounded-lg），并给出明确的 disabled 态。
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
  className = '',
}: SelectProps) {
  const base =
    'w-full h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed appearance-none pr-9'

  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={base}
      >
        {placeholder !== undefined && (
          <option value="">{placeholder}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  )
}
