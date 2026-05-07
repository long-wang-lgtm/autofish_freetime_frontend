'use client'

import React from 'react'

export type AIStep = 'account' | 'rewrite' | 'cover' | 'publish'

interface Step {
  id: AIStep
  label: string
}

const STEPS: Step[] = [
  { id: 'account', label: '账号选择' },
  { id: 'rewrite', label: 'AI改写' },
  { id: 'cover', label: '封面规划' },
  { id: 'publish', label: '发布' },
]

interface StepProgressBarProps {
  currentStep: AIStep
  completedSteps: Set<AIStep>
  onStepClick: (step: AIStep) => void
}

export function StepProgressBar({ currentStep, completedSteps, onStepClick }: StepProgressBarProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center justify-center py-4">
      {STEPS.map((step, index) => {
        const isCompleted = completedSteps.has(step.id)
        const isCurrent = step.id === currentStep
        const isPast = index < currentIndex

        return (
          <React.Fragment key={step.id}>
            {/* 连接线（左侧） */}
            {index > 0 && (
              <div
                className={`h-0.5 w-12 ${
                  isPast || isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}

            {/* 步骤节点 */}
            <button
              onClick={() => (isCompleted || isPast) && onStepClick(step.id)}
              disabled={!isCompleted && !isPast && !isCurrent}
              className={`
                flex flex-col items-center justify-center
                w-20 h-16 rounded-xl border-2 transition-all
                ${isCompleted || isPast
                  ? 'border-blue-600 bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                  : isCurrent
                  ? 'border-blue-600 bg-white text-blue-600'
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <div className="text-lg font-bold">
                {isCompleted || isPast ? '✓' : index + 1}
              </div>
              <div className="text-xs mt-0.5 whitespace-nowrap">{step.label}</div>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}
