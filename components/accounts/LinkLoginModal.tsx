"use client"

import { useState, useCallback } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { fetchApi } from "@/lib/utils/api"

interface LinkLoginModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

async function createLinkLogin(): Promise<{ link: string; token: string }> {
  return fetchApi<{ link: string; token: string }>('/api/login/link/create', { method: 'POST' })
}

async function deleteLinkLogin(token: string): Promise<void> {
  await fetchApi(`/api/login/link/${encodeURIComponent(token)}`, { method: 'DELETE' })
}

export default function LinkLoginModal({ open, onClose, onSuccess }: LinkLoginModalProps) {
  const [link, setLink] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await createLinkLogin()
      setLink(data.link)
      setToken(data.token)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    if (!link) return
    const fullUrl = window.location.origin + link
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [link])

  const handleDelete = useCallback(async () => {
    if (!token) return
    await deleteLinkLogin(token)
    setLink(null)
    setToken(null)
  }, [token])

  const handleClose = useCallback(() => {
    setLink(null)
    setToken(null)
    setError(null)
    setCopied(false)
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">链接登录</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center py-6">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-500">生成链接中...</p>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center py-4">{error}</div>
          )}

          {!loading && !link && !error && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                生成一个链接，分享给他人扫描二维码登录闲鱼。登录成功后，闲鱼账号将绑定到您的账户下。
              </p>
              <button
                onClick={handleCreate}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-medium rounded-lg transition-colors"
              >
                生成登录链接
              </button>
            </div>
          )}

          {link && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                链接已生成，请分享给需要登录闲鱼账号的人。
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.origin + link}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 text-red-600 border border-red-300 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                >
                  删除链接
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}