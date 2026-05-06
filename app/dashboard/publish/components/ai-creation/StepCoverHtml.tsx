'use client'

import { useEffect, useState } from 'react'
import { confirmCoverHtml, getCoverHtmlStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface CoverPlan {
  uid: string
  imageIndex: number
  planText: string
  htmlCode?: string
}

interface StepCoverHtmlProps {
  taskId: string
  plans: CoverPlan[]
  onGenerated: (plans: CoverPlan[]) => void
  onBack: () => void
}

export default function StepCoverHtml({ taskId, plans, onGenerated, onBack }: StepCoverHtmlProps) {
  const [status, setStatus] = useState<string>('generating')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const confirmAndGenerate = async () => {
      try {
        await confirmCoverHtml({
          task_id: taskId,
          confirmed_plans: plans.map(p => ({
            uid: p.uid,
            image_index: p.imageIndex,
            plan_text: p.planText
          }))
        })
      } catch (e) {
        setError(String(e))
      }
    }
    confirmAndGenerate()
  }, [])

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const s = await getCoverHtmlStatus(taskId)
        setStatus(s.status)
        if (s.status === 'completed' || s.status === 'failed') {
          clearInterval(poll)
          if (s.status === 'completed' && s.plans) {
            const updatedPlans = plans.map(p => {
              const updated = s.plans.find((sp: any) => sp.uid === p.uid && sp.image_index === p.imageIndex)
              return updated ? { ...p, htmlCode: updated.html_code } : p
            })
            onGenerated(updatedPlans)
          }
        }
      } catch (e) {
        clearInterval(poll)
        setError(String(e))
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [taskId])

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <LoadingSpinner size="md" />
          <h2 className="text-lg font-semibold text-gray-900">AI正在生成HTML...</h2>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>生成进度</span>
            <span>{status === 'completed' ? '完成' : '生成中...'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all animate-pulse"
              style={{ width: status === 'completed' ? '100%' : '60%' }}
            />
          </div>
        </div>

        <p className="text-sm text-gray-500">
          正在将封面规划转换为HTML代码，然后可以截图
        </p>
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
