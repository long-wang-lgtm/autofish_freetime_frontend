"use client"

import { useState, useMemo } from "react"
import type { BindableItem } from "@/lib/api/keywords"
import { CollapsiblePanel } from "./CollapsiblePanel"

export interface RuleBindingPanelProps {
  items: BindableItem[]
  selectedItemIds: string[]
  onToggleItem: (id: string) => void
}

export function RuleBindingPanel({
  items,
  selectedItemIds,
  onToggleItem,
}: RuleBindingPanelProps) {
  const [itemSearch, setItemSearch] = useState("")

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items
    const q = itemSearch.toLowerCase()
    return items.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        String(item.gid).toLowerCase().includes(q)
    )
  }, [items, itemSearch])

  return (
    <div className="flex flex-col gap-2">
      <CollapsiblePanel
        title="关联商品"
        icon="🔗"
        badge={selectedItemIds.length}
      >
        <div className="p-3 space-y-2">
          <input
            type="text"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="搜索商品..."
            className="w-full px-3 py-1 border border-gray-300 rounded-lg text-xs"
          />
          <div className="max-h-36 overflow-y-auto">
            {items.length > 0 ? (
              filteredItems.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {filteredItems.map((item) => {
                    const selected = selectedItemIds.includes(String(item.gid))
                    return (
                      <button
                        key={item.gid}
                        type="button"
                        onClick={() => onToggleItem(String(item.gid))}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          selected
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {item.title || `商品#${item.gid}`}
                        {selected && <span className="ml-1 text-blue-400">✕</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  未找到匹配的商品
                </p>
              )
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                暂无可关联的商品
              </p>
            )}
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  )
}
