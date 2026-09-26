"use client"

import { Suspense } from "react"
import { TabBar } from '@/components/ui/navigation/TabBar'
import { PendingOrdersView } from '@/components/orders/PendingOrdersView'
import { ORDER_STATUS_TABS } from '@/lib/api/items'
import { useTabRouting } from '@/hooks/useTabRouting'

type OrderTabKey = typeof ORDER_STATUS_TABS[number]['key']

const ORDER_TAB_KEYS = ORDER_STATUS_TABS.map((t) => t.key)
/** 默认落在「全部订单」—— 从侧栏进来先看全量流水，要处理哪一档再点对应 Tab */
const DEFAULT_TAB: OrderTabKey = 'all'

function OrdersPageContent() {
  const [activeTab, setActiveTab] = useTabRouting<OrderTabKey>(ORDER_TAB_KEYS, DEFAULT_TAB)
  const tab =
    ORDER_STATUS_TABS.find((t) => t.key === activeTab)
    ?? ORDER_STATUS_TABS.find((t) => t.key === DEFAULT_TAB)!

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Tab 栏 — 标签充当标题，按订单状态切换列表 */}
      <TabBar
        tabs={ORDER_STATUS_TABS.map(({ key, label }) => ({ key, label }))}
        activeTab={tab.key}
        onTabChange={(key) => setActiveTab(key as OrderTabKey)}
        variant="overline"
      />

      {/* key 随 Tab 变化 → 切换状态时重置分页与排序；tab 配置整体下传（文案/时刻字段/是否待处理） */}
      <PendingOrdersView key={tab.key} tab={tab} />
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <OrdersPageContent />
    </Suspense>
  )
}
