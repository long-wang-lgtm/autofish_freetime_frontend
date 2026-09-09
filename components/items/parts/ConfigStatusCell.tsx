"use client"

interface ConfigStatusCellProps {
  hasConfig: boolean
  onClick: () => void
  /** 阶段全名，仅用于 tooltip 辅助区分（不改变行内文案） */
  label?: string
}

/** 表格中显示配置状态的单元格 */
export function ConfigStatusCell({ hasConfig, onClick, label }: ConfigStatusCellProps) {
  const prefix = label ? `${label}：` : ''
  return (
    <button
      onClick={onClick}
      className={`text-xs hover:underline ${
        hasConfig ? 'text-blue-600' : 'text-gray-400'
      }`}
      title={`${prefix}${hasConfig ? '已配置，点击修改' : '未配置，点击配置'}`}
    >
      {hasConfig ? '已配置' : '未配置'}
    </button>
  )
}
