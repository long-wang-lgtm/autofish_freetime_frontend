# 路由一览表

> 项目路由在构建时静态确定，严禁使用 Next.js 动态路由（`[id]`、`[...slug]` 等）。

## 路由组说明

| 路由组 | 布局 | 认证 | 角色限制 |
|--------|------|------|----------|
| `(auth)` | 无布局组件包裹，页面自行居中 | 公开 | 无 |
| `/login/link` | 无布局组件包裹，独立页面 | 公开（需 token query） | 无 |
| `/dashboard/*` | `DashboardLayout` — Sidebar + Header + 认证守卫 | 需登录 | 所有用户 |
| `/admin/*` | `AdminLayout` — AdminSidebar + 管理顶栏 + 认证 + 角色守卫 | 需登录 | 仅 `administrators` |

### 根布局

`app/layout.tsx` 为所有页面提供 `AuthProvider` + `QueryProvider` + `Toaster`。

### 布局对照

| 布局组件 | 文件 | 侧边栏 | 顶栏 | 特点 |
|----------|------|--------|------|------|
| RootLayout | `app/layout.tsx` | 无 | 无 | 仅注入 Provider |
| (auth) 组 | 无 | 无 | 无 | 页面自居中 `min-h-screen flex items-center justify-center` |
| DashboardLayout | `app/dashboard/layout.tsx` | `Sidebar` | `Header` | 用户区，认证守卫 |
| AdminLayout | `app/admin/layout.tsx` | `AdminSidebar` | 管理顶栏 | 管理区，认证 + 角色守卫 |

---

## 完整路由映射表

### 认证页（公开）

| URL | 页面名称 | 布局 | 关键组件 | API 模块 | Tab 参数 |
|-----|----------|------|----------|----------|----------|
| `/` | 首页（自动跳转） | RootLayout | `LoadingSpinner` | 无（仅读取 auth store） | 无 |
| `/login` | 登录页 | RootLayout（无路由组布局） | `LoginForm` | `auth.ts` → `login()` | 无 |
| `/register` | 注册页 | RootLayout（无路由组布局） | `RegisterForm` | `auth.ts` → `register()` | 无 |
| `/login/link` | 链接扫码登录 | RootLayout（无路由组布局）, `runtime='edge'` | `QrCodeDisplay`, `useQrLogin` hook | 直接 fetch（不经过 lib/api） | `?token=`, `?uid=` |

> `/` 首页根据登录状态自动跳转：已登录 → `/dashboard/accounts`，未登录 → `/login`

---

### 用户区（需登录）

| URL | 页面名称 | 布局 | 关键组件 | API 模块 | Tab 参数 |
|-----|----------|------|----------|----------|----------|
| `/dashboard/accounts` | 账号管理 | DashboardLayout | `AccountRow`, `AccountCard`, `QrLoginModal`, `LinkLoginModal`, `LinkManagement` | `accounts.ts` | 无（单页） |
| `/dashboard/items` | 商品管理 + 回复规则 | DashboardLayout | `ItemsTab`, `RulesTab`, `useItemsPage` hook | `items.ts`, `keywords.ts` | `?tab=items`, `?tab=rules` |
| `/dashboard/publish` | 商品发布 | DashboardLayout | `OpportunityLibrary`, `PublishWorkspace`, `EditorDrawer`, `ResizableDivider`, `MobileTabView` | `opportunities.ts`, `publish-items.ts`, `accounts.ts` | 无（单页，单 Tab） |
| `/dashboard/selection` | 选品监控 | DashboardLayout | `KeywordCollectionTab`, `ProductMonitorTab`, `MerchantMonitorTab`, `SettingsDrawer` | `selection.ts` | `?tab=keyword`, `?tab=product`, `?tab=merchant` |
| `/dashboard/settings` | 系统设置 | DashboardLayout | `AIConfigTab`, `NotificationTab` | `ai-config.ts`, `notification.ts` | `?tab=ai-config`, `?tab=notification` |

#### 子视图切换机制

所有 dashboard 页面使用 `useTabRouting` hook 读取/写入 URL query 参数 `?tab=xxx`，不创建子路由。Tab 栏使用 `TabBar` 组件，统一 `variant="overline"`。

#### 账号页特殊说明

`/dashboard/accounts` 是唯一不使用 Tab 的 dashboard 页面，直接渲染账号表格/卡片。移动端使用 `window.innerWidth < 768` 自行检测（非 `useIsMobile` hook），桌面端表格、移动端卡片。

---

### 管理区（需管理员）

| URL | 页面名称 | 布局 | 关键组件 | API 模块 | Tab 参数 |
|-----|----------|------|----------|----------|----------|
| `/admin` | 管理仪表盘 | AdminLayout | `StatCard`, `ImStatusChart`, `AccountPieChart`, `Pagination`（内联定义） | `admin/index.ts` → `dashboard.ts`, `users.ts`, `accounts.ts` | 内联 Tab：`users` / `accounts`（非 URL query） |
| `/admin/accounts` | 管理员-账号管理 | AdminLayout | `Pagination`（内联定义）, `SlidePanel`, `ProxyItem`, `ImStatusChart`, `AccountPieChart` | `admin/index.ts` → `accounts.ts` | 无 |
| `/admin/users` | 管理员-用户管理 | AdminLayout | `Pagination`（内联定义）, `SlidePanel`, `ProxyItem` | `admin/index.ts` → `users.ts` | 无 |
| `/admin/proxy` | 管理员-代理管理 | AdminLayout | `Pagination`（内联定义）, `SlidePanel` | `admin/index.ts` → `proxy.ts` | 无 |

> 管理区 3 个子页面（accounts/users/proxy）各自内联定义了一个 `Pagination` 组件，代码重复。

---

## 核心约束

1. **严禁动态路由**：所有路由路径在 `app/` 目录结构中层静态确定。子视图切换通过 URL query 参数（`?tab=xxx`）实现，使用 `useTabRouting` hook。
2. **API 基础地址**：所有 API 请求的基础地址统一从 `NEXT_PUBLIC_API_BASE_URL` 环境变量读取，后接 `/api` 路径前缀。
3. **路由组 `(auth)`**：括号文件夹在 Next.js 中不产生 URL 段，仅用于组织文件。`login` 和 `register` 页面共享认证相关逻辑但各自独立渲染。
4. **无 dashboard 首页**：`/dashboard` 路径无 `page.tsx`，访问会 404。用户登录后直接跳转 `/dashboard/accounts`。
