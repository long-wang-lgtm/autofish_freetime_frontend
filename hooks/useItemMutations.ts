"use client"

import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  updateItem,
  refreshItems,
  shelvesItem,
  offlineItem,
  updateItemShipConfig,
  type ShopItem,
  type ShopItemListResponse,
  type ShipByVoucher,
} from "@/lib/api/items"
import { useToast } from '@/components/ui/Toaster'

/**
 * 商品管理页 — 变更操作层
 */
export function useItemMutations() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const updateMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: number; data: Record<string, unknown> }) =>
      updateItem(gid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
    onError: (e: Error) => {
      addToast({ title: "更新失败", description: e.message, variant: "error" })
    },
  })

  const shelfMutation = useMutation({
    mutationFn: ({ gid, uid, action }: { gid: number; uid: string; action: "shelves" | "offline" }) =>
      action === "shelves" ? shelvesItem(gid, uid) : offlineItem(gid, uid),
    onSuccess: (updated, { action }) => {
      queryClient.setQueriesData<ShopItemListResponse>({ queryKey: ["items"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((it) => (it.gid === updated.gid ? { ...it, ...updated } : it)),
        }
      })
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: action === "shelves" ? "上架成功" : "下架成功", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "操作失败", description: e.message, variant: "error" })
    },
  })

  /** ShipConfig 保存 mutation */
  const shipConfigMutation = useMutation({
    mutationFn: ({ gid, stage, byEntirety, voucher }: {
      gid: number
      stage: 'shipment' | 'shipconfirm' | 'evaluation'
      byEntirety: boolean
      voucher: ShipByVoucher
    }) => updateItemShipConfig(gid, { stage, byEntirety, voucher }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: "配置已保存", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "保存失败", description: e.message, variant: "error" })
    },
  })

  const handleToggle = useCallback(
    (item: ShopItem, field: "auto_reply" | "auto_ship" | "auto_ai_reply" | "auto_restock") => {
      const gid = item.gid
      updateMutation.mutate({ gid, data: { [field]: !item[field] } })
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
    shelfMutation,
    shipConfigMutation,
    handleToggle,
    handleRefresh,
    isRefreshing,
  }
}
