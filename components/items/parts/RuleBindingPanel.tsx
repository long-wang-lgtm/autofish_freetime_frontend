"use client"

import { useState, useMemo } from "react"
import type { RuleItem } from "@/lib/api/keywords"
import type { ItemGroup } from "@/lib/api/items"

export interface RuleBindingPanelProps {
  items: RuleItem[]
  groups: ItemGroup[]
  selectedItemIds: string[]
  selectedGroupIds: string[]
  onToggleItem: (id: string) => void
  onToggleGroup: (id: string) => void
  onSelectAllItems: () => void
  onSelectAllGroups: () => void
  onItemSearchChange: (q: string) => void
  onGroupSearchChange: (q: string) => void
}

export default function RuleBindingPanel({
  items,
  groups,
  selectedItemIds,
  selectedGroupIds,
  onToggleItem,
  onToggleGroup,
  onSelectAllItems,
  onSelectAllGroups,
  onItemSearchChange,
  onGroupSearchChange,
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

  const allFilteredItemsSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedItemIds.includes(item.gid))

  const allFilteredGroupsSelected =
    filteredGroups.length > 0 &&
    filteredGroups.every((group) => selectedGroupIds.includes(group.groupId))

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 关联商品 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">
            关联商品 ({selectedItemIds.length}个)
          </h4>
          <button
            type="button"
            onClick={onSelectAllItems}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {allFilteredItemsSelected ? "取消全选" : "全选"}
          </button>
        </div>
        <input
          type="text"
          value={itemSearch}
          onChange={(e) => {
            setItemSearch(e.target.value)
            onItemSearchChange(e.target.value)
          }}
          placeholder="搜索商品..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
        />
        <div className="border border-gray-300 rounded-md p-2 max-h-44 overflow-y-auto">
          {items.length > 0 ? (
            filteredItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.gid}
                    className={`px-2 py-1 text-xs rounded cursor-pointer ${
                      selectedItemIds.includes(item.gid)
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedItemIds.includes(item.gid)}
                        onChange={() => onToggleItem(item.gid)}
                        className="sr-only"
                      />
                      {item.title || item.gid.slice(0, 10)}
                    </label>
                  </div>
                ))}
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

      {/* 关联商品组 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">
            关联商品组 ({selectedGroupIds.length}个)
          </h4>
          <button
            type="button"
            onClick={onSelectAllGroups}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {allFilteredGroupsSelected ? "取消全选" : "全选"}
          </button>
        </div>
        <input
          type="text"
          value={groupSearch}
          onChange={(e) => {
            setGroupSearch(e.target.value)
            onGroupSearchChange(e.target.value)
          }}
          placeholder="搜索商品组..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 text-sm"
        />
        <div className="border border-gray-300 rounded-md p-2 max-h-44 overflow-y-auto">
          {groups.length > 0 ? (
            filteredGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {filteredGroups.map((group) => (
                  <label
                    key={group.groupId}
                    className={`px-2 py-1 text-xs rounded cursor-pointer ${
                      selectedGroupIds.includes(group.groupId)
                        ? "bg-purple-100 text-purple-700 border border-purple-300"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(group.groupId)}
                      onChange={() => onToggleGroup(group.groupId)}
                      className="sr-only"
                    />
                    {group.groupName}
                  </label>
                ))}
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
    </div>
  )
}
