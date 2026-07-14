'use client'

import { useQueryClient } from '@tanstack/react-query'
import { StatusPipeline } from '@/components/batch-publish/shared/StatusPipeline'
import { MATERIAL_STATUS_CONFIG } from '@/components/batch-publish/shared/constants'
import { StatusBadge } from '@/components/ui/feedback/StatusBadge'
import { fmtPrice } from '@/lib/utils/format'
import { useWorkbenchMutations } from '@/hooks/batch-publish/useWorkbenchMutations'
import type { PublishMaterial, MaterialStatus, MaterialListResponse } from '@/lib/api/batch-publish'

interface MaterialRowProps {
  materialId: number
  isSelected: boolean
  onToggleSelect: (id: number) => void
  onOpenEditor: (id: number) => void
  selectedOid: number | undefined
}

/**
 * 根据素材状态返回 4 个 AI 操作按钮的配置。
 * [改写, 封面规划, 生图, 发布] — 每个按钮 { label, stage?, enabled, primary }
 */
function getAIButtons(status: MaterialStatus): {
  label: string
  stage?: 'write' | 'genimageplan' | 'genimage'
  enabled: boolean
  primary: boolean
  isPublish?: boolean
}[] {
  switch (status) {
    case 'pending':
      return [
        { label: '改写', stage: 'write', enabled: true, primary: true },
        { label: '封面', stage: 'genimageplan', enabled: false, primary: false },
        { label: '生图', stage: 'genimage', enabled: false, primary: false },
        { label: '发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'writing_done':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '封面', stage: 'genimageplan', enabled: true, primary: true },
        { label: '生图', stage: 'genimage', enabled: false, primary: false },
        { label: '发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'genimageplan_done':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '重做', stage: 'genimageplan', enabled: true, primary: false },
        { label: '生图', stage: 'genimage', enabled: true, primary: true },
        { label: '发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'genimage_done':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '重做', stage: 'genimageplan', enabled: true, primary: false },
        { label: '重生', stage: 'genimage', enabled: true, primary: false },
        { label: '发布', enabled: true, primary: true, isPublish: true },
      ]
    case 'published':
      return [
        { label: '—', enabled: false, primary: false },
        { label: '—', enabled: false, primary: false },
        { label: '—', enabled: false, primary: false },
        { label: '✓已发布', enabled: false, primary: false, isPublish: true },
      ]
    case 'publish_failed':
      return [
        { label: '重写', stage: 'write', enabled: true, primary: false },
        { label: '重做', stage: 'genimageplan', enabled: true, primary: false },
        { label: '重生', stage: 'genimage', enabled: true, primary: false },
        { label: '重试', enabled: true, primary: true, isPublish: true },
      ]
  }
}

export function MaterialRow({
  materialId, isSelected, onToggleSelect, onOpenEditor, selectedOid,
}: MaterialRowProps) {
  const queryClient = useQueryClient()
  const { triggerWorkMutation, publishMutation } = useWorkbenchMutations(selectedOid)

  // 从 React Query 缓存读取当前素材数据
  // 缓存存储的是 MaterialListResponse { items, total }
  const cached = queryClient.getQueryData<MaterialListResponse>(['batch-publish', 'materials', selectedOid])
  const materials = cached?.items ?? []
  const material = materials.find(m => m.id === materialId)

  if (!material) {
    return (
      <div
        className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 text-gray-400"
        style={{ gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.5fr 0.8fr 0.4fr' }}
      >
        <span />
        <span>加载中...</span>
      </div>
    )
  }

  const buttons = getAIButtons(material.status)
  const isAnyLoading = triggerWorkMutation.isPending || publishMutation.isPending

  return (
    <div
      className="grid gap-2 px-4 py-2 items-center text-xs leading-tight border-b border-gray-100 hover:bg-gray-50 transition-colors"
      style={{ gridTemplateColumns: '32px 2fr 0.7fr 0.8fr 1.5fr 0.8fr 0.4fr' }}
    >
      {/* 复选框 */}
      <div>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(materialId)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* 描述 */}
      <span className="text-sm text-gray-800 leading-snug line-clamp-2">
        {material.description || '(无描述)'}
      </span>

      {/* 价格 */}
      <span className="text-sm text-gray-700 tabular-nums">
        {material.price != null ? fmtPrice(material.price) : '-'}
      </span>

      {/* 状态 */}
      <StatusBadge status={material.status} config={MATERIAL_STATUS_CONFIG} />

      {/* AI 操作按钮 */}
      <div className="flex items-center gap-1 flex-wrap">
        {buttons.map((btn, i) => (
          <button
            key={i}
            disabled={!btn.enabled || isAnyLoading}
            onClick={() => {
              if (btn.isPublish && btn.enabled) {
                publishMutation.mutate(materialId)
              } else if (btn.stage && btn.enabled) {
                triggerWorkMutation.mutate({ materialId, stage: btn.stage })
              }
            }}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              ${btn.primary && btn.enabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : btn.enabled
                  ? 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  : 'bg-white text-gray-300 border border-gray-100'
              }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 进度条 */}
      <StatusPipeline status={material.status} />

      {/* 微调按钮 */}
      <button
        onClick={() => onOpenEditor(materialId)}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center"
        title="微调"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  )
}
