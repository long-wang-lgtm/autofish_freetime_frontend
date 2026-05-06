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
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedCount, setCapturedCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const captureAll = useCallback(async () => {
    setIsCapturing(true)
    const results: Record<string, string> = {}
    const entries = Object.entries(htmlCodes)
    let count = 0

    for (const [uid, html] of entries) {
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
        results[uid] = dataUrl.split(',')[1]

        document.body.removeChild(tempDiv)
        count++
        setCapturedCount(count)
      } catch (err) {
        console.error(`截图失败 uid=${uid}:`, err)
        count++
        setCapturedCount(count)
      }
    }

    setIsCapturing(false)
    onConfirm(results)
  }, [htmlCodes, onConfirm])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-4">封面预览</h3>

        {/* HTML渲染区域（隐藏） */}
        <div ref={containerRef} className="space-y-4" style={{ display: 'none' }}>
          {Object.entries(htmlCodes).map(([uid, html]) => (
            <div key={uid} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>

        {/* 预览提示 */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(htmlCodes).map(([uid]) => (
            <div key={uid} className="border border-gray-200 rounded-lg p-2 text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">{uid}</div>
              <div className="text-gray-400 text-sm">封面图片生成中...</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isCapturing}
          className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all disabled:opacity-50"
        >
          上一步
        </button>
        <button
          onClick={captureAll}
          disabled={isCapturing}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCapturing ? (
            <><LoadingSpinner size="sm" /> 截图处理中... {capturedCount}/{Object.keys(htmlCodes).length}</>
          ) : (
            <>确认封面并截图</>
          )}
        </button>
      </div>
    </div>
  )
}
