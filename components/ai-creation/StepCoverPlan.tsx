'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCoverStatus, createCoverTask } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverPlanProps {
  taskId: string | null
  rewriteResults: Record<string, string>
  onConfirm: (taskId: string, plans: Record<string, string>) => void
}

export function StepCoverPlan({ taskId, rewriteResults, onConfirm }: StepCoverPlanProps) {
  const [plans, setPlans] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const checkStatus = useCallback(async () => {
    if (!taskId) return false
    try {
      const data = await getCoverStatus(taskId)
      if (data.status === 'planned' || data.status === 'completed') {
        const p: Record<string, string> = {}
        for (const item of data.plans || []) {
          p[item.uid] = item.plan_text
        }
        setPlans(p)
      }
      if (data.status !== 'planning' && data.status !== 'pending') {
        return false
      }
      return true
    } catch (err) {
      alert('查询失败: ' + String(err))
      return false
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId) return
    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      const shouldContinue = await checkStatus()
      if (shouldContinue) {
        timeoutId = setTimeout(poll, 2000)
      }
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [checkStatus])

  const handleConfirm = async () => {
    if (Object.keys(plans).length === 0 || !taskId) return
    setIsSubmitting(true)
    try {
      // 构建改写结果列表
      const rewriteResultsList = Object.entries(rewriteResults).map(([uid, content]) => ({
        uid,
        content,
      }))
      const newTaskId = await createCoverTask(rewriteResultsList)
      onConfirm(newTaskId, plans)
    } catch (err) {
      alert('操作失败: ' + String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const entries = Object.entries(plans)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">封面规划确认</h3>
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-3 text-gray-500">生成封面规划中...</span>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {entries.map(([uid, plan_text]) => (
              <div key={uid} className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">{uid}</div>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                  {plan_text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={isSubmitting || entries.length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <><LoadingSpinner size="sm" /> 确认规划，生成封面...</>
        ) : (
          <>确认封面规划，生成HTML</>
        )}
      </button>
    </div>
  )
}
