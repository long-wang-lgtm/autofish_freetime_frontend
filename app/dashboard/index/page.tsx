'use client'

import { useQuery } from '@tanstack/react-query'
import { getTodayOrders } from '@/lib/api/dashboard'
import { AccountOrdersBarChart } from '@/components/ui/chart/AccountOrdersBarChart'
import { TabBar } from '@/components/ui/navigation/TabBar'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'orders', 'today'],
    queryFn: getTodayOrders,
  })

  const totalOrders = data?.reduce((sum, d) => sum + d.orderCount, 0) ?? 0

  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar
        tabs={[{ key: 'dashboard', label: '仪表盘' }]}
        activeTab="dashboard"
        onTabChange={() => {}}
        variant="overline"
      />

      {error && (
        <ErrorBanner
          message={`加载失败：${error instanceof Error ? error.message : '未知错误'}`}
          variant="inline"
          onRetry={() => refetch()}
        />
      )}

      {/* KPI 汇总卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 shrink-0">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">今日支付订单</p>
            {isLoading ? (
              <div className="h-8 w-14 bg-gray-100 rounded animate-pulse mt-0.5" />
            ) : (
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                {totalOrders}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 各账号条形图 */}
      <AccountOrdersBarChart data={data ?? []} loading={isLoading} />
    </div>
  )
}
