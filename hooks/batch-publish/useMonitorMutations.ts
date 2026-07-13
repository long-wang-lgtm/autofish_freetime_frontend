'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { batchBindOpportunity, unbindOpportunity, deleteMonitoredItem } from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useMonitorMutations() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const bindMutation = useMutation({
    mutationFn: ({ gids, opportunityId }: { gids: string[]; opportunityId: number }) =>
      batchBindOpportunity(gids, opportunityId),
    onSuccess: (_data, { gids }) => {
      toast.addToast({ title: `${gids.length} 个商品绑定成功`, variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `绑定失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const unbindMutation = useMutation({
    mutationFn: (gid: string) => unbindOpportunity(gid),
    onSuccess: () => {
      toast.addToast({ title: '解绑成功', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'opportunities'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `解绑失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (gid: string) => deleteMonitoredItem(gid),
    onSuccess: () => {
      toast.addToast({ title: '删除成功', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `删除失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  return {
    bindMutation,
    unbindMutation,
    deleteMutation,
  }
}
