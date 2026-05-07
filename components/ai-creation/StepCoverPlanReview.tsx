'use client'

import { useState } from 'react'
import { confirmCoverAndGenerateHtml } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Plan {
  uid: string
  image_index: number
  plan_text: string
}

interface StepCoverPlanReviewProps {
  taskId: string
  plans: Record<string, string>
  onConfirm: (taskId: string) => void
  onBack: () => void
}

export function StepCoverPlanReview({ taskId, plans, onConfirm, onBack }: StepCoverPlanReviewProps) {
  const [edited, setEdited] = useState<Record<string, string>>(plans)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (uid: string, value: string) => {
    setEdited(prev => ({ ...prev, [uid]: value }))
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const entries = Object.entries(edited)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">封面规划审核（可编辑）</h3>
        <div className="text-sm text-gray-500 mb-4">
          请审核每个账号的封面规划内容，确认后 AI 将根据规划生成 HTML。
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {entries.map(([uid, plan_text]) => (
            <div key={uid} className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">{uid}</div>
              <textarea
                value={plan_text}
                onChange={(e) => handleEdit(uid, e.target.value)}
                rows={4}
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
          {isSubmitting ? <><LoadingSpinner size="sm" /> 确认规划，生成HTML...</> : <>确认规划，生成HTML</>}
        </button>
      </div>
    </div>
  )
}
