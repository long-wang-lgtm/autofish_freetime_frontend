'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAccounts } from '@/lib/api/accounts'
import { createRewriteTask } from '@/lib/api/publish'
import { StepProgressBar, AIStep } from '@/components/ai-creation/StepProgressBar'
import { Step1Account } from '@/components/ai-creation/Step1Account'
import { Step2Rewrite } from '@/components/ai-creation/Step2Rewrite'
import { Step3Cover } from '@/components/ai-creation/Step3Cover'
import { Step4Publish } from '@/components/ai-creation/Step4Publish'

type Tab = 'publish' | 'draft' | 'ai'

export default function PublishPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ai')
  const [aiStep, setAiStep] = useState<AIStep>('account')
  const [completedSteps, setCompletedSteps] = useState<Set<AIStep>>(new Set())
  const [rewriteTaskId, setRewriteTaskId] = useState<string | null>(null)
  const [sourceDescription, setSourceDescription] = useState('')
  const [selectedAccountUids, setSelectedAccountUids] = useState<string[]>([])
  const [rewriteResults, setRewriteResults] = useState<Record<string, string>>({})
  const [htmlCodes, setHtmlCodes] = useState<Record<string, string>>({})
  const [coverImages, setCoverImages] = useState<Record<string, string>>({})

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: listAccounts,
  })

  // 获取账号名称映射
  const accountNames: Record<string, string> = {}
  for (const acc of accountsData?.accounts || []) {
    if (selectedAccountUids.includes(acc.uid)) {
      accountNames[acc.uid] = acc.name
    }
  }

  // 步骤完成时记录
  const completeStep = (step: AIStep) => {
    setCompletedSteps(prev => {
      const next = new Set(Array.from(prev))
      next.add(step)
      return next
    })
  }

  // 步骤点击跳转
  const handleStepClick = (step: AIStep) => {
    if (completedSteps.has(step) || step === aiStep) {
      setAiStep(step)
    }
  }

  // ========== 阶段1: 账号选择 → 开始改写 ==========
  const handleStartRewrite = async (description: string, accountUids: string[]) => {
    setSourceDescription(description)
    setSelectedAccountUids(accountUids)
    const { taskId } = await createRewriteTask(description, accountUids)
    setRewriteTaskId(taskId)
    setAiStep('rewrite')
  }

  // ========== 阶段2: 改写完成 → 封面规划 ==========
  const handleRewriteComplete = (results: Record<string, string>) => {
    setRewriteResults(results)
    completeStep('rewrite')
    setAiStep('cover')
  }

  // ========== 阶段3: 封面完成 → 发布 ==========
  const handleCoverComplete = (htmls: Record<string, string>, images: Record<string, string>) => {
    setHtmlCodes(htmls)
    setCoverImages(images)
    completeStep('cover')
    setAiStep('publish')
  }

  // ========== 渲染 ==========
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">商品发布</h1>
        <p className="text-sm text-gray-500 mt-1">发布和管理您的闲鱼商品</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab('publish')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'publish'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          发布商品
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'draft'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          草稿箱
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'ai'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          AI创作
        </button>
      </div>

      {/* 发布商品/草稿箱占位 */}
      {activeTab !== 'ai' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">{activeTab === 'publish' ? '📦' : '📝'}</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {activeTab === 'publish' ? '商品发布功能' : '草稿箱'}
          </h3>
          <p className="text-sm text-gray-500">开发中...</p>
        </div>
      )}

      {/* AI创作主内容 */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* 横向步骤条 */}
          <StepProgressBar
            currentStep={aiStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />

          {/* 阶段内容 */}
          {aiStep === 'account' && (
            <Step1Account
              accounts={accountsData?.accounts || []}
              onStart={handleStartRewrite}
            />
          )}

          {aiStep === 'rewrite' && rewriteTaskId && (
            <Step2Rewrite
              taskId={rewriteTaskId}
              accountNames={accountNames}
              onComplete={handleRewriteComplete}
            />
          )}

          {aiStep === 'cover' && Object.keys(rewriteResults).length > 0 && (
            <Step3Cover
              rewriteResults={rewriteResults}
              accountNames={accountNames}
              onComplete={handleCoverComplete}
            />
          )}

          {aiStep === 'publish' && Object.keys(htmlCodes).length > 0 && (
            <Step4Publish
              accountNames={accountNames}
              rewriteResults={rewriteResults}
              sourceDescription={sourceDescription}
              coverImages={coverImages}
            />
          )}
        </div>
      )}
    </div>
  )
}
