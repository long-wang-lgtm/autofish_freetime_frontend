'use client'

import { useState } from 'react'
import { createCoverTask } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverPlanProps {
  rewriteResults: Record<string, string>
  onConfirm: (taskId: string, plans: Record<string, string>) => void
}

export function StepCoverPlan({ rewriteResults, onConfirm }: StepCoverPlanProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (Object.keys(rewriteResults).length === 0) return
    setIsSubmitting(true)
    try {
      const rewriteResultsList = Object.entries(rewriteResults).map(([uid, content]) => ({
        uid,
        content,
      }))
      const taskId = await createCoverTask(rewriteResultsList)
      // 无需轮询——StepCoverHtml 会负责轮询
      onConfirm(taskId, {}) // plans 由 StepCoverHtml 轮询填充
    } catch (err) {
      alert('操作失败: ' + String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">封面规划生成</h3>
        <div className="text-sm text-gray-500">
          点击下方按钮，后端将为每个账号的改写内容生成封面规划。
          生成完成后进入下一步骤确认规划并生成HTML。
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={isSubmitting || Object.keys(rewriteResults).length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <><LoadingSpinner size="sm" /> 生成封面规划中...</>
        ) : (
          <>开始生成封面规划</>
        )}
      </button>
    </div>
  )
}
