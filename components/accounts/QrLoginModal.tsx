"use client"

import { useEffect, useCallback, useRef } from "react"
import { useQrLogin } from "@/hooks/useQrLogin"
import { QrCodeDisplay } from "@/components/accounts/QrCodeDisplay"
import { Modal } from "@/components/ui/overlay"
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
    <Modal
      open={open}
      onClose={handleClose}
      title={uid ? "重新登录" : "添加闲鱼账号"}
      size="md"
      footer={
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
        </div>
      }
    >
      <QrCodeDisplay
        qrImage={qrImage}
        scanStatus={scanStatus}
        overlayMsg={overlayMsg}
        hintMsg={hintMsg}
        canRetry={canRetry}
        onRetry={retry}
      />
    </Modal>
  )
}
