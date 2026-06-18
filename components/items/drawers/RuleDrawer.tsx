"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { type KeywordRule, createKeywordRule, updateKeywordRule, linkItemToRule, unlinkItemFromRule, linkGroupToRule, unlinkGroupFromRule, listRuleItems } from "@/lib/api/keywords"
import { listItemGroups } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"
import RuleBindingPanel from "../parts/RuleBindingPanel"

interface RuleDrawerProps {
  rule?: KeywordRule
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function RuleDrawer({ rule, open, onClose, onSuccess }: RuleDrawerProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isDirty, setIsDirty] = useState(false)

  // 关联选择状态
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  // 搜索词追踪，用于 selectAll 逻辑
  const [itemSearch, setItemSearch] = useState("")
  const [groupSearch, setGroupSearch] = useState("")

  // 初始化关联数据
  useEffect(() => {
    if (rule) {
      setSelectedItemIds(rule.linked_item_list.map((i) => i.item_id))
      setSelectedGroupIds(rule.linked_group_list.map((g) => g.group_id))
    } else {
      setSelectedItemIds([])
      setSelectedGroupIds([])
    }
  }, [rule])

  // 数据加载 — 仅在 drawer 打开时请求
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["rule-drawer-items"],
    queryFn: listRuleItems,
    enabled: open,
  })

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["rule-drawer-groups"],
    queryFn: listItemGroups,
    enabled: open,
  })

  const groups = groupsData?.groups ?? []
  const dataReady = !itemsLoading && !groupsLoading

  // 过滤后的列表（用于 selectAll 计算）
  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items
    const q = itemSearch.toLowerCase()
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.gid.toLowerCase().includes(q)
    )
  }, [items, itemSearch])

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups
    const q = groupSearch.toLowerCase()
    return groups.filter((group) =>
      group.groupName.toLowerCase().includes(q)
    )
  }, [groups, groupSearch])

  const isEdit = !!rule

  // 切换单个关联
  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  // 全选 / 取消全选
  const selectAllItems = () => {
    if (selectedItemIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedItemIds([])
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.gid))
    }
  }

  const selectAllGroups = () => {
    if (selectedGroupIds.length === filteredGroups.length && filteredGroups.length > 0) {
      setSelectedGroupIds([])
    } else {
      setSelectedGroupIds(filteredGroups.map((g) => g.groupId))
    }
  }

  // 保存（含关联同步）
  const handleSave = async (data: RuleFormData) => {
    try {
      let createdRule: KeywordRule | null = null

      if (isEdit) {
        createdRule = await updateKeywordRule(rule!.rule_id, {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        })
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        createdRule = await createKeywordRule({
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        })
        addToast({ title: "创建成功", description: "规则已创建" })
      }

      // 同步商品关联
      if (createdRule) {
        const currentItems = rule?.linked_item_list.map((i) => i.item_id) || []
        for (const itemId of selectedItemIds) {
          if (!currentItems.includes(itemId)) {
            await linkItemToRule(createdRule.rule_id, itemId)
          }
        }
        for (const itemId of currentItems) {
          if (!selectedItemIds.includes(itemId)) {
            await unlinkItemFromRule(createdRule.rule_id, itemId)
          }
        }

        // 同步商品组关联
        const currentGroups = rule?.linked_group_list.map((g) => g.group_id) || []
        for (const groupId of selectedGroupIds) {
          if (!currentGroups.includes(groupId)) {
            await linkGroupToRule(createdRule.rule_id, groupId)
          }
        }
        for (const groupId of currentGroups) {
          if (!selectedGroupIds.includes(groupId)) {
            await unlinkGroupFromRule(createdRule.rule_id, groupId)
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      onSuccess()
    } catch (e) {
      addToast({
        title: isEdit ? "更新失败" : "创建失败",
        description: String(e),
        variant: "error",
      })
    }
  }

  const handleCancel = () => {
    setIsDirty(false)
    onClose()
  }

  const title = isEdit ? "编辑规则" : "创建规则"

  const innerContent = (
    <KeywordRuleForm
      rule={rule}
      onSubmit={handleSave}
      onCancel={handleCancel}
      onDirtyChange={setIsDirty}
    >
      {dataReady ? (
        <RuleBindingPanel
          items={items}
          groups={groups}
          selectedItemIds={selectedItemIds}
          selectedGroupIds={selectedGroupIds}
          onToggleItem={toggleItem}
          onToggleGroup={toggleGroup}
          onSelectAllItems={selectAllItems}
          onSelectAllGroups={selectAllGroups}
          onItemSearchChange={setItemSearch}
          onGroupSearchChange={setGroupSearch}
        />
      ) : (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
    </KeywordRuleForm>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">{innerContent}</div>
      </BottomSheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      width="min(900px, 66vw)"
      closeOnBackdrop={!isDirty}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{innerContent}</div>
    </Sheet>
  )
}
