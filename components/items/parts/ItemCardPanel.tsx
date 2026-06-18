"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { listRuleItems } from "@/lib/api/keywords"
import { CollapsiblePanel } from "./CollapsiblePanel"

interface ItemCardPanelProps {
  onInsert: (itemId: string) => void
}

export function ItemCardPanel({ onInsert }: ItemCardPanelProps) {
  const [search, setSearch] = useState("")
  const [dataRequested, setDataRequested] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["item-card-panel-items"],
    queryFn: listRuleItems,
    enabled: dataRequested,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (i) =>
        i.gid.toLowerCase().includes(q) ||
        (i.title && i.title.toLowerCase().includes(q))
    )
  }, [items, search])

  const handleExpand = () => {
    if (!dataRequested) setDataRequested(true)
  }

  const handleInsert = (itemId: string) => {
    onInsert(itemId)
    setSearch("")
  }

  return (
    <CollapsiblePanel
      title="商品卡片"
      icon="📦"
      onExpand={handleExpand}
    >
      <div className="p-2 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索商品..."
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs"
        />
        <div className="max-h-44 overflow-y-auto space-y-1">
          {isLoading ? (
            <p className="text-center text-gray-400 py-3 text-xs">加载中...</p>
          ) : filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.gid}
                type="button"
                onClick={() => handleInsert(item.gid)}
                className="w-full text-left p-2 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors bg-white"
              >
                <div className="font-medium text-gray-900 truncate text-xs">
                  {item.title || "无标题"}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                  <span>ID: {item.gid.slice(0, 10)}...</span>
                  <span>¥{item.price}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-400 py-3 text-xs">
              {search ? "未找到匹配的商品" : "暂无可选的商品"}
            </p>
          )}
        </div>
      </div>
    </CollapsiblePanel>
  )
}
