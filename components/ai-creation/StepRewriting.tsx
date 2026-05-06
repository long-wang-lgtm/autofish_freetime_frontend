'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRewriteStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepRewritingProps {
  taskId: string
  onComplete: (taskId: string, results: Record<string, string>) => void
}

export function StepRewriting({ taskId, onComplete }: StepRewritingProps) {
  const [progress, setProgress] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, string>>({})

  const checkStatus = useCallback(async () => {
    try {
      const data = await getRewriteStatus(taskId)
      setProgress(data.progress || {})
      if (data.results && data.results.length > 0) {
        const r: Record<string, string> = {}
        for (const item of data.results) {
          r[item.uid] = item.content
        }
        setResults(r)
      }
      if (data.status === 'completed') {
        onComplete(taskId, results)
        return false
      }
      if (data.status === 'failed') {
        alert('改写失败: ' + data.error)
        return false
      }
      return true
    } catch (err) {
      alert('查询失败: ' + String(err))
      return false
    }
  }, [taskId, results, onComplete])

  useEffect(() => {
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

  const accounts = Object.entries(progress)
  const doneCount = accounts.filter(([, s]) => s === 'completed').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-medium text-gray-900 mb-4">AI改写进行中...</h3>
      <div className="space-y-3">
        {accounts.map(([uid, status]) => (
          <div key={uid} className="flex items-center gap-3">
            <div className="w-32 text-sm text-gray-600 truncate">{uid}</div>
            {status === 'completed' ? (
              <span className="text-green-600 text-sm">✅ 完成</span>
            ) : status === 'failed' ? (
              <span className="text-red-600 text-sm">❌ 失败</span>
            ) : status === 'running' ? (
              <><LoadingSpinner size="sm" /><span className="text-blue-600 text-sm">改写中...</span></>
            ) : (
              <><LoadingSpinner size="sm" /><span className="text-gray-500 text-sm">等待中...</span></>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-sm text-gray-500">
        进度: {doneCount} / {accounts.length}
      </div>
    </div>
  )
}
