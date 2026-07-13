"use client"

import { useState } from "react"
import { getShelfState, type Item } from "@/lib/api/items"
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'

interface ShelfActionsProps {
  item: Item
  variant: "desktop" | "mobile"
  pending: boolean                 // 该行是否正在请求（锁定按钮 + 确认框 loading）
  onShelve: (item: Item) => void
  onOffline: (item: Item) => void
}

export function ShelfActions({ item, variant, pending, onShelve, onOffline }: ShelfActionsProps) {
  const [confirm, setConfirm] = useState<"shelve" | "offline" | null>(null)
  const state = getShelfState(item)

  const handleConfirm = () => {
    if (confirm === "shelve") onShelve(item)
    else if (confirm === "offline") onOffline(item)
    setConfirm(null)
  }

  // 确认框（桌面/移动共用；variant="default" 中性样式）
  const dialog = (
    <ConfirmDialog
      open={confirm !== null}
      onOpenChange={(o) => !o && setConfirm(null)}
      title={confirm === "shelve" ? "确认上架吗？" : "确认下架吗？"}
      description={
        confirm === "shelve"
          ? (
            <>
              1. 当前功能仅支持单规格商品<br />
              2. 可能导致上架前后不一致<br />
            </>
          )
          : (
              <>
                1. 下架后该商品将停止售卖<br />
                2. 再次上架时仅支持单规格商品, 可能导致上架前后不一致<br />
              </>
            )
      }
      confirmLabel={confirm === "shelve" ? "上架" : "下架"}
      loading={pending}
      onConfirm={handleConfirm}
    />
  )

  if (variant === "mobile") {
    // 移动端：只渲染与当前状态相关的单个按钮
    const showShelve = item.status === -2 || item.status === 1
    const showOffline = item.status === 0
    if (!showShelve && !showOffline) return null
    return (
      <>
        {showShelve && (
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
        {showOffline && (
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

  // 桌面端：两个按钮都显示（禁用不可用者）
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={!state.canShelve || pending}
        title={state.shelveDisabledReason}
        onClick={() => setConfirm("shelve")}
        className={`text-xs ${
          state.canShelve
            ? "text-green-600 dark:text-green-400 hover:underline"
            : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
        }`}
      >
        上架
      </button>
      <button
        type="button"
        disabled={!state.canOffline || pending}
        title={state.offlineDisabledReason}
        onClick={() => setConfirm("offline")}
        className={`text-xs ${
          state.canOffline
            ? "text-green-600 dark:text-green-400 hover:underline"
            : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
        }`}
      >
        下架
      </button>
      {dialog}
    </span>
  )
}
