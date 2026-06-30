"use client"

import type { ProxyLong } from "@/lib/api/admin"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const STATUS_LABELS: Record<string, string> = {
  active: "正常", abnormal: "异常", invalid: "失效", expired: "过期", closed: "关闭",
}
const STATUS_COLORS: Record<string, string> = {
  active: "text-green-600 bg-green-50",
  abnormal: "text-red-600 bg-red-50",
  invalid: "text-gray-500 bg-gray-100",
  expired: "text-orange-500 bg-orange-50",
  closed: "text-gray-400 bg-gray-100",
}
const SOURCE_LABELS: Record<string, string> = {
  custom: "自定义", tianqi: "天启API", jiuling: "九零科技",
}

export interface ProxyItemProps {
  proxy: ProxyLong
  /** bound = 已绑定样式（蓝底），bindable = 可绑定样式（白底） */
  variant: "bound" | "bindable"
  /** 操作按钮文字；不传则不显示按钮（仅信息展示） */
  actionLabel?: string
  actionLoading?: boolean
  onAction?: () => void
}

/**
 * 代理条目行 — 绑定/解绑列表共用
 *
 * 展示服务器地址、账号、状态、类型（直连/代理）、来源，外加操作按钮。
 */
export function ProxyItem({ proxy, variant, actionLabel, actionLoading, onAction }: ProxyItemProps) {
  const isBound = variant === "bound"
  const statusKey = proxy.status || ""
  const sourceKey = proxy.source || ""

  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg ${
        isBound ? "bg-blue-50/40 border-blue-100" : "hover:bg-gray-50"
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* 第一行：服务器 + 状态 */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-sm text-gray-900 truncate" title={proxy.server ?? undefined}>
            {proxy.server}
          </span>
          {statusKey && (
            <span className={`shrink-0 px-1.5 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[statusKey] || "text-gray-500 bg-gray-100"}`}>
              {STATUS_LABELS[statusKey] || statusKey}
            </span>
          )}
        </div>
        {/* 第二行：账号 + 类型 + 来源 */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-xs px-1 py-px rounded-full-full font-medium ${
            proxy.direction ? "text-blue-600 bg-blue-50" : "text-purple-600 bg-purple-50"
          }`}>
            {proxy.direction ? "直连" : "代理"}
          </span>
          {sourceKey && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1 py-px rounded-full">
              {SOURCE_LABELS[sourceKey] || sourceKey}
            </span>
          )}
          <span className="text-xs text-gray-500">{proxy.username }</span>
        </div>
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          disabled={actionLoading}
          className={`ml-3 px-3 py-1 text-xs rounded-lg disabled:opacity-50 shrink-0 ${
            isBound
              ? "text-red-600 bg-white border border-red-200 hover:bg-red-50"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {actionLoading ? <LoadingSpinner size="sm" /> : actionLabel}
        </button>
      )}
    </div>
  )
}
