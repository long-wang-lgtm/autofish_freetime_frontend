'use client'

import { Suspense } from 'react'
import { TabBar } from '@/components/ui/navigation/TabBar'
import { useTabRouting } from '@/hooks/useTabRouting'
import { Search, Lightbulb, PenTool, FileText } from 'lucide-react'

type TabName = 'monitor' | 'opportunity' | 'workbench' | 'materials'

const BATCH_PUBLISH_TABS: { key: TabName; label: string; icon: React.ReactNode }[] = [
  { key: 'monitor', label: '商品监控', icon: <Search className="w-4 h-4" /> },
  { key: 'opportunity', label: '商机管理', icon: <Lightbulb className="w-4 h-4" /> },
  { key: 'workbench', label: '创作台', icon: <PenTool className="w-4 h-4" /> },
  { key: 'materials', label: '发布记录', icon: <FileText className="w-4 h-4" /> },
]

function PageContent() {
  const [activeTab, setTab] = useTabRouting<TabName>(
    ['monitor', 'opportunity', 'workbench', 'materials'],
    'monitor'
  )

  return (
    <div className="flex flex-col gap-5 h-full">
      <TabBar
        tabs={BATCH_PUBLISH_TABS}
        activeTab={activeTab}
        onTabChange={(key) => setTab(key as TabName)}
        variant="overline"
      />

      {activeTab === 'monitor' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          商品监控 — 开发中
        </div>
      )}
      {activeTab === 'opportunity' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          商机管理 — 开发中
        </div>
      )}
      {activeTab === 'workbench' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          创作台 — 开发中
        </div>
      )}
      {activeTab === 'materials' && (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          发布记录 — 开发中
        </div>
      )}
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
