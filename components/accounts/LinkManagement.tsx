"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/components/ui/toaster"
import {
  listLinkTokens,
  createLinkToken,
  deleteLinkToken,
  buildLinkUrl,
  type LinkToken,
} from "@/lib/api/link-login"

interface LinkManagementProps {
  open: boolean
  onClose: () => void
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "刚刚"
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function LinkManagement({ open, onClose }: LinkManagementProps) {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [creatingToken, setCreatingToken] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["link-tokens"],
    queryFn: listLinkTokens,
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: createLinkToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-tokens"] })
      addToast({ title: "链接已生成", description: "可复制链接分享给他人扫码登录" })
    },
    onError: (e: Error) => {
      addToast({ title: "生成失败", description: e.message, variant: "error" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLinkToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-tokens"] })
      addToast({ title: "已删除", description: "链接已失效" })
    },
    onError: (e: Error) => {
      addToast({ title: "删除失败", description: e.message, variant: "error" })
    },
  })

  const handleCopy = useCallback(async (token: string) => {
    const fullUrl = buildLinkUrl(token)
    await navigator.clipboard.writeText(fullUrl)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }, [])

  const handleCreate = useCallback(async () => {
    try {
      const result = await createMutation.mutateAsync()
      setCreatingToken(result.token)
    } catch {
      // Error handled by mutation
    }
  }, [createMutation])

  const handleDelete = useCallback(
    (token: string) => {
      deleteMutation.mutate(token)
    },
    [deleteMutation]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">链接管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              管理分享的登录链接，他人可通过链接扫码登录闲鱼账号
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            {/* 生成按钮 */}
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 disabled:from-purple-400 disabled:to-fuchsia-400 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
              生成链接
            </button>

            {/* 新创建的链接展示 */}
            {creatingToken && (
              <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-fuchsia-50 to-white shadow-md">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-fuchsia-500/5" />
                <div className="relative p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700">链接已生成</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={buildLinkUrl(creatingToken)}
                      className="flex-1 px-3 py-2 bg-white/80 rounded-lg text-sm text-gray-800 border border-purple-100 focus:outline-none font-mono truncate"
                    />
                    <button
                      onClick={() => handleCopy(creatingToken)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                    >
                      {copiedToken === creatingToken ? "已复制" : "复制"}
                    </button>
                  </div>
                  <button
                    onClick={() => setCreatingToken(null)}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    收起
                  </button>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-sm text-gray-500">加载中...</p>
              </div>
            )}

            {/* 错误状态 */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-red-50/50 border border-red-100">
                <svg className="w-10 h-10 text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-600 font-medium">加载失败</p>
                <p className="text-xs text-red-400 mt-1">{String(error)}</p>
              </div>
            )}

            {/* 空状态 */}
            {!isLoading && !error && (!data || data.length === 0) && !creatingToken && (
              <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/30">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">暂无登录链接</h3>
                <p className="text-sm text-gray-400 max-w-xs text-center">
                  点击「生成链接」创建一个分享链接，他人即可扫码登录闲鱼账号
                </p>
              </div>
            )}

            {/* 链接列表 */}
            {!isLoading && !error && data && data.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium text-gray-600">
                    共 {data.length} 个链接
                  </span>
                </div>
                <div className="space-y-2">
                  {data.map((item) => (
                    <div
                      key={item.token}
                      className="group flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-mono text-gray-800 truncate">
                            {item.token.substring(0, 16)}...
                          </span>
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full shrink-0">
                            有效
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(item.token)}
                          className="px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          {copiedToken === item.token ? "已复制" : "复制"}
                        </button>
                        <button
                          onClick={() => handleDelete(item.token)}
                          disabled={deleteMutation.isPending}
                          className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? <LoadingSpinner size="sm" /> : "删除"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
