"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { startQrLogin, cancelQrLogin } from "@/lib/api/accounts"

interface QrLoginModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  uid?: string  // 指定账号uid，为空则添加新账号
}

type ScanStatus = "connecting" | "qr_ready" | "scaned" | "confirmed" | "success" | "failed"

export default function QrLoginModal({ open, onClose, onSuccess, uid }: QrLoginModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sseUrl, setSseUrl] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanStatus>("connecting")
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null)
  const [hintMsg, setHintMsg] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const inRetryRef = useRef(false)

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

  const doStart = useCallback(async () => {
    setOverlayMsg(null)
    setHintMsg(null)
    setScanStatus("connecting")
    setCanRetry(false)
    inRetryRef.current = false
    try {
      const data = await startQrLogin(uid)
      setSessionId(data.session_id)
      const fullSseUrl = data.sse_url.startsWith("http")
        ? data.sse_url
        : `${API_BASE}${data.sse_url}`
      setSseUrl(fullSseUrl)
    } catch (e) {
      setOverlayMsg("启动登录失败")
      setScanStatus("failed")
      setCanRetry(true)
    }
  }, [uid])

  useEffect(() => {
    if (!sessionId || !sseUrl) return

    const eventSource = new EventSource(sseUrl)

    eventSource.addEventListener("qr_ready", (e) => {
      const data = JSON.parse(e.data)
      setQrImage(`data:image/png;base64,${data.qr_image}`)
      setScanStatus("qr_ready")
      setOverlayMsg(null)
      setHintMsg(null)
      setCanRetry(false)
      inRetryRef.current = false
    })

    eventSource.addEventListener("qr_verify", (e) => {
      // 风控验证：新二维码需要再次扫码，提示放在二维码下方以免遮挡
      const data = JSON.parse(e.data)
      setQrImage(`data:image/png;base64,${data.qr_image}`)
      setScanStatus("qr_ready")
      setOverlayMsg(null)
      setHintMsg("安全验证，请再次扫码")
      setCanRetry(false)
      inRetryRef.current = false
    })

    eventSource.addEventListener("qr_scanned", () => {
      setScanStatus("scaned")
      setOverlayMsg("扫码成功\n请确认")
    })

    eventSource.addEventListener("qr_confirmed", () => {
      setScanStatus("confirmed")
      setOverlayMsg(null)
    })

    eventSource.addEventListener("login_success", () => {
      setScanStatus("success")
      setOverlayMsg("登录成功")
      setTimeout(() => {
        onSuccess()
        // 重置所有状态后再关闭，确保下次打开是干净的状态
        setSessionId(null)
        setSseUrl(null)
        setQrImage(null)
        setScanStatus("connecting")
        setOverlayMsg(null)
        setHintMsg(null)
        setCanRetry(false)
        inRetryRef.current = false
        onClose()
      }, 1500)
    })

    eventSource.addEventListener("login_no_need", () => {
      setScanStatus("success")
      setOverlayMsg("账号已登录\n无需重新登录")
      setTimeout(() => {
        onSuccess()
        setSessionId(null)
        setSseUrl(null)
        setQrImage(null)
        setScanStatus("connecting")
        setOverlayMsg(null)
        setHintMsg(null)
        setCanRetry(false)
        inRetryRef.current = false
        onClose()
      }, 3000)
    })

    eventSource.addEventListener("login_failed", (e) => {
      const data = JSON.parse(e.data)
      setOverlayMsg(data.reason || "登录失败")
      setScanStatus("failed")
      setCanRetry(true)
    })

    eventSource.addEventListener("login_verify", (e) => {
      const data = JSON.parse(e.data)
      setOverlayMsg(data.message || "需要验证身份")
      setScanStatus("failed")
      setCanRetry(true)
    })

    eventSource.addEventListener("login_canceled", () => {
      setOverlayMsg("已取消登录\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
    })

    eventSource.addEventListener("login_expired", () => {
      setOverlayMsg("二维码已过期\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
    })

    eventSource.addEventListener("qr_canceled", () => {
      setOverlayMsg("二维码已失效\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
    })

    eventSource.addEventListener("qr_expired", () => {
      setOverlayMsg("二维码已过期\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
    })

    return () => {
      eventSource.close()
    }
  }, [sessionId, sseUrl, onSuccess, onClose])

  const handleClose = useCallback(async () => {
    if (sessionId) {
      try {
        await cancelQrLogin(sessionId)
      } catch (e) {
        console.error("取消登录失败", e)
      }
    }
    setSessionId(null)
    setSseUrl(null)
    setQrImage(null)
    setScanStatus("connecting")
    setOverlayMsg(null)
    setHintMsg(null)
    setCanRetry(false)
    inRetryRef.current = false
    onClose()
  }, [sessionId, onClose])

  const handleRetry = useCallback(async () => {
    if (inRetryRef.current) return
    inRetryRef.current = true
    setSessionId(null)
    setSseUrl(null)
    setQrImage(null)
    await doStart()
  }, [doStart])

  useEffect(() => {
    if (open && !sessionId && scanStatus === "connecting") {
      doStart()
    }
  }, [open, sessionId, scanStatus, doStart])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{uid ? "重新登录" : "添加闲鱼账号"}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 flex flex-col items-center">
          {scanStatus === "connecting" && <LoadingSpinner size="lg" />}
          <div
            className={`relative w-48 h-48 ${canRetry && qrImage ? "cursor-pointer" : ""}`}
            onClick={canRetry && qrImage ? handleRetry : undefined}
          >
            {qrImage && <img src={qrImage} alt="二维码" className="w-full h-full" />}
            {/* 蒙版 */}
            {overlayMsg && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm text-center rounded">
                {canRetry && qrImage && (
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span className="whitespace-pre-line">{overlayMsg}</span>
              </div>
            )}
            {/* 确认中 / 成功 无文字蒙版 */}
            {!overlayMsg && scanStatus === "confirmed" && qrImage && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm rounded">
                <LoadingSpinner size="sm" />
                <span className="mt-2">登录中...</span>
              </div>
            )}
          </div>
          {hintMsg && (
            <p className="mt-3 text-amber-600 text-sm font-medium">{hintMsg}</p>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}