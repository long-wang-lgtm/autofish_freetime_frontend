'use client'

import { useState } from 'react'
import { TabBar, TabName } from '@/components/selection/TabBar'
import { KeywordCollectionTab } from '@/components/selection/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/MerchantMonitorTab'

export default function SelectionPage() {
  const [activeTab, setActiveTab] = useState<TabName>('keyword')
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {/* 顶层 TabBar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab 内容 */}
      {activeTab === 'keyword' && (
        <KeywordCollectionTab
          selectedKeywordId={selectedKeywordId}
          onSelectKeyword={setSelectedKeywordId}
        />
      )}

      {activeTab === 'product' && (
        <ProductMonitorTab />
      )}

      {activeTab === 'merchant' && (
        <MerchantMonitorTab />
      )}
    </div>
  )
}
