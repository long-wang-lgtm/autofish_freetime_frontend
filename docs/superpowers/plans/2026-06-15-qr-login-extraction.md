# QR 登录通用组件提取 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提取 QrLoginModal 和 link-login 页面中重复的 SSE 连接、状态管理、QR 码展示逻辑为通用 hook 和展示组件。

**Architecture:** `useQrLogin` hook 接管全部 SSE 生命周期和状态流转，`QrCodeDisplay` 组件纯展示二维码及蒙版。调用方只需传入 `startLogin` / `cancelLogin` 两个异步函数，其余由 hook 内部处理。

**Tech Stack:** React 19 + TypeScript + Next.js + Tailwind CSS v4 + EventSource API

---

### Task 1: 创建共享类型文件 `types/qr-login.ts`

**Files:**
- Create: `types/qr-login.ts`

- [ ] **Step 1: 写入类型定义**

```ts
export type ScanStatus =
  | "connecting"
  | "qr_ready"
  | "scaned"
  | "confirmed"
  | "success"
  | "failed"

export interface QrLoginState {
  qrImage: string | null
  scanStatus: ScanStatus
  overlayMsg: string | null
  hintMsg: string | null
  canRetry: boolean
}

export interface UseQrLoginOptions {
  /** 启动登录，返回 session_id 和 SSE URL */
  startLogin: () => Promise<{ session_id: string; sse_url: string }>
  /** 取消登录 */
  cancelLogin: (sessionId: string) => Promise<void>
  /** 登录成功回调（hook 内部延迟后调用并自动清理） */
  onSuccess?: () => void
  /** 挂载时自动启动登录（适用于页面场景） */
  autoStart?: boolean
}

export interface UseQrLoginReturn extends QrLoginState {
  start: () => Promise<void>
  retry: () => Promise<void>
  cleanup: () => Promise<void>
}
```

- [ ] **Step 2: 提交**

```bash
git add types/qr-login.ts
git commit -m "feat: add qr-login shared types"
```

---

### Task 2: 创建 `hooks/useQrLogin.ts`

**Files:**
- Create: `hooks/useQrLogin.ts`

- [ ] **Step 1: 写入 hook 实现**

```ts
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
  }, [autoStart]) // eslint-disable-line react-hooks/exhaustive-deps

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
```

- [ ] **Step 2: 提交**

```bash
git add hooks/useQrLogin.ts
git commit -m "feat: add useQrLogin hook — SSE management, state, retry, autoStart"
```

---

### Task 3: 创建 `components/ui/qr-code-display.tsx`

**Files:**
- Create: `components/ui/qr-code-display.tsx`

- [ ] **Step 1: 写入展示组件**

```tsx
"use client"

import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { ScanStatus } from "@/types/qr-login"

interface QrCodeDisplayProps {
  qrImage: string | null
  scanStatus: ScanStatus
  overlayMsg: string | null
  hintMsg: string | null
  canRetry: boolean
  onRetry?: () => void
  size?: "sm" | "md" | "lg"
}

const sizeClasses: Record<NonNullable<QrCodeDisplayProps["size"]>, string> = {
  sm: "w-40 h-40",
  md: "w-48 h-48",
  lg: "w-56 h-56",
}

export function QrCodeDisplay({
  qrImage,
  scanStatus,
  overlayMsg,
  hintMsg,
  canRetry,
  onRetry,
  size = "md",
}: QrCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      {scanStatus === "connecting" && <LoadingSpinner size="lg" />}

      <div
        className={`relative ${sizeClasses[size]} ${
          canRetry && qrImage ? "cursor-pointer" : ""
        }`}
        onClick={canRetry && qrImage ? onRetry : undefined}
      >
        {qrImage && (
          <img src={qrImage} alt="二维码" className="w-full h-full" />
        )}

        {/* 失败/过期蒙版：刷新图标 + 消息 */}
        {overlayMsg && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm text-center rounded">
            {canRetry && qrImage && (
              <svg
                className="w-6 h-6 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span className="whitespace-pre-line">{overlayMsg}</span>
          </div>
        )}

        {/* 确认中 / 成功 — 无文字蒙版，显示加载动画 */}
        {!overlayMsg &&
          (scanStatus === "confirmed" || scanStatus === "success") &&
          qrImage && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm rounded">
              <LoadingSpinner size="sm" />
              <span className="mt-2">
                {scanStatus === "success" ? "登录成功" : "登录中..."}
              </span>
            </div>
          )}
      </div>

      {hintMsg && (
        <p className="mt-3 text-amber-600 text-sm font-medium">{hintMsg}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add components/ui/qr-code-display.tsx
git commit -m "feat: add QrCodeDisplay component — QR image with overlay states, 3 sizes"
```

---

### Task 4: 改造 `QrLoginModal.tsx`

**Files:**
- Modify: `components/accounts/QrLoginModal.tsx`（全文替换）

- [ ] **Step 1: 用 hook + 展示组件重写**

```tsx
"use client"

import { useEffect, useCallback, useRef } from "react"
import { useQrLogin } from "@/hooks/useQrLogin"
import { QrCodeDisplay } from "@/components/ui/qr-code-display"
import { startQrLogin, cancelQrLogin } from "@/lib/api/accounts"

interface QrLoginModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  uid?: string
}

export default function QrLoginModal({
  open,
  onClose,
  onSuccess,
  uid,
}: QrLoginModalProps) {
  const handleSuccess = useCallback(() => {
    onSuccess()
    onClose()
  }, [onSuccess, onClose])

  const {
    qrImage,
    scanStatus,
    overlayMsg,
    hintMsg,
    canRetry,
    start,
    retry,
    cleanup,
  } = useQrLogin({
    startLogin: () => startQrLogin(uid),
    cancelLogin: (sessionId) => cancelQrLogin(sessionId),
    onSuccess: handleSuccess,
  })

  const startedRef = useRef(false)

  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true
      start()
    }
    if (!open) {
      startedRef.current = false
    }
  }, [open, start])

  const handleClose = useCallback(async () => {
    startedRef.current = false
    await cleanup()
    onClose()
  }, [cleanup, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {uid ? "重新登录" : "添加闲鱼账号"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <QrCodeDisplay
            qrImage={qrImage}
            scanStatus={scanStatus}
            overlayMsg={overlayMsg}
            hintMsg={hintMsg}
            canRetry={canRetry}
            onRetry={retry}
          />
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
```

- [ ] **Step 2: 提交**

```bash
git add components/accounts/QrLoginModal.tsx
git commit -m "refactor: QrLoginModal uses useQrLogin hook + QrCodeDisplay"
```

---

### Task 5: 改造 `link-login/[token]/page.tsx`

**Files:**
- Modify: `app/link-login/[token]/page.tsx`（全文替换）

- [ ] **Step 1: 用 hook + 展示组件重写，去除 localStorage**

```tsx
"use client"

import { useCallback } from "react"
import { useParams } from "next/navigation"
import { useQrLogin } from "@/hooks/useQrLogin"
import { QrCodeDisplay } from "@/components/ui/qr-code-display"

export const runtime = "edge"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

export default function LinkLoginPage() {
  const params = useParams()
  const token = params.token as string

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
    cleanup,
  } = useQrLogin({
    startLogin: async () => {
      const response = await fetch(
        `${API_BASE}/api/login/link/${token}/qr/start`,
        { method: "POST" }
      )
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: "请求失败" }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }
      return response.json()
    },
    cancelLogin: async (sessionId) => {
      await fetch(`${API_BASE}/api/login/qr/${sessionId}/cancel`, {
        method: "DELETE",
      })
    },
    onSuccess: handleSuccess,
    autoStart: true,
  })

  const handleCancel = useCallback(async () => {
    await cleanup()
  }, [cleanup])

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
```

- [ ] **Step 2: 提交**

```bash
git add app/link-login/[token]/page.tsx
git commit -m "refactor: link-login page uses useQrLogin + QrCodeDisplay, remove localStorage persistence"
```

---

### Task 6: 类型检查验证

**Files:** 无（验证步骤）

- [ ] **Step 1: 运行 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。

- [ ] **Step 2: 确认文件清单**

```bash
git status
```

应看到 5 个文件变更（3 新增 + 2 修改），无遗漏。

---

## 执行顺序

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

类型先行 → 逻辑 hook → 展示组件 → 改造两个调用方 → 验证。

## 改造成果

| 文件 | 改前行数 | 改后行数 | 减少 |
|------|---------|---------|------|
| QrLoginModal.tsx | 250 | ~95 | -62% |
| link-login/[token]/page.tsx | 357 | ~110 | -69% |
| **净增** | — | `types/qr-login.ts` (25行) + `useQrLogin.ts` (175行) + `qr-code-display.tsx` (90行) | — |
