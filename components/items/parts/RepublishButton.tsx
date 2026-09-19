"use client"

import { RefreshCw } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { ITEM_STATUS_DELETED } from "../config"

interface RepublishButtonProps {
  item: ShopItem
  variant: "desktop" | "mobile"
  onRepublish: (item: ShopItem) => void
}

const BTN =
  "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"

/**
 * 重发（重新发布）按钮 —— 桌面端/移动端共用，只负责「点开重发入口」。
 *
 * 二次确认不在这里：重发走的还是商品编辑弹窗（同一套表单、同一份字段），
 * 确认页就挂在弹窗的提交按钮上，免得同一个动作在两处各问一遍。
 *
 * 独立取琥珀色（警告语义）：重发虽然是一次发布操作，但代价是原商品被删除、链接失效，
 * 既不能借用上下架的绿色（那会读成"安全的常规操作"），也不宜用删除的红色
 * （同一列里两处红会让"哪个只是重发、哪个是真删除"失去区分度）。琥珀色正好落在两者之间。
 */
export function RepublishButton({ item, variant, onRepublish }: RepublishButtonProps) {
  // 已删除的商品不渲染。
  if (item.status === ITEM_STATUS_DELETED) return null

  if (variant === "mobile") {
    return (
      <button
        type="button"
        title="重新发布商品"
        onClick={() => onRepublish(item)}
        className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${BTN}`}
      >
        重发
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label="重新发布商品"
      title="重新发布商品"
      onClick={() => onRepublish(item)}
      className={`w-7 h-7 flex items-center justify-center rounded-lg ${BTN}`}
    >
      <RefreshCw className="w-4 h-4" />
    </button>
  )
}
