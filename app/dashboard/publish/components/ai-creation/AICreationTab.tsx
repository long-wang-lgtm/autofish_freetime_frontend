'use client'

import { useState } from 'react'
import StepAccounts from './StepAccounts'
import StepRewriting from './StepRewriting'
import StepRewritePreview from './StepRewritePreview'
import StepCoverPlan from './StepCoverPlan'
import StepCoverHtml from './StepCoverHtml'
import StepCoverPreview from './StepCoverPreview'
import StepPublish from './StepPublish'

type Step = 'accounts' | 'rewriting' | 'rewrite_preview' | 'cover_plan' | 'cover_html' | 'cover_preview' | 'publish'

const STEPS = [
  { key: 'accounts', label: '选择账号' },
  { key: 'rewriting', label: 'AI改写' },
  { key: 'rewrite_preview', label: '改写预览' },
  { key: 'cover_plan', label: '封面规划' },
  { key: 'cover_html', label: '生成HTML' },
  { key: 'cover_preview', label: '封面预览' },
  { key: 'publish', label: '发布' },
]

interface RewriteResult {
  uid: string
  content: string
  editedContent?: string
}

interface CoverPlan {
  uid: string
  imageIndex: number
  planText: string
  htmlCode?: string
}

interface AICreationTabProps {
  onComplete?: () => void
}

export default function AICreationTab({ onComplete }: AICreationTabProps) {
  const [currentStep, setCurrentStep] = useState<Step>('accounts')
  const [sourceDescription, setSourceDescription] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<Array<{ uid: string; name: string }>>([])
  const [rewriteResults, setRewriteResults] = useState<RewriteResult[]>([])
  const [rewriteTaskId, setRewriteTaskId] = useState<string | null>(null)
  const [coverPlans, setCoverPlans] = useState<CoverPlan[]>([])
  const [coverTaskId, setCoverTaskId] = useState<string | null>(null)
  const [capturedImages, setCapturedImages] = useState<Record<string, string>>({})

  const stepIndex = STEPS.findIndex(s => s.key === currentStep)

  const goToStep = (step: Step) => {
    setCurrentStep(step)
  }

  const handleAccountsNext = (desc: string, accounts: Array<{ uid: string; name: string }>) => {
    setSourceDescription(desc)
    setSelectedAccounts(accounts)
    goToStep('rewriting')
  }

  const handleRewriteComplete = (taskId: string, results: RewriteResult[]) => {
    setRewriteTaskId(taskId)
    setRewriteResults(results)
    goToStep('rewrite_preview')
  }

  const handleRewriteConfirm = (results: RewriteResult[]) => {
    setRewriteResults(results)
    goToStep('cover_plan')
  }

  const handleCoverPlanConfirm = (taskId: string, plans: CoverPlan[]) => {
    setCoverTaskId(taskId)
    setCoverPlans(plans)
    goToStep('cover_html')
  }

  const handleHtmlGenerated = (plans: CoverPlan[]) => {
    setCoverPlans(plans)
    goToStep('cover_preview')
  }

  const handleCoverCapture = (key: string, dataUrl: string) => {
    setCapturedImages(prev => ({ ...prev, [key]: dataUrl }))
  }

  const handlePublishComplete = () => {
    onComplete?.()
    goToStep('accounts')
  }

  return (
    <div className="space-y-6">
      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, index) => (
          <div
            key={step.key}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              index === stepIndex
                ? 'bg-blue-600 text-white'
                : index < stepIndex
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {index < stepIndex ? '✓' : index + 1}
            </span>
            {step.label}
          </div>
        ))}
      </div>

      {/* 步骤内容 */}
      <div className="min-h-[400px]">
        {currentStep === 'accounts' && (
          <StepAccounts
            onNext={handleAccountsNext}
          />
        )}

        {currentStep === 'rewriting' && (
          <StepRewriting
            sourceDescription={sourceDescription}
            accounts={selectedAccounts}
            onComplete={handleRewriteComplete}
            onBack={() => goToStep('accounts')}
          />
        )}

        {currentStep === 'rewrite_preview' && (
          <StepRewritePreview
            results={rewriteResults}
            accounts={selectedAccounts}
            onConfirm={handleRewriteConfirm}
            onBack={() => goToStep('rewriting')}
          />
        )}

        {currentStep === 'cover_plan' && (
          <StepCoverPlan
            rewriteResults={rewriteResults}
            accounts={selectedAccounts}
            onConfirm={handleCoverPlanConfirm}
            onBack={() => goToStep('rewrite_preview')}
          />
        )}

        {currentStep === 'cover_html' && (
          <StepCoverHtml
            taskId={coverTaskId!}
            plans={coverPlans}
            onGenerated={handleHtmlGenerated}
            onBack={() => goToStep('cover_plan')}
          />
        )}

        {currentStep === 'cover_preview' && (
          <StepCoverPreview
            plans={coverPlans}
            capturedImages={capturedImages}
            accounts={selectedAccounts}
            onCapture={handleCoverCapture}
            onConfirm={() => goToStep('publish')}
            onBack={() => goToStep('cover_html')}
          />
        )}

        {currentStep === 'publish' && (
          <StepPublish
            rewriteResults={rewriteResults}
            capturedImages={capturedImages}
            accounts={selectedAccounts}
            onComplete={handlePublishComplete}
            onBack={() => goToStep('cover_preview')}
          />
        )}
      </div>
    </div>
  )
}
