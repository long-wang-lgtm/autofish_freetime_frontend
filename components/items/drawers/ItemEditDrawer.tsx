"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { type ShopItem, type ShopItemUpdate, updateItem } from "@/lib/api/items"
import { LoadingSpinner } from '@/components/ui/feedback/LoadingSpinner'
import { useToast } from '@/components/ui/Toaster'
import { useQueryClient } from "@tanstack/react-query"
import { Sheet, BottomSheet } from '@/components/ui/overlay/Sheet'
import { TextEditor } from '@/components/ui/TextEditor'
import { useIsMobile } from "@/hooks/useIsMobile"

const itemSchema = z.object({
  title: z.string().optional(),
  auto_reply: z.boolean().optional(),
  auto_ai_reply: z.boolean().optional(),
  auto_ship: z.boolean().optional(),
  reply_default_content: z.string().optional(),
  ai_prompt: z.string().optional(),
})

type FormData = z.infer<typeof itemSchema>

interface ItemEditDrawerProps {
  item: ShopItem
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ItemEditDrawer({ item, open, onClose, onSuccess }: ItemEditDrawerProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [showDeliveryConfig, setShowDeliveryConfig] = useState(false)
  const [showAiConfig, setShowAiConfig] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: item.title || "",
      auto_reply: item.auto_reply || false,
      auto_ai_reply: item.auto_ai_reply || false,
      auto_ship: item.auto_ship || false,
      reply_default_content: item.config?.reply_default_content || "",
      ai_prompt: item.config?.ai_prompt || "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const updateData: Record<string, unknown> = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.auto_reply !== undefined) updateData.auto_reply = data.auto_reply
      if (data.auto_ai_reply !== undefined) updateData.auto_ai_reply = data.auto_ai_reply
      if (data.auto_ship !== undefined) updateData.auto_ship = data.auto_ship
      if (data.reply_default_content !== undefined) updateData.reply_default_content = data.reply_default_content
      if (data.ai_prompt !== undefined) updateData.ai_prompt = data.ai_prompt

      await updateItem(item.gid, updateData)
      addToast({ title: "更新成功", description: `商品 ${data.title || String(item.gid)} 已更新` })
      queryClient.invalidateQueries({ queryKey: ["items"] })
      onSuccess()
    } catch (e) {
      addToast({ title: "更新失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 表单内容（与 ItemForm 完全一致，不改逻辑）
  const formContent = (
    <form className="p-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {/* 商品信息 — 只读 */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">商品ID:</span>
            <span className="ml-2 font-mono">{item.gid}</span>
          </div>
          <div>
            <span className="text-gray-500">账号ID:</span>
            <span className="ml-2">{item.account.uid}</span>
          </div>
          <div>
            <span className="text-gray-500">价格:</span>
            <span className="ml-2 text-orange-600 font-medium">{item.reservePrice || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">状态:</span>
            <span className="ml-2">
              {item.status === 0 ? "在售" : item.status === 1 ? "已下架" : "已售出"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">商品标题</label>
          <input
            {...register("title")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="商品标题"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
        <textarea
          {...register("reply_default_content")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="商品描述"
        />
      </div>

      {/* 自动功能配置 */}
      <div className="border-t pt-4">
        <h3 className="font-medium text-gray-900 mb-3">自动功能配置</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("auto_reply")}
              id="auto_reply_drawer"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded-sm focus:ring-blue-500"
            />
            <label htmlFor="auto_reply_drawer" className="text-sm text-gray-700">
              启用自动回复
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("auto_ai_reply")}
              id="auto_ai_reply_drawer"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded-sm focus:ring-blue-500"
            />
            <label htmlFor="auto_ai_reply_drawer" className="text-sm text-gray-700">
              使用AI自动回复
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register("auto_ship")}
              id="auto_ship_drawer"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded-sm focus:ring-blue-500"
            />
            <label htmlFor="auto_ship_drawer" className="text-sm text-gray-700">
              启用自动发货
            </label>
          </div>
        </div>
      </div>

      {/* 默认回复内容 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">默认回复内容</label>
        <textarea
          {...register("reply_default_content")}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="未匹配关键词时的默认回复"
        />
      </div>

      {/* AI 配置 — 可折叠 */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAiConfig(!showAiConfig)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-medium text-gray-900">AI回复配置</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showAiConfig ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAiConfig && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品提示词</label>
              <TextEditor
                {...register("ai_prompt")}
                rows={2}
                maxHeight="30vh"
                placeholder="AI回复的商品相关提示词"
              />
            </div>
          </div>
        )}
      </div>

      {/* 发货配置 — 可折叠 */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowDeliveryConfig(!showDeliveryConfig)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-medium text-gray-900">发货配置</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showDeliveryConfig ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showDeliveryConfig && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-400">发货配置请前往表格"付款后发货/收货后赠送/评价后赠送"列进行配置</p>
          </div>
        )}
      </div>
    </form>
  )

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        取消
      </button>
      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={loading}
        className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading && <LoadingSpinner size="sm" />}
        保存
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title="编辑商品"
        subtitle={item.title || String(item.gid)}
        footer={footer}
        heightRatio={0.95}
      >
        {formContent}
      </BottomSheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="编辑商品" width="640px">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {formContent}
      </div>
      <div className="border-t px-4 py-3 flex-shrink-0">{footer}</div>
    </Sheet>
  )
}
