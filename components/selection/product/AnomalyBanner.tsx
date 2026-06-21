'use client'

import type { AnomalyAlert } from '@/components/selection/product/hourlyTrendUtils'

interface AnomalyBannerProps {
  alerts: AnomalyAlert[]
}

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  red:    { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-600' },
}

export function AnomalyBanner({ alerts }: AnomalyBannerProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider px-1">
        异常预警
      </div>
      {alerts.map((a, i) => {
        const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.gray
        return (
          <div
            key={`${a.type}-${i}`}
            className={`${style.bg} ${style.border} border rounded-lg px-3 py-2 ${style.text} text-xs`}
          >
            {a.message}
          </div>
        )
      })}
    </div>
  )
}
