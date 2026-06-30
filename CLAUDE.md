# frontend/CLAUDE.md

前端项目，Next.js + React + Tailwind CSS v3。

## 核心约束

- 严禁使用动态路由
- 做任何事情前，要牢记从“第一性原理”出发
- 所有 API 请求的基础地址统一从环境变量读取，后接 `/api` 路径前缀

## 路径约定

所有文件路径相对于 `frontend/` 根目录。规范文档位于 `.claude/rules/`（编码规范）和 `.claude/docs/`（索引/字典）。

## 业务领域模型

账号 → 商品 → 选品 → 发布 → 设置

- **账号**：闲鱼店铺账号，是其他所有功能的基础。必须先有账号才能管理商品。
- **商品**：账号下的闲鱼商品，支持自动回复、自动发货、AI回复等自动化配置。
- **选品**：市场数据采集和分析。通过关键词采集发现商品→监控商品数据→发现商机→入库商机库。
- **发布**：将商机转化为发布素材，通过 AI 辅助完成改写→封面→生图→发布的流水线。
- **设置**：AI 模型配置和通知渠道。

## 页面与路由

| 路由 | 页面 | 布局 | 关键 API |
|------|------|------|----------|
| `/dashboard/accounts` | 账号管理 | DashboardLayout | accounts.ts |
| `/dashboard/items` | 商品管理 + 回复规则 | DashboardLayout | items.ts, keywords.ts |
| `/dashboard/publish` | 商品发布（商机库+工作区）| DashboardLayout | opportunities.ts, publish-items.ts |
| `/dashboard/selection` | 选品监控 | DashboardLayout | selection.ts, keywords.ts |
| `/dashboard/settings` | 设置（AI配置+通知）| DashboardLayout | ai-config.ts, notification.ts |
| `/admin` | 管理仪表盘 | AdminLayout | admin/dashboard.ts |
| `/admin/accounts` | 管理员-账号管理 | AdminLayout | admin/accounts.ts |
| `/admin/users` | 管理员-用户管理 | AdminLayout | admin/users.ts |
| `/admin/proxy` | 管理员-代理管理 | AdminLayout | admin/proxy.ts |

## 关键设计决策

1. **Tab 使用 overline 变体**：所有 dashboard 页面统一使用 `variant="overline"`，Tab 栏在卡片容器外部，利用物理边界建立层级。参考 frontend-tabs.md。
2. **禁止动态路由**：所有路由在构建时静态确定，组件通过 URL query 参数（如 `?tab=xxx`）切换子视图。使用 `useTabRouting` hook 管理。
3. **API 类型就近定义**：API 相关的类型定义放在对应的 API 模块文件中，不单独抽离 types 目录。只有被 3+ 模块共享的类型才提取。
4. **移动端检测统一为 useIsMobile**：基于 CSS media query，避免 hydration 不匹配。
5. **Header 在移动端常驻**：作为全局导航锚点（含汉堡菜单、标题、用户头像），不随滚动隐藏。
6. **发布页桌面端双面板，移动端导航栈**：桌面并排（商机列表+工作区），移动端 Push/Pop 导航。

## 按需加载

> **使用方式**：AI Agent 根据"触发条件"列判断何时加载对应文档。开发人员根据"用途"列查找需要的规范。

| 模块 | 用途 | 触发条件 |
|------|------|----------|
| `@.claude/rules/frontend-tabs.md` | Tab 页面视觉设计规范 | 新建/修改 TabBar、useTabRouting、dashboard 页面 Tab 切换 |
| `@.claude/rules/frontend-api.md` | API 接口设计规范 | 新建/修改 API 模块、定义 API 类型、添加 fetch 封装 |
| `@.claude/rules/frontend-layout.md` | PC/移动端布局铁律 | 新建页面、修改页面布局、处理响应式适配 |
| `@.claude/rules/frontend-colors.md` | 色彩语义体系 | 使用颜色（按钮/状态/文字/分割线）、修改主题色 |
| `@.claude/rules/frontend-design-tokens.md` | 字号/间距/圆角/阴影 Token | 设置文字样式/内边距/圆角/阴影、Badge/Tag/Pill、表格文字 |
| `@.claude/rules/frontend-charts.md` | 图表配色+交互规范 | 新建/修改 ECharts 图表、tooltip、legend、dataZoom |
| `@.claude/rules/frontend-format.md` | 数字/日期/价格格式化规范 | 格式化价格/百分比/数字/日期、ECharts 轴标签 |
| `@.claude/rules/frontend-components.md` | 组件设计规范 | 新建/拆分组件、定义 Props、选择导出方式 |
| `@.claude/rules/frontend-state.md` | 状态管理规范 | 使用 Zustand/React Query、拆分自定义 hook |
| `@.claude/rules/frontend-error.md` | 错误处理规范 | 处理 API 错误、网络断开、ErrorBoundary、toast 通知 |
| `@.claude/rules/frontend-form.md` | 表单处理规范 | 使用 react-hook-form + zod、表单校验、提交状态 |
| `@.claude/rules/frontend-accessibility.md` | 无障碍最低要求 | 添加 aria-* 属性、键盘导航、焦点管理 |
| `@.claude/rules/frontend-performance.md` | 性能检查清单 | 优化渲染/加载/打包、虚拟滚动、代码分割 |
| `@.claude/docs/COMPONENTS.md` | 组件索引 | 查找已有组件、避免重复造轮子 |
| `@.claude/docs/ROUTES.md` | 路由一览表 | 了解路由结构、添加新路由 |
| `@.claude/docs/DATA_DICTIONARY.md` | 数据字典 | 理解业务术语（d7/DTO/snapshot/SSE）、缩写含义 |
| `@.claude/docs/KNOWN_ISSUES.md` | 已知问题清单 | 了解技术债、选择修复目标 |
| `@components/ui/` | UI 组件库 | 使用 TabBar/Sheet/LoadingSpinner 等通用组件 |
| `@.claude/docs/FORM_PATTERNS.md` | 表单项目特定模式 | 实现 Switch 开关、422 错误映射、文件上传校验 |
| `@.claude/docs/CHART_PATTERNS.md` | 图表项目特定模式 | 实现 ECharts 图表、tooltip 同步、click 下钻 |
| `@.claude/docs/ERROR_PATTERNS.md` | 错误处理项目特定模式 | 实现 ErrorBoundary、401 拦截 |
| `@.claude/docs/STATE_PATTERNS.md` | 状态管理项目特定模式 | 实现乐观更新、SSE 单例、虚拟滚动 |
| `@.claude/docs/AUDIT_LOG.md` | 规范审计日志 | 了解各规范域的结构性违规和修复进度 |

## 如何新建页面

1. **确定路由组**：用户端页面放在 `app/dashboard/`，管理端放在 `app/admin/`
2. **创建目录和 page.tsx**：`app/dashboard/xxx/page.tsx`（严禁动态路由 `[id]`）
3. **选择顶级容器**：Tab 页面用 `flex flex-col gap-5 h-full`，非 Tab 页面用 `space-y-5`
4. **如需 Tab**：使用 `useTabRouting` hook + `TabBar variant="overline"`，Tab 状态通过 URL query 参数同步
5. **如需 API**：在 `lib/api/` 下新建模块文件，所有类型就近定义在该文件中
6. **移动端适配**：统一使用 `useIsMobile()` 检测，数据表格提供卡片视图降级
7. **引用规范**：根据"按需加载"表的触发条件加载对应的规范文档

## 如何修复 Bug / 添加功能

1. 先查 `KNOWN_ISSUES.md` — 是否已有记录和修复方案？
2. 查 `COMPONENTS.md` — 是否有可复用的组件？
3. 查对应的规范文档 — 是否有相关的编码规则？
4. 修改代码后，确保不引入新的反模式（参考各规范文档末尾的反模式清单）

## 当前重构状态

> 每个 Phase 的详细 Issue 追踪见 [`KNOWN_ISSUES.md`](.claude/docs/KNOWN_ISSUES.md)。Phase 按顺序推进，前一 Phase 至少完成 80% 才能进入下一 Phase。

### Phase 0: 止血 ✅ 已完成 (2026-06-29)
**完成标准**：0 个 console.debug/log 残留、安全响应头已配置、ErrorBoundary 已添加
- ✅ 安全加固（安全响应头配置）— 4 个安全头 + removeConsole 构建配置
- ✅ 清理生产环境调试代码 — 删除 selection.ts 23 处 console.debug，auth.store.ts warn→error
- ✅ 添加 Error Boundary — `components/ui/error-boundary.tsx` 包裹 DashboardLayout + AdminLayout

### Phase 1: 删死代码 ✅ 已完成 (2026-06-29)
**完成标准**：selection.store.ts ✅ 已删除、inset 变体 ✅ 已删除、axios ✅ 已从 dependencies 移除
- ✅ 删除 stores/selection.store.ts → 详见 KNOWN_ISSUES #25
- ✅ 删除 TabBar inset 变体 → 详见 KNOWN_ISSUES #24
- ✅ 删除 axios 依赖 → 详见 KNOWN_ISSUES #21

### Phase 2: 去重复 ✅ 已完成 (2026-06-29)
**完成标准**：全项目仅 `fetchApi` 一种 HTTP 封装、仅 `useIsMobile` 一种移动端检测、Pagination/STATUS_MAP/fmtPrice 无重复定义
- ✅ 统一 API 调用（6种→1种 fetchApi）— 增强 fetchApi 支持 params/skipAuth/credentials_/baseUrl，迁移 auth.ts/link-login.ts/selection.ts/LinkLoginModal/login/link/page → KNOWN_ISSUES #12
- ✅ 统一移动端检测（3种→1种 useIsMobile）— accounts/page.tsx 和 publish/page.tsx 替换 → KNOWN_ISSUES #13
- ✅ 拆分 useItemsPage hook（1→3子hook）→ KNOWN_ISSUES #14
- ✅ 统一 OperationResponse 类型（3处→1处）→ KNOWN_ISSUES #15
- ✅ 拆分 PublishInstanceList.tsx（694→434行）→ KNOWN_ISSUES #16
- ✅ 拆分 ProductMonitorTab.tsx（623→552行 + columnDefs.ts）→ KNOWN_ISSUES #17
- ✅ 拆分 AIConfigTab.tsx 提取 AIConfigFormFields → KNOWN_ISSUES #18
- ✅ 提取统一 Pagination 组件（4处内联→1处共享）→ KNOWN_ISSUES #19
- ✅ 提取 useFabDrag hook（2处重复→1共享hook）→ KNOWN_ISSUES #20
- ✅ 创建 lib/utils/format.ts 统一 8 个格式化函数
- ✅ 创建 components/selection/product/constants.ts 统一 STATUS_MAP（修复 key 3→4 bug）

### Phase 3: 统一设计
**完成标准**：页面顶级容器统一、圆角统一为 rounded-xl、92 处任意值字号已替换、accounts 页有 Tab 栏
- 执行 PC/移动端布局铁律 → 详见 KNOWN_ISSUES #6-#7, #9-#10
- 创建统一组件（EmptyState, ErrorBanner, SearchToolbar 等）
- ProductMonitorTab 移动端焦点卡片视图
- accounts 页面加 Tab 栏

### Phase 4: 性能优化
**完成标准**：8 个 ECharts 文件按需导入、关键列表组件有 React.memo、非首屏组件有 next/dynamic
- ECharts 按需导入 + 统一配色 → 详见 KNOWN_ISSUES #8
- React.memo 关键组件
- 虚拟滚动 + 代码分割
- img 标签添加 loading="lazy"

### Phase 5: 功能增强
- 批量操作
- 图表交互增强（dataZoom + click 下钻）
- 全局告警中心
- 数据对比（环比/同比）

## 环境变量

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 基础地址 |
