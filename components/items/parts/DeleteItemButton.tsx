"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { ITEM_STATUS_DELETED } from "../config"

interface DeleteItemButtonProps {
  item: ShopItem
  variant: "desktop" | "mobile"
  pending: boolean
  onDelete: (item: ShopItem) => void
}

/** 删除商品按钮 — 内置二次确认，桌面端/移动端共用 */
export function DeleteItemButton({ item, variant, pending, onDelete }: DeleteItemButtonProps) {
  const [confirming, setConfirming] = useState(false)

  // 已删除的商品没有可再删除的对象，直接不渲染（与 ShelfActions 隐藏不可操作按钮一致）
  if (item.status === ITEM_STATUS_DELETED) return null

  const handleConfirm = () => {
    onDelete(item)
    setConfirming(false)
  }

  const dialog = (
    <ConfirmDialog
      open={confirming}
      onOpenChange={(o) => !o && setConfirming(false)}
      variant="danger"
      title="确认删除吗？"
      description={
        <>
          1. 将同步删除闲鱼上的该商品，不可恢复<br />
          2. 删除后可在「已删除」筛选中查看记录<br />
        </>
      }
      confirmLabel="删除"
      loading={pending}
      onConfirm={handleConfirm}
    />
  )

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          disabled={pending}
          title="删除商品"
          onClick={() => setConfirming(true)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
            pending
              ? "text-gray-300 bg-gray-100 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
              : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950 hover:bg-red-100"
          }`}
        >
          删除
        </button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="删除商品"
        disabled={pending}
        title="删除商品"
        onClick={() => setConfirming(true)}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
          pending
            ? "text-gray-300 bg-gray-50 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
            : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950 hover:bg-red-100"
        }`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {dialog}
    </>
  )
}
