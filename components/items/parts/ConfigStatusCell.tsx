"use client"

interface ConfigStatusCellProps {
  hasConfig: boolean
  onClick: () => void
}

/** 表格中显示配置状态的单元格 */
export function ConfigStatusCell({ hasConfig, onClick }: ConfigStatusCellProps) {
  return (
    <button
      onClick={onClick}
      className={`text-xs hover:underline ${
        hasConfig ? 'text-blue-600' : 'text-gray-400'
      }`}
      title={hasConfig ? '已配置，点击修改' : '未配置，点击配置'}
    >
      {hasConfig ? '已配置' : '未配置'}
    </button>
  )
}
