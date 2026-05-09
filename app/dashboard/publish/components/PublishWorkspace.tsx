'use client'
import { useState, useCallback } from 'react'
import { type Opportunity } from '@/lib/api/opportunities'
import { type PublishedItem } from '@/lib/api/publish-items'
import { PublishInstanceList } from './PublishInstanceList'
import { EditorPanel } from './EditorPanel'
import { ResizableDivider } from './ResizableDivider'
import { PromptTemplateModal } from './PromptTemplateModal'

const LIST_DEFAULT_HEIGHT = 300
const LIST_MIN_HEIGHT = 150
const LIST_MAX_HEIGHT = 600

interface PublishWorkspaceProps {
  opportunity: Opportunity | null
  accounts: { uid: string; name: string; remark?: string }[]
  onRefreshOpportunities: () => void
}

export function PublishWorkspace({ opportunity, accounts, onRefreshOpportunities }: PublishWorkspaceProps) {
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

  const handleListHeightChange = useCallback((delta: number) => {
    setListHeight(prev => {
      const next = Math.max(LIST_MIN_HEIGHT, Math.min(LIST_MAX_HEIGHT, prev + delta))
      localStorage.setItem('publish_list_height', String(next))
      return next
    })
  }, [])

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
      {/* 顶部：商机信息 + 商品组 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
        <div className="flex-1">
          <span className="font-medium text-gray-900">商机：{opportunity.name}</span>
          {opportunity.item_group_id && (
            <span className="ml-3 text-sm text-gray-500">
              商品组：{opportunity.item_group_id}
            </span>
          )}
        </div>
        {/* 元提示词编辑入口 */}
        <button
          onClick={() => setShowPromptModal(true)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600"
        >
          [AI prompt]
        </button>
        {/* 批量发布按钮 */}
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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

      {/* 编辑区 */}
      <div className="flex-1 overflow-hidden">
        <EditorPanel
          item={selectedItem}
          accounts={accounts}
          onSaveStatusChange={setEditorSaveStatus}
        />
      </div>

      {/* 元提示词弹窗 */}
      {showPromptModal && opportunity && (
        <PromptTemplateModal
          opportunity={opportunity}
          onClose={() => setShowPromptModal(false)}
        />
      )}
    </div>
  )
}
