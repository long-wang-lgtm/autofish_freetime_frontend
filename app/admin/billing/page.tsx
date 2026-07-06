'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/Tab'
import { useTabRouting } from '@/hooks/useTabRouting'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Coins } from 'lucide-react'
import { MembershipPlanTab } from './MembershipPlanTab'
import { FeaturePricingTab } from './FeaturePricingTab'
import { StonePricingTab } from './StonePricingTab'
import { OrderHistoryTab } from './OrderHistoryTab'

const TABS = [
  { key: 'membership', label: '会员方案' },
  { key: 'features', label: '功能定价' },
  { key: 'stones', label: '风铃石定价' },
  { key: 'orders', label: '订单记录' },
]

function BillingPageContent() {
  const [tab, setTab] = useTabRouting(
    ['membership', 'features', 'stones', 'orders'] as const,
    'membership',
  )

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 标题栏 */}
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-semibold text-gray-900">计费管理</h1>
      </div>

      {/* TabBar */}
      <TabBar
        tabs={TABS}
        activeTab={tab}
        onTabChange={(key) => setTab(key as typeof tab)}
        variant="overline"
      />

      {/* 内容卡片 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-4 lg:p-6">
        {tab === 'membership' && <MembershipPlanTab />}
        {tab === 'features' && <FeaturePricingTab />}
        {tab === 'stones' && <StonePricingTab />}
        {tab === 'orders' && <OrderHistoryTab />}
      </div>
    </div>
  )
}

export default function AdminBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
