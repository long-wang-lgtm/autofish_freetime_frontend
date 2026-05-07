'use client'

import { useState } from 'react'
import { confirmCoverAndGenerateHtml } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverPlanReviewProps {
  taskId: string
  plans: Record<string, string>
  onConfirm: (taskId: string) => void
  onBack: () => void
}

export function StepCoverPlanReview({ taskId, plans, onConfirm, onBack }: StepCoverPlanReviewProps) {
  const [edited, setEdited] = useState<Record<string, string>>(plans)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitLabel, setSubmitLabel] = useState('确认规划，生成HTML')

  const handleEdit = (uid: string, value: string) => {
    setEdited(prev => ({ ...prev, [uid]: value }))
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setSubmitLabel('生成中...')
    try {
      const confirmedPlans = Object.entries(edited).map(([uid, plan_text]) => ({
        uid,
        image_index: 0,
        plan_text,
      }))
      await confirmCoverAndGenerateHtml(taskId, confirmedPlans)
      onConfirm(taskId)
    } catch (err) {
      alert('操作失败: ' + String(err))
      setIsSubmitting(false)
      setSubmitLabel('确认规划，生成HTML')
    }
  }

  const entries = Object.entries(edited)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-1">封面规划审核</h3>
        <div className="text-sm text-gray-500 mb-4">
          点击内容可编辑，确认后 AI 将生成 HTML 并自动进入下一步。
        </div>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto">
          {entries.map(([uid, plan_text]) => (
            <div key={uid} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-500">
                  {uid}
                </span>
              </div>
              <textarea
                value={plan_text}
                onChange={(e) => handleEdit(uid, e.target.value)}
                rows={3}
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
          {isSubmitting ? <><LoadingSpinner size="sm" /> {submitLabel}</> : <>{submitLabel}</>}
        </button>
      </div>
    </div>
  )
}
