'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DateListSidebarProps {
  dates: string[]
  dataCounts: Record<string, number>
  activeDate: string
  onDateSelect: (date: string) => void
}

function getTrend(current: number, prev: number) {
  if (current > prev) return <TrendingUp className="w-3.5 h-3.5 text-red-400" />
  if (current < prev) return <TrendingDown className="w-3.5 h-3.5 text-green-400" />
  return <Minus className="w-3.5 h-3.5 text-gray-300" />
}

function formatDate(dateStr: string): { label: string; sub: string } {
  const date = new Date(dateStr)
  const today = new Date('2026-04-14')
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000)
  if (diff === 0) return { label: '今天', sub: dateStr }
  if (diff === 1) return { label: '昨天', sub: dateStr }
  return { label: `${diff}天前`, sub: dateStr }
}

export function DateListSidebar({ dates, dataCounts, activeDate, onDateSelect }: DateListSidebarProps) {
  const sortedDates = [...dates].sort().reverse()

  return (
    <div>
      <div className="text-xs text-gray-400 mb-3">日期筛选</div>
      <div className="space-y-1">
        {sortedDates.map((date, i) => {
          const count = dataCounts[date] || 0
          const prevCount = dataCounts[sortedDates[i + 1]] || 0
          const { label, sub } = formatDate(date)
          const isActive = date === activeDate

          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={`w-full px-3 py-2 text-left rounded-lg transition-all ${
                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                  {label}
                </span>
                {getTrend(count, prevCount)}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-400">{sub}</span>
                <span className="text-xs text-gray-500">{count}件</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
