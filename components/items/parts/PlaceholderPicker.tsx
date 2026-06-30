"use client"

import { PLACEHOLDERS } from "../config"

interface PlaceholderPickerProps {
  onInsert: (placeholder: string) => void
  /** PC 端启用拖拽插入，移动端仅点击 */
  draggable?: boolean
}

export function PlaceholderPicker({ onInsert, draggable = false }: PlaceholderPickerProps) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">
        {draggable ? "点击或拖拽占位符到文本框：" : "点击插入占位符："}
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {PLACEHOLDERS.map((p) => (
          <button
            key={p.value}
            type="button"
            draggable={draggable}
            onDragStart={
              draggable
                ? (e) => e.dataTransfer.setData("text/plain", p.value)
                : undefined
            }
            onClick={() => onInsert(p.value)}
            className={`px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-200 whitespace-nowrap transition-all ${
              draggable ? "cursor-grab" : "active:scale-95"
            }`}
            title={p.value}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
