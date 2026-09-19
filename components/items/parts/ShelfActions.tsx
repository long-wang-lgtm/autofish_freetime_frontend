"use client"

import { useState } from "react"
import { ArrowUpToLine, ArrowDownFromLine } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'

interface ShelfActionsProps {
  item: ShopItem
  variant: "desktop" | "mobile"
  pending: boolean
  onShelve: (item: ShopItem) => void
  onOffline: (item: ShopItem) => void
}

/**
 * 上架/下架可用状态（取消 Pro 限制，任意账号均可操作，仅由商品当前状态决定）
 *
 * 状态取值：0 在售 / 1 已售出 / -2 已下架 / -9 审核中 / -99 未知 / -100 已删除
 * 上架：已下架(-2)、已售出(1) 可重新上架
 * 下架：在售(0) 可下架；审核中(-9) 也允许，用于撤回审核中的商品
 */
function getShelfState(item: ShopItem) {
  const canShelve = item.status === -2 || item.status === 1
  const canOffline = item.status === 0 || item.status === -9
  return {
    canShelve,
    canOffline,
    shelveDisabledReason: canShelve ? undefined : '当前商品状态不支持上架',
    offlineDisabledReason: canOffline ? undefined : '当前商品状态不支持下架',
  }
}

export function ShelfActions({ item, variant, pending, onShelve, onOffline }: ShelfActionsProps) {
  const [confirm, setConfirm] = useState<"shelve" | "offline" | null>(null)
  const state = getShelfState(item)

  const handleConfirm = () => {
    if (confirm === "shelve") onShelve(item)
    else if (confirm === "offline") onOffline(item)
    setConfirm(null)
  }

  const dialog = (
    <ConfirmDialog
      open={confirm !== null}
      onOpenChange={(o) => !o && setConfirm(null)}
      title={confirm === "shelve" ? "确认上架吗？" : "确认下架吗？"}
      // 不再提规格限制：上架已支持多规格。原先「仅支持单规格」「上架前后不一致」
      // 两条都是由那个限制推导出来的，限制撤掉后前提不成立，一并不留。
      description={confirm === "shelve" ? "上架后该商品将恢复售卖" : "下架后该商品将停止售卖"}
      confirmLabel={confirm === "shelve" ? "上架" : "下架"}
      loading={pending}
      onConfirm={handleConfirm}
    />
  )

  if (variant === "mobile") {
    // 复用 getShelfState 的结果，避免与桌面端的状态判断各写一份而漂移
    if (!state.canShelve && !state.canOffline) return null
    return (
      <>
        {state.canShelve && (
          <button
            type="button"
            disabled={!state.canShelve || pending}
            title={state.shelveDisabledReason}
            onClick={() => setConfirm("shelve")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              state.canShelve
                ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
                : "text-gray-300 bg-gray-100 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
            }`}
          >
            上架
          </button>
        )}
        {state.canOffline && (
          <button
            type="button"
            disabled={!state.canOffline || pending}
            title={state.offlineDisabledReason}
            onClick={() => setConfirm("offline")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              state.canOffline
                ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
                : "text-gray-300 bg-gray-100 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
            }`}
          >
            下架
          </button>
        )}
        {dialog}
      </>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="上架"
        disabled={!state.canShelve || pending}
        title={state.canShelve ? "上架" : state.shelveDisabledReason}
        onClick={() => setConfirm("shelve")}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
          state.canShelve
            ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950 hover:bg-green-100"
            : "text-gray-300 bg-gray-50 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
        }`}
      >
        <ArrowUpToLine className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="下架"
        disabled={!state.canOffline || pending}
        title={state.canOffline ? "下架" : state.offlineDisabledReason}
        onClick={() => setConfirm("offline")}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
          state.canOffline
            ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950 hover:bg-green-100"
            : "text-gray-300 bg-gray-50 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
        }`}
      >
        <ArrowDownFromLine className="w-4 h-4" />
      </button>
      {dialog}
    </span>
  )
}
