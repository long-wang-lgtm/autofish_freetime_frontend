'use client'

import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { ProgressActionCell } from '../workbench/ProgressActionCell'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { fmtPrice, fmtDateTime } from '@/lib/utils/format'
import type { PublishMaterial, RewriteStage } from '@/lib/api/batch-publish'

interface MaterialCardProps {
  item: PublishMaterial
  onOpportunityClick: (id: number) => void
  /** 卡片点击 → 打开编辑 Sheet */
  onOpenEditor: (id: number) => void
  /** 触发 AI 工作——由父组件包装 mutation，卡片内闭包传入 materialId */
  onTriggerWork: (materialId: number, stage: RewriteStage) => Promise<void>
  onPublish: (materialId: number) => Promise<void>
  isAnyLoading: boolean
}

export function MaterialCard({
  item, onOpportunityClick, onOpenEditor,
  onTriggerWork, onPublish, isAnyLoading,
}: MaterialCardProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 cursor-pointer hover:border-blue-300 transition-colors"
      onClick={() => onOpenEditor(item.id)}
    >
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
