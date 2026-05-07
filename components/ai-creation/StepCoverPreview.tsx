'use client'

import { useState, useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StepCoverPreviewProps {
  htmlCodes: Record<string, string>
  onConfirm: (images: Record<string, string>) => void
  onBack: () => void
}

export function StepCoverPreview({ htmlCodes, onConfirm, onBack }: StepCoverPreviewProps) {
  const [capturedImages, setCapturedImages] = useState<Record<string, string>>({})
  const [capturingUid, setCapturingUid] = useState<string | null>(null)
  const [isAllDone, setIsAllDone] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const captureOne = useCallback(async (uid: string, html: string) => {
    setCapturingUid(uid)
    try {
      const tempDiv = document.createElement('div')
      tempDiv.style.cssText = 'width:750px;height:750px;position:absolute;left:-9999px;top:-9999px;overflow:hidden;'
      tempDiv.innerHTML = html
      document.body.appendChild(tempDiv)

      const canvas = await html2canvas(tempDiv, {
        width: 750,
        height: 750,
        scale: 1,
        useCORS: true,
        allowTaint: true,
      })

      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]

      setCapturedImages(prev => ({ ...prev, [uid]: base64 }))
      document.body.removeChild(tempDiv)
    } catch (err) {
      console.error(`截图失败 uid=${uid}:`, err)
      setCapturedImages(prev => ({ ...prev, [uid]: '' }))
    }
    setCapturingUid(null)
  }, [])

  const handleCaptureAll = useCallback(async () => {
    for (const [uid, html] of Object.entries(htmlCodes)) {
      await captureOne(uid, html)
    }
    setIsAllDone(true)
  }, [htmlCodes, captureOne])

  const handleConfirm = () => {
    onConfirm(capturedImages)
  }

  const entries = Object.entries(htmlCodes)
  const doneCount = Object.keys(capturedImages).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">封面预览（{doneCount}/{entries.length} 已截图）</h3>
          {capturingUid && (
            <span className="text-sm text-blue-600 flex items-center gap-1">
              <LoadingSpinner size="sm" /> 截图处理中: {capturingUid}
            </span>
          )}
        </div>

        {/* 网格布局——应付多账号 */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {entries.map(([uid, html]) => {
            const captured = capturedImages[uid]
            const isCapturing = capturingUid === uid
            return (
              <div key={uid} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700 truncate">{uid}</div>
                  {captured ? (
                    <span className="text-green-600 text-xs">✅ 已截图</span>
                  ) : isCapturing ? (
                    <span className="text-blue-600 text-xs flex items-center gap-1"><LoadingSpinner size="sm" /> 截图中</span>
                  ) : (
                    <span className="text-gray-400 text-xs">待截图</span>
                  )}
                </div>
                {/* 渲染真实 HTML */}
                <div
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="w-full aspect-square bg-white flex items-center justify-center"
                  style={{ minHeight: '200px' }}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={!!capturingUid}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all disabled:opacity-50"
        >
          上一步
        </button>
        {!isAllDone ? (
          <button
            onClick={handleCaptureAll}
            disabled={!!capturingUid}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {capturingUid ? <><LoadingSpinner size="sm" /> 截图处理中...</> : <>逐个截图</>}
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            确认 {doneCount} 张封面，发布
          </button>
        )}
      </div>
    </div>
  )
}
