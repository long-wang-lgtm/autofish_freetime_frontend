'use client'

import { useMemo } from 'react'
import { OTHER_COLOR, USER_PALETTE } from '@/lib/constants/chart-theme'
import type { Account } from '@/lib/api/accounts'
import type {
  AccountDayOrderDTO,
  AccountHourOrderDTO,
  ItemDayOrderDTO,
} from '@/lib/api/dashboard'

// ===== 视图类型（图表组件消费的数据形状） =====

/** 数字卡片：一个时间窗口内的销量与销售额 */
export interface KpiCardData {
  key: string
  label: string
  count: number
  payamt: number
}

/** 条形图的一根条形：一个类目（账号/商品）在近 3 日的数值 */
export interface BarGroupData {
  key: string
  /** 账号名 / 商品标题 */
  label: string
  /** 近 3 日，升序，末位为今日 */
  days: SeriesPoint[]
}

/** 条形图上的一天 */
export interface SeriesPoint {
  /** 'YYYY-MM-DD' */
  date: string
  /** 'MM-DD' */
  label: string
  count: number
  payamt: number
}

/** 折线图：每个账号一条线，销量与销售额各一套 */
export interface TrendData {
  /** x 轴：近 30 日 'MM-DD'，升序 */
  dates: string[]
  series: {
    key: string
    label: string
    color: string
    count: number[]
    payamt: number[]
  }[]
}

/**
 * 面积图：近 3 日各一条，x 轴为 0-23 时
 *
 * 不带 color——这里的颜色语义是「指标 × 新旧」，由图表组件按
 * METRIC_ORDER_* + RECENT_DAY_LINE_ALPHA 组合，不是每系列一色。
 */
export interface HourlyData {
  /** x 轴：'00' ~ '23' */
  hours: string[]
  series: {
    /** 日期 'YYYY-MM-DD' */
    key: string
    /** 'MM-DD' */
    label: string
    count: number[]
    payamt: number[]
  }[]
}

// ===== 聚合 =====

const KPI_WINDOWS = [
  { key: 'today', label: '今日', days: 1 },
  { key: 'd7', label: '近 7 日', days: 7 },
  { key: 'd30', label: '近 30 日', days: 30 },
] as const

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

/** 'YYYY-MM-DD' → 'MM-DD' */
function shortDate(date: string): string {
  return date.slice(5)
}

/** 升序去重的日期列表 */
function sortedDates(rows: { date: string }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.date))).sort()
}

/** 取数组末尾 n 项 */
function tail<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n))
}

/** 累加一段时间窗口内的销量与销售额 */
function sumWindow(
  rows: AccountDayOrderDTO[],
  window: Set<string>,
): { count: number; payamt: number } {
  let count = 0
  let payamt = 0
  for (const r of rows) {
    if (!window.has(r.date)) continue
    count += r.count
    payamt += r.payamt
  }
  return { count, payamt }
}

/** 把 (日期 → 数值) 映射摊平到 days 上，缺的补 0 */
function toSeriesPoints(
  byDate: Map<string, { count: number; payamt: number }>,
  days: string[],
): SeriesPoint[] {
  return days.map((d) => {
    const v = byDate.get(d)
    return {
      date: d,
      label: shortDate(d),
      count: v?.count ?? 0,
      payamt: v?.payamt ?? 0,
    }
  })
}

/** 按近 3 日销量合计降序 */
function byTotalDesc(a: BarGroupData, b: BarGroupData): number {
  const sum = (g: BarGroupData) => g.days.reduce((s, d) => s + d.count, 0)
  return sum(b) - sum(a)
}

// ===== Hook =====

export interface DashboardMetricsInput {
  accountDay: AccountDayOrderDTO[]
  accountHour: AccountHourOrderDTO[]
  itemDay: ItemDayOrderDTO[]
  accounts: Account[]
  /** 选中的账号 uid；null 表示全选 */
  selectedUids: string[] | null
}

/**
 * 仪表盘派生数据（状态派生层）
 *
 * 负责三件事：按账号筛选、按时间窗口汇总、把稀疏行散列补零成规整数组。
 * 纯计算，不发请求。
 */
export function useDashboardMetrics({
  accountDay,
  accountHour,
  itemDay,
  accounts,
  selectedUids,
}: DashboardMetricsInput) {
  return useMemo(() => {
    // 账号全集以账号列表为准；列表还没回来时退回订单行里的 uid，
    // 否则 active 集合为空会把所有数据都过滤掉
    const allUids = accounts.length
      ? accounts.map((a) => a.uid)
      : Array.from(new Set([...accountDay, ...accountHour].map((r) => r.uid))).sort()
    const activeUids = selectedUids ?? allUids
    // 颜色按账号全集的下标分配，筛选切换时同一账号的颜色保持不变
    const colorOf = new Map(
      allUids.map((uid, i) => [uid, USER_PALETTE[i % USER_PALETTE.length]]),
    )
    const active = new Set(activeUids)

    // 账号名：以账号列表为准，订单行里的名字兜底
    const nameOf = new Map<string, string>()
    for (const a of accounts) nameOf.set(a.uid, a.name)
    for (const r of accountDay) if (!nameOf.has(r.uid)) nameOf.set(r.uid, r.name)

    const dayRows = accountDay.filter((r) => active.has(r.uid))
    const hourRows = accountHour.filter((r) => active.has(r.uid))

    // 折线图窗口：近 30 日
    const trendDates = tail(sortedDates(dayRows), 30)
    // 条形图/面积图窗口：近 3 日（以小时接口的覆盖范围为准）
    const days3 = tail(sortedDates(hourRows), 3)
    const barDays = days3.length ? days3 : tail(trendDates, 3)

    const kpis: KpiCardData[] = KPI_WINDOWS.map((w) => {
      const { count, payamt } = sumWindow(dayRows, new Set(tail(sortedDates(dayRows), w.days)))
      return { key: w.key, label: w.label, count, payamt }
    })

    const accountBars: BarGroupData[] = activeUids
      .map((uid) => {
        const byDate = new Map<string, { count: number; payamt: number }>()
        for (const r of dayRows) {
          if (r.uid !== uid) continue
          const cur = byDate.get(r.date) ?? { count: 0, payamt: 0 }
          cur.count += r.count
          cur.payamt += r.payamt
          byDate.set(r.date, cur)
        }
        return {
          key: uid,
          label: nameOf.get(uid) ?? uid,
          days: toSeriesPoints(byDate, barDays),
        }
      })
      .sort(byTotalDesc)

    const itemByGid = new Map<
      string,
      { label: string; byDate: Map<string, { count: number; payamt: number }> }
    >()
    for (const r of itemDay) {
      if (!active.has(r.uid)) continue
      const key = String(r.gid)
      let entry = itemByGid.get(key)
      if (!entry) {
        entry = { label: r.title, byDate: new Map() }
        itemByGid.set(key, entry)
      }
      const cur = entry.byDate.get(r.date) ?? { count: 0, payamt: 0 }
      cur.count += r.count
      cur.payamt += r.payamt
      entry.byDate.set(r.date, cur)
    }
    const itemBars: BarGroupData[] = Array.from(itemByGid.entries())
      .map(([key, entry]) => ({
        key,
        label: entry.label,
        days: toSeriesPoints(entry.byDate, barDays),
      }))
      .sort(byTotalDesc)

    const trendIndex = new Map(trendDates.map((d, i) => [d, i]))
    const trend: TrendData = {
      dates: trendDates.map(shortDate),
      series: activeUids.map((uid) => {
        const count = new Array(trendDates.length).fill(0)
        const payamt = new Array(trendDates.length).fill(0)
        for (const r of dayRows) {
          if (r.uid !== uid) continue
          const j = trendIndex.get(r.date)
          if (j === undefined) continue
          count[j] += r.count
          payamt[j] += r.payamt
        }
        return {
          key: uid,
          label: nameOf.get(uid) ?? uid,
          color: colorOf.get(uid) ?? OTHER_COLOR,
          count,
          payamt,
        }
      }),
    }

    const hourly: HourlyData = {
      hours: HOURS,
      series: days3.map((d) => {
        const count = new Array(24).fill(0)
        const payamt = new Array(24).fill(0)
        for (const r of hourRows) {
          if (r.date !== d) continue
          const h = Number(r.hour)
          if (!Number.isInteger(h) || h < 0 || h > 23) continue
          count[h] += r.count
          payamt[h] += r.payamt
        }
        return { key: d, label: shortDate(d), count, payamt }
      }),
    }

    return { allUids, activeUids, kpis, accountBars, itemBars, trend, hourly, days3: barDays }
  }, [accountDay, accountHour, itemDay, accounts, selectedUids])
}
