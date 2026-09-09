"use client"

import { Bot, Truck, Upload } from "lucide-react"
import type { ShopItem } from "@/lib/api/items"
import { IconToggle } from "./IconToggle"

/** 商品自动化开关字段集合 */
export type ItemToggleField = "auto_reply" | "auto_ship" | "auto_ai_reply" | "auto_restock"

interface AutomationTogglesProps {
  item: ShopItem
  onToggle: (item: ShopItem, field: ItemToggleField) => void
}

/**
 * AI回复 / 自动发货 / 自动上架 三个开关的紧凑图标按钮组。
 * 桌面表格「自动化」列与移动端商品卡顶部共用，保证同一交互模式一致。
 */
export function AutomationToggles({ item, onToggle }: AutomationTogglesProps) {
  const restockDisabled = item.account.isPro

  return (
    <div className="flex items-center gap-0.5">
      <IconToggle
        active={item.auto_ai_reply}
        activeClass="text-purple-500 bg-purple-50"
        title={item.auto_ai_reply ? "AI回复：开" : "AI回复：关"}
        onClick={() => onToggle(item, "auto_ai_reply")}
      >
        <Bot className="w-4 h-4" />
      </IconToggle>

      <IconToggle
        active={item.auto_ship}
        activeClass="text-green-500 bg-green-50"
        title={item.auto_ship ? "自动发货：开" : "自动发货：关"}
        onClick={() => onToggle(item, "auto_ship")}
      >
        <Truck className="w-4 h-4" />
      </IconToggle>

      <IconToggle
        active={item.auto_restock}
        activeClass="text-teal-500 bg-teal-50"
        disabled={restockDisabled}
        title={
          restockDisabled
            ? "Pro账号无法开启自动上架"
            : item.auto_restock
            ? "自动上架：开"
            : "自动上架：关"
        }
        onClick={() => {
          if (restockDisabled) return
          onToggle(item, "auto_restock")
        }}
      >
        <Upload className="w-4 h-4" />
      </IconToggle>
    </div>
  )
}
