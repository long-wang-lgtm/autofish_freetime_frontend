'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import html2canvas from 'html2canvas'
import { createCoverTask, getCoverStatus, confirmCoverAndGenerateHtml, getHtmlStatus } from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AccountListPanel, AccountItem, AccountStatus } from './AccountListPanel'
import { MasterDetailLayout } from './MasterDetailLayout'

type CoverSubStep = 'planning' | 'review' | 'generating' | 'preview'

interface Step3CoverProps {
  rewriteResults: Record<string, string>
  accountNames: Record<string, string>
  onComplete: (htmlCodes: Record<string, string>, images: Record<string, string>) => void
}

export function Step3Cover({ rewriteResults, accountNames, onComplete }: Step3CoverProps) {
  const [subStep, setSubStep] = useState<CoverSubStep>('planning')
  const [coverTaskId, setCoverTaskId] = useState<string | null>(null)
  const [plans, setPlans] = useState<Record<string, string>>({})
  const [htmlCodes, setHtmlCodes] = useState<Record<string, string>>({})
  const [capturedImages, setCapturedImages] = useState<Record<string, string>>({})
  const [selectedUid, setSelectedUid] = useState<string | 'all'>('all')
  const [generatingUids, setGeneratingUids] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const accountList: AccountItem[] = Object.entries(accountNames).map(([uid, name]) => ({
    uid,
    name,
    status: htmlCodes[uid] ? 'completed' : generatingUids.includes(uid) ? 'running' : 'idle',
    thumbnail: capturedImages[uid],
  }))

  // ========== 阶段1: 封面规划生成 ==========
  const startPlanning = useCallback(async () => {
    if (started.current) return
    started.current = true

    try {
      const rewriteResultsList = Object.entries(rewriteResults).map(([uid, content]) => ({
        uid,
        content,
      }))
      const taskId = await createCoverTask(rewriteResultsList)
      setCoverTaskId(taskId)
    } catch (err) {
      setError(String(err))
    }
  }, [rewriteResults])

  useEffect(() => {
    if (subStep !== 'planning') return
    startPlanning()

    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      if (!coverTaskId) return
      try {
        const data = await getCoverStatus(coverTaskId)
        if (data.status === 'planned' || data.status === 'completed') {
          const newPlans: Record<string, string> = {}
          for (const item of data.plans || []) {
            newPlans[item.uid] = item.plan_text || ''
          }
          setPlans(newPlans)
          setSubStep('review')
          return
        }
        if (data.status === 'failed') {
          setError('封面规划生成失败')
          return
        }
      } catch {}
      timeoutId = setTimeout(poll, 2000)
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [subStep, coverTaskId, startPlanning])

  // ========== 阶段2: 用户审核 → 生成HTML ==========
  const handleReviewConfirm = async () => {
    if (!coverTaskId) return
    try {
      const confirmedPlans = Object.entries(plans).map(([uid, plan_text]) => ({
        uid,
        image_index: 0,
        plan_text,
      }))
      await confirmCoverAndGenerateHtml(coverTaskId, confirmedPlans)
      setSubStep('generating')
    } catch (err) {
      alert('操作失败: ' + String(err))
    }
  }

  // ========== 阶段3: HTML生成（流式）==========
  useEffect(() => {
    if (subStep !== 'generating' || !coverTaskId) return

    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const data = await getHtmlStatus(coverTaskId)

        // 流式更新：每完成一个立即追加
        const newHtmlCodes: Record<string, string> = {}
        const stillGenerating: string[] = []

        for (const plan of data.plans || []) {
          if (plan.html_code) {
            newHtmlCodes[plan.uid] = plan.html_code
          } else if (data.status !== 'failed') {
            // html_code 为空且整体状态未失败，说明还在生成中
            stillGenerating.push(plan.uid)
          }
        }

        if (Object.keys(newHtmlCodes).length > 0) {
          setHtmlCodes(prev => {
            const next = { ...prev, ...newHtmlCodes }
            // 如果有新的完成，自动切换到该账号
            const newCompleted = Object.keys(newHtmlCodes).find(uid => !prev[uid])
            if (newCompleted && Object.keys(prev).length === 0) {
              setSelectedUid(newCompleted)
            }
            return next
          })
        }

        setGeneratingUids(stillGenerating)

        if (data.status === 'completed') {
          setSubStep('preview')
          return
        }
        if (data.status === 'failed') {
          setError('HTML生成失败')
          return
        }
      } catch {}
      timeoutId = setTimeout(poll, 2000)
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [subStep, coverTaskId])

  // ========== 阶段4: 封面预览/截图 ==========
  const handleCapture = useCallback(async (uid: string, html: string) => {
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
      setCapturedImages(prev => ({ ...prev, [uid]: dataUrl.split(',')[1] }))
      document.body.removeChild(tempDiv)
    } catch (err) {
      console.error(`截图失败 uid=${uid}:`, err)
    }
  }, [])

  const handleCaptureAll = useCallback(async () => {
    for (const [uid, html] of Object.entries(htmlCodes)) {
      await handleCapture(uid, html)
    }
  }, [htmlCodes, handleCapture])

  const handleDownload = (uid: string, base64: string) => {
    const link = document.createElement('a')
    link.download = `cover_${uid}.png`
    link.href = `data:image/png;base64,${base64}`
    link.click()
  }

  const handleConfirm = () => {
    onComplete(htmlCodes, capturedImages)
  }

  // ========== 渲染 ==========
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
        <div className="text-red-600 text-sm">❌ {error}</div>
      </div>
    )
  }

  // 封面规划中
  if (subStep === 'planning') {
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

  // 封面规划审核
  if (subStep === 'review') {
    const currentPlan = selectedUid === 'all' ? '' : (plans[selectedUid] || '')

    return (
      <MasterDetailLayout
        leftPanel={
          <AccountListPanel
            accounts={accountList}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
          />
        }
        rightPanel={
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">封面规划审核</h3>
              <button
                onClick={handleReviewConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                确认规划，生成HTML
              </button>
            </div>

            {selectedUid === 'all' ? (
              <div className="space-y-3">
                {Object.entries(plans).map(([uid, plan]) => (
                  <div key={uid} className="p-3 border border-gray-200 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-1">{accountNames[uid] || uid}</div>
                    <p className="text-sm text-gray-600 line-clamp-2">{plan}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  {accountNames[selectedUid] || selectedUid} 的封面规划
                </h4>
                <textarea
                  value={currentPlan}
                  onChange={(e) => setPlans(prev => ({ ...prev, [selectedUid]: e.target.value }))}
                  rows={8}
                  className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
          </div>
        }
      />
    )
  }

  // HTML生成中（流式）
  if (subStep === 'generating') {
    const doneCount = Object.keys(htmlCodes).length
    const total = Object.keys(accountNames).length

    return (
      <MasterDetailLayout
        leftPanel={
          <AccountListPanel
            accounts={accountList}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
          />
        }
        rightPanel={
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">HTML生成中...</h3>
              <span className="text-sm text-gray-500">{doneCount}/{total} 完成</span>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(doneCount / total) * 100}%` }}
              />
            </div>

            {/* 当前选中的账号HTML预览 */}
            {selectedUid !== 'all' && htmlCodes[selectedUid] && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  {accountNames[selectedUid] || selectedUid} 的封面
                </h4>
                <div
                  className="w-full aspect-square bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: htmlCodes[selectedUid] }}
                  style={{ transform: 'scale(0.3)', transformOrigin: 'center', width: '333%', height: '333%', pointerEvents: 'none' }}
                />
              </div>
            )}

            {selectedUid !== 'all' && !htmlCodes[selectedUid] && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-500">生成中...</span>
              </div>
            )}

            {selectedUid === 'all' && doneCount === 0 && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-500">HTML生成中...</span>
              </div>
            )}
          </div>
        }
      />
    )
  }

  // 封面预览（网格展示）
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">封面预览</h3>
        <button
          onClick={handleCaptureAll}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          一键截图全部
        </button>
      </div>

      {/* 网格展示 */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(htmlCodes).map(([uid, html]) => {
          const captured = capturedImages[uid]
          return (
            <div key={uid} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                <span className="text-xs font-medium text-gray-600 truncate">{accountNames[uid] || uid}</span>
                {captured && <span className="text-green-600 text-xs">✅</span>}
              </div>
              <div
                className="w-full aspect-square bg-white flex items-center justify-center cursor-pointer relative"
                onClick={() => !captured && handleCapture(uid, html)}
                title={captured ? '已截图' : '点击截图'}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: html }}
                  className="w-full h-full flex items-center justify-center"
                  style={{ transform: 'scale(0.2)', transformOrigin: 'center', width: '500%', height: '500%', pointerEvents: 'none' }}
                />
              </div>
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
                ) : (
                  <span className="text-xs text-gray-400">点击截图</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 确认按钮 */}
      <button
        onClick={handleConfirm}
        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
      >
        确认 {Object.keys(capturedImages).length} 张封面，开始发布
      </button>
    </div>
  )
}
