'use client'
import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { type Opportunity } from '@/lib/api/opportunities'
import { type PublishedItem } from '@/lib/api/publish-items'
import { PublishInstanceList } from './PublishInstanceList'
import { EditorPanel } from './EditorPanel'
import { ResizableDivider } from './ResizableDivider'
import { PromptTemplateModal } from './PromptTemplateModal'
import { NewPublishedItemModal } from './NewPublishedItemModal'

const LIST_DEFAULT_HEIGHT = 300
const LIST_MIN_HEIGHT = 150
const LIST_MAX_HEIGHT = 600

interface PublishWorkspaceProps {
  opportunity: Opportunity | null
  accounts: { uid: string; name: string; remark?: string }[]
  onRefreshOpportunities: () => void
}

export function PublishWorkspace({ opportunity, accounts, onRefreshOpportunities }: PublishWorkspaceProps) {
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<PublishedItem | null>(null)
  const [listHeight, setListHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('publish_list_height')
      return stored ? parseInt(stored) : LIST_DEFAULT_HEIGHT
    }
    return LIST_DEFAULT_HEIGHT
  })
  const [editorSaveStatus, setEditorSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showNewItemModal, setShowNewItemModal] = useState(false)

  const handleListHeightChange = useCallback((delta: number) => {
    setListHeight(prev => {
      const next = Math.max(LIST_MIN_HEIGHT, Math.min(LIST_MAX_HEIGHT, prev + delta))
      localStorage.setItem('publish_list_height', String(next))
      return next
    })
  }, [])

  const handleItemChange = useCallback((updated: PublishedItem) => {
    queryClient.setQueryData(['published-items', opportunity?.id], (old: any) => {
      if (!old) return old
      return {
        ...old,
        items: old.items.map((i: PublishedItem) =>
          i.id === updated.id ? updated : i
        ),
      }
    })
  }, [queryClient, opportunity?.id])

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
      {/* 顶部：商机信息 + 操作按钮 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900 truncate">商机：{opportunity.name}</span>
          {opportunity.item_group_id && (
            <span className="ml-2 text-sm text-gray-500">
              商品组：{opportunity.item_group_id}
            </span>
          )}
        </div>
        {/* 新增实例 */}
        <button
          onClick={() => setShowNewItemModal(true)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600 whitespace-nowrap"
        >
          + 新增实例
        </button>
        {/* 元提示词 */}
        <button
          onClick={() => setShowPromptModal(true)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600 whitespace-nowrap"
        >
          [AI prompt]
        </button>
        {/* 批量发布 */}
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap">
          批量发布 ▶
        </button>
      </div>

      {/* 发布实例列表（可调高度） */}
      <div style={{ height: listHeight, flexShrink: 0 }} className="overflow-hidden border-b">
        <PublishInstanceList
          opportunityId={opportunity.id}
          accounts={accounts}
          onEditItem={setSelectedItem}
          selectedItemId={selectedItem?.id}
        />
      </div>

      {/* 可拖拽分隔线 */}
      <ResizableDivider
        direction="vertical"
        onResize={handleListHeightChange}
      />

      {/* 编辑区 — 直接填满剩余空间 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <EditorPanel
          item={selectedItem}
          accounts={accounts}
          onSaveStatusChange={setEditorSaveStatus}
          onItemChange={handleItemChange}
        />
      </div>

      {/* 元提示词弹窗 */}
      {showPromptModal && opportunity && (
        <PromptTemplateModal
          opportunity={opportunity}
          onClose={() => setShowPromptModal(false)}
        />
      )}

      {/* 新增发布实例弹窗 */}
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
