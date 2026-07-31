"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ReplyRule,
  type ReplyRuleCreate,
  createReplyRule,
  updateReplyRule,
  bindRuleItems,
  fetchBindableItems,
} from "@/lib/api/keywords"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm } from "../parts/KeywordRuleForm"
import { RuleBindingPanel } from "../parts/RuleBindingPanel"

interface RuleDrawerProps {
  rule?: ReplyRule
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RuleDrawer({ rule, open, onClose, onSuccess }: RuleDrawerProps) {
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isDirty, setIsDirty] = useState(false)

  // 关联商品选择状态
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // 初始化关联数据
  useEffect(() => {
    if (rule) {
      setSelectedItemIds([])
    } else {
      setSelectedItemIds([])
    }
  }, [rule])

  // 加载可绑定商品列表
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["bindable-items"],
    queryFn: fetchBindableItems,
    enabled: open,
  })

  const dataReady = !itemsLoading
  const isEdit = !!rule

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  // 保存（含关联同步 — 批量操作）
  const handleSave = async (data: ReplyRuleCreate) => {
    try {
      let savedRule: ReplyRule | null = null

      if (isEdit) {
        savedRule = await updateReplyRule(rule!.id, {
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
        })
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        savedRule = await createReplyRule({
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
          gids: selectedItemIds.length > 0 ? selectedItemIds : undefined,
        })
        addToast({ title: "创建成功", description: "规则已创建" })
      }

      // 编辑模式：全量替换关联
      if (savedRule && isEdit) {
        if (selectedItemIds.length > 0) {
          await bindRuleItems(savedRule.id, selectedItemIds)
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

  // 右列面板（ItemCardPanel 由 showItemCardPanel 自动渲染）
  const sidePanelContent = dataReady ? (
    <RuleBindingPanel
      items={items}
      selectedItemIds={selectedItemIds}
      onToggleItem={toggleItem}
    />
  ) : (
    <div className="flex items-center justify-center py-6">
      <LoadingSpinner />
    </div>
  )

  // 桌面端：两列布局，右列三面板
  const desktopContent = (
    <KeywordRuleForm
      rule={rule}
      onSubmit={handleSave}
      onCancel={handleCancel}
      onDirtyChange={setIsDirty}
      showItemCardPanel
      sidePanel={sidePanelContent}
    />
  )

  // 移动端：单列布局，面板在表单下方以 accordion 展示
  const mobileContent = (
    <>
      <KeywordRuleForm
        rule={rule}
        onSubmit={handleSave}
        onCancel={handleCancel}
        onDirtyChange={setIsDirty}
      />
      {dataReady && (
        <div className="mt-3">
          <RuleBindingPanel
            items={items}
            selectedItemIds={selectedItemIds}
            onToggleItem={toggleItem}
          />
        </div>
      )}
    </>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">{mobileContent}</div>
      </BottomSheet>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      width="min(66vw, 900px)"
      closeOnBackdrop={!isDirty}
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{desktopContent}</div>
    </Sheet>
  )
}
