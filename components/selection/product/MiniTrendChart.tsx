'use client'

interface MiniTrendChartProps {
  /** 小时级时序数据（如 hourly_want_rate），按时间升序 */
  hourlyData: number[]
  /** 趋势方向 */
  slope: 'up' | 'down' | 'flat' | null
  /** 日均值 */
  dailyAvg: number | null
  /** 变异系数（stability） */
  cv: number | null
  /** 颜色主题 */
  color: 'amber' | 'blue' | 'violet'
}

const COLOR_MAP: Record<string, { stroke: string; gradient: [string, string] }> = {
  amber:  { stroke: '#d97706', gradient: ['rgba(217,119,6,0.10)', 'rgba(217,119,6,0.02)'] },
  blue:   { stroke: '#2563eb', gradient: ['rgba(37,99,235,0.08)', 'rgba(37,99,235,0.01)'] },
  violet: { stroke: '#7c3aed', gradient: ['rgba(124,58,237,0.08)', 'rgba(124,58,237,0.02)'] },
}

const SLOPE_DISPLAY: Record<string, { arrow: string; color: string }> = {
  up:   { arrow: '↗', color: '' },
  down: { arrow: '↘', color: '#ef4444' },
  flat: { arrow: '→', color: '#9ca3af' },
}

function fmtDaily(v: number | null): string {
  if (v === null) return '-'
  return v.toFixed(1)
}

function fmtCV(v: number | null): string {
  if (v === null) return '-'
  return v.toFixed(2)
}

export function MiniTrendChart({ hourlyData, slope, dailyAvg, cv, color }: MiniTrendChartProps) {
  const W = 90
  const H = 32
  const palette = COLOR_MAP[color] || COLOR_MAP.amber
  const slopeInfo = (slope && SLOPE_DISPLAY[slope]) ? SLOPE_DISPLAY[slope] : { arrow: '-', color: '#9ca3af' }
  const arrowColor = slope === 'up' ? palette.stroke : slopeInfo.color

  // 生成 SVG polyline
  let polylinePoints = ''
  if (hourlyData.length >= 2) {
    const max = Math.max(...hourlyData)
    const min = Math.min(...hourlyData)
    const range = max - min || 1
    const points = hourlyData.map((v, i) => {
      const x = (i / (hourlyData.length - 1)) * W
      const y = H - ((v - min) / range) * (H - 4) - 2
      return `${x},${y}`
    })
    polylinePoints = points.join(' ')
  }

  const svgOpacity = hourlyData.length >= 2 ? 0.30 : 0.20

  return (
    <div
      className="relative w-[90px] h-[32px] rounded overflow-hidden"
      title={`日均 ${fmtDaily(dailyAvg)} · CV ${fmtCV(cv)}`}
    >
      {/* Layer 1: background gradient */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${palette.gradient[0]}, ${palette.gradient[1]})` }}
      />
      {/* Layer 2: SVG polyline */}
      {polylinePoints && (
        <svg width={W} height={H} className="absolute inset-0" style={{ opacity: svgOpacity }}>
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={palette.stroke}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {/* Layer 3: indicator text */}
      <div className="relative z-[1] flex justify-around items-center h-full text-[9px]">
        <span className="text-gray-500 tabular-nums">日{fmtDaily(dailyAvg)}</span>
        <span className="tabular-nums" style={{ color: arrowColor, fontWeight: 600 }}>{slopeInfo.arrow}</span>
        <span className="text-gray-500 tabular-nums">CV{fmtCV(cv)}</span>
      </div>
    </div>
  )
}
