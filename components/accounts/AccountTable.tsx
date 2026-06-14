"use client"

import { useState } from "react"
import { Account, updateAccount } from "@/lib/api/accounts"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Bot, Truck, QrCode, Zap, Star, Sparkles, Bell, BellOff, AlertCircle  } from "lucide-react"

type ConfigField = "full_ai_reply_system_prompt" | "full_default_reply_content"

interface AccountRowProps {
  account: Account
  index: number
  onRelogin: (uid: string) => void
}

const fieldLabels: Record<ConfigField, string> = {
  full_ai_reply_system_prompt: "AI提示词",
  full_default_reply_content: "默认回复内容",
}

const fieldPlaceholders: Record<ConfigField, string> = {
  full_ai_reply_system_prompt: `定义全局身份与语言风格, 如：

你是一个热情的闲鱼虚拟卖家 
- 不承诺具体发货时间 
- 禁止使用「亲」等淘宝用语... 

账号级:	身份、风格、通用规则	示例："你是热情的数码卖家"
商品组级:	同一类商品的回复策略	示例："手机类商品要突出质保"
商品级:	单个商品的特定信息	示例："这台相机包含XX配件"
商品描述:	商品的详细描述	示例："这台相机包含XX配件，质量好，价格低"
发货内容:	发货内容	示例："百度网盘分享的文件，链接: https://"
   
   `,
  full_default_reply_content: `默认回复内容...
  
相当于首次回复配置，冲突时，首次回复配置优先
  `,
}

// 配置模态框
function ConfigModal({
  account,
  field,
  value,
  onClose,
  onSave,
}: {
  account: Account
  field: ConfigField
  value: string
  onClose: () => void
  onSave: (value: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{fieldLabels[field]}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500">账号:</span>
              <span className="font-medium text-gray-900">{account.name}</span>
            </div>
            <div className="text-xs text-gray-500">
              UID: {account.uid}
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y"
            placeholder={fieldPlaceholders[field]}
          />
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            取消
          </button>
          <button
            onClick={() => { onSave(localValue) }}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// 可点击的配置单元格
function ConfigCell({
  value,
  onClick,
  disabled,
  disabledTooltip,
}: {
  value: string
  onClick: () => void
  disabled?: boolean
  disabledTooltip?: string
}) {
  const hasValue = value && value.trim().length > 0

  if (disabled) {
    return (
      <div
        className="w-full h-full min-h-[2.5rem] max-h-[2.5rem] flex items-center justify-center text-amber-500"
        title={disabledTooltip || "自动回复未开启"}
      >
        <AlertCircle className="w-4 h-4" />
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full h-full min-h-[2.5rem] max-h-[2.5rem] text-sm px-1 flex items-center justify-center text-center hover:underline ${
        hasValue ? "text-blue-600" : "text-gray-400"
      }`}
      title={value || "点击配置"}
    >
      {hasValue ? (
        <span className="text-center">已配置</span>
      ) : (
        "点击配置"
      )}
    </button>
  )
}

export function AccountRow({ account, index, onRelogin }: AccountRowProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [configField, setConfigField] = useState<ConfigField | null>(null)

  const statusLabels: Record<number, string> = { 1: "正常", 2: "禁用", 3: "异常" }
  const statusColors: Record<number, string> = {
    1: "text-green-600",
    2: "text-gray-500",
    3: "text-red-600",
  }

  const handleToggle = async (field: "auto_reply" | "auto_delivery" | "auto_free" | "auto_positive_review" | "auto_notify" | "ai_auto_reply") => {
    try {
      await updateAccount(account.uid, { [field]: !account[field] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "更新失败", description: String(e), variant: "error" })
    }
  }

  const handleSaveConfig = async (value: string) => {
    try {
      await updateAccount(account.uid, { [configField as string]: value })
      addToast({ title: "保存成功" })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "保存失败", description: String(e), variant: "error" })
    }
    setConfigField(null)
  }

  const isEven = index % 2 === 0

  return (
    <>
      <div
        className={`grid grid-cols-11 gap-2 px-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
          isEven ? "bg-white" : "bg-gray-50/30"
        }`}
      >
        {/* 账号信息 */}
        <div className="col-span-1 min-w-0">
          <div className="font-medium text-gray-900 truncate" title={account.name}>
            {account.name}
          </div>
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {account.uid}
          </div>
        </div>
        
        {/* 状态 */}
        <div className="col-span-1 text-center">
          <button
            onClick={() => {
              if (account.status === 3) {
                addToast({ title: "无法切换", description: "账号处于异常状态，请先处理", variant: "warning" })
                return
              }
              if (loading) return
              setLoading("status")
              const newStatus = account.status === 1 ? 2 : 1
              updateAccount(account.uid, { status: newStatus })
                .then(() => {
                  addToast({ title: newStatus === 1 ? "账号已启用" : "账号已禁用" })
                  queryClient.invalidateQueries({ queryKey: ["accounts"] })
                })
                .catch((e) => {
                  addToast({ title: "切换失败", description: String(e), variant: "error" })
                })
                .finally(() => setLoading(null))
            }}
            disabled={loading === "status"}
            className={`font-medium transition-colors ${
              account.status === 3
                ? `${statusColors[account.status]} cursor-not-allowed`
                : `${statusColors[account.status]} cursor-pointer hover:opacity-80`
            }`}
            title={account.status === 3 ? "异常状态无法自行切换" : "点击切换状态"}
          >
            {loading === "status" ? <LoadingSpinner size="sm" /> : statusLabels[account.status]}
          </button>
        </div>

        {/* 自动免拼开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle("auto_free")}
            className={`p-1.5 rounded transition-colors ${
              account.auto_free ? "text-amber-500 bg-amber-50" : "text-gray-300 bg-gray-100"
            }`}
            title={account.auto_free ? "自动免拼：开" : "自动免拼：关"}
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>

        {/* 自动发货开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle("auto_delivery")}
            className={`p-1.5 rounded transition-colors ${
              account.auto_delivery ? "text-green-500 bg-green-50" : "text-gray-300 bg-gray-100"
            }`}
            title={account.auto_delivery ? "自动发货：开" : "自动发货：关"}
          >
            <Truck className="w-4 h-4" />
          </button>
        </div>

        {/* 自动回复开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle("auto_reply")}
            className={`p-1.5 rounded transition-colors ${
              account.auto_reply ? "text-purple-500 bg-purple-50" : "text-gray-300 bg-gray-100"
            }`}
            title={account.auto_reply ? "自动回复：开" : "自动回复：关"}
          >
            <Bot className="w-4 h-4" />
          </button>
        </div>

        {/* AI回复开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle("ai_auto_reply")}
            className={`p-1.5 rounded transition-colors ${
              account.ai_auto_reply ? "text-cyan-500 bg-cyan-50" : "text-gray-300 bg-gray-100"
            }`}
            title={account.ai_auto_reply ? "AI回复：开" : "AI回复：关"}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* 自动评价开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle("auto_positive_review")}
            className={`p-1.5 rounded transition-colors ${
              account.auto_positive_review ? "text-pink-500 bg-pink-50" : "text-gray-300 bg-gray-100"
            }`}
            title={account.auto_positive_review ? "自动评价：开" : "自动评价：关"}
          >
            <Star className="w-4 h-4" />
          </button>
        </div>

        {/* 自动通知开关 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => handleToggle("auto_notify")}
            className={`p-1.5 rounded transition-colors ${
              account.auto_notify ? "text-amber-500 bg-amber-50" : "text-gray-300 bg-gray-100"
            }`}
            title={account.auto_notify ? "自动通知：开" : "自动通知：关"}
          >
            {account.auto_notify ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
          </button>
        </div>

        {/* AI提示词 */}
        <div className="col-span-1">
          <ConfigCell
            value={account.full_ai_reply_system_prompt || ""}
            onClick={() => setConfigField("full_ai_reply_system_prompt")}
          />
        </div>

        {/* 默认回复 */}
        <div className="col-span-1">
          <ConfigCell
            value={account.full_default_reply_content || ""}
            onClick={() => setConfigField("full_default_reply_content")}
            disabled={!account.auto_reply}
            disabledTooltip="自动回复未开启，默认回复不会生效"
          />
        </div>

        {/* 重新登录 */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            onClick={() => onRelogin(account.uid)}
            disabled={loading === "relogin"}
            className="p-1.5 rounded transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            title="重新登录"
          >
            {loading === "relogin" ? <LoadingSpinner size="sm" /> : <QrCode className="w-4 h-4" />}
          </button>
        </div>


      </div>

      {/* 配置模态框 */}
      {configField && (
        <ConfigModal
          account={account}
          field={configField}
          value={configField === "full_ai_reply_system_prompt"
            ? account.full_ai_reply_system_prompt || ""
            : account.full_default_reply_content || ""
          }
          onClose={() => setConfigField(null)}
          onSave={handleSaveConfig}
        />
      )}
    </>
  )
}
