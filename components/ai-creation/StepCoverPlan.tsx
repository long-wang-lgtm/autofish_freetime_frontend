'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createCoverTask, getCoverPlanStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverPlanProps {
  rewriteResults: Record<string, string>
  onPlansReady: (taskId: string, plans: Record<string, string>) => void
}

export function StepCoverPlan({ rewriteResults, onPlansReady }: StepCoverPlanProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  const onPlansReadyRef = useRef(onPlansReady)
  onPlansReadyRef.current = onPlansReady

  const startPlanning = useCallback(async (): Promise<string | null> => {
    if (started.current) return null
    if (Object.keys(rewriteResults).length === 0) return null
    started.current = true
    setIsLoading(true)
    try {
      const rewriteResultsList = Object.entries(rewriteResults).map(([uid, content]) => ({
        uid,
        content,
      }))
      const taskId = await createCoverTask(rewriteResultsList)
      setIsLoading(false)
      return taskId
    } catch (err) {
      setError(String(err))
      setIsLoading(false)
      return null
    }
  }, [rewriteResults])

  useEffect(() => {
    let taskId: string | null = null
    let timeoutId: ReturnType<typeof setTimeout>

    const poll = async () => {
      if (!taskId) {
        taskId = await startPlanning()
        if (!taskId) return
      }
      try {
        const data = await getCoverPlanStatus(taskId)
        if (data.status === 'planned' || data.status === 'completed') {
          const plans: Record<string, string> = {}
          for (const item of data.plans || []) {
            plans[item.uid] = item.plan_text || ''
          }
          onPlansReadyRef.current(taskId, plans)
          return
        }
        if (data.status === 'failed') {
          setError('封面规划生成失败')
          return
        }
      } catch {
        return
      }
      timeoutId = setTimeout(poll, 2000)
    }

    poll()
    return () => clearTimeout(timeoutId)
  }, [startPlanning])

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <div className="text-red-600 text-sm">❌ {error}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="flex items-center justify-center gap-3">
        <LoadingSpinner size="md" />
        <div>
          <div className="text-gray-700 font-medium">AI 正在生成封面规划...</div>
          <div className="text-sm text-gray-400 mt-1">完成后自动进入规划审核</div>
        </div>
      </div>
    </div>
  )
}
