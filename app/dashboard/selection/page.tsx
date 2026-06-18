'use client'

import { useState } from 'react'
import { TabBar, type TabName } from '@/components/selection/shared/TabBar'
import { KeywordCollectionTab } from '@/components/selection/keyword/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/product/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/merchant/MerchantMonitorTab'
import { SettingsDrawer } from '@/components/selection/shared/SettingsDrawer'
import { Settings } from 'lucide-react'

export default function SelectionPage() {
  const [selectionTab, setSelectionTab] = useState<TabName>('keyword')
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 顶部工具栏：TabBar + 设置按钮 */}
      <div className="flex items-center justify-between">
        <TabBar activeTab={selectionTab} onTabChange={setSelectionTab} />
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
