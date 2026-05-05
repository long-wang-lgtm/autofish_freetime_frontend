"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Account, AccountCreate, AccountUpdate, createAccount, updateAccount } from "@/lib/api/accounts"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { useQueryClient } from "@tanstack/react-query"

const accountSchema = z.object({
  uid: z.string().min(1, "请输入闲鱼UID"),
  name: z.string().min(1, "请输入账号名称"),
  cookie: z.string().optional(),
  remark: z.string().optional(),
  auto_reply: z.boolean().optional(),
  ai_auto_reply: z.boolean().optional(),
  auto_delivery: z.boolean().optional(),
  auto_free: z.boolean().optional(),
  auto_positive_review: z.boolean().optional(),
  reply_pause_seconds: z.number().min(0).optional(),
  full_deliveryContent: z.string().optional(),
  full_receiptAfter: z.string().optional(),
  full_positiveReviewAfter: z.string().optional(),
  full_default_reply_content: z.string().optional(),
})

type FormData = z.infer<typeof accountSchema>

interface AccountFormProps {
  account?: Account | null
  onClose: () => void
  onSuccess: () => void
}

export function AccountForm({ account, onClose, onSuccess }: AccountFormProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showDeliveryConfig, setShowDeliveryConfig] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      uid: account?.uid || "",
      name: account?.name || "",
      cookie: "",
      remark: account?.remark || "",
      auto_reply: account?.auto_reply || false,
      ai_auto_reply: account?.ai_auto_reply || false,
      auto_delivery: account?.auto_delivery || false,
      auto_free: account?.auto_free || false,
      auto_positive_review: account?.auto_positive_review || false,
      reply_pause_seconds: account?.reply_pause_seconds || 600,
      full_deliveryContent: account?.full_deliveryContent || "",
      full_receiptAfter: account?.full_receiptAfter || "",
      full_positiveReviewAfter: account?.full_positiveReviewAfter || "",
      full_default_reply_content: account?.full_default_reply_content || "",
    },
  })

  const isEdit = !!account

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      if (isEdit) {
        const updateData: AccountUpdate = {
          name: data.name,
          remark: data.remark,
          auto_reply: data.auto_reply,
          ai_auto_reply: data.ai_auto_reply,
          auto_delivery: data.auto_delivery,
          auto_free: data.auto_free,
          auto_positive_review: data.auto_positive_review,
          reply_pause_seconds: data.reply_pause_seconds,
          full_deliveryContent: data.full_deliveryContent,
          full_receiptAfter: data.full_receiptAfter,
          full_positiveReviewAfter: data.full_positiveReviewAfter,
          full_default_reply_content: data.full_default_reply_content,
        }
        if (data.cookie && data.cookie.trim()) {
          updateData.cookie = data.cookie
        }
        await updateAccount(account.uid, updateData)
        addToast({ title: "更新成功", description: `账号 ${data.name} 已更新` })
      } else {
        if (!data.cookie || !data.cookie.trim()) {
          addToast({ title: "请输入Cookie", description: "添加账号必须提供Cookie", variant: "error" })
          setLoading(false)
          return
        }
        const createData: AccountCreate = {
          uid: data.uid,
          name: data.name,
          cookie: data.cookie,
          remark: data.remark,
          auto_reply: data.auto_reply,
          ai_auto_reply: data.ai_auto_reply,
          auto_delivery: data.auto_delivery,
          auto_free: data.auto_free,
          auto_positive_review: data.auto_positive_review,
          reply_pause_seconds: data.reply_pause_seconds,
          full_deliveryContent: data.full_deliveryContent,
          full_receiptAfter: data.full_receiptAfter,
          full_positiveReviewAfter: data.full_positiveReviewAfter,
          full_default_reply_content: data.full_default_reply_content,
        }
        await createAccount(createData)
        addToast({ title: "创建成功", description: `账号 ${data.name} 已添加` })
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      onSuccess()
    } catch (e) {
      addToast({ title: "操作失败", description: String(e), variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 标题栏 - 包含保存按钮 */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">{isEdit ? "编辑账号" : "添加账号"}</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              {isEdit ? "保存" : "添加"}
            </button>
          </div>
        </div>

        {/* 表单内容 - 可滚动 */}
        <form className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                闲鱼UID <span className="text-red-500">*</span>
              </label>
              <input
                {...register("uid")}
                disabled={isEdit}
                className={`w-full px-3 py-2 border rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.uid ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="请输入闲鱼用户ID"
              />
              {errors.uid && (
                <p className="text-sm text-red-500 mt-1">{errors.uid.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                账号名称 <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name")}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="例如: 我的闲鱼账号1"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Cookie 输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cookie {isEdit && <span className="text-orange-500">(留空则不更新)</span>}
            </label>
            <textarea
              {...register("cookie")}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.cookie ? "border-red-500" : "border-gray-300"
              }`}
              placeholder={isEdit ? "留空则保持现有Cookie不变" : "请输入闲鱼Cookie"}
            />
            {errors.cookie && (
              <p className="text-sm text-red-500 mt-1">{errors.cookie.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {isEdit ? "仅在填写新值时更新Cookie" : "添加账号时必须提供Cookie"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <input
              {...register("remark")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="可选备注信息"
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
                  id="auto_reply"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_reply" className="text-sm text-gray-700">
                  启用自动回复
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("ai_auto_reply")}
                  id="ai_auto_reply"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="ai_auto_reply" className="text-sm text-gray-700">
                  使用AI自动回复
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("auto_delivery")}
                  id="auto_delivery"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="auto_delivery" className="text-sm text-gray-700">
                  启用自动发货
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("auto_free")}
                  id="auto_free"
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="auto_free" className="text-sm text-gray-700">
                  启用自动免拼
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("auto_positive_review")}
                  id="auto_positive_review"
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="auto_positive_review" className="text-sm text-gray-700">
                  启用自动评价
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  回复暂停时间（秒）
                </label>
                <input
                  type="number"
                  {...register("reply_pause_seconds", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* 发货配置 - 可折叠 */}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    发货内容（按{`{分段符}`}拆分，每条一条）
                  </label>
                  <textarea
                    {...register("full_deliveryContent")}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="例如: 亲，宝贝已发出哦~{分段符}请注意查收~"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    收货后赠送内容
                  </label>
                  <textarea
                    {...register("full_receiptAfter")}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="买家确认收货后自动发送"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    好评后赠送内容
                  </label>
                  <textarea
                    {...register("full_positiveReviewAfter")}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="买家好评后自动发送"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    默认回复内容
                  </label>
                  <textarea
                    {...register("full_default_reply_content")}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="未匹配关键词时的默认回复"
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}