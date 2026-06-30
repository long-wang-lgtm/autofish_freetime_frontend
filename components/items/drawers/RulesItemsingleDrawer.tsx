"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type KeywordRule,
  createKeywordRule,
  updateKeywordRule,
  unlinkItemFromRule,
  linkItemToRule,
  PREDEFINED_KEYWORDS,
  getRulesForItem,
} from "@/lib/api/keywords"
import type { Item } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet, BottomSheet } from "@/components/ui/Sheet"
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
  const [editingRule, setEditingRule] = useState<KeywordRule | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // 获取当前商品关联的规则
  const { data: linkedRulesData, isLoading: linkedLoading } = useQuery({
    queryKey: ["keywords", "item", item.gid],
    queryFn: () => getRulesForItem(item.gid),
  })

  // 绑定警告：编辑规则时，若已关联多个商品则提示
  const bindingWarning =
    editingRule && editingRule.linked_items > 0
      ? `此规则已关联 ${editingRule.linked_items} 个商品，修改将影响所有关联商品`
      : undefined

  // 开始创建新规则
  const handleCreateNew = () => {
    setEditingRule(null)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  // 开始编辑规则
  const handleEditRule = (rule: KeywordRule) => {
    setEditingRule(rule)
    setIsDirty(false)
    setShowCreateForm(true)
  }

  // 保存规则
  const handleSave = async (data: RuleFormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        await updateKeywordRule(editingRule.rule_id, data)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const savedRule = await createKeywordRule(data)
        await linkItemToRule(savedRule.rule_id, item.gid)
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
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
  const handleUnlinkRule = async (rule: KeywordRule) => {
    if (!confirm(`确定要解除规则"${rule.keyword}"与此商品的绑定吗？`)) return
    setLoading(true)
    try {
      await unlinkItemFromRule(rule.rule_id, item.gid)
      addToast({ title: "已解除绑定", description: "规则与此商品的关联已取消" })
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
      queryClient.invalidateQueries({ queryKey: ["keywords"] })
      setShowCreateForm(false)
      setEditingRule(null)
    } catch (e) {
      addToast({ title: "解除绑定失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const getDisplayKeyword = (rule: KeywordRule) => {
    if (rule.reply_type === "predefined") {
      return PREDEFINED_KEYWORDS.find((k) => k.value === rule.keyword)?.label || rule.keyword
    }
    return rule.keyword
  }

  // ==== 规则列表视图 ====
  const ruleListView = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          已关联 {linkedRulesData?.total || 0} 个规则
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + 创建新规则
        </button>
      </div>

      {linkedLoading ? (
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner size="md" />
        </div>
      ) : linkedRulesData?.rules && linkedRulesData.rules.length > 0 ? (
        <div className="space-y-2">
          {linkedRulesData.rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        rule.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {rule.enabled ? "启用" : "禁用"}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {getDisplayKeyword(rule)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {rule.reply_type === "predefined" ? "预定义" : rule.match_type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {rule.reply_content || "(无回复内容)"}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditRule(rule)}
                    className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleUnlinkRule(rule)}
                    disabled={loading}
                    className="px-3 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
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
  const subtitle = `为商品「${item.title || item.gid.slice(0, 10)}...」配置关键词自动回复`

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
        subtitle={subtitle}
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
