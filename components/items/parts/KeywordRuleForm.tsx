"use client"

import { useState, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeywordRule, PREDEFINED_KEYWORDS } from "@/lib/api/keywords"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { TextEditor } from "@/components/ui/text-editor"
import { PlaceholderPicker } from "./PlaceholderPicker"
import { ItemCardPanel } from "./ItemCardPanel"

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
  onDestructiveAction?: { label: string; onAction: () => Promise<void> }
  onDirtyChange?: (dirty: boolean) => void
  /** 右侧折叠面板区域，由父 Drawer 注入（RuleDrawer 用于关联面板） */
  sidePanel?: React.ReactNode
  /** 是否在右列显示商品卡片面板（KeywordDrawer / RuleDrawer 使用） */
  showItemCardPanel?: boolean
}

export function KeywordRuleForm({
  rule,
  linkedItem,
  bindingWarning,
  onSubmit,
  onCancel,
  onDestructiveAction,
  onDirtyChange,
  sidePanel,
  showItemCardPanel,
}: KeywordRuleFormProps) {
  const isEdit = !!rule
  const [loading, setLoading] = useState(false)
  const [destructiveLoading, setDestructiveLoading] = useState(false)

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

  // Insert placeholder via PlaceholderPicker or drag-drop
  const insertPlaceholder = useCallback(
    (placeholder: string) => {
      const currentValue = replyContent || ""
      setValue("reply_content", currentValue + placeholder, { shouldValidate: true, shouldDirty: true })
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
        setValue("reply_content", currentValue + text, { shouldValidate: true, shouldDirty: true })
      }
    },
    [replyContent, setValue]
  )

  const handleSubmitForm = async (data: RuleFormData) => {
    setLoading(true)
    try {
      await onSubmit(data)
      reset(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  const handleDestructive = async () => {
    if (!onDestructiveAction) return
    setDestructiveLoading(true)
    try {
      await onDestructiveAction.onAction()
    } finally {
      setDestructiveLoading(false)
    }
  }

  // 右列是否有内容需要渲染
  const hasSidePanel = showItemCardPanel || sidePanel

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="flex-1 min-h-0 flex flex-col">
      {/* 顶部：启用开关（左上角） */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={watch("enabled")}
          onClick={() => setValue("enabled", !watch("enabled"), { shouldDirty: true })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
            watch("enabled") ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              watch("enabled") ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </button>
        <span className="text-sm text-gray-700 select-none">启用</span>
      </div>

      {/* 主体：左列表单 + 右列面板 */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* 左列 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 🔑 匹配规则卡片 */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700">匹配规则</span>
                {/* 回复类型 pill 切换 */}
                <div className="flex gap-0.5 bg-blue-100 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setValue("reply_type", "custom", { shouldDirty: true })}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                      replyType === "custom"
                        ? "bg-white text-blue-700 font-medium shadow-sm"
                        : "text-blue-500 hover:text-blue-700"
                    }`}
                  >
                    自定义
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("reply_type", "predefined", { shouldDirty: true })}
                    className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                      replyType === "predefined"
                        ? "bg-white text-blue-700 font-medium shadow-sm"
                        : "text-blue-500 hover:text-blue-700"
                    }`}
                  >
                    预定义
                  </button>
                </div>
              </div>
              {/* 优先级 */}
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-gray-400">优先级</label>
                <input
                  type="number"
                  {...register("priority", { valueAsNumber: true })}
                  className="w-[42px] px-1.5 py-0.5 border border-gray-300 rounded text-xs text-center"
                />
              </div>
            </div>

            {/* 关键词 / 匹配方式 或 预定义选择 */}
            {replyType === "predefined" ? (
              <select
                {...register("keyword")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {PREDEFINED_KEYWORDS.map((kw) => (
                  <option key={kw.value} value={kw.value}>
                    {kw.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-3">
                <div className="flex-[5]">
                  <label className="block text-[11px] text-gray-500 mb-1">关键词</label>
                  <input
                    {...register("keyword")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="例如: 多少钱 / 价格"
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-[11px] text-gray-500 mb-1">匹配方式</label>
                  <select
                    {...register("match_type")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="exact">精确匹配</option>
                    <option value="fuzzy">模糊匹配</option>
                    <option value="regex">正则匹配</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 💬 回复内容卡片 */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3">
            <label className="block text-xs font-semibold text-purple-700 mb-2">
              回复内容 <span className="text-red-500">*</span>
            </label>

            {/* 占位符工具栏 */}
            <PlaceholderPicker onInsert={insertPlaceholder} draggable />

            {/* Textarea */}
            <div className="mt-2">
              <TextEditor
                {...register("reply_content")}
                rows={5}
                maxHeight="35vh"
                onDrop={handleReplyContentDrop}
                onDragOver={(e) => e.preventDefault()}
                placeholder="当消息匹配时，自动发送此回复内容"
              />
              {errors.reply_content && (
                <p className="mt-1 text-xs text-red-500">{errors.reply_content.message}</p>
              )}
              <p className="mt-1 text-[11px] text-gray-400">
                占位符格式：{"{占位符名称}"}，商品卡片格式：[ITEM:商品ID]
              </p>
            </div>
          </div>

          {/* 关联商品信息 / 警告 */}
          {linkedItem && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
              <div className="text-xs text-green-700">
                <span className="font-medium">关联商品：</span>
                {linkedItem.title || "无标题"}
                {linkedItem.price != null && ` (¥${linkedItem.price})`}
              </div>
            </div>
          )}
          {bindingWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <div className="text-xs text-amber-700">{bindingWarning}</div>
            </div>
          )}
        </div>

        {/* 右列面板 */}
        {hasSidePanel && (
          <div className="hidden md:flex w-[220px] flex-shrink-0 flex-col gap-2">
            {showItemCardPanel && (
              <ItemCardPanel
                onInsert={(itemId) => {
                  const placeholder = makeItemCardPlaceholder(itemId)
                  setValue("reply_content", (watch("reply_content") || "") + placeholder, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }}
              />
            )}
            {sidePanel}
          </div>
        )}
      </div>

      {/* 底部按钮栏 */}
      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-100 flex-shrink-0">
        {onDestructiveAction && (
          <button
            type="button"
            onClick={handleDestructive}
            disabled={destructiveLoading || loading}
            className="px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50"
          >
            {destructiveLoading ? "处理中..." : onDestructiveAction.label}
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
