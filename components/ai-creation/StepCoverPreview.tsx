'use client'

import { useState, useCallback } from 'react'
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

  const captureOne = useCallback(async (uid: string, html: string) => {
    setCapturingUid(uid)
    try {
      const tempDiv = document.createElement('div')
      tempDiv.style.cssText = 'width:750px;height:750px;position:absolute;left:-9999px;top:-9999px;overflow:hidden;background:#fff'
      tempDiv.innerHTML = html
      document.body.appendChild(tempDiv)

      const canvas = await html2canvas(tempDiv, {
        width: 750,
        height: 750,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      })

      const dataUrl = canvas.toDataURL('image/png')
      setCapturedImages(prev => ({ ...prev, uid: dataUrl.split(',')[1] }))
      document.body.removeChild(tempDiv)
    } catch (err) {
      console.error(`截图失败 uid=${uid}:`, err)
      setCapturedImages(prev => ({ ...prev, uid: '' }))
    }
    setCapturingUid(null)
  }, [])

  const handleCaptureAll = useCallback(async () => {
    for (const [uid, html] of Object.entries(htmlCodes)) {
      await captureOne(uid, html)
    }
    setIsAllDone(true)
  }, [htmlCodes, captureOne])

  const handleDownload = (uid: string, base64: string) => {
    const link = document.createElement('a')
    link.download = `cover_${uid}.png`
    link.href = `data:image/png;base64,${base64}`
    link.click()
  }

  const handleDownloadAll = () => {
    Object.entries(capturedImages).forEach(([uid, b64]) => {
      if (b64) handleDownload(uid, b64)
    })
  }

  const handleConfirm = () => {
    onConfirm(capturedImages)
  }

  const entries = Object.entries(htmlCodes)
  const doneCount = Object.keys(capturedImages).filter(u => capturedImages[u]).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            封面预览
            <span className="text-gray-400 font-normal text-sm ml-2">({doneCount}/{entries.length} 已截图)</span>
          </h3>
          {doneCount > 0 && (
            <button
              onClick={handleDownloadAll}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              📥 下载全部
            </button>
          )}
        </div>

        {/* 固定宽度卡片网格 */}
        <div className="flex flex-wrap gap-4">
          {entries.map(([uid, html]) => {
            const captured = capturedImages[uid]
            const isCapturing = capturingUid === uid
            return (
              <div key={uid} className="w-44 flex flex-col rounded-xl border border-gray-200 overflow-hidden shrink-0">
                {/* 卡片头部 */}
                <div className="px-3 py-2 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                  <span className="text-xs font-mono text-gray-500 truncate">{uid}</span>
                  {captured ? (
                    <span className="text-green-600 text-xs shrink-0">✅</span>
                  ) : isCapturing ? (
                    <span className="text-blue-600 text-xs shrink-0 flex items-center gap-1"><LoadingSpinner size="sm" /></span>
                  ) : (
                    <span className="text-gray-300 text-xs shrink-0">○</span>
                  )}
                </div>
                {/* HTML 渲染区 */}
                <div
                  className="w-full aspect-square bg-white flex items-center justify-center overflow-hidden relative"
                  onClick={() => !captured && !isCapturing && captureOne(uid, html)}
                  style={{ cursor: captured ? 'default' : 'pointer' }}
                  title={captured ? '已截图，可下载' : '点击截图'}
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="w-full h-full flex items-center justify-center"
                    style={{ transform: 'scale(0.2)', transformOrigin: 'center', width: '500%', height: '500%', pointerEvents: 'none' }}
                  />
                </div>
                {/* 卡片底部 */}
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  {captured ? (
                    <>
                      <span className="text-xs text-green-600">已截图</span>
                      <button
                        onClick={() => handleDownload(uid, captured)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        下载
                      </button>
                    </>
                  ) : isCapturing ? (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <LoadingSpinner size="sm" /> 截图中
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">点击截图</span>
                  )}
                </div>
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
            {capturingUid ? <><LoadingSpinner size="sm" /> 截图{capturingUid}...</> : <>一键截图全部</>}
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all"
          >
            确认 {doneCount} 张封面，发布
          </button>
        )}
      </div>
    </div>
  )
}
