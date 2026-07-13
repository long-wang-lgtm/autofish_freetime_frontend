'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOpportunity, updateOpportunity, deleteOpportunity, type OpportunityParams } from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useOpportunityMutations() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const createMutation = useMutation({
    mutationFn: (opp: OpportunityParams) => createOpportunity(opp),
    onSuccess: () => {
      toast.addToast({ title: '商机创建成功', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `创建失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ oid, opp }: { oid: number; opp: Partial<OpportunityParams> }) =>
      updateOpportunity(oid, opp),
    onSuccess: () => {
      toast.addToast({ title: '商机已更新', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `更新失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (oid: number) => deleteOpportunity(oid),
    onSuccess: () => {
      toast.addToast({ title: '商机已删除', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `删除失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  return { createMutation, updateMutation, deleteMutation }
}
