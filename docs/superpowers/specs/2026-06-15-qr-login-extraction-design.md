# QR 登录通用组件提取 — 设计文档

日期: 2026-06-15

## 目标

将 `QrLoginModal.tsx` 和 `link-login/[token]/page.tsx` 中重复的 SSE 事件处理、状态管理、二维码展示逻辑提取为通用 hook 和展示组件。

## 架构

```
hooks/useQrLogin.ts          ← 纯逻辑 hook（SSE、状态、重试、取消）
components/ui/qr-code-display.tsx  ← 纯展示组件（二维码 + 蒙版）
types/qr-login.ts            ← 共享类型
```

调用方只需提供 `startLogin` / `cancelLogin` 两个异步函数，其余全部由 hook 内部处理。

## 类型定义 (`types/qr-login.ts`)

```ts
type ScanStatus = "connecting" | "qr_ready" | "scaned" | "confirmed" | "success" | "failed"

interface QrLoginState {
  qrImage: string | null
  scanStatus: ScanStatus
  overlayMsg: string | null
  hintMsg: string | null
  canRetry: boolean
}

interface UseQrLoginOptions {
  startLogin: () => Promise<{ session_id: string; sse_url: string }>
  cancelLogin: (sessionId: string) => Promise<void>
  onSuccess?: () => void
}

interface UseQrLoginReturn extends QrLoginState {
  retry: () => Promise<void>
  cleanup: () => Promise<void>
}
```

## Hook (`hooks/useQrLogin.ts`)

**职责：** SSE 连接管理、11 种事件处理、状态流转、重试/取消。

**内部流程：**

1. 调用方调用 `start()` → 执行 `startLogin()` → 拿到 session_id + sse_url → 建立 EventSource
2. SSE 事件到达 → 更新 state（qrImage / scanStatus / overlayMsg / hintMsg / canRetry）
3. `login_success` / `login_no_need` → 延迟 1.5s/3s → 调用 `onSuccess()` + 自动清理
4. `retry()` → 取消旧 session → 重置状态 → `start()`
5. `cleanup()` → 取消 session → 关闭 SSE → 重置所有状态

**防竞态：** `inRetryRef` 防止重复重试。

## 展示组件 (`components/ui/qr-code-display.tsx`)

纯展示，无业务逻辑：

| scanStatus | 渲染 |
|-----------|------|
| connecting | 居中 LoadingSpinner |
| qr_ready | 二维码图片（canRetry 时可点击重试） |
| scaned | 二维码 + 半透明蒙版 "扫码成功\n请确认" |
| confirmed | 二维码 + 半透明蒙版 LoadingSpinner + "登录中..." |
| success | 二维码 + 半透明蒙版 "登录成功" |
| failed (canRetry) | 二维码 + 半透明蒙版 刷新图标 + overlayMsg |
| failed (!canRetry) | 半透明蒙版 overlayMsg（无二维码） |
| hintMsg | 二维码下方琥珀色提示文字 |

**Size 变体：** `'sm'` (w-40 h-40), `'md'` (w-48 h-48, 默认), `'lg'` (w-56 h-56)

## 改造 QrLoginModal

- 去掉所有 SSE 逻辑、状态声明、事件处理
- 改用 `useQrLogin({ startLogin: () => startQrLogin(uid), cancelLogin: (sid) => cancelQrLogin(sid), onSuccess })`
- 保留 Modal 容器、标题栏、取消按钮
- 用 `<QrCodeDisplay ...state onRetry={retry} />` 替换二维码区域

## 改造 link-login 页面

- 去掉所有 SSE 逻辑、状态声明、localStorage
- 改用 `useQrLogin({ startLogin: () => fetch(...), cancelLogin: (sid) => fetch(...), onSuccess })`
- 提供内联 fetch 函数（不需要 API 封装，直接调用 link 专用端点）
- 保留全页渐变色布局、标题区、底部提示区
- 用 `<QrCodeDisplay ...state onRetry={retry} />` 替换二维码区域

## 文件变更

| 操作 | 文件 |
|------|------|
| 新增 | `types/qr-login.ts` |
| 新增 | `hooks/useQrLogin.ts` |
| 新增 | `components/ui/qr-code-display.tsx` |
| 修改 | `components/accounts/QrLoginModal.tsx`（大幅简化 ~250→~70 行） |
| 修改 | `app/link-login/[token]/page.tsx`（大幅简化 ~357→~80 行，去除 localStorage） |

## 边界情况

- Session 创建失败 → `failed` 状态 + `canRetry: true` + 错误 overlayMsg
- SSE 断开 → 浏览器自动重连（EventSource 默认行为）
- 二维码过期 → `failed` 状态 + `canRetry: true` + "二维码已过期\n点击刷新"
- 风控验证 → 新二维码 + hintMsg "安全验证，请再次扫码"
- 账号已登录 → `success` + "账号已登录\n无需重新登录" → 3s 后 onSuccess
- 组件卸载 → `cleanup()` 取消 session + 关闭 SSE
