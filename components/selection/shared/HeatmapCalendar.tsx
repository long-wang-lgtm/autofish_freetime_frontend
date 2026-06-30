'use client'

interface HeatmapCalendarProps {
  dataCounts: Record<string, number>
  activeDate: string
  onDateSelect: (date: string) => void
}

function getIntensity(count: number, max: number): string {
  if (count === 0) return 'bg-gray-50'
  const ratio = count / max
  if (ratio > 0.75) return 'bg-blue-500'
  if (ratio > 0.5) return 'bg-blue-400'
  if (ratio > 0.25) return 'bg-blue-300'
  return 'bg-blue-200'
}

export function HeatmapCalendar({ dataCounts, activeDate, onDateSelect }: HeatmapCalendarProps) {
  const dates = Object.keys(dataCounts).sort()
  const max = Math.max(...Object.values(dataCounts), 1)

  return (
    <div>
      <div className="text-xs text-gray-400 mb-3">数据密度</div>
      <div className="flex gap-1.5 flex-wrap">
        {dates.map((date) => {
          const count = dataCounts[date] || 0
          const isActive = date === activeDate
          return (
            <button
              key={date}
              onClick={() => onDateSelect(date)}
              className={`w-10 h-10 rounded-lg text-xs flex flex-col items-center justify-center transition-all ${getIntensity(count, max)} ${
                isActive ? 'ring-2 ring-blue-500 ring-offset-1' : ''
              }`}
            >
              <span className={`font-medium ${count > 0 ? 'text-white' : 'text-gray-400'}`}>
                {date.slice(5)}
              </span>
              <span className={`text-xs ${count > 0 ? 'text-white/80' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
