"use client"

import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateItem, refreshItems, type Item } from "@/lib/api/items"
import { useToast } from "@/components/ui/toaster"

/**
 * 商品管理页 — 变更操作层
 *
 * 包含 toggle（自动回复/自动发货等开关）和 refresh（刷新商品）两个 mutation。
 * handleRefresh 接受 uid 参数——由调用方传入当前筛选的账号。
 */
export function useItemMutations() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: string; data: Parameters<typeof updateItem>[1] }) =>
      updateItem(gid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  const handleToggle = useCallback(
    (item: Item, field: "auto_reply" | "auto_delivery" | "auto_ai_reply" | "auto_restock") => {
      updateMutation.mutate({ gid: item.gid, data: { [field]: !item[field] } })
    },
    [updateMutation],
  )

  const handleRefresh = useCallback(
    async (uid: string | undefined) => {
      if (!uid) {
        addToast({ title: "刷新失败", description: "请先选择账号", variant: "error" })
        return
      }
      setIsRefreshing(true)
      try {
        const result = await refreshItems(uid)
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ["items"] })
        } else {
          addToast({ title: "刷新失败", description: result.message, variant: "error" })
        }
      } catch (e) {
        addToast({
          title: "刷新失败",
          description: e instanceof Error ? e.message : "刷新失败",
          variant: "error",
        })
      } finally {
        setIsRefreshing(false)
      }
    },
    [queryClient, addToast],
  )

  return {
    updateMutation,
    handleToggle,
    handleRefresh,
    isRefreshing,
  }
}
