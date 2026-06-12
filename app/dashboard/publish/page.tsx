'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TabBar } from '@/components/ui/Tab'
import { OpportunityLibrary } from '@/components/publish/OpportunityLibrary'
import { PublishWorkspace } from '@/components/publish/PublishWorkspace'
import { EditorDrawer } from '@/components/publish/EditorDrawer'
import { ResizableDivider } from '@/components/publish/ResizableDivider'
import { MobileTabView } from '@/components/publish/MobileTabView'
import { listOpportunities, type Opportunity } from '@/lib/api/opportunities'
import { type PublishedItem } from '@/lib/api/publish-items'
import { getAccountNames } from '@/lib/api/accounts'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { TabBar as SelectionTabBar, TabName } from '@/components/selection/TabBar'
import { KeywordCollectionTab } from '@/components/selection/KeywordCollectionTab'
import { ProductMonitorTab } from '@/components/selection/ProductMonitorTab'
import { MerchantMonitorTab } from '@/components/selection/MerchantMonitorTab'

type PublishTab = 'publish' | 'selection'

const PUBLISH_TABS: { key: PublishTab; label: string }[] = [
  { key: 'publish', label: '商品发布' },
  { key: 'selection', label: '选品监控' },
]

const LEFT_PANEL_DEFAULT_WIDTH = 280
const LEFT_PANEL_MIN_WIDTH = 200
const LEFT_PANEL_MAX_WIDTH = 480

export default function PublishPage() {
  const queryClient = useQueryClient()
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [activePublishTab, setActivePublishTab] = useState<PublishTab>('publish')
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [selectionTab, setSelectionTab] = useState<TabName>('keyword')
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null)

  const [leftWidth, setLeftWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('publish_panel_left_width')
      return stored ? parseInt(stored) : LEFT_PANEL_DEFAULT_WIDTH
    }
    return LEFT_PANEL_DEFAULT_WIDTH
  })

  const { data: opportunitiesData, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => listOpportunities({ page_size: 100 }),
  })

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccountNames,
  })

  // 编辑器抽屉 — 选中的素材项
  const [selectedItem, setSelectedItem] = useState<PublishedItem | null>(null)

  // 切换商机时清除选中素材
  useEffect(() => {
    setSelectedItem(null)
  }, [selectedOpportunity?.id])

  const handleItemChange = useCallback((updated: PublishedItem) => {
    setSelectedItem(updated)
    queryClient.setQueryData(['published-items', selectedOpportunity?.id], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((i: PublishedItem) =>
          i.id === updated.id ? updated : i
        ),
      }
    })
  }, [queryClient, selectedOpportunity?.id])

  const handleLeftWidthChange = useCallback((delta: number) => {
    setLeftWidth(prev => {
      const next = Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(LEFT_PANEL_MAX_WIDTH, prev + delta))
      localStorage.setItem('publish_panel_left_width', String(next))
      return next
    })
  }, [])

  if (isMobile) {
    return (
      <div className="h-full">
        <MobileTabView
          opportunities={opportunitiesData?.items || []}
          selectedOpportunity={selectedOpportunity}
          onSelectOpportunity={setSelectedOpportunity}
          accounts={accountsData || []}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* 一级 Tab 栏 */}
      <TabBar
        tabs={PUBLISH_TABS}
        activeTab={activePublishTab}
        onTabChange={(key) => setActivePublishTab(key as PublishTab)}
        variant="overline"
      />

      {/* Tab 内容 */}
      {activePublishTab === 'publish' && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div style={{ width: leftWidth, flexShrink: 0 }} className="overflow-hidden">
            <OpportunityLibrary
              opportunities={opportunitiesData?.items || []}
              isLoading={opportunitiesLoading}
              selectedOpportunity={selectedOpportunity}
              onSelectOpportunity={setSelectedOpportunity}
            />
          </div>

          <ResizableDivider
            direction="horizontal"
            onResize={handleLeftWidthChange}
          />

          <div className="flex-1 overflow-hidden">
            <PublishWorkspace
              opportunity={selectedOpportunity}
              accounts={accountsData || []}
              onRefreshOpportunities={() => queryClient.invalidateQueries({ queryKey: ['opportunities'] })}
              selectedItem={selectedItem}
              selectedItemId={selectedItem?.id}
              onSelectItem={setSelectedItem}
              onItemChange={handleItemChange}
            />
          </div>
        </div>
      )}

      {activePublishTab === 'selection' && (
        <div className="space-y-3">
         <SelectionTabBar activeTab={selectionTab} onTabChange={setSelectionTab} />
          {selectionTab === 'keyword' && (
            <KeywordCollectionTab
              selectedKeywordId={selectedKeywordId}
              onSelectKeyword={setSelectedKeywordId}
            />
          )}
          {selectionTab === 'product' && <ProductMonitorTab />}
          {selectionTab === 'merchant' && <MerchantMonitorTab />}
        </div>
      )}

      {/* 编辑抽屉 — fixed overlay，从右侧滑入 */}
      <EditorDrawer
        item={selectedItem}
        accounts={accountsData || []}
        onSaveStatusChange={() => {}}
        onItemChange={handleItemChange}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  )
}
