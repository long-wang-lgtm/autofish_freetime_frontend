'use client'
import { useState } from 'react'
import { type Opportunity } from '@/lib/api/opportunities'
import { OpportunityLibrary } from './OpportunityLibrary'
import { PublishWorkspace } from './PublishWorkspace'

interface MobileTabViewProps {
  opportunities: Opportunity[]
  selectedOpportunity: Opportunity | null
  onSelectOpportunity: (opp: Opportunity | null) => void
  accounts: { uid: string; name: string; remark?: string }[]
}

export function MobileTabView({
  opportunities,
  selectedOpportunity,
  onSelectOpportunity,
  accounts,
}: MobileTabViewProps) {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'workspace'>('opportunities')

  return (
    <div className="h-full flex flex-col">
      {/* 底部 Tab 栏 */}
      <div className="flex border-t bg-white">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'opportunities'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          商机库
        </button>
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'workspace'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500'
          }`}
        >
          创作+发布
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'opportunities' ? (
          <OpportunityLibrary
            opportunities={opportunities}
            isLoading={false}
            selectedOpportunity={selectedOpportunity}
            onSelectOpportunity={opp => {
              onSelectOpportunity(opp)
              setActiveTab('workspace')
            }}
          />
        ) : (
          <PublishWorkspace
            opportunity={selectedOpportunity}
            accounts={accounts}
            onRefreshOpportunities={() => {}}
          />
        )}
      </div>
    </div>
  )
}
