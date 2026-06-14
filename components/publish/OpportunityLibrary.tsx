'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { OpportunityCard } from './OpportunityCard'
import { NewOpportunityModal } from './NewOpportunityModal'
import { deleteOpportunity } from '@/lib/api/opportunities'
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
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['opportunities'], (old: any) => {
        if (!old) return old
        return { ...old, items: old.items.filter((o: Opportunity) => o.id !== id) }
      })
      if (selectedOpportunity?.id === id) onSelectOpportunity(null)
    },
  })

  const handleDeleteOpp = (id: number) => {
    if (window.confirm('确认删除该商机？删除后将无法恢复。')) {
      deleteMutation.mutate(id)
    }
  }

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
          <button
            onClick={() => setShowNewModal(true)}
            className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 新建
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
              onDelete={handleDeleteOpp}
            />
          ))
        )}
      </div>

      {/* 新建商机弹窗 */}
      {showNewModal && (
        <NewOpportunityModal onClose={() => setShowNewModal(false)} />
      )}
    </div>
  )
}
