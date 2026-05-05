"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type ScanStatus = "loading" | "qr_ready" | "scaned" | "confirmed" | "success" | "failed" | "expired" | "cancelled"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!
const STORAGE_KEY = (token: string) => `link_login_${token}`

interface SavedState {
  sessionId: string
  qrImage: string | null
  scanStatus: ScanStatus
  overlayMsg: string | null
  hintMsg: string | null
  timestamp: number
}

export default function LinkLoginPage() {
  const params = useParams()
  const token = params.token as string

  const [qrImage, setQrImage] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanStatus>("loading")
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null)
  const [hintMsg, setHintMsg] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const inRetryRef = useRef(false)
  const initializedRef = useRef(false)

  const connectSSERef = useRef<((sseUrl: string) => void) | null>(null)
  const startNewSessionRef = useRef<(() => Promise<string | null>) | null>(null)

  const saveState = useCallback((sessionId: string, data: Partial<SavedState>) => {
    const existing = getStoredState()
    const state: SavedState = {
      sessionId,
      qrImage: data.qrImage ?? existing?.qrImage ?? null,
      scanStatus: data.scanStatus ?? existing?.scanStatus ?? "loading",
      overlayMsg: data.overlayMsg ?? existing?.overlayMsg ?? null,
      hintMsg: data.hintMsg ?? existing?.hintMsg ?? null,
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY(token), JSON.stringify(state))
  }, [token])

  const getStoredState = useCallback((): SavedState | null => {
    const raw = localStorage.getItem(STORAGE_KEY(token))
    if (!raw) return null
    try {
      return JSON.parse(raw) as SavedState
    } catch {
      return null
    }
  }, [token])

  const clearState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY(token))
  }, [token])

  const getStoredSession = useCallback((): string | null => {
    return getStoredState()?.sessionId ?? null
  }, [getStoredState])

  const saveSession = useCallback((sessionId: string) => {
    saveState(sessionId, { scanStatus: "loading" })
  }, [saveState])

  const connectSSE = useCallback((sseUrl: string) => {
    const fullSseUrl = sseUrl.startsWith("http") ? sseUrl : `${API_BASE}${sseUrl}`
    const eventSource = new EventSource(fullSseUrl)
    eventSourceRef.current = eventSource

    eventSource.addEventListener("qr_ready", (e) => {
      const data = JSON.parse(e.data)
      setQrImage(`data:image/png;base64,${data.qr_image}`)
      setScanStatus("qr_ready")
      setOverlayMsg(null)
      setHintMsg(null)
      setCanRetry(false)
      setCancelled(false)
      saveState(getStoredSession(), { qrImage: `data:image/png;base64,${data.qr_image}`, scanStatus: "qr_ready" })
    })

    eventSource.addEventListener("qr_verify", (e) => {
      const data = JSON.parse(e.data)
      setQrImage(`data:image/png;base64,${data.qr_image}`)
      setScanStatus("qr_ready")
      setOverlayMsg(null)
      setHintMsg("安全验证，请再次扫码")
      setCanRetry(false)
      setCancelled(false)
      saveState(getStoredSession(), { qrImage: `data:image/png;base64,${data.qr_image}`, scanStatus: "qr_ready", hintMsg: "安全验证，请再次扫码" })
    })

    eventSource.addEventListener("qr_scanned", () => {
      setScanStatus("scaned")
      setOverlayMsg("扫码成功\n请确认")
      setCancelled(false)
      saveState(getStoredSession(), { scanStatus: "scaned", overlayMsg: "扫码成功\n请确认" })
    })

    eventSource.addEventListener("qr_confirmed", () => {
      setScanStatus("confirmed")
      setOverlayMsg(null)
      setCancelled(false)
      saveState(getStoredSession(), { scanStatus: "confirmed" })
    })

    eventSource.addEventListener("login_success", () => {
      setScanStatus("success")
      setOverlayMsg("登录成功")
      setCancelled(false)
      clearState()
    })

    eventSource.addEventListener("login_failed", (e) => {
      const data = JSON.parse(e.data)
      setOverlayMsg(data.reason || "登录失败")
      setScanStatus("failed")
      setCanRetry(true)
      setCancelled(false)
      clearState()
    })

    eventSource.addEventListener("login_verify", (e) => {
      const data = JSON.parse(e.data)
      setOverlayMsg(data.message || "需要验证身份")
      setScanStatus("failed")
      setCanRetry(true)
      setCancelled(false)
      clearState()
    })

    eventSource.addEventListener("login_canceled", () => {
      setOverlayMsg("已取消登录\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
      setCancelled(false)
      clearState()
    })

    eventSource.addEventListener("login_expired", () => {
      setOverlayMsg("二维码已过期\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
      setCancelled(false)
      clearState()
    })

    eventSource.addEventListener("qr_canceled", () => {
      setOverlayMsg("二维码已失效\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
      setCancelled(false)
      clearState()
    })

    eventSource.addEventListener("qr_expired", () => {
      setOverlayMsg("二维码已过期\n点击刷新")
      setScanStatus("failed")
      setCanRetry(true)
      setCancelled(false)
      clearState()
    })

    eventSource.onerror = () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [API_BASE, saveState, getStoredSession, clearState])

  const startNewSession = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/api/login/link/${token}/qr/start`, {
        method: "POST",
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "请求失败" }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
      const data = await response.json()
      saveSession(data.session_id)
      return data.sse_url
    } catch (e) {
      setOverlayMsg("启动登录失败")
      setScanStatus("failed")
      setCanRetry(true)
      return null
    }
  }, [token, API_BASE, saveSession])

  connectSSERef.current = connectSSE
  startNewSessionRef.current = startNewSession

  const handleCancel = useCallback(async () => {
    const sessionId = getStoredSession()
    if (sessionId) {
      try {
        await fetch(`${API_BASE}/api/login/qr/${sessionId}/cancel`, { method: "DELETE" })
      } catch { /* ignore */ }
    }
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setCancelled(true)
    setOverlayMsg("已取消登录\n请点击重新获取")
    setCanRetry(true)
  }, [getStoredSession, API_BASE])

  const handleRetry = useCallback(async () => {
    if (inRetryRef.current) return
    inRetryRef.current = true

    // 先取消当前session
    const sessionId = getStoredSession()
    if (sessionId) {
      try {
        await fetch(`${API_BASE}/api/login/qr/${sessionId}/cancel`, { method: "DELETE" })
      } catch { /* ignore */ }
    }

    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setCancelled(false)
    setQrImage(null)
    setScanStatus("loading")
    setOverlayMsg(null)

    const sseUrl = await startNewSessionRef.current?.()
    if (sseUrl) connectSSERef.current?.(sseUrl)

    inRetryRef.current = false
  }, [getStoredSession, API_BASE])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      const existingSession = getStoredSession()
      if (existingSession) {
        try {
          const resp = await fetch(`${API_BASE}/api/login/qr/${existingSession}/exists`)
          const data = await resp.json()
          if (data.exists) {
            const saved = getStoredState()
            if (saved) {
              setQrImage(saved.qrImage)
              setScanStatus(saved.scanStatus)
              setOverlayMsg(saved.overlayMsg)
              setHintMsg(saved.hintMsg)
              setCanRetry(saved.scanStatus === "failed" || saved.scanStatus === "expired")
            }
            const sseUrl = `/api/login/qr/sse?session=${existingSession}`
            connectSSE(sseUrl)
            return
          }
        } catch { /* 继续尝试新session */ }
        clearState()
      }

      setQrImage(null)
      setScanStatus("loading")
      setOverlayMsg(null)
      setHintMsg(null)
      setCanRetry(false)
      setCancelled(false)
      const sseUrl = await startNewSession()
      if (sseUrl) connectSSE(sseUrl)
    }

    init()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 text-center border-b bg-gradient-to-r from-purple-50 to-fuchsia-50">
          <h1 className="text-xl font-bold text-gray-900">扫码登录</h1>
          <p className="text-sm text-gray-500 mt-1">请扫描下方二维码登录闲鱼</p>
        </div>
        <div className="p-8 flex flex-col items-center">
          {scanStatus === "loading" && <LoadingSpinner size="lg" />}

          {qrImage && (
            <div className="relative w-48 h-48">
              <img src={qrImage} alt="二维码" className="w-full h-full" />
              {/* 蒙板：任何overlayMsg都显示 */}
              {overlayMsg && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm text-center rounded">
                  {canRetry && (
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span className="whitespace-pre-line">{overlayMsg}</span>
                </div>
              )}
              {/* confirmed/success无文字蒙版（加载中状态） */}
              {!overlayMsg && (scanStatus === "confirmed" || scanStatus === "success") && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm rounded">
                  <LoadingSpinner size="sm" />
                  <span className="mt-2">{scanStatus === "success" ? "登录成功" : "登录中..."}</span>
                </div>
              )}
            </div>
          )}

          {hintMsg && (
            <p className="mt-3 text-amber-600 text-sm font-medium">{hintMsg}</p>
          )}

          {scanStatus === "success" && (
            <p className="mt-4 text-green-600 text-sm">页面将在2秒后关闭...</p>
          )}

          {scanStatus !== "success" && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCancel}
                disabled={cancelled}
                className="px-4 py-2 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                取消登录
              </button>
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重新获取
              </button>
            </div>
          )}
        </div>
        {/* <div className="px-6 py-4 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">登录成功后，闲鱼账号将自动绑定到分享链接的用户</p>
        </div> */}
      </div>
    </div>
  )
}