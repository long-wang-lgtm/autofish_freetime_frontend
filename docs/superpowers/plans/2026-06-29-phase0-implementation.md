# Phase 0 止血重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除前端 3 类安全/稳定性出血点：添加安全响应头、创建 ErrorBoundary、清理生产环境调试代码

**Architecture:** 3 个独立任务，无相互依赖。next.config.js 同时承载安全头 + removeConsole 两个配置。ErrorBoundary 为 Class Component（React 错误边界必须），包裹两个 Layout 的 children。

**Tech Stack:** Next.js 14, React 18, TypeScript

---

### Task 1: next.config.js — 安全响应头 + removeConsole

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: 读取当前 next.config.js**

确认当前内容（18 行，无 headers、无 compiler 配置）。

- [ ] **Step 2: 添加 headers() 和 compiler 配置**

在 `nextConfig` 对象的 `typescript` 块之后、闭合 `}` 之前，插入 `async headers()` 和 `compiler`：

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // 在生产构建时运行ESLint
    ignoreDuringBuilds: false,
  },
  typescript: {
    // 在生产构建时运行TypeScript检查
    ignoreBuildErrors: false,
  },

  // === 安全响应头 ===
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  // === 生产构建剔除 console.log/debug，保留 error/warn ===
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
}

module.exports = nextConfig
```

- [ ] **Step 3: 验证配置语法**

```bash
node -e "const c = require('./next.config.js'); console.log('headers:', typeof c.headers); console.log('compiler:', JSON.stringify(c.compiler))"
```

Expected: `headers: function`, `compiler: {"removeConsole":{"exclude":["error","warn"]}}`（开发环境为 `compiler: false`）

- [ ] **Step 4: Commit**

```bash
git add next.config.js
git commit -m "feat: 添加安全响应头 + 生产构建 console 剔除配置

- 4 个安全响应头：X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- compiler.removeConsole 在生产构建自动剔除 console.log/debug，保留 error/warn
- 排除 X-XSS-Protection（已过时），CSP 留待 Phase 1

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 创建 ErrorBoundary 组件

**Files:**
- Create: `components/ui/error-boundary.tsx`

- [ ] **Step 1: 创建文件**

写入 `components/ui/error-boundary.tsx`：

```tsx
'use client'

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[16rem] text-gray-500 gap-3 px-4">
          {/* 错误图标 */}
          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-lg font-semibold text-gray-700">页面出现异常</p>
          <p className="text-sm text-gray-500 max-w-sm text-center">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit components/ui/error-boundary.tsx
```

Expected: 无类型错误（可能有路径别名相关警告，忽略）。

- [ ] **Step 3: Commit**

```bash
git add components/ui/error-boundary.tsx
git commit -m "feat: 创建 ErrorBoundary 组件

Class Component 实现 getDerivedStateFromError，捕获子组件渲染异常。
降级 UI 遵循设计规范（gray-700 标题/gray-500 描述/blue-600 CTA 按钮）。
支持自定义 fallback prop。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: DashboardLayout 包裹 ErrorBoundary

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: 添加 import**

在文件顶部 import 区（第 8 行 `import { useState }` 之后）添加：

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'
```

- [ ] **Step 2: 包裹 children**

将第 39 行：

```tsx
          {children}
```

改为：

```tsx
          <ErrorBoundary>{children}</ErrorBoundary>
```

- [ ] **Step 3: 验证语法**

```bash
npx tsc --noEmit app/dashboard/layout.tsx
```

Expected: 无新增类型错误。

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: DashboardLayout 包裹 ErrorBoundary

用户端页面的子组件渲染异常不再导致白屏，改为显示错误信息和重试按钮。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: AdminLayout 包裹 ErrorBoundary

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: 添加 import**

在文件顶部 import 区（`import { toast } from 'sonner'` 之前或之后）添加：

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'
```

- [ ] **Step 2: 包裹 children**

将第 142 行：

```tsx
          {children}
```

改为：

```tsx
          <ErrorBoundary>{children}</ErrorBoundary>
```

- [ ] **Step 3: 验证语法**

```bash
npx tsc --noEmit app/admin/layout.tsx
```

Expected: 无新增类型错误。

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat: AdminLayout 包裹 ErrorBoundary

管理端页面的子组件渲染异常不再导致白屏，改为显示错误信息和重试按钮。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 清理 selection.ts 中 23 处 console.debug

**Files:**
- Modify: `lib/api/selection.ts`

删除以下 23 行 `console.debug` 语句（保留同文件中 `console.error` 的运行时错误日志）：

| 行号 | 内容 |
|------|------|
| 464 | `console.debug(\`[SelectionAPI] ${options?.method \|\| 'GET'} ${url}\`)` |
| 479 | `console.debug(\`[SelectionAPI] Response ${url}:\`, data)` |
| 493 | `console.debug(\`[SelectionAPI] listMonitorItems page=${page} page_size=${pageSize}\`)` |
| 499 | `console.debug('[SelectionAPI] listMonitorMerchants')` |
| 505 | `console.debug(\`[SelectionAPI] addMonitorMerchant uid=${uid}, name=${name}\`)` |
| 514 | `console.debug('[SelectionAPI] getTopicStats')` |
| 520 | `console.debug(\`[SelectionAPI] removeMonitorItem gid=${gid}\`)` |
| 528 | `console.debug(\`[SelectionAPI] activateMonitorItem gid=${gid}\`)` |
| 534 | `console.debug(\`[SelectionAPI] cancelMonitorItem gid=${gid}\`)` |
| 540 | `console.debug(\`[SelectionAPI] storedMonitorItem gid=${gid}\`)` |
| 546 | `console.debug(\`[SelectionAPI] updateMonitorItemPriority gid=${gid} priority=${priority}\`)` |
| 555 | `console.debug(\`[SelectionAPI] removeMonitorMerchant uid=${uid}\`)` |
| 565 | `console.debug('[SelectionAPI] listKeywords')` |
| 571 | `console.debug(\`[SelectionAPI] addKeyword keyword=${keyword}\`)` |
| 580 | `console.debug(\`[SelectionAPI] removeKeyword keywordId=${keywordId}\`)` |
| 590 | `console.debug(\`[SelectionAPI] triggerCollection keywordIds=${JSON.stringify(keywordIds)}\`)` |
| 601 | `console.debug(\`[SelectionAPI] listCategories type=${type}\`)` |
| 603 | `console.debug(\`[SelectionAPI] listCategories got ${keywords.length} keywords\`)` |
| 622 | `console.debug(\`[SelectionAPI] getCategoryProducts categoryId=${categoryId}\`)` |
| 628 | `console.debug(\`[SelectionAPI] getCategoryProducts filtered ${filtered.length} items\`)` |
| 633 | `console.debug(\`[SelectionAPI] getCategoryReports categoryId=${categoryId}\`)` |
| 639 | `console.debug(\`[SelectionAPI] getDailyProductCounts categoryId=${categoryId}\`)` |
| 646 | `console.debug(\`[SelectionAPI] getDailyProductCounts counts=${JSON.stringify(counts)}\`)` |
| 679 | `console.debug(\`[SelectionAPI] getProductHistory gid=${gid} days=${days}\`)` |

- [ ] **Step 1: 批量删除 console.debug 行**

```bash
sed -i '/^[[:space:]]*console\.debug(/d' lib/api/selection.ts
```

- [ ] **Step 2: 验证删除结果**

```bash
grep -n 'console\.debug' lib/api/selection.ts
```

Expected: 无输出（0 行匹配）

- [ ] **Step 3: 验证无语法错误**

```bash
npx tsc --noEmit lib/api/selection.ts 2>&1 | head -20
```

Expected: 无新增错误。

- [ ] **Step 4: Commit**

```bash
git add lib/api/selection.ts
git commit -m "chore: 删除 selection.ts 中 23 处 console.debug

生产构建已配置 compiler.removeConsole 自动剔除，源码层同步清理。
同文件中的 console.error 运行时日志保留。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: auth.store.ts — console.warn → console.error

**Files:**
- Modify: `stores/auth.store.ts`

- [ ] **Step 1: 修改第 67 行**

将：

```ts
      console.warn('登出API调用失败:', error)
```

改为：

```ts
      console.error('登出API调用失败:', error)
```

- [ ] **Step 2: 验证**

```bash
grep -n 'console\.' stores/auth.store.ts
```

Expected: 仅显示 `console.error`，无 `console.warn`。

- [ ] **Step 3: Commit**

```bash
git add stores/auth.store.ts
git commit -m "fix: 登出失败日志从 console.warn 改为 console.error

登出 API 调用失败是错误级事件，非警告。生产构建保留 console.error。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 最终验证

- [ ] **Step 1: 全量 console 残留确认**

```bash
grep -rn 'console\.\(debug\|log\)' --include='*.ts' --include='*.tsx' lib/ stores/ hooks/ components/ app/ 2>/dev/null
```

Expected: 无输出（`console.debug` 和 `console.log` 已全部清除）。`console.error` 和 `console.warn` 允许保留。

- [ ] **Step 2: TypeScript 全量检查**

```bash
npx tsc --noEmit 2>&1 | tail -20
```

Expected: 无本次修改引入的新增类型错误（已有的无关错误可忽略）。

- [ ] **Step 3: 构建验证**

```bash
npm run build 2>&1 | tail -30
```

Expected: 构建成功，无安全头相关警告。

- [ ] **Step 4: 最终 Commit（如有遗漏）**

```bash
git status
# 如有未提交变更，补充提交
```

---

## 实施顺序

任务 1-6 相互独立，可任意顺序执行。建议按 Task 1 → 2 → 3 → 4 → 5 → 6 → 7 顺序，每个任务 commit 一次，方便 review 和回滚。

## 预期结果

完成后：
- ✅ 所有 HTTP 响应带 4 个安全头
- ✅ 生产构建 `console.log/debug` 自动剔除
- ✅ 两个布局的 children 由 ErrorBoundary 保护
- ✅ 源码中 0 处 `console.debug` 残留
- ✅ Phase 0 3 个完成标准全部达成
