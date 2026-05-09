'use client'
import { useState } from 'react'
import { OpportunityCard } from './OpportunityCard'
import { type Opportunity } from '@/lib/api/opportunities'

interface OpportunityLibraryProps {
  opportunities: Opportunity[]
  isLoading: boolean
  selectedOpportunity: Opportunity | null
  onSelectOpportunity: (opp: Opportunity | null) => void
}

export function OpportunityLibrary({
  opportunities,
  isLoading,
  selectedOpportunity,
  onSelectOpportunity,
}: OpportunityLibraryProps) {
  const [search, setSearch] = useState('')

  const filtered = opportunities.filter(opp =>
    opp.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      {/* 顶部工具栏 */}
      <div className="p-3 space-y-2 border-b bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索商机..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 新建
          </button>
          <button className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            ↑ 升品
          </button>
        </div>
      </div>

      {/* 商机列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {search ? '无匹配商机' : '暂无商机'}
          </div>
        ) : (
          filtered.map(opp => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              isSelected={selectedOpportunity?.id === opp.id}
              onClick={() => onSelectOpportunity(selectedOpportunity?.id === opp.id ? null : opp)}
            />
          ))
        )}
      </div>
    </div>
  )
}
