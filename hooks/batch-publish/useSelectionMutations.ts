'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMonitoredItem, createMaterialsByItem, updateMonitorItemStatus, type MonitorItemListResponse } from '@/lib/api/batch-publish'
import { useToast } from '@/components/ui/Toaster'

export function useSelectionMutations() {
  const queryClient = useQueryClient()
  const toast = useToast()

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

  // 按监控商品创建素材
  const createByItemMutation = useMutation({
    mutationFn: ({ num, souItemId, toUid }: { num: number; souItemId: string; toUid?: string }) =>
      createMaterialsByItem(num, souItemId, toUid),
    onSuccess: () => {
      toast.addToast({ title: '素材创建成功', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'materials'] })
    },
    onError: (err: Error) => {
      toast.addToast({ title: `创建失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
  })

  const statusToggleMutation = useMutation({
    mutationFn: ({ gid, newStatus }: { gid: string; newStatus: 0 | 1 }) =>
      updateMonitorItemStatus(gid, newStatus),
    onMutate: async ({ gid, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['batch-publish', 'monitored-items'] })
      const previous = queryClient.getQueriesData<MonitorItemListResponse>({ queryKey: ['batch-publish', 'monitored-items'] })

      queryClient.setQueriesData<MonitorItemListResponse>(
        { queryKey: ['batch-publish', 'monitored-items'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.gid === gid ? { ...item, monitorStatus: newStatus } : item
            ),
          }
        }
      )

      return { previous }
    },
    onError: (err: Error, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.addToast({ title: `状态切换失败：${err?.message || '请稍后重试'}`, variant: 'error' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-publish', 'monitored-items'] })
    },
  })

  return {
    deleteMutation,
    createByItemMutation,
    statusToggleMutation,
  }
}
