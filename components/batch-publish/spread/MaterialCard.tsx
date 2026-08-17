'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ProgressActionCell } from '../original/ProgressActionCell'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtDateTime } from '@/lib/utils/format'
import type { PublishMaterial, RewriteStage } from '@/lib/api/batch-publish'

interface MaterialCardProps {
  item: PublishMaterial
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpportunityClick: (id: number) => void
  /** 卡片点击 → 打开编辑 Sheet */
  onOpenEditor: (id: number) => void
  /** 触发 AI 工作——由父组件包装 mutation，卡片内闭包传入 materialId */
  onTriggerWork: (materialId: number, stage: RewriteStage) => Promise<void>
  onPublish: (materialId: number) => Promise<void>
  isAnyLoading: boolean
}

export function MaterialCard({
  item, isSelected, onToggleSelect, onOpportunityClick, onOpenEditor,
  onTriggerWork, onPublish, isAnyLoading,
}: MaterialCardProps) {
  return (
    <div
      className={`bg-white border rounded-xl p-3 space-y-2 cursor-pointer transition-colors ${
        isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'
      }`}
      onClick={() => onOpenEditor(item.id)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* checkbox 独立于卡片点击——label h-11 保证 ≥44px 触控目标，点击不透传开 Sheet */}
          <label
            className="h-11 flex items-center shrink-0 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
          <span className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug min-w-0 flex-1">
            {item.description || '-'}
          </span>
        </div>
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
          onClick={(e) => { e.stopPropagation(); if (item.opportunity?.id) onOpportunityClick(item.opportunity.id) }}
          className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
          disabled={!item.opportunity?.id}
        >
          {item.opportunity?.name ?? (item.opportunity?.id ? `商机 #${item.opportunity.id}` : (item.souItem?.title || item.souItem?.gid || '未知商机'))}
        </button>
        <span>·</span>
        <span>{item.updated_at ? fmtDateTime(item.updated_at) : '-'}</span>
      </div>
      {/* 创作进度——行内直接触发 改写→封面→生图→发布（ProgressActionCell 内部已 stopPropagation） */}
      <ProgressActionCell
        status={item.status}
        onTriggerWork={(stage) => onTriggerWork(item.id, stage)}
        onPublish={() => onPublish(item.id)}
        isAnyLoading={isAnyLoading}
      />
    </div>
  )
}
