'use client'

import { useState } from 'react'
import { createCoverTask, getCoverStatus, CoverStatusResponse } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface RewriteResult {
  uid: string
  content: string
}

interface CoverPlan {
  uid: string
  imageIndex: number
  planText: string
  htmlCode?: string
}

interface StepCoverPlanProps {
  rewriteResults: RewriteResult[]
  accounts: Array<{ uid: string; name: string }>
  onConfirm: (taskId: string, plans: CoverPlan[]) => void
  onBack: () => void
}

export default function StepCoverPlan({ rewriteResults, accounts, onConfirm, onBack }: StepCoverPlanProps) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('pending')
  const [plans, setPlans] = useState<CoverPlan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editedPlans, setEditedPlans] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const startPlanning = async () => {
      try {
        const res = await createCoverTask({
          rewrite_results: rewriteResults.map(r => ({ uid: r.uid, content: r.content }))
        })
        setTaskId(res.task_id)
      } catch (e) {
        setError(String(e))
      }
    }
    startPlanning()
  }, [])

  useEffect(() => {
    if (!taskId) return

    const poll = setInterval(async () => {
      try {
        const s = await getCoverStatus(taskId)
        setStatus(s.status)
        if (s.plans) {
          setPlans(s.plans.map((p: any) => ({
            uid: p.uid,
            imageIndex: p.image_index,
            planText: p.plan_text,
            htmlCode: p.html_code
          })))
        }
        if (s.status === 'planned' || s.status === 'failed') {
          clearInterval(poll)
        }
      } catch (e) {
        clearInterval(poll)
        setError(String(e))
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [taskId])

  const updatePlanText = (uid: string, imageIndex: number, text: string) => {
    const key = `${uid}_${imageIndex}`
    setEditedPlans(prev => {
      const next = new Map(prev)
      next.set(key, text)
      return next
    })
  }

  const getEditedPlanText = (uid: string, imageIndex: number, original: string) => {
    const key = `${uid}_${imageIndex}`
    return editedPlans.get(key) || original
  }

  const handleConfirm = () => {
    const confirmedPlans = plans.map(p => ({
      ...p,
      planText: getEditedPlanText(p.uid, p.imageIndex, p.planText)
    }))
    onConfirm(taskId!, confirmedPlans)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          {status === 'planning' && <LoadingSpinner size="md" />}
          <h2 className="text-lg font-semibold text-gray-900">
            {status === 'planning' ? 'AI正在生成封面规划...' : '封面规划预览'}
          </h2>
        </div>

        {status === 'planning' && (
          <p className="text-gray-500">这可能需要几秒钟...</p>
        )}

        {status === 'planned' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">可以修改封面规划描述，然后确认生成HTML</p>
            {plans.map((plan, index) => {
              const account = accounts.find(a => a.uid === plan.uid)
              return (
                <div key={`${plan.uid}_${plan.imageIndex}`} className="border border-gray-200 rounded-xl p-4">
                  <div className="font-medium text-gray-900 mb-2">
                    {account?.name || plan.uid} - {plan.imageIndex === 0 ? '主图' : `细节图${plan.imageIndex}`}
                  </div>
                  <textarea
                    value={getEditedPlanText(plan.uid, plan.imageIndex, plan.planText)}
                    onChange={e => updatePlanText(plan.uid, plan.imageIndex, e.target.value)}
                    className="w-full h-24 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          错误: {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-all"
        >
          ← 上一步
        </button>
        {status === 'planned' && (
          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
          >
            确认规划 → 生成HTML
          </button>
        )}
      </div>
    </div>
  )
}
