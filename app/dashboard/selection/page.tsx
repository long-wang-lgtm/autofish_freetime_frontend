'use client'

import { useState, Suspense } from 'react'
import { TabBar } from '@/components/ui/Tab'
import { KeywordCollectionTab } from '@/components/selection/keyword/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/product/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/merchant/MerchantMonitorTab'
import { SettingsDrawer } from '@/components/selection/shared/SettingsDrawer'
import { useTabRouting } from '@/hooks/useTabRouting'
import { Search, BarChart2, Users, Settings } from 'lucide-react'

type TabName = 'keyword' | 'product' | 'merchant'

const SELECTION_TABS: { key: TabName; label: string; icon: React.ReactNode }[] = [
  { key: 'keyword', label: '关键词采集', icon: <Search className="w-4 h-4" /> },
  { key: 'product', label: '商品监控', icon: <BarChart2 className="w-4 h-4" /> },
  { key: 'merchant', label: '商家监控', icon: <Users className="w-4 h-4" /> },
]

function SelectionContent() {
  const [selectionTab, setSelectionTab] = useTabRouting<TabName>(
    ['keyword', 'product', 'merchant'],
    'keyword'
  )

  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 顶部工具栏：TabBar + 设置按钮 */}
      <div className="flex items-center justify-between">
        <TabBar
          tabs={SELECTION_TABS}
          activeTab={selectionTab}
          onTabChange={(key) => setSelectionTab(key as TabName)}
          variant="overline"
        />
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>

      {/* Tab 内容 */}
      {selectionTab === 'keyword' && (
        <KeywordCollectionTab
          selectedKeywordId={selectedKeywordId}
          onSelectKeyword={setSelectedKeywordId}
        />
      )}
      {selectionTab === 'product' && <ProductMonitorTab />}
      {selectionTab === 'merchant' && <MerchantMonitorTab />}

      {/* 设置抽屉 */}
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default function SelectionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>}>
      <SelectionContent />
    </Suspense>
  )
}
