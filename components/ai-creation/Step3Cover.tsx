'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  createCoverPlanTask,
  getCoverPlanStatus,
  confirmCoverPlan,
  getImageGenerateStatus,
} from '@/lib/api/publish'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AccountListPanel, AccountItem, AccountStatus } from './AccountListPanel'
import { MasterDetailLayout } from './MasterDetailLayout'

type CoverSubStep = 'planning' | 'review' | 'generating' | 'preview'

interface PlanData {
  style_id: string
  style_name: string
  plan_prompt: string
}

interface Step3CoverProps {
  rewriteResults: Record<string, string>
  accountNames: Record<string, string>
  recordId: number
  rewriteTaskId: string
  onComplete: (images: Record<string, string>) => void
}

export function Step3Cover({
  rewriteResults,
  accountNames,
  recordId,
  rewriteTaskId,
  onComplete,
}: Step3CoverProps) {
  const [subStep, setSubStep] = useState<CoverSubStep>('planning')
  const [coverPlanTaskId, setCoverPlanTaskId] = useState<string | null>(null)
  const [plans, setPlans] = useState<Record<string, PlanData>>({})
  const [images, setImages] = useState<Record<string, string>>({})
  const [selectedUid, setSelectedUid] = useState<string | 'all'>('all')
  const [generatingUids, setGeneratingUids] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const accountList: AccountItem[] = Object.entries(accountNames).map(([uid, name]) => ({
    uid,
    name,
    status: images[uid] ? 'completed' : generatingUids.includes(uid) ? 'running' : 'idle',
    thumbnail: images[uid] ? `data:image/png;base64,${images[uid]}` : undefined,
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
      const taskId = await createCoverPlanTask(rewriteTaskId, rewriteResultsList, recordId)
      setCoverPlanTaskId(taskId)
    } catch (err) {
      setError(String(err))
    }
  }, [rewriteResults, rewriteTaskId, recordId])

  useEffect(() => {
    if (subStep !== 'planning') return
    startPlanning()

    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      if (!coverPlanTaskId) return
      try {
        const data = await getCoverPlanStatus(coverPlanTaskId)
        if (data.status === 'planned' || data.status === 'completed') {
          const newPlans: Record<string, PlanData> = {}
          for (const item of data.plans || []) {
            newPlans[item.uid] = {
              style_id: item.style_id || 'default',
              style_name: item.style_name || '默认风格',
              plan_prompt: item.plan_prompt || '',
            }
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
  }, [subStep, coverPlanTaskId, startPlanning])

  // ========== 阶段2: 用户审核 → 生图 ==========
  const handleReviewConfirm = async () => {
    if (!coverPlanTaskId) return
    try {
      const confirmedPlans = Object.entries(plans).map(([uid, plan]) => ({
        uid,
        plan_prompt: plan.plan_prompt,
      }))
      await confirmCoverPlan(coverPlanTaskId, confirmedPlans, recordId)
      setSubStep('generating')
    } catch (err) {
      alert('操作失败: ' + String(err))
    }
  }

  // ========== 阶段3: AI生图（流式）==========
  useEffect(() => {
    if (subStep !== 'generating' || !coverPlanTaskId) return

    let timeoutId: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const data = await getImageGenerateStatus(coverPlanTaskId)

        const newImages: Record<string, string> = {}
        const stillGenerating: string[] = []

        for (const img of data.images || []) {
          if (img.b64_image) {
            newImages[img.uid] = img.b64_image
          }
          if (img.status === 'generating' || (!img.b64_image && img.status !== 'failed')) {
            stillGenerating.push(img.uid)
          }
        }

        if (Object.keys(newImages).length > 0) {
          setImages(prev => ({ ...prev, ...newImages }))
        }

        setGeneratingUids(stillGenerating)

        if (data.status === 'completed') {
          setSubStep('preview')
          return
        }
        if (data.status === 'failed') {
          setError('图片生成失败')
          return
        }
      } catch {}
      timeoutId = setTimeout(poll, 2000)
    }
    poll()
    return () => clearTimeout(timeoutId)
  }, [subStep, coverPlanTaskId])

  // ========== 阶段4: 预览 ==========
  const handleConfirm = () => {
    onComplete(images)
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
    const currentPlan = selectedUid === 'all' ? '' : (plans[selectedUid]?.plan_prompt || '')

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
                确认规划，生成封面图
              </button>
            </div>

            {selectedUid === 'all' ? (
              <div className="space-y-3">
                {Object.entries(plans).map(([uid, plan]) => (
                  <div key={uid} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {accountNames[uid] || uid}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{plan.style_name}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{plan.plan_prompt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">
                    {accountNames[selectedUid] || selectedUid} 的封面规划
                  </h4>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                    {plans[selectedUid]?.style_name || ''}
                  </span>
                </div>
                <textarea
                  value={currentPlan}
                  onChange={(e) => setPlans(prev => ({
                    ...prev,
                    [selectedUid]: {
                      ...prev[selectedUid],
                      plan_prompt: e.target.value,
                    },
                  }))}
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

  // AI生图中（流式）
  if (subStep === 'generating') {
    const doneCount = Object.keys(images).length
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
              <h3 className="font-medium text-gray-900">AI 生成封面图中...</h3>
              <span className="text-sm text-gray-500">{doneCount}/{total} 完成</span>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
              />
            </div>

            {/* 当前选中的账号图片预览 */}
            {selectedUid !== 'all' && images[selectedUid] && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  {accountNames[selectedUid] || selectedUid} 的封面
                </h4>
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  <div className="absolute inset-0 flex items-center justify-center bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <img
                      src={`data:image/png;base64,${images[selectedUid]}`}
                      alt="封面图"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedUid !== 'all' && !images[selectedUid] && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-500">生成中...</span>
              </div>
            )}

            {selectedUid === 'all' && doneCount === 0 && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-500">AI生图中...</span>
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
      </div>

      {/* 网格展示 */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(images).map(([uid, b64Image]) => (
          <div key={uid} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 flex items-center justify-between border-b border-gray-200">
              <span className="text-xs font-medium text-gray-600 truncate">
                {accountNames[uid] || uid}
              </span>
              <span className="text-green-600 text-xs">✅</span>
            </div>
            <div className="w-full aspect-square bg-white flex items-center justify-center">
              <img
                src={`data:image/png;base64,${b64Image}`}
                alt="封面图"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      {/* 确认按钮 */}
      <button
        onClick={handleConfirm}
        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
      >
        确认 {Object.keys(images).length} 张封面，开始发布
      </button>
    </div>
  )
}