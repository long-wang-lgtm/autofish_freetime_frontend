'use client'
import { type Opportunity } from '@/lib/api/opportunities'

interface OpportunityCardProps {
  opportunity: Opportunity
  isSelected: boolean
  onClick: () => void
  onDelete: (id: number) => void
}

export function OpportunityCard({ opportunity, isSelected, onClick, onDelete }: OpportunityCardProps) {
  const statusBadge = {
    active: { label: '活跃', color: 'bg-green-100 text-green-700' },
    archived: { label: '已归档', color: 'bg-gray-100 text-gray-500' },
  }[opportunity.status] ?? { label: opportunity.status, color: 'bg-gray-100 text-gray-600' }

  const sourceBadge = {
    collection: { label: '采集', color: 'bg-blue-50 text-blue-600' },
    manual: { label: '手工', color: 'bg-orange-50 text-orange-600' },
  }[opportunity.source_type] ?? { label: opportunity.source_type, color: 'bg-gray-50 text-gray-600' }

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-xl border cursor-pointer transition-all
        ${isSelected
          ? 'border-blue-400 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{opportunity.name}</div>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded ${sourceBadge.color}`}>
              {sourceBadge.label}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {opportunity.item_count > 0 ? `${opportunity.item_count} 素材` : '无素材'}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(opportunity.id) }}
            className="text-gray-300 hover:text-red-500 text-sm"
            title="删除商机"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
