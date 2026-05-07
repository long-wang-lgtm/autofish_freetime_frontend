'use client'

import { useState } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepRewritePreviewProps {
  results: Record<string, string>
  onConfirm: (confirmedResults: Record<string, string>) => void
  onBack: () => void
}

export function StepRewritePreview({ results, onConfirm, onBack }: StepRewritePreviewProps) {
  const [edited, setEdited] = useState<Record<string, string>>(results)
  const [selected, setSelected] = useState<Set<string>>(new Set(Object.keys(results)))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedUid, setExpandedUid] = useState<string | null>(null)

  const handleEdit = (uid: string, value: string) => {
    setEdited(prev => ({ ...prev, [uid]: value }))
  }

  const toggleSelect = (uid: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(Object.keys(results)))
  const deselectAll = () => setSelected(new Set())

  const handleConfirm = () => {
    setIsSubmitting(true)
    onConfirm(edited)
  }

  const entries = Object.entries(edited)
  const selectedCount = selected.size

  return (
    <div className="space-y-4">
      {/* 头部工具栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">改写结果预览（{selectedCount}/{entries.length} 已选）</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-700">全选</button>
            <span className="text-gray-300">|</span>
            <button onClick={deselectAll} className="text-xs text-gray-500 hover:text-gray-700">清空</button>
          </div>
        </div>

        {/* 账号名说明 */}
        <div className="text-xs text-gray-400 mb-2">点击卡片可编辑内容，右侧复选框控制是否发布</div>

        {/* 卡片列表 */}
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {entries.map(([uid, content]) => {
            const isSelected = selected.has(uid)
            const isExpanded = expandedUid === uid
            const isEdited = edited[uid] !== results[uid]
            return (
              <div
                key={uid}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setExpandedUid(isExpanded ? null : uid)}
              >
                {/* 账号名标签 */}
                <div className="shrink-0 w-24 text-center">
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-mono truncate w-full">
                    {uid}
                  </span>
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  {isExpanded ? (
                    <textarea
                      value={content}
                      onChange={(e) => handleEdit(uid, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      rows={4}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                      {content}
                    </div>
                  )}
                  {isEdited && (
                    <div className="text-xs text-orange-500 mt-1">已编辑</div>
                  )}
                </div>

                {/* 复选框 */}
                <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(uid)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all disabled:opacity-50"
        >
          上一步
        </button>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || selectedCount === 0}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><LoadingSpinner size="sm" /></> : null}
          确认 {selectedCount > 0 ? `${selectedCount} 个账号` : '无'}，开始生成封面规划
        </button>
      </div>
    </div>
  )
}
