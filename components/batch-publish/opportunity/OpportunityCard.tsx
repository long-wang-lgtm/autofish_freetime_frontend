'use client'

import { useState } from 'react'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { OPPORTUNITY_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice } from '@/lib/utils/format'
import type { OpportunityItem } from '@/lib/api/batch-publish'

interface OpportunityCardProps {
  item: OpportunityItem
  onEdit: (item: OpportunityItem) => void
  onSelect: (item: OpportunityItem) => void
  onDelete: (id: number) => void
  isDeleting?: boolean
}

export function OpportunityCard({ item, onEdit, onSelect, onDelete, isDeleting }: OpportunityCardProps) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:border-blue-300 transition-colors cursor-pointer space-y-3"
        onClick={() => onSelect(item)}
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{item.name}</h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
              title="编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowDelete(true) }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
              title="删除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(item.price ?? 0) > 0 && (
            <span className="text-sm font-semibold text-gray-800">{fmtPrice(item.price!)}</span>
          )}
          <StatusBadge status={item.status} config={OPPORTUNITY_STATUS_CONFIG} />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>📦 {item.monitored_item_count ?? 0} 监控商品</span>
          <span>📝 {item.material_count ?? 0} 素材</span>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="删除商机"
        description={
          (item.material_count ?? 0) > 0
            ? `该商机下有 ${item.material_count} 份素材将被一并删除，确定删除吗？`
            : `确定要删除商机「${item.name}」吗？`
        }
        confirmLabel="删除"
        variant="danger"
        loading={isDeleting}
        onConfirm={() => { onDelete(item.id); setShowDelete(false) }}
      />
    </>
  )
}
