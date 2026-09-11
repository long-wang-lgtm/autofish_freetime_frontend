"use client"

import { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  updateItem,
  updateItemConfig,
  refreshItems,
  shelvesItem,
  offlineItem,
  deleteItem,
  editPriceByIdle,
  editPriceByPro,
  setFansPrice,
  PRO_DEFAULT_QUANTITY,
  updateItemShipConfig,
  type ShopItem,
  type FansPriceUpdate,
  type ShopItemConfigUpdate,
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

  /** 商品配置字段更新（sendCode / ai_prompt / reply_default_content） */
  const configMutation = useMutation({
    mutationFn: ({ gid, data }: { gid: number; data: ShopItemConfigUpdate }) =>
      updateItemConfig(gid, data),
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

  /** 删除商品 mutation（软删除：后端把 status 置为 -100） */
  const deleteMutation = useMutation({
    mutationFn: ({ gid, uid }: { gid: number; uid: string }) => deleteItem(gid, uid),
    onSuccess: (result) => {
      // 删除会改变列表条数与排序，按状态管理规范使用 invalidateQueries
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: result.message || "删除成功", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "删除失败", description: e.message, variant: "error" })
    },
  })

  /**
   * 改价 mutation — 按账号类型分流到两个后端接口（isPro 由列表数据直接带出，无需额外请求）。
   * 非鱼小铺走 /edit.price.by.idle，鱼小铺走 /edit.price.by.pro；两者对账号类型的校验互斥，
   * 前端选错接口只会拿到 403，所以这里必须与 item.account.isPro 保持一致。
   */
  const repriceMutation = useMutation({
    mutationFn: ({ gid, uid, price, quantity, isPro }: {
      gid: number; uid: string; price: number; quantity?: number; isPro: boolean
    }) =>
      isPro
        ? editPriceByPro(gid, uid, price, quantity ?? PRO_DEFAULT_QUANTITY)
        : editPriceByIdle(gid, uid, price),
    onSuccess: (_result, { price, quantity, isPro }) => {
      // 价格列可排序（orderBy=reservePrice），改价会改变该行在列表中的位置，
      // 按状态管理规范的决策树走 invalidateQueries 而非乐观更新
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({
        title: isPro ? `已改价 ${price} 元，库存 ${quantity}` : `已改价为 ${price} 元`,
        variant: "success",
      })
    },
    onError: (e: Error) => {
      addToast({ title: "改价失败", description: e.message, variant: "error" })
    },
  })

  /**
   * 粉丝价 mutation —— 仅鱼小铺（Pro）账号可用，非 Pro 后端直接 403。
   * 三档可选，只把弹窗实际填了的档透传下去（解构出 prices 而非逐个列举，
   * 避免未填的档带上 undefined 键混进 Body）。
   */
  const fansPriceMutation = useMutation({
    mutationFn: ({ gid, uid, ...prices }: { gid: number; uid: string } & FansPriceUpdate) =>
      setFansPrice(gid, uid, prices),
    onSuccess: () => {
      // 最终生效值由闲鱼侧决定（可能取整/归一），本地推算不可靠，直接重取列表
      queryClient.invalidateQueries({ queryKey: ["items"] })
      addToast({ title: "粉丝价已设置", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "设置粉丝价失败", description: e.message, variant: "error" })
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
    configMutation,
    shelfMutation,
    deleteMutation,
    repriceMutation,
    fansPriceMutation,
    shipConfigMutation,
    handleToggle,
    handleRefresh,
    isRefreshing,
  }
}
