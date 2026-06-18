"use client"

import { useState } from "react"
import { Item } from "@/lib/api/items"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
import { TextEditor } from "@/components/ui/text-editor"
import { useIsMobile } from "@/hooks/useIsMobile"
import { ConfigField, FIELD_LABELS } from "../config"
import { PlaceholderPicker } from "../parts/PlaceholderPicker"

interface ConfigDrawerProps {
  open: boolean
  item: Item
  field: ConfigField
  onClose: () => void
  onSave: (gid: string, field: ConfigField, value: string) => void
}

export function ConfigDrawer({ open, item, field, onClose, onSave }: ConfigDrawerProps) {
  const isMobile = useIsMobile()
  const [localValue, setLocalValue] = useState(item[field] || "")

  const insertPlaceholder = (value: string) => {
    setLocalValue((prev) => prev + value)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const text = e.dataTransfer.getData("text/plain")
    if (text) setLocalValue((prev) => prev + text)
  }

  const handleSave = () => {
    onSave(item.gid, field, localValue)
    onClose()
  }

  const title = FIELD_LABELS[field] || "配置"

  const content = (
    <div className="p-4 space-y-4">
      {/* 商品信息 — 内联渲染 */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-gray-500">商品:</span>
          <span className="font-medium text-gray-900 truncate">{item.title || "无标题"}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>ID: {item.gid}</span>
          <span>账号: {item.account.name}</span>
          <span>价格: ¥{item.price}</span>
        </div>
      </div>

      {/* 占位符选择器 — PC 端支持拖拽，移动端仅点击 */}
      <PlaceholderPicker onInsert={insertPlaceholder} draggable={!isMobile} />

      {/* 文本输入 */}
      <TextEditor
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onDrop={isMobile ? undefined : handleDrop}
        onDragOver={isMobile ? undefined : (e) => e.preventDefault()}
        rows={{ pc: 6, landscape: 5, portrait: 5 }}
        placeholder="输入内容..."
      />
    </div>
  )

  const footer = (
    <div className="flex gap-2">
      <button
        onClick={onClose}
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
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        subtitle={`${item.title || "无标题"} · ¥${item.price}`}
        footer={footer}
      >
        {content}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} width="480px">
      {content}
      <div className="border-t px-4 py-3">{footer}</div>
    </Sheet>
  )
}
