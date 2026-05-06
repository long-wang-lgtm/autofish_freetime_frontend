'use client'

import { useEffect, useState } from 'react'
import { createRewriteTask, getRewriteStatus, RewriteStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepRewritingProps {
  sourceDescription: string
  accounts: Array<{ uid: string; name: string }>
  onComplete: (taskId: string, results: Array<{ uid: string; content: string }>) => void
  onBack: () => void
}

export default function StepRewriting({ sourceDescription, accounts, onComplete, onBack }: StepRewritingProps) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<RewriteStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const startRewrite = async () => {
      try {
        const res = await createRewriteTask({
          source_description: sourceDescription,
          account_uids: accounts.map(a => a.uid)
        })
        setTaskId(res.task_id)
      } catch (e) {
        setError(String(e))
      }
    }
    startRewrite()
  }, [])

  useEffect(() => {
    if (!taskId) return

    const poll = setInterval(async () => {
      try {
        const s = await getRewriteStatus(taskId)
        setStatus(s)
        if (s.status === 'completed' || s.status === 'failed') {
          clearInterval(poll)
          if (s.status === 'completed') {
            onComplete(taskId, s.results.filter(r => r.content).map(r => ({ uid: r.uid, content: r.content })))
          }
        }
      } catch (e) {
        clearInterval(poll)
        setError(String(e))
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [taskId])

  const progress = status?.progress || {}
  const completedCount = Object.values(progress).filter(v => v === 'completed').length
  const totalCount = accounts.length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <LoadingSpinner size="md" />
          <h2 className="text-lg font-semibold text-gray-900">AI正在改写商品描述...</h2>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>改写进度</span>
            <span>{completedCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {accounts.map(acc => (
            <div key={acc.uid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                progress[acc.uid] === 'completed' ? 'bg-green-500 text-white' :
                progress[acc.uid] === 'running' ? 'bg-blue-500 text-white animate-pulse' :
                'bg-gray-300 text-gray-600'
              }`}>
                {progress[acc.uid] === 'completed' ? '✓' : progress[acc.uid] === 'running' ? '...' : '○'}
              </div>
              <span className="font-medium text-gray-900">{acc.name}</span>
              <span className="text-sm text-gray-500">
                {progress[acc.uid] === 'completed' ? '已完成' :
                 progress[acc.uid] === 'running' ? '改写中...' : '等待中'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          错误: {error}
        </div>
      )}

      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-all"
        >
          ← 上一步
        </button>
      </div>
    </div>
  )
}
