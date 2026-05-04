"use client"

import { useState } from "react"
import { Account, startAccountIm, stopAccountIm, deleteAccount, refreshAccountToken } from "@/lib/api/accounts"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"

interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
}

export function AccountCard({ account, onEdit }: AccountCardProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const statusLabels = { 1: "正常", 2: "禁用", 3: "异常" }
  const statusColors = { 1: "text-green-600", 2: "text-gray-500", 3: "text-red-600" }

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

  const handleRefreshToken = async () => {
    setLoading("refresh")
    try {
      const result = await refreshAccountToken(account.uid)
      if (result.success) {
        addToast({ title: "令牌刷新成功" })
      } else {
        addToast({ title: "令牌刷新失败", description: result.message, variant: "error" })
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "令牌刷新失败", description: String(e), variant: "error" })
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`确定要删除账号 ${account.name} 吗？`)) return
    setLoading("delete")
    try {
      await deleteAccount(account.uid)
      addToast({ title: "已删除", description: `账号 ${account.name} 已删除` })
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
    } catch (e) {
      addToast({ title: "删除失败", description: String(e), variant: "error" })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{account.name}</h3>
            <span className={`text-sm ${statusColors[account.status as keyof typeof statusColors]}`}>
              {statusLabels[account.status as keyof typeof statusLabels] || "未知"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">UID: {account.uid}</p>
          {account.remark && (
            <p className="text-sm text-gray-400 mt-1">备注: {account.remark}</p>
          )}
        </div>

        {/* IM状态指示灯 */}
        <div className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              account.im_connected ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <span className="text-xs text-gray-500">
            {account.im_running ? "运行中" : "已停止"}
          </span>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="mt-3 flex gap-4 text-sm text-gray-600">
        <span>商品: {account.itemtotalCounts}</span>
        <span>在售: {account.onsaleitemCount}</span>
        <span>自动回复: {account.auto_reply ? "✓" : "✗"}</span>
        <span>自动发货: {account.auto_delivery ? "✓" : "✗"}</span>
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onEdit(account)}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          编辑
        </button>

        {!account.im_running ? (
          <button
            onClick={handleStart}
            disabled={loading === "start"}
            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loading === "start" ? <LoadingSpinner size="sm" /> : "启动"}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading === "stop"}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loading === "stop" ? <LoadingSpinner size="sm" /> : "停止"}
          </button>
        )}

        <button
          onClick={handleRefreshToken}
          disabled={loading === "refresh"}
          className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors disabled:opacity-50"
        >
          {loading === "refresh" ? <LoadingSpinner size="sm" /> : "刷新令牌"}
        </button>

        <button
          onClick={handleDelete}
          disabled={loading === "delete"}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 ml-auto"
        >
          {loading === "delete" ? <LoadingSpinner size="sm" /> : "删除"}
        </button>
      </div>
    </div>
  )
}