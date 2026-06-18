"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  KeywordRule,
  KeywordRuleCreate,
  KeywordRuleUpdate,
  createKeywordRule,
  updateKeywordRule,
  deleteKeywordRule,
  linkItemToRule,
  PREDEFINED_KEYWORDS,
  getRulesForItem,
} from "@/lib/api/keywords"
import { listItems, Item } from "@/lib/api/items"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Sheet } from "@/components/ui/Sheet"
import { BottomSheet } from "@/components/ui/BottomSheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { PlaceholderPicker } from "../parts/PlaceholderPicker"

const makeItemCardPlaceholder = (itemId: string) => `[ITEM:${itemId}]`

const ruleSchema = z.object({
  reply_type: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  reply_content: z.string().min(1, "回复内容不能为空"),
  match_type: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
})

type FormData = z.infer<typeof ruleSchema>

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
  const [itemPickerSearch, setItemPickerSearch] = useState("")
  const [showItemPicker, setShowItemPicker] = useState(false)

  // 获取当前商品关联的规则
  const { data: linkedRulesData, isLoading: linkedLoading } = useQuery({
    queryKey: ["keywords", "item", item.gid],
    queryFn: () => getRulesForItem(item.gid),
  })

  // 获取全店商品列表（用于插入商品卡片）
  const { data: allItemsData } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems(),
  })

  // 商品选择器过滤
  const filteredPickerItems = useMemo(() => {
    if (!allItemsData) return []
    if (!itemPickerSearch.trim()) return allItemsData
    const search = itemPickerSearch.toLowerCase()
    return allItemsData.filter(
      (i) =>
        i.gid.toLowerCase().includes(search) ||
        (i.title && i.title.toLowerCase().includes(search)) ||
        (i.description && i.description.toLowerCase().includes(search))
    )
  }, [allItemsData, itemPickerSearch])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      reply_type: "custom",
      keyword: "",
      reply_content: "",
      match_type: "exact",
      priority: 0,
      enabled: true,
    },
  })

  const replyType = watch("reply_type")
  const replyContent = watch("reply_content")

  // 插入占位符
  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const currentValue = replyContent || ""
      const newValue = currentValue + placeholder
      setValue("reply_content", newValue, { shouldValidate: true })
    },
    [replyContent, setValue]
  )

  // 插入商品卡片
  const insertItemCard = useCallback(
    (itemId: string) => {
      const placeholder = makeItemCardPlaceholder(itemId)
      const currentValue = replyContent || ""
      const newValue = currentValue + placeholder
      setValue("reply_content", newValue, { shouldValidate: true })
      setShowItemPicker(false)
      setItemPickerSearch("")
    },
    [replyContent, setValue]
  )

  // 处理拖拽到回复内容
  const handleReplyContentDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const text = e.dataTransfer.getData("text/plain")
      if (text && text.startsWith("[ITEM:")) {
        const currentValue = replyContent || ""
        setValue("reply_content", currentValue + text, { shouldValidate: true })
      }
    },
    [replyContent, setValue]
  )

  // 开始创建新规则
  const handleCreateNew = () => {
    setEditingRule(null)
    reset({
      reply_type: "custom",
      keyword: "",
      reply_content: "",
      match_type: "exact",
      priority: 0,
      enabled: true,
    })
    setShowCreateForm(true)
  }

  // 开始编辑规则
  const handleEditRule = (rule: KeywordRule) => {
    setEditingRule(rule)
    reset({
      reply_type: rule.reply_type,
      keyword: rule.keyword,
      reply_content: rule.reply_content,
      match_type: rule.match_type,
      priority: rule.priority,
      enabled: rule.enabled,
    })
    setShowCreateForm(true)
  }

  // 删除规则
  const handleDeleteRule = async (rule: KeywordRule) => {
    if (!confirm(`确定要删除规则"${rule.keyword}"吗？`)) return
    setLoading(true)
    try {
      await deleteKeywordRule(rule.rule_id)
      addToast({ title: "已删除", description: "规则已删除" })
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
    } catch (e) {
      addToast({ title: "删除失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 保存规则
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      if (editingRule) {
        const updateData: KeywordRuleUpdate = {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        }
        await updateKeywordRule(editingRule.rule_id, updateData)
        addToast({ title: "更新成功", description: "规则已更新" })
      } else {
        const createData: KeywordRuleCreate = {
          reply_type: data.reply_type,
          keyword: data.keyword,
          reply_content: data.reply_content,
          match_type: data.match_type,
          priority: data.priority,
          enabled: data.enabled,
        }
        const savedRule = await createKeywordRule(createData)
        await linkItemToRule(savedRule.rule_id, item.gid)
        addToast({ title: "创建成功", description: "规则已创建并关联到此商品" })
      }
      queryClient.invalidateQueries({ queryKey: ["keywords", "item", item.gid] })
      setShowCreateForm(false)
      setEditingRule(null)
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

  const getDisplayKeyword = (rule: KeywordRule) => {
    if (rule.reply_type === "predefined") {
      return PREDEFINED_KEYWORDS.find((k) => k.value === rule.keyword)?.label || rule.keyword
    }
    return rule.keyword
  }

  // ==== 商品选择器面板（内联，非嵌套弹窗） ====
  const itemPickerPanel = showItemPicker && (
    <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">插入商品卡片</span>
        <button
          type="button"
          onClick={() => {
            setShowItemPicker(false)
            setItemPickerSearch("")
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          收起
        </button>
      </div>
      <input
        type="text"
        value={itemPickerSearch}
        onChange={(e) => setItemPickerSearch(e.target.value)}
        placeholder="搜索商品..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        autoFocus
      />
      <div className="max-h-48 overflow-y-auto space-y-1.5">
        {filteredPickerItems.length > 0 ? (
          filteredPickerItems.map((i) => (
            <button
              key={i.gid}
              type="button"
              onClick={() => insertItemCard(i.gid)}
              className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-orange-300 transition-colors bg-white"
            >
              <div className="font-medium text-gray-900 truncate text-sm">
                {i.title || "无标题"}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>ID: {i.gid.slice(0, 12)}...</span>
                <span>¥{i.price}</span>
              </div>
            </button>
          ))
        ) : (
          <p className="text-center text-gray-400 py-4 text-sm">
            {itemPickerSearch ? "未找到匹配的商品" : "暂无可选的商品"}
          </p>
        )}
      </div>
    </div>
  )

  // ==== 规则列表视图 ====
  const ruleListView = (
    <div className="p-4">
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
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : linkedRulesData?.rules && linkedRulesData.rules.length > 0 ? (
        <div className="space-y-2">
          {linkedRulesData.rules.map((rule) => (
            <div
              key={rule.rule_id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
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
                    onClick={() => handleDeleteRule(rule)}
                    disabled={loading}
                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>暂无关联的关键词规则</p>
          <p className="text-xs mt-1">点击上方按钮创建新规则</p>
        </div>
      )}
    </div>
  )

  // ==== 创建/编辑规则表单 ====
  const ruleFormView = (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">
          {editingRule ? "编辑规则" : "创建新规则"}
        </h3>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(false)
            setEditingRule(null)
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          返回列表
        </button>
      </div>

      {/* 回复类型 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">回复类型</label>
        <select
          {...register("reply_type")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="custom">自定义关键词</option>
          <option value="predefined">预定义关键词</option>
        </select>
      </div>

      {/* 关键词 */}
      {replyType === "predefined" ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">预定义关键词</label>
          <select
            {...register("keyword")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {PREDEFINED_KEYWORDS.map((kw) => (
              <option key={kw.value} value={kw.value}>
                {kw.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
            <input
              {...register("keyword")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例如: 多少钱 / 价格"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">匹配类型</label>
            <select
              {...register("match_type")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="exact">精确匹配</option>
              <option value="fuzzy">模糊匹配</option>
              <option value="regex">正则匹配</option>
            </select>
          </div>
        </div>
      )}

      {/* 优先级 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
        <input
          type="number"
          {...register("priority", { valueAsNumber: true })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
      </div>

      {/* 回复内容 + 占位符 + 商品卡片选择器 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            回复内容 <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowItemPicker(!showItemPicker)}
            className="text-xs text-orange-600 hover:text-orange-800 font-medium"
          >
            {showItemPicker ? "收起商品选择" : "+ 插入商品卡片"}
          </button>
        </div>

        {/* 占位符工具栏 */}
        <PlaceholderPicker onInsert={insertPlaceholder} draggable={!isMobile} />

        <div className="mt-2">
          <textarea
            {...register("reply_content")}
            rows={4}
            onDrop={handleReplyContentDrop}
            onDragOver={(e) => e.preventDefault()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
            placeholder="当消息匹配时，自动发送此回复内容"
          />
          {errors.reply_content && (
            <p className="mt-1 text-xs text-red-500">{errors.reply_content.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            占位符格式：{"{占位符名称}"}，商品卡片格式：[ITEM:商品ID]
          </p>
        </div>

        {/* 内联商品选择器面板 */}
        {itemPickerPanel}
      </div>

      {/* 启用开关 */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          {...register("enabled")}
          id="enabled_kw_drawer"
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="enabled_kw_drawer" className="text-sm text-gray-700">
          启用此规则
        </label>
      </div>

      {/* 关联商品提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="text-xs text-blue-700">
          <span className="font-medium">关联商品：</span>
          {item.title || "无标题"} (¥{item.price})
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(false)
            setEditingRule(null)
          }}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <LoadingSpinner size="sm" />}
          {editingRule ? "保存" : "创建"}
        </button>
      </div>
    </form>
  )

  const title = "关键词回复"
  const subtitle = `为商品「${item.title || item.gid.slice(0, 10)}...」配置关键词自动回复`

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        heightRatio={0.95}
      >
        <div className="flex-1 overflow-y-auto">
          {!showCreateForm ? ruleListView : ruleFormView}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} width="560px">
      <div className="flex-1 overflow-y-auto">
        {!showCreateForm ? ruleListView : ruleFormView}
      </div>
    </Sheet>
  )
}
