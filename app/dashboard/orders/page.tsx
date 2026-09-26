"use client"

import { TabBar } from '@/components/ui/navigation/TabBar'
import { PendingOrdersView } from '@/components/orders/PendingOrdersView'

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Tab 栏 — 标签充当标题 */}
      <TabBar
        tabs={[{ key: "orders", label: "待发货订单" }]}
        activeTab="orders"
        onTabChange={() => {}}
        variant="overline"
      />

      <PendingOrdersView />
    </div>
  )
}
