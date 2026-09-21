'use client'

import { useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { useAccounts } from '@/hooks/useAccounts'
import { AccountFilterBar } from '@/components/dashboard/AccountFilterBar'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { MetricBarChart } from '@/components/dashboard/MetricBarChart'
import { DailyTrendChart } from '@/components/dashboard/DailyTrendChart'
import { HourlyAreaChart } from '@/components/dashboard/HourlyAreaChart'
import { ErrorBanner } from '@/components/ui/feedback/ErrorBanner'

/** 条形图与折线/面积图的高度，账号与商品两组各自对齐 */
const BAR_HEIGHT = 420
const TIME_HEIGHT = 320

/** 账号名短（3-5 字），留白压到最小；商品标题长，多给几个字 */
const ACCOUNT_LABEL_MAX = 6
const ITEM_LABEL_MAX = 10

export default function DashboardPage() {
  const { accountDay, accountHour, itemDay, isLoading, error, refetch } =
    useDashboardData()
  const { accounts } = useAccounts()
  // null = 全部账号；筛选只发生在客户端，不重新请求
  const [selectedUids, setSelectedUids] = useState<string[] | null>(null)

  // 商品条数即接口给的条数（Top 20），装不下时由卡片内部滚动查看
  const { kpis, accountBars, itemBars, trend, hourly } = useDashboardMetrics({
    accountDay,
    accountHour,
    itemDay,
    accounts,
    selectedUids,
  })

  return (
    <div className="space-y-5">
      {/* 账号筛选常驻仪表盘顶部：滚到下面的图表也随手能切账号，不用翻回最上面。
          背景铺成页面底色，内容滑到它下面时被盖住（同 TabBar 的 sticky 写法） */}
      <div className="sticky top-0 z-20 bg-gray-50 py-1">
        <AccountFilterBar
          accounts={accounts}
          selected={selectedUids}
          onChange={setSelectedUids}
          onRefresh={refetch}
          loading={isLoading}
        />
      </div>

      {error && (
        <ErrorBanner
          message={`加载失败：${error instanceof Error ? error.message : '未知错误'}`}
          variant="banner"
          onRetry={refetch}
        />
      )}

      <KpiCards kpis={kpis} loading={isLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <DailyTrendChart trend={trend} height={TIME_HEIGHT} loading={isLoading} />
        <HourlyAreaChart hourly={hourly} height={TIME_HEIGHT} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <MetricBarChart
          title="账号成单 · 近 3 日"
          groups={accountBars}
          height={BAR_HEIGHT}
          labelMax={ACCOUNT_LABEL_MAX}
          loading={isLoading}
        />
        <MetricBarChart
          title="商品成单 · 近 3 日 TOP 20"
          groups={itemBars}
          height={BAR_HEIGHT}
          labelMax={ITEM_LABEL_MAX}
          loading={isLoading}
        />
      </div>

    </div>
  )
}
