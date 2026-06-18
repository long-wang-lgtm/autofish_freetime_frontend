"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"
import { BottomSheet } from "@/components/ui/BottomSheet"

type ConfigField = "deliveryContent" | "receiptAfter" | "positiveReviewAfter" | "ai_reply_item_prompt"

const PLACEHOLDERS = [
  { label: "订单号", value: "{订单号}" },
  { label: "商品标题", value: "{商品标题}" },
  { label: "价格", value: "{价格}" },
  { label: "数量", value: "{数量}" },
  { label: "使用说明", value: "{使用说明}" },
  { label: "商家编码", value: "{商家编码}" },
  { label: "卡种/卡券方案名称", value: "{卡种/卡券方案名称}" },
  { label: "卡券信息", value: "{卡券信息}" },
  { label: "分段符", value: "{分段符}" },
  { label: "Sku属性名", value: "{Sku属性名}" },
  { label: "充值账号", value: "{充值账号}" },
  { label: "拍下时间", value: "{拍下时间}" },
  { label: "付款时间", value: "{付款时间}" },
  { label: "当前时间", value: "{当前时间}" },
  { label: "买家留言", value: "{买家留言}" },
]

const FIELD_LABELS: Partial<Record<ConfigField, string>> = {
  deliveryContent: "付款后发货内容",
  receiptAfter: "收货后赠送内容",
  positiveReviewAfter: "评价后赠送内容",
  ai_reply_item_prompt: "AI系统提示词",
}

interface MobileConfigSheetProps {
  open: boolean
  item: Item
  field: ConfigField
  onClose: () => void
  onSave: (gid: string, field: ConfigField, value: string) => void
}

export function MobileConfigSheet({
  open,
  item,
  field,
  onClose,
  onSave,
}: MobileConfigSheetProps) {
  const [localValue, setLocalValue] = useState(item[field] || "")

  // 当 item/field 变化时重置本地值
  const handleClose = () => {
    onClose()
  }

  const handleSave = () => {
    onSave(item.gid, field, localValue)
    onClose()
  }

  const insertPlaceholder = (placeholder: string) => {
    setLocalValue((prev) => prev + placeholder)
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={FIELD_LABELS[field] || "配置"}
      subtitle={`${item.title || "无标题"} · ¥${item.price}`}
      footer={
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {/* 商品信息 */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <div>
            <span>商品ID: </span>
            <span className="font-mono text-gray-700">{item.gid}</span>
          </div>
          <div>
            <span>账号: </span>
            <span className="text-gray-700">{item.account.name}</span>
          </div>
        </div>

        {/* 占位符区 */}
        <div>
          <div className="text-xs text-gray-500 mb-2">点击插入占位符：</div>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => insertPlaceholder(p.value)}
                className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 active:scale-95 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 文本输入区 */}
        <div>
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="输入内容，可点击上方占位符插入..."
          />
        </div>
      </div>
    </BottomSheet>
  )
}
