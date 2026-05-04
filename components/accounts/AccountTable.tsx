"use client"

import { useState } from "react"
import { Account, startAccountIm, stopAccountIm, updateAccount } from "@/lib/api/accounts"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import { Bot, Truck } from "lucide-react"

type ConfigField = "full_ai_reply_system_prompt" | "full_default_reply_content"

interface AccountRowProps {
  account: Account
  index: number
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
}: {
  value: string
  onClick: () => void
}) {
  const hasValue = value && value.trim().length > 0
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

export function AccountRow({ account, index }: AccountRowProps) {
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

  const handleToggle = async (field: "auto_reply" | "auto_delivery") => {
    try {
      await updateAccount(account.uid, { [field]: !account[field] })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "更新失败", description: String(e), variant: "error" })
    }
  }

  const handleStart = async () => {
    setLoading("start")
    try {
      const result = await startAccountIm(account.uid)
      if (result.im_running) {
        addToast({ title: "启动成功", description: `账号 ${account.name} IM服务已启动` })
      } else {
        addToast({ title: "启动中", description: result.message })
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "启动失败", description: String(e), variant: "error" })
    } finally {
      setLoading(null)
    }
  }

  const handleStop = async () => {
    setLoading("stop")
    try {
      const result = await stopAccountIm(account.uid)
      addToast({ title: "已停止", description: result.message })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "停止失败", description: String(e), variant: "error" })
    } finally {
      setLoading(null)
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
        className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors ${
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
        <div className={`col-span-1 text-center font-medium ${statusColors[account.status] || "text-gray-500"}`}>
          {statusLabels[account.status] || "未知"}
        </div>

        {/* IM控制 */}
        <div className="col-span-1 flex items-center justify-center">
          {!account.im_running ? (
            <button
              onClick={handleStart}
              disabled={loading === "start"}
              className="px-2 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
            >
              {loading === "start" ? <LoadingSpinner size="sm" /> : "启动"}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading === "stop"}
              className="px-2 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
            >
              {loading === "stop" ? <LoadingSpinner size="sm" /> : "停止"}
            </button>
          )}
        </div>

        {/* 商品数量 */}
        <div className="col-span-1 text-center">
          <span className="text-gray-700">
            {account.onsaleitemCount || 0}
            <span className="text-gray-400">/</span>
            {account.itemtotalCounts || 0}
          </span>
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

        {/* AI提示词 */}
        <div className="col-span-2">
          <ConfigCell
            value={account.full_ai_reply_system_prompt || ""}
            onClick={() => setConfigField("full_ai_reply_system_prompt")}
          />
        </div>

        {/* 默认回复 */}
        <div className="col-span-2">
          <ConfigCell
            value={account.full_default_reply_content || ""}
            onClick={() => setConfigField("full_default_reply_content")}
          />
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
