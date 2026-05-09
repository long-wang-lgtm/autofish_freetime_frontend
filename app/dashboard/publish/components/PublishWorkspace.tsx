'use client'
import { type Opportunity } from '@/lib/api/opportunities'
import { type PublishedItem } from '@/lib/api/publish-items'

interface PublishWorkspaceProps {
  opportunity: Opportunity | null
  accounts: { uid: string; name: string; remark?: string }[]
  onRefreshOpportunities: () => void
}

export function PublishWorkspace({ opportunity, accounts, onRefreshOpportunities }: PublishWorkspaceProps) {
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
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
        <div className="flex-1">
          <span className="font-medium text-gray-900">商机：{opportunity.name}</span>
          {opportunity.item_group_id && (
            <span className="ml-3 text-sm text-gray-500">
              商品组：{opportunity.item_group_id}
            </span>
          )}
        </div>
        <button className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white text-gray-600">
          [AI prompt]
        </button>
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          批量发布 ▶
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        发布实例列表加载中...
      </div>
    </div>
  )
}
