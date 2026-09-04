'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  triggerWork, publishMaterial, createMaterials, editMaterial,
  deleteMaterial, type RewriteStage,
  type MaterialEditInput,
  type MaterialCreateParams,
} from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useWorkbenchMutations(selectedGid: string | undefined) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const invalidateAll = () => {
    if (selectedGid) {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials', selectedGid] })
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

  // 按源商品创建素材（POST /material.create.by.item）
  const createMaterialsMutation = useMutation({
    mutationFn: (input: MaterialCreateParams) => createMaterials(input),
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
    deleteMaterialMutation,
  }
}
