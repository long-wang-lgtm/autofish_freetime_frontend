# 错误处理规范

## 一、Error Boundary（全局异常捕获）

DashboardLayout 和 AdminLayout 的 `{children}` 必须由 ErrorBoundary 包裹，防止任何组件渲染异常导致白屏。使用统一的 ErrorBoundary 组件，提供错误信息展示和重试按钮。详见 docs/ERROR_PATTERNS.md。

**铁律**：DashboardLayout 和 AdminLayout 的 children 必须由 ErrorBoundary 包裹。

## 二、API 错误分类与处理

### 错误类型与用户提示

| HTTP 状态码 | 错误类型 | 用户提示 | 处理方式 |
|------------|----------|----------|----------|
| 400 | 请求参数错误 | 显示后端返回的具体错误信息 | toast.error(detail) |
| 401 | 未认证 | "登录已过期，请重新登录" | 清除 token → 跳转登录页 |
| 403 | 无权限 | "没有权限执行此操作" | toast.error |
| 404 | 资源不存在 | "请求的资源不存在" | toast.error |
| 409 | 冲突 | 显示后端返回的冲突原因 | toast.error(detail) |
| 422 | 校验失败 | 显示字段级错误信息 | 表单内联错误 或 toast.error |
| 500 | 服务器错误 | "服务器异常，请稍后重试" | toast.error |
| 网络断开 | 无响应 | "网络连接失败，请检查网络" | toast.error + 不自动重试 |

### 401 全局拦截

fetchApi 函数必须内置 401 拦截：检测到 401 响应时自动清除本地 token 并跳转登录页。具体实现详见 docs/ERROR_PATTERNS.md。

### 网络断开检测

根布局应添加在线/离线监听（通过 `window` 的 `online`/`offline` 事件）。离线时在页面顶部显示横幅："当前处于离线状态，部分功能不可用"。详见 docs/ERROR_PATTERNS.md。

## 三、组件级错误展示

### ErrorBanner

所有 API 错误在 UI 层的展示统一使用 ErrorBanner 组件。支持两种变体：`banner`（全宽横幅）和 `inline`（卡片内嵌）。Props 包含 `message`（错误信息）、`variant`（变体类型）、`onRetry`（重试回调）。

**铁律**：所有 API 错误在 UI 层的展示统一使用 ErrorBanner。禁止各处用内联 div 自行拼写错误展示。

### 空状态

所有空数据场景统一使用 EmptyState 组件。Props 包含 `icon`（图标或表情符号）、`title`（标题）、`description`（引导文案）、`action`（可选 CTA 按钮）。

**铁律**：所有空数据场景统一使用 EmptyState。不允许纯文字"暂无数据"无图标、无引导的展示。

### 加载状态

加载状态统一使用 LoadingSpinner 组件。页面级加载：居中容器 + `LoadingSpinner size="lg"` + "加载中..."文字。列表/卡片级加载：`LoadingSpinner size="md"`。禁止纯文字无 Spinner。

## 四、Toast 通知规范

Toast 提供 `toast.success()` / `toast.error()` / `toast.warning()` / `toast.info()` 四个方法。

### 使用场景

| 方法 | 触发场景 | 文案风格 | 示例 |
|------|---------|---------|------|
| toast.success | 操作成功（CUD） | 动词+成功 | "商品发布成功"、"配置已保存" |
| toast.error | 操作失败（API 错误） | 动作+失败+原因 | "删除失败：该商品有关联规则" |
| toast.warning | 需用户注意但不阻塞 | 直接陈述 | "请先选择账号"、"表单有未保存的更改" |
| toast.info | 中性信息通知 | 直接陈述 | "正在生成图片，请稍候" |

### 文案规范

文案必须使用操作式中文（动词开头），禁止暴露技术细节：使用"已保存"而非"Error: fetch failed with status 500"，使用"删除失败：该商品被 3 条规则引用"而非"Unhandled Promise Rejection"。

### Toast vs ErrorBanner 选择

| 场景 | 使用 |
|------|------|
| 操作反馈（增删改） | Toast（右上角弹出，自动消失） |
| 页面数据加载失败 | ErrorBanner（内容区内嵌，带重试按钮） |
| 表单字段校验失败 | 字段下方内联错误（不弹 Toast） |
| 网络离线 | 页面顶部横幅（持久显示） |

## 五、生产环境 console 清理

生产环境通过 next.config.js 配置 `compiler.removeConsole`，仅保留 `error` 和 `warn` 级别输出。ESLint 规则 `no-console` 设为 warn 级别，仅允许 `error` 和 `warn`。

开发阶段禁止在代码中使用 `console.debug` 和 `console.log`。

## 反模式

- 用 try/catch 捕获异常后静默吞掉（至少要 toast.error）
- API 错误信息直接展示 HTTP 状态码（应为用户可读的中文）
- 多个组件各自定义一个 ErrorBanner（应使用统一组件）
- 加载中和空数据用纯文字无图标（应使用 LoadingSpinner/EmptyState）
- 生产环境保留 console.debug / console.log（应用 removeConsole 剔除）
- 离线时 API 调用静默失败无用户提示（应检测并展示离线横幅）

## 另见

- [表单处理规范](frontend-form.md) — 表单字段校验错误的内联显示
- [状态管理规范](frontend-state.md) — API 缓存与 React Query 配置
- [组件设计规范](frontend-components.md) — ErrorBanner/EmptyState 统一组件设计
