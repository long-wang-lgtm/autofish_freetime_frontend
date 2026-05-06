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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (uid: string, value: string) => {
    setEdited(prev => ({ ...prev, [uid]: value }))
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      onConfirm(edited)
    } finally {
      setIsSubmitting(false)
    }
  }

  const entries = Object.entries(edited)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">改写结果预览（可编辑）</h3>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {entries.map(([uid, content]) => (
            <div key={uid} className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">{uid}</div>
              <textarea
                value={content}
                onChange={(e) => handleEdit(uid, e.target.value)}
                rows={5}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          ))}
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
          disabled={isSubmitting}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><LoadingSpinner size="sm" /></> : null}
          确认改写，进入封面生成
        </button>
      </div>
    </div>
  )
}
