"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Sheet } from "@/components/ui/Sheet"
import { useToast } from "@/components/ui/toaster"
import {
  listReviewTemplates,
  createReviewTemplate,
  updateReviewTemplate,
  deleteReviewTemplate,
  ReviewTemplate,
} from "@/lib/api/accounts"

interface ReviewTemplateSheetProps {
  open: boolean
  onClose: () => void
}

const REVIEW_TYPE_LABELS: Record<string, string> = {
  seller: "卖家评价",
  buyer: "买家评价",
}

const DEFAULT_TEMPLATE: ReviewTemplate = {
  content: "",
  is_active: true,
  review_type: "seller",
}

export function ReviewTemplateSheet({ open, onClose }: ReviewTemplateSheetProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: templates, isLoading } = useQuery({
    queryKey: ["review-templates"],
    queryFn: listReviewTemplates,
    enabled: open,
  })

  const [selected, setSelected] = useState<ReviewTemplate | null>(null)
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 选中模板时同步编辑区
  const selectTemplate = (tpl: ReviewTemplate) => {
    flushSave()
    setSelected(tpl)
    setContent(tpl.content || "")
    setSaved(true)
  }

  // 切换单个模板的启用状态
  const handleToggleTemplate = async (tpl: ReviewTemplate) => {
    if (!tpl.id) return
    try {
      await updateReviewTemplate({
        id: tpl.id,
        content: tpl.content || "",
        is_active: !tpl.is_active,
        review_type: tpl.review_type,
      })
      queryClient.invalidateQueries({ queryKey: ["review-templates"] })
    } catch (e) {
      addToast({ title: "操作失败", description: String(e), variant: "error" })
    }
  }

  // 新建模板
  const handleCreate = async () => {
    try {
      const created = await createReviewTemplate({ ...DEFAULT_TEMPLATE })
      addToast({ title: "模板已创建" })
      queryClient.invalidateQueries({ queryKey: ["review-templates"] })
      selectTemplate(created)
    } catch (e) {
      addToast({ title: "创建失败", description: String(e), variant: "error" })
    }
  }

  // 删除模板
  const handleDelete = async (tpl: ReviewTemplate) => {
    if (!tpl.id) return
    try {
      await deleteReviewTemplate(tpl.id)
      addToast({ title: "模板已删除" })
      queryClient.invalidateQueries({ queryKey: ["review-templates"] })
      if (selected?.id === tpl.id) {
        setSelected(null)
        setContent("")
      }
    } catch (e) {
      addToast({ title: "删除失败", description: String(e), variant: "error" })
    }
  }

  // 立即刷新待保存内容
  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
  }, [])

  // 自动保存
  const doSave = useCallback(
    async (tpl: ReviewTemplate, newContent: string, newIsActive: boolean) => {
      if (!tpl.id) return
      setSaving(true)
      try {
        await updateReviewTemplate({
          id: tpl.id,
          content: newContent,
          is_active: newIsActive,
          review_type: tpl.review_type,
        })
        setSaved(true)
        queryClient.invalidateQueries({ queryKey: ["review-templates"] })
      } catch (e) {
        addToast({ title: "自动保存失败", description: String(e), variant: "error" })
      } finally {
        setSaving(false)
      }
    },
    [addToast, queryClient]
  )

  const handleContentChange = (value: string) => {
    setContent(value)
    setSaved(false)
    flushSave()
    saveTimer.current = setTimeout(() => {
      if (selected) doSave(selected, value, selected.is_active ?? true)
    }, 800)
  }

  useEffect(() => {
    return () => flushSave()
  }, [flushSave])

  // 首次加载时自动选中第一个模板
  useEffect(() => {
    if (templates && templates.length > 0 && !selected) {
      const first = templates[0]
      setSelected(first)
      setContent(first.content || "")
      setSaved(true)
    }
  }, [templates, selected])

  return (
    <Sheet open={open} onClose={onClose} title="评价模板配置" width="600px">
      <div className="flex flex-col h-full">
        {/* 共享提醒 */}
        <div className="flex-shrink-0 mx-4 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <svg
            className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-medium">注意：</span>
            评价模板为全局配置，所有账号共享。修改后会影响所有账号的自动评价行为。
          </p>
        </div>

        {/* 上半部分：模板列表 */}
        <div className="flex-1 min-h-0 px-4 pt-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">模板列表</span>
            <button
              onClick={handleCreate}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + 新建模板
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-6 text-xs text-gray-400">加载中...</div>
          )}

          {!isLoading && (!templates || templates.length === 0) && (
            <div className="text-center py-6 text-xs text-gray-400">暂无模板，点击新建</div>
          )}

          {!isLoading && templates && templates.length > 0 && (
            <div className="space-y-1 flex-1 overflow-y-auto">
              {templates.map((tpl, i) => {
                const isSelected = selected?.id === tpl.id
                return (
                  <div
                    key={tpl.id || i}
                    onClick={() => selectTemplate(tpl)}
                    className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50 border border-gray-100 hover:bg-gray-100"
                    }`}
                  >
                    {/* 开关在左 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleTemplate(tpl)
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mr-3 overflow-hidden ${
                        tpl.is_active ? "bg-blue-600" : "bg-gray-300"
                      }`}
                      title={tpl.is_active ? "已启用" : "已禁用"}
                    >
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-sm ring-1 ring-black/5 transition-all ${
                          tpl.is_active ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>

                    {/* 内容在右 */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`text-xs font-medium truncate ${
                        isSelected ? "text-blue-700" : "text-gray-600"
                      }`}>
                        {REVIEW_TYPE_LABELS[tpl.review_type] || tpl.review_type}
                      </span>
                      {tpl.content && (
                        <span className="text-xs text-gray-400 truncate">
                          {tpl.content.slice(0, 20)}{tpl.content.length > 20 ? "…" : ""}
                        </span>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(tpl) }}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                      title="删除模板"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 分割线 */}
        <div className="border-t border-gray-100 mt-3" />
        
        {/* 共享提醒 */}
        <div className="flex-shrink-0 mx-4 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <svg
            className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-medium">注意：</span>
            评价模板为全局配置，所有账号共享。修改后会影响所有账号的自动评价行为。
          </p>
        </div>

        {/* 下半部分：编辑区 */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4 pt-3">
          {selected ? (
            <>
              {/* 编辑头部 */}
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <span className="text-sm font-medium text-gray-700">
                  {REVIEW_TYPE_LABELS[selected.review_type] || selected.review_type}
                </span>
              </div>

              {/* 编辑框 */}
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={8}
                className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-300"
                placeholder="输入评价模板内容，支持 {买家昵称} 等变量..."
              />

              {/* 右下角自动保存状态 */}
              <div className="flex items-center justify-end gap-1.5 mt-2 flex-shrink-0">
                {saving ? (
                  <span className="text-xs text-amber-500 animate-pulse">保存中...</span>
                ) : saved ? (
                  <span className="text-xs text-green-500">已保存</span>
                ) : (
                  <span className="text-xs text-gray-400">未保存</span>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              请选择一个模板进行编辑
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
