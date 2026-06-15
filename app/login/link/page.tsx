"use client"

import { useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useQrLogin } from "@/hooks/useQrLogin"
import { QrCodeDisplay } from "@/components/ui/qr-code-display"

export const runtime = "edge"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export default function LinkLoginPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const uid = searchParams.get("uid")

  const handleSuccess = useCallback(() => {
    // 登录成功后页面关闭（由外部窗口控制或用户手动关闭）
  }, [])

  const {
    qrImage,
    scanStatus,
    overlayMsg,
    hintMsg,
    canRetry,
    retry,
    cancel,
    cleanup,
  } = useQrLogin({
    startLogin: async () => {
      const response = await fetch(
        `${API_BASE}/api/login/link/start?token=${token}${uid ? `&uid=${uid}` : ""}`,
        { method: "POST" }
      )
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: "请求失败" }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
      const data = await response.json()
      return { session_id: data.session_id }
    },
    cancelLogin: async (sessionId) => {
      await fetch(`${API_BASE}/api/login/link/${sessionId}`, {
        method: "DELETE",
      })
    },
    onSuccess: handleSuccess,
    autoStart: !!token,
  })

  const handleCancel = useCallback(async () => {
    await cancel()
  }, [cancel])

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">无效链接</h1>
          <p className="text-sm text-gray-500">缺少 token 参数，请检查链接是否完整</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 text-center border-b bg-gradient-to-r from-purple-50 to-fuchsia-50">
          <h1 className="text-xl font-bold text-gray-900">扫码登录</h1>
          <p className="text-sm text-gray-500 mt-1">请扫描下方二维码登录闲鱼</p>
        </div>
        <div className="p-8 flex flex-col items-center">
          <QrCodeDisplay
            qrImage={qrImage}
            scanStatus={scanStatus}
            overlayMsg={overlayMsg}
            hintMsg={hintMsg}
            canRetry={canRetry}
            onRetry={retry}
          />

          {scanStatus === "success" && (
            <p className="mt-4 text-green-600 text-sm">页面将在2秒后关闭...</p>
          )}

          {scanStatus !== "success" && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                取消登录
              </button>
              <button
                onClick={retry}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重新获取
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-red-50 text-center border-t border-red-200">
          <p className="text-sm text-amber-700 font-semibold flex items-center justify-center gap-1">
            <span>⚠️</span> 重要提示
          </p>
          <p className="text-sm text-red-600 font-semibold leading-relaxed">
            🔔 扫码后请不要关闭此页面，请等待验证通过
            <br />
            登录成功后，闲鱼账号将自动绑定到分享链接的用户
          </p>
        </div>
      </div>
    </div>
  )
}
