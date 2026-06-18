'use client'

interface MiniTrendChartProps {
  /** 最近 10 次采集的询单数，按时间升序 */
  data: number[]
  /** 趋势方向，决定折线颜色 */
  trend: 'up' | 'down' | 'flat'
  /** 最近一次采集时间（ISO 8601），用于 tooltip */
  lastCollectedAt: string | null
}

const COLOR_MAP: Record<string, string> = {
  up: '#16a34a',   // green-600
  down: '#dc2626', // red-600
  flat: '#9ca3af', // gray-400
}

export function MiniTrendChart({ data, trend, lastCollectedAt }: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return <span className="text-xs text-gray-400">-</span>
  }

  const width = 100
  const height = 28
  const padding = 2

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // 将数据点映射为 SVG 坐标
  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const polyline = points.join(' ')
  const lastValue = data[data.length - 1]
  const color = COLOR_MAP[trend] || COLOR_MAP.flat

  const tooltipText = lastCollectedAt
    ? `最后采集: ${new Date(lastCollectedAt).toLocaleDateString('zh-CN')} · 询单 ${lastValue}`
    : `最近询单: ${lastValue}`

  return (
    <div className="inline-flex items-center justify-center" title={tooltipText}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1]?.split(',')[0] || 0}
          cy={points[points.length - 1]?.split(',')[1] || 0}
          r="2"
          fill={color}
        />
      </svg>
    </div>
  )
}
