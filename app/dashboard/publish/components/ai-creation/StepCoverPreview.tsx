'use client'

import { useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'

interface CoverPlan {
  uid: string
  imageIndex: number
  planText: string
  htmlCode?: string
}

interface StepCoverPreviewProps {
  plans: CoverPlan[]
  capturedImages: Record<string, string>
  accounts: Array<{ uid: string; name: string }>
  onCapture: (key: string, dataUrl: string) => void
  onConfirm: () => void
  onBack: () => void
}

export default function StepCoverPreview({
  plans,
  capturedImages,
  accounts,
  onCapture,
  onConfirm,
  onBack
}: StepCoverPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCapture = async (plan: CoverPlan) => {
    if (!plan.htmlCode) return

    const key = `${plan.uid}_${plan.imageIndex}`
    if (capturedImages[key]) return

    const wrapper = document.createElement('div')
    wrapper.innerHTML = plan.htmlCode
    const element = wrapper.firstElementChild as HTMLElement
    if (!element) return

    element.style.width = '750px'
    element.style.height = '750px'
    element.style.position = 'absolute'
    element.style.top = '-9999px'
    document.body.appendChild(element)

    try {
      const canvas = await html2canvas(element, { width: 750, height: 750 })
      const dataUrl = canvas.toDataURL('image/png')
      onCapture(key, dataUrl)
    } finally {
      document.body.removeChild(element)
    }
  }

  const handleCaptureAll = async () => {
    for (const plan of plans) {
      if (plan.htmlCode) {
        await handleCapture(plan)
      }
    }
  }

  useEffect(() => {
    handleCaptureAll()
  }, [])

  const capturedCount = Object.keys(capturedImages).length
  const totalCount = plans.length

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">封面预览</h2>
          <span className="text-sm text-gray-500">
            已截图: {capturedCount} / {totalCount}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const key = `${plan.uid}_${plan.imageIndex}`
            const account = accounts.find(a => a.uid === plan.uid)
            const captured = capturedImages[key]

            return (
              <div key={key} className="border border-gray-200 rounded-xl p-2">
                <div className="text-xs font-medium text-gray-700 mb-2 truncate">
                  {account?.name || plan.uid} - {plan.imageIndex === 0 ? '主图' : `细节${plan.imageIndex}`}
                </div>
                {captured ? (
                  <div className="relative">
                    <img src={captured} alt="封面" className="w-full aspect-square object-cover rounded-lg" />
                    <button
                      onClick={() => handleCapture(plan)}
                      className="absolute top-1 right-1 px-2 py-1 bg-blue-600 text-white text-xs rounded"
                    >
                      重新截图
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    {plan.htmlCode ? (
                      <button
                        onClick={() => handleCapture(plan)}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded"
                      >
                        截图
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">无HTML</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-all"
        >
          ← 上一步
        </button>
        <button
          onClick={onConfirm}
          disabled={capturedCount < totalCount}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          确认封面 → 发布
        </button>
      </div>
    </div>
  )
}
