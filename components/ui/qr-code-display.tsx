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
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm text-center rounded-lg">
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
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-sm rounded-lg">
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
