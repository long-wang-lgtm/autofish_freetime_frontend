'use client'

import { useState } from 'react'
import { TabBar, type TabName } from '@/components/selection/shared/TabBar'
import { KeywordCollectionTab } from '@/components/selection/keyword/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/product/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/merchant/MerchantMonitorTab'

export default function SelectionPage() {
  const [selectionTab, setSelectionTab] = useState<TabName>('keyword')
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 顶部 TabBar */}
      <TabBar activeTab={selectionTab} onTabChange={setSelectionTab} />

      {/* Tab 内容 */}
      {selectionTab === 'keyword' && (
        <KeywordCollectionTab
          selectedKeywordId={selectedKeywordId}
          onSelectKeyword={setSelectedKeywordId}
        />
      )}
      {selectionTab === 'product' && <ProductMonitorTab />}
      {selectionTab === 'merchant' && <MerchantMonitorTab />}
    </div>
  )
}
