# 错误处理规范

> **Phase 0 进展 (2026-06-29)**：Error Boundary ✅ 已创建并包裹两个 Layout、生产 console 清理 ✅ (selection.ts 23处 debug 已删 + compiler.removeConsole 已配置)。剩余 ErrorBanner/EmptyState/401 拦截/网络检测 待后续 Phase。
>
> 当前项目零 Error Boundary、3 种 ErrorBanner 实现散落各处、toaster 使用场景不统一。本文档定义错误处理的统一标准。

## 一、Error Boundary（全局异常捕获）✅ 已实现

### 已实现 (Phase 0, 2026-06-29)

`components/ui/error-boundary.tsx` 已创建，DashboardLayout 和 AdminLayout 的 `{children}` 已包裹。

项目当前无 Error Boundary，任何组件渲染异常会导致白屏。必须在布局层级添加：

```tsx
// components/ui/error-boundary.tsx（待创建）
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
          <p className="text-lg font-semibold text-gray-700">页面出现异常</p>
          <p className="text-sm text-gray-500">{this.state.error?.message ?? '未知错误'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**放置位置**：

```tsx
// app/dashboard/layout.tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>

// app/admin/layout.tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

**铁律**：DashboardLayout 和 AdminLayout 的 `{children}` 必须由 ErrorBoundary 包裹。

## 二、API 错误分类与处理

### 错误类型与用户提示

| HTTP 状态码 | 错误类型 | 用户提示 | 处理方式 |
|------------|----------|----------|----------|
| 400 | 请求参数错误 | 显示后端返回的具体错误信息 | `toast.error(detail)` |
| 401 | 未认证 | "登录已过期，请重新登录" | 清除 token → 跳转登录页 |
| 403 | 无权限 | "没有权限执行此操作" | `toast.error(...)` |
| 404 | 资源不存在 | "请求的资源不存在" | `toast.error(...)` |
| 409 | 冲突 | 显示后端返回的冲突原因 | `toast.error(detail)` |
| 422 | 校验失败 | 显示字段级错误信息 | 表单内联错误 或 `toast.error` |
| 500 | 服务器错误 | "服务器异常，请稍后重试" | `toast.error(...)` |
| 网络断开 | 无响应 | "网络连接失败，请检查网络" | `toast.error(...)` + 不自动重试 |

### 401 全局拦截

`lib/utils/api.ts` 的 `fetchApi` 必须添加 401 拦截：

```tsx
// ✅ 401 自动处理
if (response.status === 401) {
  // 清除本地 token
  clearTokens()
  // 跳转登录页
  window.location.href = '/login'
  throw new Error('登录已过期，请重新登录')
}
```

### 网络断开检测

根布局应添加在线/离线监听：

```tsx
// app/layout.tsx 或专用 hook
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}
```

离线时在页面顶部显示横幅："当前处于离线状态，部分功能不可用"。

## 三、组件级错误展示

### ErrorBanner（统一组件，待创建）

```
components/ui/error-banner.tsx
```

```tsx
interface ErrorBannerProps {
  message: string
  variant?: 'banner' | 'inline'   // banner=全宽横幅, inline=卡片内嵌
  onRetry?: () => void
}

// 使用示例
<ErrorBanner
  message="加载商品列表失败"
  variant="banner"
  onRetry={() => refetch()}
/>
```

**铁律**：所有 API 错误在 UI 层的展示统一使用 ErrorBanner。当前项目中 3 种不同的错误展示（`bg-red-50 border-red-200 p-4` 各有不同的 margin 处理）必须合并到此组件。

当前待合并的错误展示位置：
- `accounts/page.tsx` 第 134 行 — `bg-red-50 border border-red-200 rounded-lg p-4 text-red-700`
- `ItemsTab.tsx` 第 103 行 — 同上 + `m-4`
- `RulesTab.tsx` 第 152 行 — 同上 + `m-4`

### 空状态（统一组件，待创建）

```
components/ui/empty-state.tsx
```

```tsx
interface EmptyStateProps {
  icon?: string               // emoji 或图标名，默认 "📦"
  title: string               // "暂无商品"
  description?: string        // 引导文案
  action?: {                  // 可选 CTA
    label: string
    onClick: () => void
  }
}

// 使用示例
<EmptyState
  icon="📦"
  title="暂无商品"
  description="点击下方按钮添加第一件商品"
  action={{ label: "添加商品", onClick: handleAdd }}
/>
```

**铁律**：所有空数据场景统一使用 EmptyState。不允许纯文字 `暂无数据` 无图标、无引导的展示。

### 加载状态

统一使用 `LoadingSpinner`（`components/ui/loading-spinner.tsx`）包裹：

```tsx
// ✅ 页面级加载
{isLoading && (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
    <span className="ml-3 text-gray-400">加载中...</span>
  </div>
)}

// ✅ 列表/卡片级加载
{isLoading && <LoadingSpinner size="md" />}

// ❌ 纯文字无 Spinner
<p className="text-gray-500">加载中...</p>
```

## 四、Toast 通知规范

`components/ui/toaster.tsx` 的 `useToast()` 提供 `toast.error()` / `toast.success()` / `toast.warning()` / `toast.info()` 四个方法。

### 使用场景

| 方法 | 触发场景 | 文案风格 | 示例 |
|------|---------|---------|------|
| `toast.success` | 操作成功（CUD） | 动词+成功 | "商品发布成功"、"配置已保存" |
| `toast.error` | 操作失败（API 错误） | 动作+失败+原因 | "删除失败：该商品有关联规则" |
| `toast.warning` | 需用户注意但不阻塞 | 直接陈述 | "请先选择账号"、"表单有未保存的更改" |
| `toast.info` | 中性信息通知 | 直接陈述 | "正在生成图片，请稍候" |

### 文案规范

```tsx
// ✅ 操作式文案（动词开头）
toast.success('已保存')
toast.success('商品发布成功')
toast.error('删除失败：该商品被 3 条规则引用')

// ❌ 技术式文案（暴露内部实现细节）
toast.error('Error: fetch failed with status 500')
toast.error('Unhandled Promise Rejection: TypeError')
```

### Toast vs ErrorBanner 选择

| 场景 | 使用 |
|------|------|
| 操作反馈（增删改） | Toast（右上角弹出，自动消失） |
| 页面数据加载失败 | ErrorBanner（内容区内嵌，带重试按钮） |
| 表单字段校验失败 | 字段下方内联错误（不弹 Toast） |
| 网络离线 | 页面顶部横幅（持久显示） |

## 五、生产环境 console 清理 ✅ 已配置

### 已实现 (Phase 0, 2026-06-29)

`next.config.js` 已配置 `compiler.removeConsole`，`lib/api/selection.ts` 中 23 处 `console.debug` 已删除。

`next.config.js` 中配置 TerserPlugin 剔除生产环境调试输出：

```js
// next.config.js
compiler: {
  removeConsole: process.env.NODE_ENV === 'production'
    ? { exclude: ['error', 'warn'] }  // 保留 error 和 warn
    : false,
}
```

### ESLint 规则

```json
// .eslintrc
{
  "rules": {
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

当前待清理位置：
- `lib/api/selection.ts` 第 464-679 行：28 处 `console.debug`
- `stores/auth.store.ts` 第 67 行：1 处 `console.warn`
- `app/admin/page.tsx` 第 136、147、162 行：`console.error`
- `hooks/useImStatusSnapshots.ts` 第 26 行：`console.log`
- `components/publish/PublishInstanceList.tsx` 第 114 行：`console.log`

## 反模式

- 用 try/catch 捕获异常后静默吞掉（至少要 `toast.error`）
- API 错误信息直接展示 HTTP 状态码（应为用户可读的中文）
- 多个组件各自定义一个 ErrorBanner（应使用统一组件）
- 加载中和空数据用纯文字无图标（应使用 LoadingSpinner/EmptyState）
- 生产环境保留 `console.debug` / `console.log`（应用 `removeConsole` 剔除）
- 离线时 API 调用静默失败无用户提示（应检测并展示离线横幅）
