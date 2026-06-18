'use client'

import { useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TabBar, type TabName } from '@/components/selection/shared/TabBar'
import { KeywordCollectionTab } from '@/components/selection/keyword/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/product/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/merchant/MerchantMonitorTab'
import { SettingsDrawer } from '@/components/selection/shared/SettingsDrawer'
import { Settings } from 'lucide-react'

const VALID_TABS: TabName[] = ['keyword', 'product', 'merchant']

function parseTab(raw: string | null): TabName {
  if (raw && VALID_TABS.includes(raw as TabName)) return raw as TabName
  return 'keyword'
}

function SelectionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const selectionTab = parseTab(searchParams.get('tab'))

  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleTabChange = useCallback((tab: TabName) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/dashboard/selection?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 顶部工具栏：TabBar + 设置按钮 */}
      <div className="flex items-center justify-between">
        <TabBar activeTab={selectionTab} onTabChange={handleTabChange} />
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
