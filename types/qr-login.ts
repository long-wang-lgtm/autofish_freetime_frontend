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
