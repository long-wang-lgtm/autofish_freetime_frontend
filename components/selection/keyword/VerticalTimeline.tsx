'use client'

import { useEffect, useRef } from 'react'

interface VerticalTimelineProps {
  dates: string[]
  dataCounts: Record<string, number>
  activeDate: string
  selectedDates: string[]  // 新增：多选选中日期数组
  onDateSelect: (date: string) => void
  onDateToggle?: (date: string) => void  // 新增：多选切换回调
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${month}/${day}`
}

// 获取星期几
function getWeekday(dateStr: string): string {
  const date = new Date(dateStr)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return weekdays[date.getDay()]
}

export function VerticalTimeline({
  dates,
  dataCounts,
  activeDate,
  selectedDates,
  onDateSelect,
  onDateToggle
}: VerticalTimelineProps) {
  const sortedDates = [...dates].sort().reverse() // 最近的在上方
  const containerRef = useRef<HTMLDivElement>(null)

  // 计算选中数量
  const selectedCount = selectedDates.length > 0
    ? selectedDates.length
    : (activeDate ? 1 : 0)

  // 自动滚动到选中日期
  useEffect(() => {
    if (containerRef.current && activeDate) {
      const activeIndex = sortedDates.indexOf(activeDate)
      if (activeIndex >= 0) {
        const container = containerRef.current
        const itemHeight = 48 // 每个日期项的大致高度
        const scrollPos = activeIndex * itemHeight - container.clientHeight / 2 + itemHeight / 2
        container.scrollTo({ top: Math.max(0, scrollPos), behavior: 'smooth' })
      }
    }
  }, [activeDate, sortedDates])

  // 清空所有选中日期
  const clearSelectedDates = () => {
    if (onDateToggle && selectedDates.length > 0) {
      selectedDates.forEach(date => onDateToggle(date))
    } else if (onDateSelect && activeDate) {
      // 清除单选选中
      onDateSelect('')
    }
  }

  return (
    <div className="h-full">
      <div className="relative h-full pl-3">
        {/* 多选状态指示器 - 常驻显示 */}
        <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span className="text-xs font-medium text-gray-700">
                已选 <span className="font-semibold text-blue-600">{selectedCount}</span> 个日期
              </span>
            </div>
            {selectedCount > 0 && (
              <button
                onClick={clearSelectedDates}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title="清空选择"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 滚动容器 */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto custom-scrollbar pr-3"
        >
          <div className="space-y-0.5 pb-4">
            {sortedDates.map((date) => {
              const count = dataCounts[date] || 0
              const dateLabel = formatDateLabel(date)
              const weekday = getWeekday(date)
              const hasSelectedDates = selectedDates.length > 0
              const isSelected = hasSelectedDates
                ? selectedDates.includes(date)
                : date === activeDate

              const handleClick = () => {
                if (onDateToggle) {
                  onDateToggle(date)  // 多选模式
                } else {
                  onDateSelect(date)  // 单选模式（向后兼容）
                }
              }

              return (
                <button
                  key={date}
                  onClick={handleClick}
                  className={`flex items-center w-full text-left pr-3 py-1 gap-2 transition-all duration-150 ${
                    isSelected
                      ? 'bg-blue-50 shadow-sm ring-1 ring-blue-100 rounded'  // 添加边框光环
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* 圆点指示器 */}
                  <div className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                    isSelected
                      ? 'w-4 h-4 bg-blue-600 ring-2 ring-blue-200'  // 选中：实心大圆点+光环
                      : count > 0
                        ? 'w-3 h-3 border-2 border-blue-500 bg-transparent'
                        : 'w-2.5 h-2.5 border-2 border-gray-300 bg-transparent'
                  }`} />

                  {/* 日期信息布局 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <div className={`text-xs font-medium truncate ${
                          isSelected ? 'text-blue-700 font-semibold' : 'text-gray-800'
                        }`}>
                          {dateLabel}
                        </div>
                        <div className={`text-xs flex-shrink-0 ${
                          isSelected ? 'text-blue-600 font-medium' : 'text-gray-500'
                        }`}>
                          周{weekday}
                        </div>
                      </div>
                      <div className={`text-xs flex-shrink-0 ${
                        isSelected ? 'font-semibold text-blue-600' : 'font-medium text-gray-600'
                      }`}>
                        {count}件
                      </div>
                    </div>
                    {/* 完整日期 */}
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {date}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}