'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createCoverTask, getCoverStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverPlanProps {
  rewriteResults: Record<string, string>
  onPlansReady: (taskId: string, plans: Record<string, string>) => void
}

export function StepCoverPlan({ rewriteResults, onPlansReady }: StepCoverPlanProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const onPlansReadyRef = useRef(onPlansReady)
  onPlansReadyRef.current = onPlansReady

  const handleStart = async () => {
    if (Object.keys(rewriteResults).length === 0) return
    setIsSubmitting(true)
    try {
      const rewriteResultsList = Object.entries(rewriteResults).map(([uid, content]) => ({
        uid,
        content,
      }))
      const newTaskId = await createCoverTask(rewriteResultsList)
      setTaskId(newTaskId)
      setIsSubmitting(false)
      setIsPolling(true)
    } catch (err) {
      alert('操作失败: ' + String(err))
      setIsSubmitting(false)
    }
  }

  const checkStatus = useCallback(async () => {
    if (!taskId) return false
    try {
      const data = await getCoverStatus(taskId)
      if (data.status === 'planned' || data.status === 'completed') {
        const plans: Record<string, string> = {}
        for (const item of data.plans || []) {
          plans[item.uid] = item.plan_text || ''
        }
        setIsPolling(false)
        onPlansReadyRef.current(taskId, plans)
        return false
      }
      if (data.status === 'failed') {
        alert('封面规划生成失败: ' + (data.error || '未知错误'))
        setIsPolling(false)
        return false
      }
      return true
    } catch (err) {
      setIsPolling(false)
      return false
    }
  }, [taskId])

  useEffect(() => {
    if (!taskId || !isPolling) return
    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      const shouldContinue = await checkStatus()
      if (shouldContinue) {
        timeoutId = setTimeout(poll, 2000)
      }
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [taskId, isPolling, checkStatus])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">封面规划生成</h3>
        <div className="text-sm text-gray-500">
          点击下方按钮，后端将为每个账号的改写内容生成封面规划。
          生成完成后进入下一步骤确认规划并生成HTML。
        </div>
      </div>

      {!taskId ? (
        <button
          onClick={handleStart}
          disabled={isSubmitting || Object.keys(rewriteResults).length === 0}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><LoadingSpinner size="sm" /> 生成封面规划中...</>
          ) : (
            <>开始生成封面规划</>
          )}
        </button>
      ) : isPolling ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <LoadingSpinner size="md" />
            <span className="text-gray-500">AI 正在生成封面规划...</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
