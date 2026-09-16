/** 字段分组的标题与说明 —— 两个字段分组文件共用，避免各写一份 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-800">
      {children}
    </h4>
  )
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{children}</p>
}
