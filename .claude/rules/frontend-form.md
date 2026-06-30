# 表单处理规范

## 一、技术栈与标准模式

表单统一使用 react-hook-form + zodResolver + zod 组合：zod 定义校验 schema，`z.infer` 推导 TypeScript 类型，useForm 管理字段状态。提交成功后可调用 `reset()` 清空表单。

### Schema 定义位置

| Schema 适用范围 | 定义位置 |
|----------------|----------|
| 单个表单专用 | 该表单组件文件内 |
| 多组件共享 | `lib/utils/validation.ts` |

**铁律**：同一表单的 schema 不拆散到多个文件。避免"字段在 A 文件，验证在 B 文件"。

## 二、表单字段标准样式

### 单行文本输入

输入框统一使用 `h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg`，聚焦态 `focus:ring-2 focus:ring-blue-500 focus:border-blue-500`，禁用态 `disabled:bg-gray-50 disabled:text-gray-400`。标签使用 `text-sm font-medium text-gray-700`，必填字段使用红色星号标记。校验错误使用 `text-sm text-red-600` 显示在字段下方。

### 下拉选择

选择框使用与输入框相同的高度和边框样式：`h-10 px-3 py-2 text-sm border border-gray-200 rounded-lg`，聚焦态 `focus:ring-2 focus:ring-blue-500`。

### Switch 开关

Switch 使用 Controller 包裹，配合 `role="switch"` + `aria-checked` 属性。开启态使用品牌色 `bg-blue-600`，关闭态使用 `bg-gray-200`。完全实现详见 docs/FORM_PATTERNS.md。

### 多行文本

Textarea 使用 `px-3 py-2 text-sm border border-gray-200 rounded-lg`，聚焦态 `focus:ring-2 focus:ring-blue-500`，支持垂直调整 `resize-vertical`。

## 三、表单字段高度与间距统一

| 元素 | 高度 | Token |
|------|------|-------|
| 输入框 | h-10（40px） | `h-10 px-3 py-2 text-sm` |
| 选择框 | h-10（40px） | `h-10 px-3 py-2 text-sm` |
| 按钮（默认） | h-10（40px） | `h-10 px-4 py-2 text-sm` |
| 按钮（主操作） | h-10（40px） | `h-10 px-5 py-2 text-sm` |

**铁律**：同一表单行的输入框和按钮高度必须一致。不允许 `py-2.5` 按钮与 `py-2` 输入框并存。

### 标签与输入框间距

- 标签与输入框间距：`space-y-1`（4px）
- 字段之间间距：`space-y-4`（16px）

## 四、表单提交流程

### 提交按钮状态处理

提交按钮必须包含 loading 状态：提交中显示 Spinner + "保存中..."文本，并设置 `disabled` 防止重复点击。按钮禁用条件包括 `isSubmitting` 和 `!isValid`。

### 防止重复提交

两种方式可组合使用：
- react-hook-form 的 `formState.isSubmitting`：提交期间按钮 disabled
- React Query mutation 的 `isPending`：mutation 进行中按钮 disabled，显示"提交中..."

### 服务端校验错误映射

当后端返回 422 字段级错误时，通过 `setError` 将错误映射到对应字段，而非使用 toast。具体实现详见 docs/FORM_PATTERNS.md。

## 五、表单在 PC/移动端的差异处理

**桌面端**：表单在 Sheet 抽屉中，使用 `p-6 space-y-4`。

**移动端**：表单在 BottomSheet 中，使用 `p-4 space-y-4`。Sheet 组件已内置 `useIsMobile` 自动切换为 BottomSheet。

**铁律**：同一表单不应为桌面端和移动端写两份代码。使用 Sheet 组件（已内置 useIsMobile 切换），表单字段根据容器宽度自适应。

## 六、安全表单字段

### 密码/密钥输入框

API Key、密码、代理密钥等敏感字段必须使用 `type="password"`，禁止 `type="text"` 明文显示。可选择性添加显示/隐藏切换按钮。

### 文件上传

上传前必须在客户端进行校验：

| 校验项 | 阈值 |
|--------|------|
| 最大文件大小 | 10MB |
| 允许的格式 | image/jpeg、image/png、image/webp |

校验失败通过 toast.error 提示用户，阻止上传。

## 反模式

- 表单字段的 `py-2.5` 按钮与 `py-2` 输入框高度不一致
- 提交按钮无 loading 状态（容易重复提交）
- 服务端校验错误用 `toast.error` 而非映射到字段级 `setError`
- 密码/密钥输入框使用 `type="text"`
- 为桌面端和移动端各写一份表单代码（应共享字段组件）
- 文件上传缺乏前端类型/大小校验
- Schema 定义在组件很远的地方或跨文件拆散

## 另见

- [PC/移动端布局铁律](frontend-layout.md) — Sheet/BottomSheet 使用场景
- [设计 Token 规范](frontend-design-tokens.md) — 输入框高度与圆角 Token
- [错误处理规范](frontend-error.md) — Toast vs 内联错误的选用
