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

export function QrLoginModal({
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
    cancelLogin: async (sessionId) => { await cancelQrLogin(sessionId) },
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
    await cleanup()
    onClose()
  }, [cleanup, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
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
