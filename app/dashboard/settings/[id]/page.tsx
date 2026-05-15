'use client'

export const runtime = 'edge'

import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AIConfigForm from '@/components/ai-config/AIConfigForm'
import { getAIConfig, updateAIConfig, AIConfigUpdate, AIConfigCreate } from '@/lib/api/ai-config'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function EditConfigPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const configId = parseInt(params.id)

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['ai-config', configId],
    queryFn: () => getAIConfig(configId),
  })

  const updateMutation = useMutation({
    mutationFn: (data: AIConfigUpdate) => updateAIConfig(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['ai-config', configId] })
      router.push('/dashboard/settings')
    },
  })

  const handleSubmit = async (data: AIConfigCreate | AIConfigUpdate) => {
    await updateMutation.mutateAsync(data as AIConfigUpdate)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-red-600">配置不存在或加载失败</p>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="mt-4 px-4 py-2 text-blue-600 hover:underline"
        >
          返回列表
        </button>
      </div>
    )
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
        <h1 className="text-xl font-bold text-gray-900 mb-6">编辑 AI 模型配置</h1>
        <AIConfigForm
          initialData={config}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
        />
      </div>
    </div>
  )
}
