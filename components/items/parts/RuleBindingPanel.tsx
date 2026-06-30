"use client"

import { useState, useMemo } from "react"
import type { RuleItem } from "@/lib/api/keywords"
import type { ItemGroup } from "@/lib/api/items"
import { CollapsiblePanel } from "./CollapsiblePanel"

export interface RuleBindingPanelProps {
  items: RuleItem[]
  groups: ItemGroup[]
  selectedItemIds: string[]
  selectedGroupIds: string[]
  onToggleItem: (id: string) => void
  onToggleGroup: (id: string) => void
}

export function RuleBindingPanel({
  items,
  groups,
  selectedItemIds,
  selectedGroupIds,
  onToggleItem,
  onToggleGroup,
}: RuleBindingPanelProps) {
  const [itemSearch, setItemSearch] = useState("")
  const [groupSearch, setGroupSearch] = useState("")

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items
    const q = itemSearch.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.gid.toLowerCase().includes(q)
    )
  }, [items, itemSearch])

  const filteredGroups = useMemo(() => {
    if (!groupSearch) return groups
    const q = groupSearch.toLowerCase()
    return groups.filter((group) =>
      group.groupName.toLowerCase().includes(q)
    )
  }, [groups, groupSearch])

  return (
    <div className="flex flex-col gap-2">
      {/* 关联商品 */}
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
                    const selected = selectedItemIds.includes(item.gid)
                    return (
                      <button
                        key={item.gid}
                        type="button"
                        onClick={() => onToggleItem(item.gid)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          selected
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {item.title || item.gid.slice(0, 10)}
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

      {/* 关联商品组 */}
      <CollapsiblePanel
        title="关联商品组"
        icon="📁"
        badge={selectedGroupIds.length}
      >
        <div className="p-3 space-y-2">
          <input
            type="text"
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            placeholder="搜索商品组..."
            className="w-full px-3 py-1 border border-gray-300 rounded-lg text-xs"
          />
          <div className="max-h-36 overflow-y-auto">
            {groups.length > 0 ? (
              filteredGroups.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {filteredGroups.map((group) => {
                    const selected = selectedGroupIds.includes(group.groupId)
                    return (
                      <button
                        key={group.groupId}
                        type="button"
                        onClick={() => onToggleGroup(group.groupId)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          selected
                            ? "bg-purple-100 text-purple-700 border border-purple-300"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {group.groupName}
                        {selected && <span className="ml-1 text-purple-400">✕</span>}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">
                  未找到匹配的商品组
                </p>
              )
            ) : (
              <p className="text-xs text-gray-400 text-center py-2">
                暂无可关联的商品组
              </p>
            )}
          </div>
        </div>
      </CollapsiblePanel>
    </div>
  )
}
