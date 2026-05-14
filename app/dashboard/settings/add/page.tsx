'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AIConfigForm from '@/components/ai-config/AIConfigForm'
import { createAIConfig, AIConfigCreate, AIConfigUpdate } from '@/lib/api/ai-config'

export default function AddConfigPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      router.push('/dashboard/settings')
    },
  })

  const handleSubmit = async (data: AIConfigCreate | AIConfigUpdate) => {
    await createMutation.mutateAsync(data as AIConfigCreate)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">添加 AI 模型配置</h1>
        <AIConfigForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  )
}
