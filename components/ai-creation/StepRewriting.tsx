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
        // 流式追加：每完成一个就追加到列表，不等全部完成
        const r: Record<string, string> = {}
        for (const item of data.results) {
          r[item.uid] = item.content
        }
        setResults(prev => {
          const next = { ...prev }
          for (const [uid, content] of Object.entries(r)) {
            if (content) next[uid] = content
          }
          return next
        })
        // 当 backend 标记 completed 时才进入下一步
        if (data.status === 'completed') {
          onComplete(taskId, r)
          return false
        }
      } else if (data.status === 'completed') {
        // fallback：backend 已完成但 results 为空（不应该发生）
        onComplete(taskId, results)
        return false
      }
      if (data.status === 'failed') {
        alert('改写失败: ' + (data.error || '未知错误'))
        return false
      }
      return true
    } catch (err) {
      alert('查询失败: ' + String(err))
      return false
    }
  }, [taskId, onComplete])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      const shouldContinue = await checkStatus()
      if (shouldContinue) {
        timeoutId = setTimeout(poll, 1500)
      }
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [checkStatus])

  const doneCount = Object.values(progress).filter(s => s === 'completed').length
  const failedCount = Object.values(progress).filter(s => s === 'failed').length
  const totalCount = Object.keys(progress).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-medium text-gray-900 mb-4">AI改写进行中...</h3>
      <div className="mb-3 flex items-center gap-3">
        <div className="text-sm text-gray-500">
          进度: {doneCount}{failedCount > 0 ? ` + ${failedCount}失败` : ''} / {totalCount}
        </div>
        <LoadingSpinner size="sm" />
      </div>

      {/* 流式结果列表——每个账号完成立即展示 */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">
        {Object.entries(progress).map(([uid, status]) => (
          <div key={uid} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700 truncate">{uid}</div>
              {status === 'completed' ? (
                <span className="text-green-600 text-sm shrink-0">✅ 完成</span>
              ) : status === 'failed' ? (
                <span className="text-red-600 text-sm shrink-0">❌ 失败</span>
              ) : status === 'running' ? (
                <span className="text-blue-600 text-sm shrink-0 flex items-center gap-1"><LoadingSpinner size="sm" /> 改写中</span>
              ) : (
                <span className="text-gray-400 text-sm shrink-0 flex items-center gap-1"><LoadingSpinner size="sm" /> 等待中</span>
              )}
            </div>
            {results[uid] && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 max-h-24 overflow-y-auto">
                {results[uid].slice(0, 200)}{results[uid].length > 200 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
