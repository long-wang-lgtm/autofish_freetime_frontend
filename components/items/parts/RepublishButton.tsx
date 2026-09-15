"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { ConfirmDialog } from '@/components/ui/overlay/ConfirmDialog'
import { ITEM_STATUS_DELETED } from "../config"

interface RepublishButtonProps {
  item: ShopItem
  variant: "desktop" | "mobile"
  pending: boolean
  onRepublish: (item: ShopItem) => void
}

/**
 * 重发（重新发布）按钮 — 内置二次确认，桌面端/移动端共用。
 *
 * 独立取琥珀色（警告语义）：重发虽然是一次发布操作，但代价是原商品被删除、链接失效，
 * 既不能借用上下架的绿色（那会读成"安全的常规操作"），也不宜用删除的红色
 * （同一列里两处红会让"哪个只是重发、哪个是真删除"失去区分度）。琥珀色正好落在两者之间。
 */
export function RepublishButton({ item, variant, pending, onRepublish }: RepublishButtonProps) {
  const [confirming, setConfirming] = useState(false)

  // 已删除的商品没有可重新发布的源商品：取详情必然失败，而后端把发布失败吞成日志、
  // 仍然返回成功，用户会拿到一个假的"重新发布成功"。与其误导，不如不渲染。
  if (item.status === ITEM_STATUS_DELETED) return null

  const handleConfirm = () => {
    onRepublish(item)
    setConfirming(false)
  }

  const dialog = (
    <ConfirmDialog
      open={confirming}
      onOpenChange={(o) => !o && setConfirming(false)}
      variant="danger"
      title="确认重新发布吗？"
      description={
        <>
          1. 将当前商品删除后重发，当前商品不可恢复 !<br />
          2. 新商品 ID 与当前商品不同，当前商品的链接将失效<br />
          3. 新商品延迟更新，大约半分钟<br />
        </>
      }
      confirmLabel="重新发布"
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
          title="重新发布商品"
          onClick={() => setConfirming(true)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
            pending
              ? "text-gray-300 bg-gray-100 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
              : "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950 hover:bg-amber-100"
          }`}
        >
          重发
        </button>
        {dialog}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="重新发布商品"
        disabled={pending}
        title="重新发布商品"
        onClick={() => setConfirming(true)}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
          pending
            ? "text-gray-300 bg-gray-50 dark:text-gray-600 dark:bg-gray-800 cursor-not-allowed"
            : "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950 hover:bg-amber-100"
        }`}
      >
        <RefreshCw className="w-4 h-4" />
      </button>
      {dialog}
    </>
  )
}
