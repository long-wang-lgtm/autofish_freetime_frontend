# 已知问题清单

本文档追踪项目中的技术债、安全漏洞和代码质量问题。按严重度从高到低排列。

---

## 严重（安全 / 崩溃风险）

### #1 Token 存储在 localStorage，XSS 可窃取

| 属性 | 值 |
|------|-----|
| **严重度** | 严重 |
| **问题** | 访问令牌和刷新令牌存储在 `localStorage` 中，任何成功的 XSS 攻击均可读取并窃取 token |
| **涉及文件** | `lib/utils/auth.ts` — `setTokens()`, `getAccessToken()`, `getRefreshToken()`, `clearTokens()` |
| **建议修复** | 迁移至 httpOnly Secure SameSite cookie，由后端在登录时设置。前端不再直接读取 token，改用 cookie-based 认证 |
| **阻塞** | ⚠️ **阻塞于后端**：需后端配合修改登录/刷新/登出接口（设置/清除 cookie），前端才能跟进改造 |
| **降级方案** | 迁移前至少对所有 localStorage 读写添加 try/catch（见 #4），防止隐私模式崩溃 |

### #2 管理员路由仅前端守卫 ✅ 已确认不存在

| 属性 | 值 |
|------|-----|
| **严重度** | —（已排除） |
| **原问题** | ~~管理员页面的权限检查仅在 `AdminLayout` 中通过前端判断，后端 API 端点可能未做相同的角色校验~~ |
| **实际状态** | 后端所有 `/api/admin/*` 端点已有独立的角色校验，前端守卫仅作为 UX 优化，不存在安全漏洞 |
| **涉及文件** | `app/admin/layout.tsx` — 第 38 行（前端守卫保留，作为合法 UX 优化） |

### #3 无 Error Boundary ✅ 已修复 (Phase 0, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~整个应用没有 React Error Boundary。子组件渲染异常会导致整个页面白屏，无降级 UI~~ |
| **修复** | 创建 `components/ui/error-boundary.tsx`，包裹 `DashboardLayout` 和 `AdminLayout` 的 `{children}` |
| **涉及文件** | `components/ui/error-boundary.tsx`（新建）, `app/dashboard/layout.tsx`, `app/admin/layout.tsx` |

### #4 localStorage 操作 6 处无 try/catch

| 属性 | 值 |
|------|-----|
| **严重度** | 严重 |
| **问题** | `localStorage.setItem/getItem/removeItem` 在隐私模式或存储满时可能抛出异常，但代码中均未包裹 try/catch |
| **涉及文件** | `lib/utils/auth.ts` — `setTokens()`, `getAccessToken()`, `getRefreshToken()`, `clearTokens()`, `isAuthenticated()`；`components/layout/Sidebar.tsx`；`components/layout/AdminSidebar.tsx`；`app/dashboard/publish/page.tsx` — 第 32 行 `localStorage.getItem('publish_panel_left_width')`；`components/publish/OpportunityHeader.tsx` |
| **建议修复** | 创建 `safeStorage` 工具模块，所有 `localStorage` 操作统一封装 try/catch + 降级处理 |

### #5 navigator.clipboard 3 处无 try/catch

| 属性 | 值 |
|------|-----|
| **严重度** | 严重 |
| **问题** | 剪贴板 API `navigator.clipboard.writeText()` 可能在非 HTTPS 或被浏览器拒绝时抛出异常，代码未做错误处理 |
| **涉及文件** | `components/settings/NotificationTab.tsx`, `components/accounts/LinkManagement.tsx`, `components/accounts/LinkLoginModal.tsx`（3 处） |
| **建议修复** | 创建 `copyToClipboard` 工具函数，内置 try/catch + fallback (`document.execCommand('copy')`)，统一使用 |

---

## 高（功能 / 体验缺陷）

### #6 ProductMonitorTab 移动端完全不可用

| 属性 | 值 |
|------|-----|
| **严重度** | 高 |
| **问题** | 商品监控表格设置了 `min-width: 1400px`，移动端屏幕完全无法正常显示，无卡片视图降级 |
| **涉及文件** | `components/selection/product/ProductMonitorTab.tsx`（623 行） |
| **建议修复** | 移动端提供卡片视图，或简化列数（只显示核心 3-4 列），参考 AccountCard/AccountRow 模式 |

### #7 账号页无 Tab 栏，与其他 4 个 dashboard 页面不统一

| 属性 | 值 |
|------|-----|
| **严重度** | 高 |
| **问题** | 其他 4 个 dashboard 页面（items/publish/selection/settings）都使用 `TabBar variant="overline"`，但 accounts 页面直接渲染内容，破坏了视觉一致性 |
| **涉及文件** | `app/dashboard/accounts/page.tsx` — 无 TabBar |
| **建议修复** | 为账号页添加 TabBar（如"账号列表"单 tab），或在设计上明确该页面不适合 tab 结构的原因 |

### #8 ECharts tooltip 颜色与折线颜色错配

| 属性 | 值 |
|------|-----|
| **严重度** | 高 |
| **问题** | 选品页面图表的 tooltip 指示色与实际折线颜色不一致（chart-color-redesign spec 已写好但未实施） |
| **涉及文件** | 选品模块中 ECharts 配置 |
| **建议修复** | 按 chart-color-redesign 规范统一折线颜色和 tooltip 颜色 |

### #9 桌面端商品管理页缺少统计总览

| 属性 | 值 |
|------|-----|
| **严重度** | 高 |
| **问题** | 移动端商品管理页有统计卡片（在售/仓库/售出数量等），桌面端同等页面缺少这些统计信息 |
| **涉及文件** | `components/items/ItemsTab.tsx` |
| **建议修复** | 桌面端 ItemsTab 顶部增加统计概览行，与移动端保持一致 |

### #10 选品页异常检测结果在列表层不可见

| 属性 | 值 |
|------|-----|
| **严重度** | 高 |
| **问题** | 商品监控页的异常检测结果（升温信号、价格异常等）被锁在详情抽屉中，用户在列表视图无法看到异常标记 |
| **涉及文件** | `components/selection/product/ProductMonitorTab.tsx` |
| **建议修复** | 在列表行中添加异常徽章或颜色标记，或提供异常筛选开关 |

### #11 发布页 4 步流水线进度展示不直观

| 属性 | 值 |
|------|-----|
| **严重度** | 高 |
| **问题** | 发布流水线（rewriting → cover_planning → image_generating → publishing）的进度展示缺乏可视化引导，用户难以判断当前处于哪一步 |
| **涉及文件** | `components/publish/PublishWorkspace.tsx`, `components/publish/PublishInstanceList.tsx` |
| **建议修复** | 添加 StepIndicator 组件，用进度条/步骤条展示 4 步状态，每步显示 loading/completed/error 状态 |

---

## 中（代码质量 / 可维护性）

### #12 API 调用存在 4 种不同的 fetch 封装 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~项目中存在 4 套不同的 HTTP 请求封装：`lib/utils/api.ts` 的 `fetchApi`、`lib/api/auth.ts` 的 `handleResponse`、`lib/api/link-login.ts` 的 `apiFetch`、`lib/api/selection.ts` 的 `selectionFetch`。各自有不同的错误处理和日志行为~~ |
| **修复** | `fetchApi` 已增强，新增 `params`/`skipAuth`/`credentials_`/`baseUrl` 可选参数。`auth.ts` 的 `handleResponse` 已删除，改用 `fetchApi` + `skipAuth`。`link-login.ts` 的 `apiFetch` 已删除。`selection.ts` 的 `selectionFetch` 已删除。`LinkLoginModal.tsx` 和 `login/link/page.tsx` 的裸 fetch 已迁移到 `fetchApi` |
| **涉及文件** | `lib/utils/api.ts`, `lib/api/auth.ts`, `lib/api/link-login.ts`, `lib/api/selection.ts`, `components/accounts/LinkLoginModal.tsx`, `app/login/link/page.tsx` |

### #13 移动端检测 3 种实现并存 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~移动端断点检测有 3 种实现：`useIsMobile()` hook（CSS media query）、`useMediaQuery('max-width: 768px')`、以及 `window.innerWidth < 768` 的 useEffect 自建监听~~ |
| **修复** | `accounts/page.tsx` 的 `window.innerWidth` 和 `publish/page.tsx` 的 `useMediaQuery('max-width:768px')` 已全部替换为 `useIsMobile()`，全项目仅 `useIsMobile` 一种移动端检测方式 |
| **涉及文件** | `app/dashboard/accounts/page.tsx`, `app/dashboard/publish/page.tsx`, `hooks/useIsMobile.ts` |

### #14 useItemsPage hook 过度膨胀 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~`useItemsPage` 导出了 30+ 个属性和回调，混合了状态管理、数据获取、业务逻辑，难以理解和测试~~ |
| **修复** | 已拆分为 `useItemsFilters`（筛选状态）+ `useItemsData`（数据获取）+ `useItemMutations`（变更操作），`useItemsPage` 保留为组合层 |
| **涉及文件** | `hooks/useItemsPage.ts`, `hooks/useItemsFilters.ts`, `hooks/useItemsData.ts`, `hooks/useItemMutations.ts` |

### #15 OperationResponse 类型重复定义 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~`OperationResponse` 接口在 `lib/utils/api.ts` 和 `lib/api/link-login.ts` 和 `lib/api/selection.ts` 中重复定义了 3 次，字段完全一致~~ |
| **修复** | `link-login.ts` 和 `selection.ts` 中的重复定义已删除，统一从 `lib/utils/api.ts` 导入 |
| **涉及文件** | `lib/utils/api.ts`, `lib/api/link-login.ts`, `lib/api/selection.ts` |

### #16 PublishInstanceList.tsx 694 行，需拆分 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~单个组件的行数超过 600 行，混合了列表渲染、状态展示、操作按钮、错误重试逻辑，难以维护~~ |
| **修复** | 已提取 `PublishInstanceRow` 组件（`React.memo`），原文件从 694 行减少到 434 行 |
| **涉及文件** | `components/publish/PublishInstanceList.tsx`, `components/publish/PublishInstanceRow.tsx` |

### #17 ProductMonitorTab.tsx 623 行，需拆分 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~商品监控 Tab 组件超过 600 行，包含表格、筛选、排序、抽屉、图表，职责过多~~ |
| **修复** | 已提取 `columnDefs.ts`（列定义），原文件从 623 行减少到 552 行 |
| **涉及文件** | `components/selection/product/ProductMonitorTab.tsx`, `components/selection/product/columnDefs.ts` |

### #18 AIConfigTab.tsx 554 行，表单在两个容器中完全重复 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~AI 配置的表单在两个不同的 UI 容器中渲染了完全相同的表单字段，代码重复~~ |
| **修复** | 已提取 `AIConfigFormFields` 共享组件到 `components/ai-config/form-fields.tsx`，原文件从 555 行减少到 493 行 |
| **涉及文件** | `components/settings/AIConfigTab.tsx`, `components/ai-config/form-fields.tsx` |

### #19 admin 3 个子页面各有一份分页组件 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~`app/admin/page.tsx`, `app/admin/accounts/page.tsx`, `app/admin/users/page.tsx`, `app/admin/proxy/page.tsx` 各自内联定义了一份功能完全相同的 `Pagination` 组件~~ |
| **修复** | 已提取 `components/ui/pagination.tsx`，4 个 admin 页面全部改用导入 |
| **涉及文件** | `components/ui/pagination.tsx`, `app/admin/page.tsx`, `app/admin/accounts/page.tsx`, `app/admin/users/page.tsx`, `app/admin/proxy/page.tsx` |

### #20 FAB 拖拽逻辑在 Sidebar 和 AdminSidebar 中重复 ✅ 已修复 (Phase 2, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~Sidebar 和 AdminSidebar 中包含相同的 FAB（浮动操作按钮）拖拽逻辑，约 65 行重复代码~~ |
| **修复** | 已提取 `hooks/useFabDrag.ts`，`Sidebar.tsx` 和 `AdminSidebar.tsx` 共用 |
| **涉及文件** | `hooks/useFabDrag.ts`, `components/layout/Sidebar.tsx`, `components/layout/AdminSidebar.tsx` |

---

## 低（轻微 / 技术改进）

### #21 axios 在 package.json 中但未被使用 ✅ 已修复 (Phase 1, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~`package.json` 中依赖了 `axios: ^1.6.0`，但全项目代码中无任何 `import axios` 或 `require('axios')`~~ |
| **修复** | 已运行 `npm uninstall axios`，移除 11 个关联包 |
| **涉及文件** | ~~`package.json`~~（已修改） |

### #22 NEXT_PUBLIC_CHUNK_SIZE 环境变量未被使用

| 属性 | 值 |
|------|-----|
| **严重度** | 低 |
| **问题** | `.env.local` 中定义了 `NEXT_PUBLIC_CHUNK_SIZE=102400`，但全项目代码中无任何读取该环境变量 |
| **涉及文件** | `.env.local` |
| **建议修复** | 清理未使用的环境变量，或在实际需要分片上传的地方使用它 |

### #23 RulesItemsingleDrawer.tsx 文件名拼写错误

| 属性 | 值 |
|------|-----|
| **严重度** | 低 |
| **问题** | 文件名中 `single` 拼写错误（应为 `Single` 但实际可能是 `single`，需确认预期名称） |
| **涉及文件** | `components/items/RulesItemsingleDrawer.tsx` |
| **建议修复** | 重命名为预期名称，更新所有 import 引用 |

### #24 TabBar inset 变体未被使用 ✅ 已修复 (Phase 1, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~`TabBar` 组件支持 `variant="inset"` 变体，但全项目中无任何地方使用该变体（全部使用 `overline`）~~ |
| **修复** | 已删除 `inset` 变体代码和样式，`TabVariant` 简化为仅 `'overline'` |
| **涉及文件** | ~~`components/ui/Tab.tsx`~~（已修改） |

### #25 stores/selection.store.ts 零引用 ✅ 已修复 (Phase 1, 2026-06-29)

| 属性 | 值 |
|------|-----|
| **严重度** | —（已修复） |
| **问题** | ~~`stores/selection.store.ts` 定义了 zustand store，但全项目中无任何文件 import 该 store~~ |
| **修复** | 已删除该文件 |
| **涉及文件** | ~~`stores/selection.store.ts`~~（已删除） |

### #26 暗色主题 CSS 变量已定义但零组件支持

| 属性 | 值 |
|------|-----|
| **严重度** | 低 |
| **问题** | `globals.css` 中定义了完整的暗色主题 CSS 变量（`@media (prefers-color-scheme: dark)`），但所有组件均硬编码颜色值（如 `text-gray-900`），未使用 CSS 变量，暗色模式下无法自动切换 |
| **涉及文件** | `styles/globals.css` |
| **建议修复** | 决定是否支持暗色模式：若支持则逐步替换 Tailwind 颜色为 CSS 变量；若不支持则删除无用变量 |

---

## 问题统计

| 严重度 | 数量 |
|--------|------|
| 严重 | 3（#1 阻塞于后端） |
| 高 | 6 |
| 中 | 0 |
| 低 | 3 |
| 已排除 | 1（#2 后端已有校验） |
| 已修复 | 13（#3 Phase 0, #21+#24+#25 Phase 1, #12-#20 Phase 2） |
| **合计** | **12 个待修复 + 1 个已排除 + 13 个已修复** |
