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
  editItem,
  republishItem,
  editPriceByIdle,
  editPriceByPro,
  setFansPrice,
  PRO_DEFAULT_QUANTITY,
  updateItemShipConfig,
  type ShopItem,
  type ItemEditMaterial,
  type FansPriceUpdate,
  type ShopItemConfigUpdate,
  type ShopItemListResponse,
  type ShipByVoucher,
} from "@/lib/api/items"
import { useToast } from '@/components/ui/Toaster'

/**
 * 重新发布后，新商品重新入库的等待时间。
 * 后端发布成功后要等 uniform(8, 15) 秒才去查询并写入新商品，
 * 这里留够这个窗口，用于「操作完自动再刷一次列表」，避免用户手动刷新。
 */
const REPUBLISH_SETTLE_MS = 20_000

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
   * 编辑商品属性 mutation —— 编辑弹窗的「保存」。
   *
   * material 是弹窗里那份物料，整包下发。
   *
   * 成功后拿接口返回的 item 原地替换列表里的那一条，**不 invalidate**：接口返回的
   * 是库里那条记录（后端注释就写着「暂未刷新」），数据库未必跟上了闲鱼侧的结果，
   * 重新拉一次反而会把刚写进去的值覆盖回去。返回什么就显示什么，落库是后端的事。
   *
   * 注意后端把闲鱼侧的失败吞成了日志并照常返回 200（core/im/account.py 的 items.edit），
   * 失败在前端看来就是成功 —— 只能等后端把异常抛出来，这里才谈得上区分。
   */
  const editItemMutation = useMutation({
    mutationFn: ({ gid, uid, material }: { gid: number; uid: string; material: ItemEditMaterial }) =>
      editItem(gid, uid, material),
    onSuccess: (updated) => {
      // 前缀匹配所有商品列表查询：同一个商品可能同时出现在别的筛选/分页下
      queryClient.setQueriesData<ShopItemListResponse>(
        { queryKey: ["items"] },
        (old) =>
          old
            ? { ...old, items: old.items.map((it) => (it.gid === updated.gid ? updated : it)) }
            : old
      )
      // 编辑详情也要作废：弹窗关掉即卸载，但那份物料还留在缓存里，
      // staleTime 内再打开同一个商品，字段区显示的会是保存前的旧值。
      // refetchType: 'none' —— 此刻弹窗还开着（onSuccess 先于 mutateAsync resolve），
      // 立刻重拉会让字段区跟着重挂载闪一下；只标脏，等下次打开时按 enabled 自然重拉。
      queryClient.invalidateQueries({ queryKey: ["itemEditDetail"], refetchType: "none" })
      addToast({ title: "商品已保存", variant: "success" })
    },
    onError: (e: Error) => {
      addToast({ title: "保存失败", description: e.message, variant: "error" })
    },
  })

  /**
   * 重新发布 mutation —— 后端「先发布新商品，再删除原商品」，原商品会被删除、新商品换了 gid，
   * 每行在列表中的身份和排序都可能变，按状态管理规范的决策树走 invalidateQueries 而非乐观更新。
   *
   * material 是编辑弹窗里那份物料，会作为请求体下发 —— 重发同样按弹窗里的字段发。
   *
   * 后端返回时新商品还没入库（发布成功后异步等待 8~15s 才查详情落库），
   * 所以立刻刷新只能看到原商品消失；再补一次延迟刷新，让新商品自己出现。
   */
  const republishMutation = useMutation({
    mutationFn: ({ gid, uid, material }: { gid: number; uid: string; material: ItemEditMaterial }) =>
      republishItem(gid, uid, material),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["items"] })
      }, REPUBLISH_SETTLE_MS)
      addToast({
        title: result.message || "重新发布成功",
        description: "新商品稍后出现在列表中",
        variant: "success",
      })
    },
    onError: (e: Error) => {
      addToast({ title: "重新发布失败", description: e.message, variant: "error" })
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
    editItemMutation,
    republishMutation,
    repriceMutation,
    fansPriceMutation,
    shipConfigMutation,
    handleToggle,
    handleRefresh,
    isRefreshing,
  }
}
