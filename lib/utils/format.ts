/**
 * 价格格式化——千分位，无小数
 * fmtPrice(12345) → "¥12,345"
 * fmtPrice(12345.5) → "¥12,346"
 */
export function fmtPrice(v: number): string {
  return `¥${Math.round(v).toLocaleString('zh-CN')}`
}

/**
 * 百分比——1 位小数，无正负号前缀（颜色承担语义）
 * fmtPercent(0.125) → "12.5%"
 * fmtPercent(-0.03) → "-3.0%"
 * fmtPercent(null) → "-"
 */
export function fmtPercent(v: number | null): string {
  if (v === null) return '-'
  return `${(v * 100).toFixed(1)}%`
}

/**
 * 增长率——带正负号前缀
 * fmtGrowth(0.153) → "+15.3%"
 * fmtGrowth(-0.082) → "-8.2%"
 * fmtGrowth(0) → "0%"
 * fmtGrowth(null) → "-"
 */
export function fmtGrowth(v: number | null): string {
  if (v === null) return '-'
  const pct = (v * 100).toFixed(1)
  return v > 0 ? `+${pct}%` : v < 0 ? `${pct}%` : '0%'
}

/**
 * 加速度——文字 + 增长率
 * fmtAcceleration(0.45) → "加速 +45.0%"
 * fmtAcceleration(-0.5) → "降温 -50.0%"
 * fmtAcceleration(0.1) → "平稳"
 * fmtAcceleration(null) → "-"
 */
export function fmtAcceleration(v: number | null): string {
  if (v === null) return '-'
  const pct = (v * 100).toFixed(1)
  if (v > 0.3) return `加速 +${pct}%`
  if (v < -0.3) return `降温 ${pct}%`
  return '平稳'
}

/**
 * 大数字——千分位
 * fmtNumber(1234567) → "1,234,567"
 */
export function fmtNumber(v: number): string {
  return v.toLocaleString('zh-CN')
}

/**
 * 日期——统一格式 YYYY-MM-DD
 * fmtDate("2026-06-29") → "2026-06-29"
 */
export function fmtDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 日期时间 YYYY-MM-DD HH:mm
 * fmtDateTime("2026-06-29T14:30:00") → "2026-06-29 14:30"
 */
export function fmtDateTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

/**
 * 相对时间——用于列表项
 * fmtRelative("2026-06-29T12:00:00") 相对于当前时间 → "2小时前" / "3天前" / "刚刚"
 */
export function fmtRelative(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return fmtDate(date)
}
