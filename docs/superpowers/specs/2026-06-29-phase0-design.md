# Phase 0 止血重构 — 设计文档

> 日期：2026-06-29 | 状态：已确认

## 目标

消除前端项目的 3 类安全/稳定性"出血点"：无安全响应头、无 Error Boundary、生产环境残留调试日志。所有任务前端独立完成，不依赖后端。

## 任务一：安全响应头

### 背景

`next.config.js` 当前未配置任何安全响应头，所有页面裸奔。需注入 4 个基础安全头（`X-XSS-Protection` 已过时，排除；`Content-Security-Policy` 复杂度高，Phase 1 用 report-only 模式单独推进）。

### 实施方案

修改 `next.config.js`，在 `nextConfig` 对象中添加 `headers()` 异步函数：

| 响应头 | 值 | 防御场景 |
|--------|-----|----------|
| `X-Content-Type-Options` | `nosniff` | MIME 嗅探攻击 |
| `X-Frame-Options` | `DENY` | 点击劫持 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | URL 信息泄露 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 权限滥用 |

### 涉及文件

| 操作 | 文件 |
|------|------|
| 修改 | `next.config.js` — 新增 `headers()` 函数（~15 行） |

---

## 任务二：Error Boundary

### 背景

项目零 Error Boundary。任何子组件渲染异常 → 整个页面白屏，用户无恢复手段。React 错误边界必须用 Class Component 实现（`componentDidCatch` / `getDerivedStateFromError` 无函数组件等价 API）。

### 组件设计

**路径**：`components/ui/error-boundary.tsx`

**Props**：

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `children` | `ReactNode` | 是 | 被保护的子组件 |
| `fallback` | `ReactNode` | 否 | 自定义降级 UI，默认使用内置样式 |

**内置降级 UI**：

- 垂直居中布局，`h-64` 最小高度
- 错误图标（SVG 感叹号圆）
- 标题："页面出现异常" (`text-gray-700 text-lg font-semibold`)
- 描述：`error.message` 或 "未知错误" (`text-gray-500 text-sm`)
- 按钮："重试" (`bg-blue-600 text-white rounded-lg`)，点击后 `setState({ hasError: false })` 触发重新渲染
- 遵循色彩/字号/间距规范（无任意值、无 rounded-md）

**包裹位置**：

| 文件 | 行 | 修改 |
|------|-----|------|
| `app/dashboard/layout.tsx` | 39 | `{children}` → `<ErrorBoundary>{children}</ErrorBoundary>` |
| `app/admin/layout.tsx` | 142 | `{children}` → `<ErrorBoundary>{children}</ErrorBoundary>` |

### 涉及文件

| 操作 | 文件 |
|------|------|
| 新建 | `components/ui/error-boundary.tsx`（~45 行） |
| 修改 | `app/dashboard/layout.tsx`（import + wrap，3 行） |
| 修改 | `app/admin/layout.tsx`（import + wrap，3 行） |

---

## 任务三：生产环境 Console 清理

### 背景

`lib/api/selection.ts` 中 23 处 `console.debug` 在每次 API 调用时输出完整请求/响应数据，存在敏感信息泄露风险且污染生产日志。需在构建层（自动剔除）和源码层（删除调试代码）同时清理。

### 构建层：`removeConsole` 配置

修改 `next.config.js`，添加 `compiler.removeConsole`：

```js
compiler: {
  removeConsole: process.env.NODE_ENV === 'production'
    ? { exclude: ['error', 'warn'] }
    : false,
}
```

生产构建自动剔除 `console.log` 和 `console.debug`，保留 `console.error` 和 `console.warn`（用于运行时错误报告）。

### 源码层：手动清理

| 文件 | 操作 | 数量 | 说明 |
|------|------|------|------|
| `lib/api/selection.ts` | 删除 `console.debug(...)` | 23 行 | 调试日志不应留在源码 |
| `stores/auth.store.ts:67` | `console.warn` → `console.error` | 1 行 | 登出失败是错误级，非警告 |

**保留的 console 语句**（合法运行时错误日志）：

| 文件 | 行 | 内容 |
|------|-----|------|
| `useImStatusSnapshots.ts` | 26 | `console.error('[IM Status SSE] 连接错误:', err.message)` |
| `PublishInstanceList.tsx` | 114 | `console.error('图片上传失败:', err)` |
| `app/admin/page.tsx` | 136,147,162 | `console.error` — 管理仪表盘数据加载失败 |

### 涉及文件

| 操作 | 文件 |
|------|------|
| 修改 | `next.config.js` — 新增 `compiler` 配置（6 行） |
| 修改 | `lib/api/selection.ts` — 删除 23 处 `console.debug` |
| 修改 | `stores/auth.store.ts` — 改 `console.warn` 为 `console.error` |

---

## 范围外（明确不做）

| 项目 | 原因 |
|------|------|
| Token 迁移至 httpOnly Cookie | 阻塞于后端改造 |
| localStorage try/catch 封装 | 属 Phase 1（KNOWN_ISSUES #4） |
| `Content-Security-Policy` 响应头 | 复杂度高，Phase 1 report-only 模式单独推进 |
| ESLint `no-console` 规则 | 项目无独立 ESLint 配置（使用 Next.js 内置），Phase 1 考虑 |
| npm audit 流程 / CI 安全扫描 | 属 Phase 1 工程化建设 |

---

## 涉及文件汇总

| 操作 | 文件 | 行数变化 |
|------|------|----------|
| 新建 | `components/ui/error-boundary.tsx` | +45 |
| 修改 | `next.config.js` | +21 |
| 修改 | `app/dashboard/layout.tsx` | +3 |
| 修改 | `app/admin/layout.tsx` | +3 |
| 修改 | `lib/api/selection.ts` | -23 |
| 修改 | `stores/auth.store.ts` | 1 行改动 |
