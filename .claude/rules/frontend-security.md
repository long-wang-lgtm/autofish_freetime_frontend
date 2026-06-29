# 安全检查清单

> 基于项目前端安全审计发现的问题制定，按严重度排序

## 严重问题（必须修复）

### 1. Token 存储：禁止 localStorage，使用 httpOnly Secure cookie

**当前状态**：`lib/utils/auth.ts` 将 JWT access_token 和 refresh_token 明文存储在 localStorage 中，XSS 攻击可直接窃取。

```ts
// ❌ 当前实现 (lib/utils/auth.ts)
localStorage.setItem("access_token", token)
localStorage.setItem("refresh_token", token)

// ✅ 应改为后端设置 httpOnly Secure SameSite=Strict cookie
// 前端不应直接操作 token
```

在迁移完成前，至少应：
- 对所有 localStorage 读写添加 `try/catch`
- `lib/utils/auth.ts` 中 6 处 localStorage 操作均无异常处理

相关文件：`lib/utils/auth.ts:1-28`

### 2. 管理员路由仅前端守卫，后端必须校验

**当前状态**：管理员页面路由仅在前端通过 `AuthProvider` 检查权限，后端 API 是否校验未知。每个管理端 API 端点必须在服务端验证管理员身份。

相关文件：`components/auth/AuthProvider.tsx`、`app/admin/` 下所有页面

### 3. 无安全响应头

**当前状态**：`next.config.js` 中未配置任何安全响应头。应在 `next.config.js` 中添加 `headers()` 配置：

```js
// next.config.js 应添加
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }]
}
```

相关文件：`next.config.js`

### 4. 代理密码输入框 type="text" 明文显示

**当前状态**：`app/admin/proxy/page.tsx:84,164` 的代理密钥输入框使用 `type="text"`，密码明文可见。

```tsx
// ❌ 当前 (app/admin/proxy/page.tsx:84)
<input type="text" value={form.password} placeholder="代理密钥" />

// ✅ 应改为
<input type="password" value={form.password} placeholder="代理密钥" />
```

### 5. 链接登录 Token 在 URL query string 中明文传输

**当前状态**：`app/login/link/page.tsx:14` 从 URL 读取 token，`lib/api/link-login.ts:61` 将 token 拼接进 URL。Token 在浏览器历史、服务器日志、Referer 头中泄露。

```ts
// ❌ 当前 (app/login/link/page.tsx:14)
const token = searchParams.get("token")

// ❌ 当前 (lib/api/link-login.ts:61)
`${origin}/login/link?token=${encodeURIComponent(token)}`

// ✅ 应改为 POST 请求 body 传递，或使用加密的一次性 ticket
```

### 6. Token 刷新机制无 rotation

**当前状态**：refresh_token 刷新后未更新，无 token rotation 机制。每个 refresh_token 应只能使用一次，刷新后立即颁发新 token 对。

## 高危问题（尽快修复）

### 7. console.debug 泄露 API 响应数据

**当前状态**：`lib/api/selection.ts` 中有 23 处 `console.debug` 输出完整的 API 请求/响应数据，可能包含敏感业务信息。

- 生产构建必须移除所有 `console.log`/`console.debug`/`console.warn`
- 配置 ESLint `no-console` 规则（`{ allow: ["error"] }`）
- 或使用 `esbuild` 的 `drop: ['console.debug', 'console.log']` 配置在 TerserPlugin 中剔除

相关文件：`lib/api/selection.ts`（23 处）、ESLint 配置

### 8. 文件上传缺乏前端大小限制

**当前状态**：`lib/api/upload.ts` 中无文件大小校验。应在客户端上传前检查文件大小并给出友好提示。

```ts
// ✅ 上传前应检查
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
if (file.size > MAX_UPLOAD_SIZE) {
  throw new Error(`文件大小不能超过 ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`)
}
```

### 9. 密码强度要求仅 8 位+字母数字

**当前状态**：`lib/utils/validation.ts:23-27` 密码校验仅要求 8 位、含字母、含数字。

```ts
// ❌ 当前 (lib/utils/validation.ts)
password: z.string().min(8).regex(/[a-zA-Z]/).regex(/\d/)

// ✅ 建议增加特殊字符要求
password: z.string().min(8).regex(/[a-zA-Z]/).regex(/\d/).regex(/[!@#$%^&*]/)
// 并可引入 zxcvbn 做强度评估
```

### 10. ECharts tooltip HTML 拼接无转义

**当前状态**：项目中使用 ECharts 的 chart 组件通过 `formatter` 函数拼接 HTML 片段显示 tooltip。所有用户可控数据在拼接 HTML 前必须转义。

## 中危问题（计划修复）

### 11. localStorage 操作无 try/catch

项目中 6 处 localStorage 读写无异常保护（隐私模式下 localStorage 可能被禁用）：

| 文件 | 行号 | 操作 |
|------|------|------|
| `lib/utils/auth.ts` | 1-28 | 读写 access_token、refresh_token（无 catch） |
| `components/layout/Sidebar.tsx` | 92-102 | 读 FAB 位置（有 catch） |
| `components/layout/AdminSidebar.tsx` | 68-78 | 读 FAB 位置（有 catch） |
| `app/dashboard/publish/page.tsx` | 32 | 读面板宽度（无 catch） |
| `components/publish/OpportunityHeader.tsx` | 16 | 读展开状态（无 catch） |

所有 localStorage 操作必须包裹 `try/catch`：

```ts
// ✅ 安全读写 localStorage
function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
```

## 低危问题（持续改进）

### 12. navigator.clipboard 无 try/catch

**当前状态**：3 处 clipboard 调用无异常处理，权限拒绝时会产生未捕获的 Promise 拒绝。

| 文件 | 行号 | 问题 |
|------|------|------|
| `components/accounts/LinkManagement.tsx` | 78 | 无 try/catch |
| `components/accounts/LinkLoginModal.tsx` | 65 | 无 try/catch |
| `components/settings/NotificationTab.tsx` | 89 | 无 await、无 catch |

```ts
// ✅ 安全复制
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 降级：使用 document.execCommand 或提示用户手动复制
  }
}
```

### 13. 无 npm audit 流程

**当前状态**：项目无 `.github/workflows`、无安全扫描配置。每次 PR 应通过 `npm audit --production`（零严重/高危漏洞）。

可在 `package.json` 中添加：
```json
{
  "scripts": {
    "audit": "npm audit --production --audit-level=high"
  }
}
```

## 积极发现（已做对的）

| 项目 | 状态 |
|------|------|
| 无 `dangerouslySetInnerHTML` | 全项目 0 处使用 |
| 无 `innerHTML` / `document.write` | 全项目 0 处使用 |
| API 全走 HTTPS | 通过环境变量 `API_BASE` 配置 |
| 登录表单用 Zod 验证 | `lib/utils/validation.ts` 定义 schema |
| 无第三方 CDN 脚本 | 所有资源自托管 |
| 点击元素使用 `<button>` | 未发现 `div onClick` 替代 button |

## 编码检查清单

每次提交前确认：

- [ ] 无新增 `console.log`/`console.debug`（生产构建自动剔除已配置）
- [ ] 密码 / 密钥输入框使用 `type="password"`
- [ ] 敏感数据不存储在 localStorage / URL query string
- [ ] 所有 localStorage 操作有 try/catch
- [ ] 文件上传有客户端大小限制
- [ ] 所有用户可控数据在 HTML 拼接前已转义
- [ ] `npm audit --production` 无严重/高危漏洞
- [ ] 敏感操作（删除、权限变更）有二次确认弹窗（使用 ConfirmDialog，非 window.confirm）
