'use client'

export interface RadioOption {
  value: string
  label: string
}

interface RadioGroupProps {
  /** 同一组必须同名 —— 原生单选的互斥行为依赖它 */
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  disabled?: boolean
  /** 默认横向。选项文案长短不一时可改纵向，避免换行后参差 */
  direction?: 'row' | 'column'
}

/**
 * 单选组 —— 一组互斥选项里挑一个。
 *
 * 与 Switch 的分工：Switch 是单个独立布尔（开/关，各自生效），RadioGroup 是
 * 「多选一」。视觉上一个是滑块、一个是圆点，别混用 —— 用滑块做多选一，用户
 * 看不出选项之间互斥。
 *
 * 用原生 <input type="radio"> 而非自绘：键盘方向键切换、浏览器自动成组、
 * 移动端唤起系统控件都是白拿的。选中色用 accent-*（本项目未启用 forms 插件，
 * text-* 对原生控件不生效）。
 */
export function RadioGroup({
  name,
  value,
  onChange,
  options,
  disabled = false,
  direction = 'row',
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={`flex gap-x-6 gap-y-3 ${
        direction === 'column' ? 'flex-col' : 'flex-wrap items-center'
      }`}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={`flex items-center gap-2 ${
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            disabled={disabled}
            className="w-4 h-4 accent-blue-600 dark:accent-blue-500 flex-shrink-0"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{o.label}</span>
        </label>
      ))}
    </div>
  )
}
