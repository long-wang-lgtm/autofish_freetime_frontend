"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeywordRule, listRuleItems, PREDEFINED_KEYWORDS } from "@/lib/api/keywords"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { PlaceholderPicker } from "./PlaceholderPicker"

const makeItemCardPlaceholder = (itemId: string) => `[ITEM:${itemId}]`

export const ruleSchema = z.object({
  reply_type: z.enum(["predefined", "custom"]),
  keyword: z.string(),
  reply_content: z.string().min(1, "回复内容不能为空"),
  match_type: z.enum(["exact", "fuzzy", "regex"]),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
})

export type RuleFormData = z.infer<typeof ruleSchema>

export interface KeywordRuleFormProps {
  rule?: KeywordRule
  linkedItem?: { title?: string; price?: number; gid?: string }
  bindingWarning?: string
  onSubmit: (data: RuleFormData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  children?: React.ReactNode
}

export function KeywordRuleForm({
  rule,
  linkedItem,
  bindingWarning,
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
  children,
}: KeywordRuleFormProps) {
  const isEdit = !!rule
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [itemPickerSearch, setItemPickerSearch] = useState("")
  const [showItemPicker, setShowItemPicker] = useState(false)

  const { data: itemsData } = useQuery({
    queryKey: ["keyword-form-items"],
    queryFn: listRuleItems,
  })

  const filteredPickerItems = useMemo(() => {
    if (!itemsData) return []
    if (!itemPickerSearch.trim()) return itemsData
    const search = itemPickerSearch.toLowerCase()
    return itemsData.filter(
      (i) =>
        i.gid.toLowerCase().includes(search) ||
        (i.title && i.title.toLowerCase().includes(search))
    )
  }, [itemsData, itemPickerSearch])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<RuleFormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      reply_type: rule?.reply_type || "custom",
      keyword: rule?.keyword || "",
      reply_content: rule?.reply_content || "",
      match_type: rule?.match_type || "exact",
      priority: rule?.priority || 0,
      enabled: rule?.enabled ?? true,
    },
  })

  const replyType = watch("reply_type")
  const replyContent = watch("reply_content")

  // Dirty state tracking
  const isDirty = Object.keys(dirtyFields).length > 0
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Insert placeholder via PlaceholderPicker
  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const currentValue = replyContent || ""
      const newValue = currentValue + placeholder
      setValue("reply_content", newValue, { shouldValidate: true, shouldDirty: true })
    },
    [replyContent, setValue]
  )

  // Insert item card into reply content
  const insertItemCard = useCallback(
    (itemId: string) => {
      const placeholder = makeItemCardPlaceholder(itemId)
      const currentValue = replyContent || ""
      const newValue = currentValue + placeholder
      setValue("reply_content", newValue, { shouldValidate: true, shouldDirty: true })
      setShowItemPicker(false)
      setItemPickerSearch("")
    },
    [replyContent, setValue]
  )

  // Handle drop into reply content textarea
  const handleReplyContentDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const text = e.dataTransfer.getData("text/plain")
      if (text && (text.startsWith("[ITEM:") || text.startsWith("{"))) {
        const currentValue = replyContent || ""
        setValue("reply_content", currentValue + text, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
    },
    [replyContent, setValue]
  )

  const handleSubmitForm = async (data: RuleFormData) => {
    setLoading(true)
    try {
      await onSubmit(data)
      reset(data) // reset dirty state after successful submit
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset() // reset dirty state on cancel
    onCancel()
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  // ---- Item picker panel (inline, collapsible) ----
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

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
      {/* Reply type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">回复类型</label>
        <select
          {...register("reply_type")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="custom">自定义关键词</option>
          <option value="predefined">预定义关键词</option>
        </select>
      </div>

      {/* Keyword or predefined select */}
      {replyType === "predefined" ? (
        <div>
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
        <div className="grid grid-cols-2 gap-4">
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

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
        <input
          type="number"
          {...register("priority", { valueAsNumber: true })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
      </div>

      {/* Reply content + placeholder picker + item card picker */}
      <div>
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

        {/* PlaceholderPicker toolbar */}
        <PlaceholderPicker onInsert={insertPlaceholder} draggable />

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

        {/* Inline item picker panel */}
        {itemPickerPanel}
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register("enabled")}
          id="enabled_kw_form"
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="enabled_kw_form" className="text-sm text-gray-700">
          启用此规则
        </label>
      </div>

      {/* Binding warning (amber) */}
      {bindingWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-700">{bindingWarning}</div>
        </div>
      )}

      {/* Linked item info (blue) */}
      {linkedItem && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-700">
            <span className="font-medium">关联商品：</span>
            {linkedItem.title || "无标题"}
            {linkedItem.price != null && ` (¥${linkedItem.price})`}
          </div>
        </div>
      )}

      {/* Children slot */}
      {children}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || loading}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          >
            {deleting ? "删除中..." : "删除"}
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
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
          {isEdit ? "保存" : "创建"}
        </button>
      </div>
    </form>
  )
}
