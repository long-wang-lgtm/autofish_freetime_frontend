"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { ScanStatus, UseQrLoginOptions, UseQrLoginReturn } from "@/types/qr-login"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export function useQrLogin({
  startLogin,
  cancelLogin,
  onSuccess,
  autoStart,
}: UseQrLoginOptions): UseQrLoginReturn {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sseUrl, setSseUrl] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanStatus>("connecting")
  const [overlayMsg, setOverlayMsg] = useState<string | null>(null)
  const [hintMsg, setHintMsg] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const inRetryRef = useRef(false)

  const reset = useCallback(() => {
    setSessionId(null)
    setSseUrl(null)
    setQrImage(null)
    setScanStatus("connecting")
    setOverlayMsg(null)
    setHintMsg(null)
    setCanRetry(false)
    inRetryRef.current = false
  }, [])

  const start = useCallback(async () => {
    setOverlayMsg(null)
    setHintMsg(null)
    setScanStatus("connecting")
    setCanRetry(false)
    inRetryRef.current = false
    try {
      const data = await startLogin()
      setSessionId(data.session_id)
      const fullSseUrl = data.sse_url.startsWith("http")
        ? data.sse_url
        : `${API_BASE}${data.sse_url}`
      setSseUrl(fullSseUrl)
    } catch {
      setOverlayMsg("启动登录失败")
      setScanStatus("failed")
      setCanRetry(true)
    }
  }, [startLogin])

  const retry = useCallback(async () => {
    if (inRetryRef.current) return
    inRetryRef.current = true
    if (sessionId) {
      try { await cancelLogin(sessionId) } catch { /* ignore */ }
    }
    reset()
    await start()
    inRetryRef.current = false
  }, [sessionId, cancelLogin, reset, start])

  const cleanup = useCallback(async () => {
    if (sessionId) {
      try { await cancelLogin(sessionId) } catch { /* ignore */ }
    }
    reset()
  }, [sessionId, cancelLogin, reset])

  // autoStart — 页面场景挂载即启动
  useEffect(() => {
    if (autoStart && !sessionId && scanStatus === "connecting") {
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  // SSE connection
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
        onSuccess?.()
        reset()
      }, 1500)
    })

    eventSource.addEventListener("login_no_need", () => {
      setScanStatus("success")
      setOverlayMsg("账号已登录\n无需重新登录")
      setTimeout(() => {
        onSuccess?.()
        reset()
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
  }, [sessionId, sseUrl, onSuccess, reset])

  return {
    qrImage,
    scanStatus,
    overlayMsg,
    hintMsg,
    canRetry,
    start,
    retry,
    cleanup,
  }
}
