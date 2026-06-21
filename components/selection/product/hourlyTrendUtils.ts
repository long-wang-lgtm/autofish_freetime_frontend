import type { HourlyTrendDTO, WindowMetricsDTO } from '@/lib/api/selection'

// ===== 数据格式转换 =====

/** ECharts dataset 行式格式 */
export interface EChartsDataset {
  dimensions: string[]
  source: (number | string | null)[][]
}

/**
 * 将后端列式 hourly_trend 转置为 ECharts dataset 行式格式。
 * 输入: { ts:[t1,t2,...], hourly_want_rate:[v1,v2,...], ... }
 * 输出: { dimensions: ['ts','hourly_want_rate',...], source: [[t1,v1,...], [t2,v2,...], ...] }
 */
export function transposeHourlyTrendToDataset(
  ht: HourlyTrendDTO,
  fields: string[]
): EChartsDataset {
  const keys = Object.keys(ht) as (keyof HourlyTrendDTO)[]
  const includedFields = fields.filter(f => keys.includes(f as keyof HourlyTrendDTO) && Array.isArray((ht as any)[f]))

  const source = (ht.ts || []).map((ts, i) => {
    return [ts, ...includedFields.map(f => (ht as any)[f]?.[i] ?? null)]
  })

  return {
    dimensions: ['ts', ...includedFields],
    source,
  }
}

// ===== 稳定性计算 =====

export interface StabilityStats {
  cv: number | null
  mean: number | null
  stddev: number | null
  n: number
}

/**
 * 从数组计算 CV（变异系数）、均值、标准差。
 * 非零均值时 CV = σ / |μ|，零均值或无数据时返回 null。
 */
export function computeStability(values: number[]): StabilityStats {
  const n = values.length
  if (n === 0) return { cv: null, mean: null, stddev: null, n: 0 }

  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
  const stddev = Math.sqrt(variance)
  const cv = mean !== 0 ? stddev / Math.abs(mean) : null

  return { cv, mean, stddev, n }
}

/**
 * 从 hourly_trend 指定字段取最近 N 个数据点计算稳定性。
 * 确保 CV = σ/|μ| 数学一致性（三项均在同一个数组上计算）。
 */
export function computeStabilityFromTrend(
  ht: HourlyTrendDTO | null | undefined,
  field: 'hourly_want_rate' | 'hourly_look_rate' | 'hourly_collect_rate',
  windowPoints: number = 168 // 默认近 7 天 = 168 小时
): StabilityStats {
  if (!ht) return { cv: null, mean: null, stddev: null, n: 0 }
  const arr = ht[field]
  if (!arr || arr.length === 0) return { cv: null, mean: null, stddev: null, n: 0 }

  const recent = arr.slice(-windowPoints)
  return computeStability(recent)
}

// ===== 异常检测 =====

export interface AnomalyAlert {
  type: string
  severity: 'red' | 'orange' | 'yellow' | 'green' | 'gray'
  message: string
}

/**
 * 根据设计文档 3.2 节规则，生成异常预警列表。
 * 多条可同时触发，按严重度排序。
 */
export function detectAnomalies(
  wm: { d1: WindowMetricsDTO; d3: WindowMetricsDTO; d7: WindowMetricsDTO } | null,
  hourlyTrend: HourlyTrendDTO | null
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = []
  if (!wm) return alerts

  const { d1, d7 } = wm

  // 1. 合并流量 + 需求波动（当 want 或 look CV 达标时触发）
  const wantCv = d7.want_stability
  const lookCv = d7.look_stability
  const worstCv = Math.max(wantCv ?? 0, lookCv ?? 0)
  const worstDimension = (wantCv ?? 0) >= (lookCv ?? 0) ? '想要需求' : '浏览流量'
  if (worstCv >= 1.2) {
    alerts.push({
      type: 'data_volatile',
      severity: 'red',
      message: `🚨 数据波动剧烈 (${worstDimension} CV=${worstCv.toFixed(2)})，可能存在断崖或突增`,
    })
  } else if (worstCv >= 0.8) {
    alerts.push({
      type: 'data_unstable',
      severity: 'orange',
      message: `⚠️ 数据波动较大 (${worstDimension} CV=${worstCv.toFixed(2)})`,
    })
  }

  // 5. 收藏率悬崖 (d1_favorite_rate < d7_favorite_rate × 0.5)
  if (
    d1.favorite_rate != null &&
    d7.favorite_rate != null &&
    d7.favorite_rate > 0 &&
    d1.favorite_rate < d7.favorite_rate * 0.5
  ) {
    alerts.push({
      type: 'favorite_cliff',
      severity: 'orange',
      message: `⚠️ 近期收藏意愿骤降 (D7=${(d7.favorite_rate * 100).toFixed(1)}% → D1=${(d1.favorite_rate * 100).toFixed(1)}%)，可能竞品上架或平台调权`,
    })
  }

  // 6. 浏览负增长 (d7 browse_growth < -0.10)
  if (d7.browse_growth != null && d7.browse_growth < -0.10) {
    alerts.push({
      type: 'browse_decline',
      severity: 'orange',
      message: `⚠️ 7天流量趋势下行 (${(d7.browse_growth * 100).toFixed(1)}%)`,
    })
  }

  // 7. 零询单窗口 (d1 total_dwant === 0 且 quality_label !== 'insufficient')
  if (d1.total_dwant === 0 && d7.quality_label !== 'insufficient') {
    alerts.push({
      type: 'zero_inquiry',
      severity: 'orange',
      message: '❕ 近24小时零询单，商品可能已无活跃度',
    })
  }

  // 8. 询单率骤降但流量未减（最危险信号——商品竞争力恶化）
  if (
    d1.inquiry_rate != null &&
    d7.inquiry_rate != null &&
    d7.inquiry_rate > 0 &&
    d1.inquiry_rate < d7.inquiry_rate * 0.7 &&
    (d7.browse_growth == null || d7.browse_growth >= 0)
  ) {
    alerts.push({
      type: 'inquiry_collapse',
      severity: 'red',
      message: `🔴 询单率骤降但流量未减，商品竞争力在恶化 (D7=${(d7.inquiry_rate * 100).toFixed(1)}% → D1=${(d1.inquiry_rate * 100).toFixed(1)}%)`,
    })
  }

  // 9. 极端询藏比 (d7 if_ratio > 5)
  if (d7.if_ratio != null && d7.if_ratio > 5) {
    alerts.push({
      type: 'extreme_if_ratio',
      severity: 'gray',
      message: `❕ 询藏比极高 (${d7.if_ratio.toFixed(2)})，用户大量咨询但极少收藏`,
    })
  }

  // 9. 降价信号 (price_trend === 'down' 且降幅 > 3%)
  if (d7.price_trend === 'down' && d7.price_lowest_ratio != null && d7.price_lowest_ratio < 0.97) {
    const pct = ((1 - d7.price_lowest_ratio) * 100).toFixed(1)
    alerts.push({
      type: 'price_drop',
      severity: 'yellow',
      message: `⚠️ 近期降价 ${pct}%，询单率如有回升则为有效降价`,
    })
  }

  // 10. 提价信号 (price_trend === 'up' 且涨幅 > 3%)
  if (d7.price_trend === 'up' && d7.price_lowest_ratio != null && d7.price_lowest_ratio > 1.03) {
    const pct = ((d7.price_lowest_ratio - 1) * 100).toFixed(1)
    alerts.push({
      type: 'price_rise',
      severity: 'green',
      message: `💹 近期提价 ${pct}%，如需求未降则卖家有定价权`,
    })
  }

  return alerts
}

// ===== 趋势判断 =====

/**
 * 三值趋势标签（启发式，非统计显著）。
 * 基于 D1/D3/D7 三窗口单调性，返回趋势类型和说明。
 */
export function judgeThreeWindowTrend(
  d1: number | null,
  d3: number | null,
  d7: number | null
): { label: string; direction: 'up' | 'down' | 'v' | 'peak' | 'mixed' } {
  if (d1 == null || d3 == null || d7 == null) {
    return { label: '数据不足', direction: 'mixed' }
  }
  if (d1 > d3 && d3 > d7) return { label: '持续下行', direction: 'down' }
  if (d1 < d3 && d3 < d7) return { label: '持续上行', direction: 'up' }
  if (d3 < d1 && d3 < d7) return { label: '触底反弹', direction: 'v' }
  if (d3 > d1 && d3 > d7) return { label: '见顶回落', direction: 'peak' }
  return { label: '无明显趋势', direction: 'mixed' }
}
