'use client'

import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import type { KpiCardData } from '@/hooks/useDashboardMetrics'

const CARD =
  'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4'

/** 今日 / 近 7 日 / 近 30 日的销量与销售额 */
export function KpiCards({
  kpis,
  loading = false,
}: {
  kpis: KpiCardData[]
  loading?: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.key} className={CARD}>
          <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
                  {fmtNumber(kpi.count)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">单</span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 tabular-nums leading-tight">
                {fmtPrice(kpi.payamt)}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
