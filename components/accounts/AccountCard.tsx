"use client"

import { useState } from "react"
import { Account, updateAccount } from "@/lib/api/accounts"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Bot, Truck, QrCode, Zap, Star, Sparkles, Bell, BellOff, MessageSquare, Sparkle } from "lucide-react"

type ConfigField = "full_ai_reply_system_prompt" | "full_default_reply_content"

interface AccountCardProps {
  account: Account
  onRelogin: (uid: string) => void
}

// 配置编辑框
function ConfigModal({
  field,
  value,
  onClose,
  onSave,
}: {
  field: ConfigField
  value: string
  onClose: () => void
  onSave: (value: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 右上角关闭按钮 */}
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-3">
          <h3 className="font-semibold text-gray-900">
            {field === "full_ai_reply_system_prompt" ? "AI提示词" : "默认回复内容"}
          </h3>
        </div>

        <div className="px-4 flex-1 overflow-auto">
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
            placeholder={field === "full_ai_reply_system_prompt"
              ? "定义全局身份与语言风格..."
              : "默认回复内容..."
            }
          />
        </div>

        {/* 右下角确认取消按钮 */}
        <div className="flex justify-end gap-2 px-4 pb-4 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={() => onSave(localValue)}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

export function AccountCard({ account, onRelogin }: AccountCardProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [configField, setConfigField] = useState<ConfigField | null>(null)

  const statusLabels: Record<number, string> = { 1: "正常", 2: "禁用", 3: "异常" }
  const statusColors: Record<number, string> = {
    1: "bg-green-500 text-white",
    2: "bg-gray-400 text-white",
    3: "bg-red-500 text-white",
  }

  const handleToggle = async (field: "auto_reply" | "auto_delivery" | "auto_free" | "auto_positive_review" | "auto_notify" | "ai_auto_reply") => {
    try {
      await updateAccount(account.uid, { [field]: !account[field] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "更新失败", description: String(e), variant: "error" })
    }
  }

  const handleStatusToggle = () => {
    if (account.status === 3) {
      addToast({ title: "无法切换", description: "账号处于异常状态，请先处理", variant: "warning" })
      return
    }
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

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        {/* 头部：名称在左，状态在右 */}
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1 pr-3">
            <h3 className="font-semibold text-gray-900 truncate text-sm">{account.name}</h3>
            <p className="text-xs text-gray-400 truncate">{account.uid}</p>
          </div>
          <button
            onClick={handleStatusToggle}
            disabled={loading === "status"}
            className={`px-1.5 py-0.5 rounded-lg text-xs font-medium ${statusColors[account.status]} ${
              account.status === 3 ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            title={account.status === 3 ? "异常状态无法自行切换" : "点击切换状态"}
          >
            {loading === "status" ? <LoadingSpinner size="sm" /> : statusLabels[account.status]}
          </button>
        </div>

        {/* 开关 + 配置 + 重新登录 */}
        <div className="flex items-center gap-1 flex-wrap">
          <ToggleIcon
            icon={<Bot className="w-3.5 h-3.5" />}
            enabled={account.auto_reply}
            onClick={() => handleToggle("auto_reply")}
            color="purple"
            title="自动回复"
          />
          <ToggleIcon
            icon={<Sparkles className="w-3.5 h-3.5" />}
            enabled={account.ai_auto_reply}
            onClick={() => handleToggle("ai_auto_reply")}
            color="cyan"
            title="AI回复"
          />
          <ToggleIcon
            icon={<Truck className="w-3.5 h-3.5" />}
            enabled={account.auto_delivery}
            onClick={() => handleToggle("auto_delivery")}
            color="green"
            title="自动发货"
          />
          <ToggleIcon
            icon={<Zap className="w-3.5 h-3.5" />}
            enabled={account.auto_free}
            onClick={() => handleToggle("auto_free")}
            color="amber"
            title="自动免拼"
          />
          <ToggleIcon
            icon={<Star className="w-3.5 h-3.5" />}
            enabled={account.auto_positive_review}
            onClick={() => handleToggle("auto_positive_review")}
            color="pink"
            title="自动评价"
          />
          <ToggleIcon
            icon={account.auto_notify ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            enabled={account.auto_notify}
            onClick={() => handleToggle("auto_notify")}
            color="amber"
            title="自动通知"
          />

          {/* 竖线隔开 */}
          <div className="w-px h-5 bg-gray-200 mx-1" />

                    <button
            onClick={() => {
              if (!account.auto_reply) {
                addToast({ title: "无法配置", description: "自动回复未开启，默认回复不会生效", variant: "warning" })
                return
              }
              setConfigField("full_default_reply_content")
            }}
            className={`p-1.5 rounded-lg transition-colors ${account.full_default_reply_content ? "text-blue-500 bg-blue-50" : "text-gray-300"}`}
            title={account.auto_reply ? "默认回复" : "自动回复未开启，默认回复不会生效"}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {/* 配置按钮 */}
          <button
            onClick={() => setConfigField("full_ai_reply_system_prompt")}
            className={`p-1.5 rounded-lg transition-colors ${account.full_ai_reply_system_prompt ? "text-blue-500 bg-blue-50" : "text-gray-300"}`}
            title="AI提示词"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>


          {/* 重新登录放最右 */}
          <button
            onClick={() => onRelogin(account.uid)}
            disabled={loading === "relogin"}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 ml-auto"
            title="重新登录"
          >
            {loading === "relogin" ? <LoadingSpinner size="sm" /> : <QrCode className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 配置编辑框 */}
      {configField && (
        <ConfigModal
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

// 紧凑图标开关
function ToggleIcon({
  icon,
  enabled,
  onClick,
  color,
  title,
}: {
  icon: React.ReactNode
  enabled: boolean
  onClick: () => void
  color: "green" | "purple" | "cyan" | "amber" | "pink"
  title: string
}) {
  const colorMap = {
    green: enabled ? "text-green-500 bg-green-50" : "text-gray-300",
    purple: enabled ? "text-purple-500 bg-purple-50" : "text-gray-300",
    cyan: enabled ? "text-cyan-500 bg-cyan-50" : "text-gray-300",
    amber: enabled ? "text-amber-500 bg-amber-50" : "text-gray-300",
    pink: enabled ? "text-pink-500 bg-pink-50" : "text-gray-300",
  }

  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${colorMap[color]}`}
      title={title}
    >
      {icon}
    </button>
  )
}