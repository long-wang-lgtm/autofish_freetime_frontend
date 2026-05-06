'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAccounts } from '@/lib/api/accounts'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StepAccounts } from '@/components/ai-creation/StepAccounts'
import { StepRewriting } from '@/components/ai-creation/StepRewriting'
import { StepRewritePreview } from '@/components/ai-creation/StepRewritePreview'
import { StepCoverPlan } from '@/components/ai-creation/StepCoverPlan'
import { StepCoverHtml } from '@/components/ai-creation/StepCoverHtml'
import { StepCoverPreview } from '@/components/ai-creation/StepCoverPreview'
import { StepPublish } from '@/components/ai-creation/StepPublish'

type Tab = 'publish' | 'draft' | 'ai'
type AIStep = 'accounts' | 'rewriting' | 'rewrite-preview' | 'cover-plan' | 'cover-html' | 'cover-preview' | 'publish'

export default function PublishPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ai')
  const [aiStep, setAiStep] = useState<AIStep>('accounts')
  const [sourceDescription, setSourceDescription] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [rewriteResults, setRewriteResults] = useState<Record<string, string>>({})
  const [rewriteTaskId, setRewriteTaskId] = useState<string | null>(null)
  const [coverTaskId, setCoverTaskId] = useState<string | null>(null)
  const [coverPlans, setCoverPlans] = useState<Record<string, string>>({})
  const [htmlCodes, setHtmlCodes] = useState<Record<string, string>>({})
  const [coverImages, setCoverImages] = useState<Record<string, string>>({})

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: listAccounts,
  })

  // ===== Step1: accounts → start rewrite =====
  const handleStartRewrite = (description: string, accountUids: string[], taskId: string) => {
    setSourceDescription(description)
    setSelectedAccounts(accountUids)
    setRewriteTaskId(taskId)
    setAiStep('rewriting')
  }

  // ===== Step2: rewriting complete → preview =====
  const handleRewriteComplete = (taskId: string, results: Record<string, string>) => {
    setRewriteTaskId(taskId)
    setRewriteResults(results)
    setAiStep('rewrite-preview')
  }

  // ===== Step3: confirm rewrite → cover plan =====
  const handleConfirmRewrite = (confirmedResults: Record<string, string>) => {
    setRewriteResults(confirmedResults)
    setAiStep('cover-plan')
  }

  // ===== Step4: cover plan complete → generate html =====
  const handleCoverPlanComplete = (taskId: string, plans: Record<string, string>) => {
    setCoverTaskId(taskId)
    setCoverPlans(plans)
    setAiStep('cover-html')
  }

  // ===== Step5: html generation complete → screenshot =====
  const handleHtmlComplete = (htmls: Record<string, string>) => {
    setHtmlCodes(htmls)
    setAiStep('cover-preview')
  }

  // ===== Step6: cover confirmed → publish =====
  const handleConfirmCover = (images: Record<string, string>) => {
    setCoverImages(images)
    setAiStep('publish')
  }

  const renderAIStep = () => {
    switch (aiStep) {
      case 'accounts':
        return (
          <StepAccounts
            accounts={accountsData?.accounts || []}
            onStart={handleStartRewrite}
          />
        )
      case 'rewriting':
        return (
          <StepRewriting
            taskId={rewriteTaskId!}
            onComplete={handleRewriteComplete}
          />
        )
      case 'rewrite-preview':
        return (
          <StepRewritePreview
            results={rewriteResults}
            onConfirm={handleConfirmRewrite}
            onBack={() => setAiStep('accounts')}
          />
        )
      case 'cover-plan':
        return (
          <StepCoverPlan
            rewriteResults={rewriteResults}
            onConfirm={handleCoverPlanComplete}
          />
        )
      case 'cover-html':
        return (
          <StepCoverHtml
            taskId={coverTaskId!}
            onComplete={handleHtmlComplete}
          />
        )
      case 'cover-preview':
        return (
          <StepCoverPreview
            htmlCodes={htmlCodes}
            onConfirm={handleConfirmCover}
            onBack={() => setAiStep('cover-html')}
          />
        )
      case 'publish':
        return (
          <StepPublish
            sourceDescription={sourceDescription}
            selectedAccounts={selectedAccounts}
            rewriteResults={rewriteResults}
            coverImages={coverImages}
          />
        )
    }
  }

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

      {/* 内容区域 */}
      {activeTab === 'publish' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">商品发布功能</h3>
          <p className="text-sm text-gray-500">开发中...</p>
        </div>
      )}

      {activeTab === 'draft' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">草稿箱</h3>
          <p className="text-sm text-gray-500">暂无草稿</p>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          {/* 步骤指示器 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={`font-medium ${aiStep === 'accounts' ? 'text-blue-600' : ''}`}>1.选择账号</span>
            <span>›</span>
            <span className={`font-medium ${aiStep === 'rewriting' ? 'text-blue-600' : ''}`}>2.改写中</span>
            <span>›</span>
            <span className={`font-medium ${aiStep === 'rewrite-preview' ? 'text-blue-600' : ''}`}>3.改写预览</span>
            <span>›</span>
            <span className={`font-medium ${aiStep === 'cover-plan' ? 'text-blue-600' : ''}`}>4.封面规划</span>
            <span>›</span>
            <span className={`font-medium ${aiStep === 'cover-html' ? 'text-blue-600' : ''}`}>5.生成封面</span>
            <span>›</span>
            <span className={`font-medium ${aiStep === 'cover-preview' ? 'text-blue-600' : ''}`}>6.封面预览</span>
            <span>›</span>
            <span className={`font-medium ${aiStep === 'publish' ? 'text-blue-600' : ''}`}>7.发布</span>
          </div>
          {renderAIStep()}
        </div>
      )}
    </div>
  )
}
