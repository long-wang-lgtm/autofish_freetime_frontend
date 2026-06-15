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
  /** 启动登录，返回 session_id，SSE URL 由 hook 内部构造 */
  startLogin: () => Promise<{ session_id: string }>
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
  /** 取消服务端会话，保留二维码并显示蒙版提示 */
  cancel: () => Promise<void>
  /** 完全清理：取消会话 + 重置所有状态 */
  cleanup: () => Promise<void>
}
