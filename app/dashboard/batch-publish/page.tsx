'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/navigation/TabBar'
import { useTabRouting } from '@/hooks/useTabRouting'
import { Search, PenTool, FileText } from 'lucide-react'
import dynamic from 'next/dynamic'

// 非首屏组件懒加载（遵循 frontend-performance.md）
const MonitorTab = dynamic(
  () => import('@/components/batch-publish/monitor/MonitorTab').then(m => ({ default: m.MonitorTab })),
  { loading: () => <TabPlaceholder text="商品监控加载中..." /> }
)
const MaterialsTab = dynamic(
  () => import('@/components/batch-publish/materials/MaterialsTab').then(m => ({ default: m.MaterialsTab })),
  { loading: () => <TabPlaceholder text="发布记录加载中..." /> }
)
const WorkbenchTab = dynamic(
  () => import('@/components/batch-publish/workbench/WorkbenchTab').then(m => ({ default: m.WorkbenchTab })),
  { loading: () => <TabPlaceholder text="创作台加载中..." /> }
)

function TabPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      {text}
    </div>
  )
}

type TabName = 'monitor' | 'workbench' | 'materials'

const BATCH_PUBLISH_TABS: { key: TabName; label: string; icon: React.ReactNode }[] = [
  { key: 'workbench', label: '商品发布', icon: <PenTool className="w-4 h-4" /> },
  { key: 'materials', label: '素材工作台', icon: <FileText className="w-4 h-4" /> },
  { key: 'monitor', label: '商品监控', icon: <Search className="w-4 h-4" /> },
]

function PageContent() {
  const [activeTab, setTab] = useTabRouting<TabName>(
    ['monitor', 'workbench', 'materials'],
    'workbench'
  )

  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar
        tabs={BATCH_PUBLISH_TABS}
        activeTab={activeTab}
        onTabChange={(key) => setTab(key as TabName)}
        variant="overline"
      />

      {activeTab === 'monitor' && <MonitorTab />}
      {activeTab === 'workbench' && <WorkbenchTab />}
      {activeTab === 'materials' && <MaterialsTab />}
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
