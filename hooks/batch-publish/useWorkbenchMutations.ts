'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  triggerWork, publishMaterial, createMaterials, editMaterial,
  updateMaterialContext, deleteMaterial, type RewriteStage,
  type MaterialEditInput, type MaterialContextInput,
} from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useWorkbenchMutations(selectedOid: number | undefined) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const invalidateAll = () => {
    if (selectedOid) {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedOid] })
    }
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', 'overview'] })
    queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
  }

  // AI 工作触发
  const triggerWorkMutation = useMutation({
    mutationFn: ({ materialId, stage }: { materialId: number; stage: RewriteStage }) =>
      triggerWork(materialId, stage),
    onSuccess: (_data, { stage }) => {
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}完成`, variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error, { stage }) => {
      const stageLabel = stage === 'write' ? '改写' : stage === 'genimageplan' ? '封面规划' : '生图'
      toast.addToast({ title: `${stageLabel}失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 发布
  const publishMutation = useMutation({
    mutationFn: (materialId: number) => publishMaterial(materialId),
    onSuccess: () => {
      toast.addToast({ title: '发布成功', variant: 'success' })
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `发布失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 批量创建素材
  const createMaterialsMutation = useMutation({
    mutationFn: ({ num, opp }: {
      num: number
      opp: { id: number; name: string; description?: string | null; price?: number; status: string; ai_context_template?: string | null }
    }) =>
      createMaterials({
        num,
        opp: {
          id: opp.id,
          name: opp.name,
          description: opp.description ?? undefined,
          price: opp.price ?? undefined,
          status: opp.status,
          ai_context_template: (opp.ai_context_template as 'only_opportunity' | 'with_item') ?? undefined,
        },
      }),
    onSuccess: (data) => {
      toast.addToast({ title: `${data.length} 份素材创建成功`, variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `创建失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 编辑素材
  const editMaterialMutation = useMutation({
    mutationFn: (input: MaterialEditInput) => editMaterial(input),
    onSuccess: () => {
      toast.addToast({ title: '素材已保存', variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `保存失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 更新 AI 上下文
  const updateContextMutation = useMutation({
    mutationFn: (input: MaterialContextInput) => updateMaterialContext(input),
    onSuccess: () => {
      toast.addToast({ title: 'AI 上下文已保存', variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `AI 上下文保存失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  // 删除素材
  const deleteMaterialMutation = useMutation({
    mutationFn: (id: number) => deleteMaterial(id),
    onSuccess: () => {
      toast.addToast({ title: '素材已删除', variant: 'success' })
      invalidateAll()
    },
    onError: (err: Error) => {
      toast.addToast({ title: `删除失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  return {
    triggerWorkMutation,
    publishMutation,
    createMaterialsMutation,
    editMaterialMutation,
    updateContextMutation,
    deleteMaterialMutation,
  }
}
