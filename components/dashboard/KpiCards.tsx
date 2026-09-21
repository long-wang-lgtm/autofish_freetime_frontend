'use client'

import { fmtNumber, fmtPrice } from '@/lib/utils/format'
import type { KpiCardData } from '@/hooks/useDashboardMetrics'

/** 今日 / 近 7 日 / 近 30 日的销量与销售额——每个窗口两行：第一行标签、第二行数据
 *  （单量 + 金额），三块之间竖线分隔。宽度按内容，不拉伸到全宽。 */
export function KpiCards({
  kpis,
  loading = false,
}: {
  kpis: KpiCardData[]
  loading?: boolean
}) {
  return (
    <div className="w-full lg:w-auto flex items-stretch divide-x divide-gray-100 dark:divide-gray-800 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          className="flex-1 lg:flex-none flex flex-col justify-center px-4 first:pl-0 last:pr-0"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
          {loading ? (
            <div className="mt-1 h-6 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
              <span className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 tabular-nums leading-tight">
                {fmtNumber(kpi.count)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">单</span>
              <span className="text-xs lg:text-sm lg:ml-1 text-gray-500 dark:text-gray-400 tabular-nums leading-tight">
                {fmtPrice(kpi.payamt)}
              </span>
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
