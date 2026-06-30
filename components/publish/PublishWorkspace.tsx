'use client'
import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type Opportunity } from '@/lib/api/opportunities'
import { type PublishedItem } from '@/lib/api/publish-items'
import { PublishInstanceList } from './PublishInstanceList'
import { EditorPanel } from './EditorPanel'
import { NewPublishedItemModal } from './NewPublishedItemModal'
import { OpportunityHeader } from './OpportunityHeader'

interface PublishWorkspaceProps {
  opportunity: Opportunity | null
  accounts: { uid: string; name: string }[]
  onRefreshOpportunities: () => void

  // Desktop mode: 状态由父组件（page.tsx）管理
  selectedItem?: PublishedItem | null
  selectedItemId?: number
  onSelectItem?: (item: PublishedItem | null) => void
  onItemChange?: (item: PublishedItem) => void
}

export function PublishWorkspace({
  opportunity,
  accounts,
  onRefreshOpportunities,
  selectedItem: externalSelectedItem,
  selectedItemId: externalSelectedItemId,
  onSelectItem: externalOnSelectItem,
  onItemChange: externalOnItemChange,
}: PublishWorkspaceProps) {
  const queryClient = useQueryClient()

  // Mobile mode 内部状态（props 未传入时使用）
  const [internalSelectedItem, setInternalSelectedItem] = useState<PublishedItem | null>(null)
  const [editorSaveStatus, setEditorSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const isDesktop = externalOnSelectItem !== undefined
  const selectedItem = isDesktop ? (externalSelectedItem ?? null) : internalSelectedItem
  const selectedItemId = isDesktop ? externalSelectedItemId : internalSelectedItem?.id

  const handleSelectItem = isDesktop
    ? externalOnSelectItem!
    : setInternalSelectedItem

  const handleItemChange = useCallback((updated: PublishedItem) => {
    if (isDesktop && externalOnItemChange) {
      externalOnItemChange(updated)
      return
    }
    // Mobile: 内部更新
    setInternalSelectedItem(updated)
    queryClient.setQueryData(['published-items', opportunity?.id], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((i: PublishedItem) =>
          i.id === updated.id ? updated : i
        ),
      }
    })
  }, [isDesktop, externalOnItemChange, queryClient, opportunity?.id])

  const [showNewItemModal, setShowNewItemModal] = useState(false)

  if (!opportunity) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-gray-500">从左侧选择或创建一个商机</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 商机头部 — 折叠/展开 */}
      <OpportunityHeader
        opportunity={opportunity}
        accounts={accounts}
        onRefreshOpportunities={onRefreshOpportunities}
      />

      {/* 操作按钮栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50 flex-shrink-0">
        <button
          onClick={() => setShowNewItemModal(true)}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
          </svg>
          新增素材
        </button>
      </div>

      {/* 发布素材列表 — 填满剩余高度 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PublishInstanceList
          opportunityId={opportunity.id}
          accounts={accounts}
          onEditItem={handleSelectItem}
          selectedItemId={selectedItemId}
        />
      </div>

      {/* Mobile mode 内嵌编辑器（desktop 时由外部 EditorDrawer 承担） */}
      {!isDesktop && (
        <div className="flex-1 min-h-0 overflow-hidden border-t">
          <EditorPanel
            item={selectedItem}
            accounts={accounts}
            onSaveStatusChange={setEditorSaveStatus}
            onItemChange={handleItemChange}
          />
        </div>
      )}

      {/* 新增发布素材弹窗 */}
      {showNewItemModal && (
        <NewPublishedItemModal
          opportunityId={opportunity.id}
          defaultPrice={opportunity.price}
          onClose={() => setShowNewItemModal(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['published-items', opportunity.id] })
          }}
        />
      )}
    </div>
  )
}
