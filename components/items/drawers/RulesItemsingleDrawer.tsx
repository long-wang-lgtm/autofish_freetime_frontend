"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ReplyRule,
  createReplyRule,
  updateReplyRule,
  unbindItemRules,
  bindItemRules,
  fetchItemRules,
  fetchPredefinedKeywords,
  formatRuleKeyword,
} from "@/lib/api/keywords"
import type { Item } from "@/lib/api/items"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { useIsMobile } from "@/hooks/useIsMobile"
import { KeywordRuleForm, type RuleFormData } from "../parts/KeywordRuleForm"

interface KeywordDrawerProps {
  item: Item
  open: boolean
  onClose: () => void
}

export function KeywordDrawer({ item, open, onClose }: KeywordDrawerProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRule, setEditingRule] = useState<ReplyRule | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // 预定义关键词标签
  const { data: prefLabels = {} } = useQuery({
    queryKey: ["predefined-keywords"],
    queryFn: fetchPredefinedKeywords,
    staleTime: 5 * 60 * 1000,
  })

  // 获取当前商品关联的规则
  const { data: linkedRules = [], isLoading: linkedLoading } = useQuery({
    queryKey: ["item-rules", item.gid],
    queryFn: () => fetchItemRules(item.gid),
  })

  // 绑定警告：编辑规则时，若已关联多个商品则提示
  const bindingWarning =
    editingRule && editingRule.itemsCount > 0
      ? `此规则已关联 ${editingRule.itemsCount} 个商品，修改将影响所有关联商品`
      : undefined

  // 开始创建新规则
  const handleCreateNew = () => {
    setEditingRule(null)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  // 开始编辑规则
  const handleEditRule = (rule: ReplyRule) => {
    setEditingRule(rule)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  // 保存规则
  const handleSave = async (data: RuleFormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        await updateReplyRule(editingRule.id, {
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
        const savedRule = await createReplyRule({
          keyType: data.keyType,
          keyword: data.keyword,
          matchType: data.matchType,
          replyContent: data.replyContent,
          priority: data.priority,
          enabled: data.enabled,
          fullShop: data.fullShop,
        })
        await bindItemRules(item.gid, [savedRule.id])
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["item-rules", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
      setIsDirty(false)
    } catch (e) {
      addToast({
        title: editingRule ? "更新失败" : "创建失败",
        description: String(e),
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  // 解除绑定（替代原来的删除规则）
  const handleUnlinkRule = async (rule: ReplyRule) => {
    const keyword = formatRuleKeyword(rule, prefLabels)
    if (!confirm(`确定要解除规则"${keyword}"与此商品的绑定吗？`)) return
    setLoading(true)
    try {
      await unbindItemRules(item.gid, [rule.id])
      addToast({ title: "已解除绑定", description: "规则与此商品的关联已取消" })
      queryClient.invalidateQueries({ queryKey: ["item-rules", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
    } catch (e) {
      addToast({ title: "解除绑定失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // ==== 规则列表视图 ====
  const ruleListView = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          已关联 {linkedRules.length} 个规则
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          + 创建新规则
        </button>
      </div>

      {linkedLoading ? (
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner size="md" />
        </div>
      ) : linkedRules.length > 0 ? (
        <div className="space-y-2">
          {linkedRules.map((rule) => (
            <div
              key={rule.id}
              className="border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded-full ${
                        rule.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.enabled ? "启用" : "禁用"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatRuleKeyword(rule, prefLabels)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {rule.keyType === "predefined" ? "预定义" : rule.matchType}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {rule.replyContent || "(无回复内容)"}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleUnlinkRule(rule)}
                    disabled={loading}
                    className="px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    解除绑定
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          <p>暂无关联的关键词规则</p>
          <p className="text-xs mt-1">点击上方按钮创建新规则</p>
        </div>
      )}
    </>
  )

  const title = "关键词回复"

  // ==== 编辑表单视图 ====
  const editView = (
    <KeywordRuleForm
      rule={editingRule ?? undefined}
      linkedItem={item}
      bindingWarning={bindingWarning}
      onSubmit={handleSave}
      onCancel={() => {
        setShowCreateForm(false)
        setEditingRule(null)
        setIsDirty(false)
      }}
      onDestructiveAction={
        editingRule
          ? { label: "解除绑定", onAction: () => handleUnlinkRule(editingRule) }
          : undefined
      }
      onDirtyChange={setIsDirty}
      showItemCardPanel
    />
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        heightRatio={0.95}
        closeOnBackdrop={!isDirty}
      >
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!showCreateForm ? (
            ruleListView
          ) : (
            <KeywordRuleForm
              rule={editingRule ?? undefined}
              linkedItem={item}
              bindingWarning={bindingWarning}
              onSubmit={handleSave}
              onCancel={() => {
                setShowCreateForm(false)
                setEditingRule(null)
                setIsDirty(false)
              }}
              onDestructiveAction={
                editingRule
                  ? { label: "解除绑定", onAction: () => handleUnlinkRule(editingRule) }
                  : undefined
              }
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {!showCreateForm ? ruleListView : editView}
      </div>
    </Sheet>
  )
}
