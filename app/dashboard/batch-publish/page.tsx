'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/navigation/TabBar'
import { useTabRouting } from '@/hooks/useTabRouting'
import { Package, FileText, Search } from 'lucide-react'
import dynamic from 'next/dynamic'

// 非首屏组件懒加载（遵循 frontend-performance.md）
const SpreadTab = dynamic(
  () => import('@/components/batch-publish/spread/SpreadTab').then(m => ({ default: m.SpreadTab })),
  { loading: () => <TabPlaceholder text="批量铺货加载中..." /> }
)
const OriginalTab = dynamic(
  () => import('@/components/batch-publish/original/OriginalTab').then(m => ({ default: m.OriginalTab })),
  { loading: () => <TabPlaceholder text="原创素材加载中..." /> }
)
const SelectionTab = dynamic(
  () => import('@/components/batch-publish/selection/SelectionTab').then(m => ({ default: m.SelectionTab })),
  { loading: () => <TabPlaceholder text="选品中心加载中..." /> }
)

function TabPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      {text}
    </div>
  )
}

type TabName = 'spread' | 'original' | 'selection'

const BATCH_PUBLISH_TABS: { key: TabName; label: string; icon: React.ReactNode }[] = [
  { key: 'spread', label: '批量铺货', icon: <Package className="w-4 h-4" /> },
  { key: 'original', label: '原创素材', icon: <FileText className="w-4 h-4" /> },
  { key: 'selection', label: '选品中心', icon: <Search className="w-4 h-4" /> },
]

function PageContent() {
  const [activeTab, setTab] = useTabRouting<TabName>(
    ['spread', 'original', 'selection'],
    'spread'
  )

  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar
        tabs={BATCH_PUBLISH_TABS}
        activeTab={activeTab}
        onTabChange={(key) => setTab(key as TabName)}
        variant="overline"
      />

      {activeTab === 'spread' && <SpreadTab />}
      {activeTab === 'original' && <OriginalTab />}
      {activeTab === 'selection' && <SelectionTab />}
    </div>
  )
}

export default function BatchPublishPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
    }>
      <PageContent />
    </Suspense>
  )
}
