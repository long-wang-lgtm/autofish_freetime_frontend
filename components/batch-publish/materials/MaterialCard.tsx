'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtDateTime } from '@/lib/utils/format'
import type { PublishMaterial } from '@/lib/api/batch-publish'

interface MaterialCardProps {
  item: PublishMaterial
  onOpportunityClick: (id: number) => void
}

export function MaterialCard({ item, onOpportunityClick }: MaterialCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">{item.description || '-'}</span>
        <StatusBadge status={item.status} config={MATERIAL_STATUS_CONFIG} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        {item.price != null && (
          <span className="font-semibold text-gray-900">{fmtPrice(item.price)}</span>
        )}
        <span className="text-gray-400">{item.category || '未分类'}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <button
          onClick={(e) => { e.stopPropagation(); onOpportunityClick(item.opportunity_id) }}
          className="text-blue-600 hover:underline"
        >
          {item.opportunity_name || `商机 #${item.opportunity_id}`}
        </button>
        <span>·</span>
        <span>{item.updated_at ? fmtDateTime(item.updated_at) : '-'}</span>
      </div>
    </div>
  )
}
