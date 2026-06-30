# 无障碍最低要求

## 最低要求

### 1. 所有交互元素必须可键盘访问

所有可交互元素（按钮、链接、输入框、选择器、开关）必须通过 Tab 键导航到，通过 Enter/Space 激活。

- 交互元素使用原生的 `<button>` 元素，不使用 `div onClick` 替代按钮
- 非标准交互元素使用 `tabIndex={0}` 并绑定 `onKeyDown` 处理 Enter/Space 键
- 聚焦样式不得被移除：使用 `outline-none` 时必须配合可见的替代焦点样式（如 `focus-visible:ring-2 focus-visible:ring-blue-500`）

### 2. 所有图标按钮必须有 aria-label

无文本的图标按钮对屏幕阅读器不可见，必须添加 `aria-label` 属性描述按钮用途。

### 3. 所有表单输入必须有 label 或 aria-label

- 可见 label 使用 `<label htmlFor="...">` 关联输入框
- 无可见 label 的输入框使用 `aria-label` 属性
- 不可仅靠 `placeholder` 传达输入框含义

### 4. 状态变化必须用 aria-live 通知屏幕阅读器

异步操作完成后，屏幕阅读器用户需要感知结果。

- 操作结果区域使用 `aria-live="polite"` 配合 `aria-atomic="true"`
- 加载状态区域使用 `role="status"` 配合 `aria-live="polite"`

常用 `aria-live` 值：
- `polite`：等当前朗读完成后播报（适用于大多数场景）
- `assertive`：立即播报（仅用于紧急通知）

### 5. 颜色不能作为唯一的信息传达方式

色盲用户无法仅靠颜色区分状态。状态信息必须通过颜色 + 文本/图标双重传达。

- 通过/拒绝状态同时显示文本标记（如"已通过"/"已拒绝"）和颜色
- 图表中确保色板在色盲模拟下仍可区分，或提供图案填充/纹理作为第二通道

### 6. 焦点顺序必须合理

DOM 顺序应与视觉顺序一致。避免使用 CSS `order` 或 `flex-direction: row-reverse` 等影响视觉顺序的属性导致 Tab 焦点跳跃。

### 7. 模态框/抽屉打开时焦点必须移入，关闭时焦点必须回到触发元素

- 打开时：保存当前焦点元素引用，将焦点移入模态框容器（设置 `tabIndex={-1}`、`role="dialog"`、`aria-modal="true"`）
- 关闭时：焦点回到之前的触发元素

`Sheet` 和 `BottomSheet` 组件应实现此焦点管理。

### 8. 触摸目标最小 44x44px

WCAG 2.5.5 (Level AAA) 要求触摸目标至少 44x44 CSS 像素。移动端交互元素必须满足此要求，可通过 `min-w-[44px] min-h-[44px]` 加 padding 扩展点击区域。

### 9. 对比度至少达到 WCAG AA 标准

| 元素 | 最低对比度 | 约束 |
|------|-----------|------|
| 正文（< 18px） | 4.5:1 | 灰色字不浅于 `text-gray-500`（`#6b7280`，在白底上约 4.6:1） |
| 大字（>= 18px 粗体） | 3:1 | `text-gray-400`（`#9ca3af`）仅可用于大字或装饰用途 |
| 非文本 UI 组件 | 3:1 | 输入框边框、图标等 |

需注意的常见问题：
- `text-gray-400`（`#9ca3af`）在白底上约 2.8:1，不达标，仅可用于装饰/占位或大字场景
- 浅色背景上的表单边框应使用 `border-gray-300` 或更深的颜色

## 编码检查清单

每次提交前确认：

- [ ] 新增图标按钮有 `aria-label`
- [ ] 新增表单输入有 `label` 或 `aria-label`
- [ ] 无 `div onClick` 替代 button
- [ ] 无 `outline-none` 裸用（需配合 `focus-visible:ring-*`）
- [ ] 状态信息通过文本+颜色双重传达（非仅颜色）
- [ ] 模态框/抽屉有焦点管理
- [ ] 移动端触摸目标 >= 44x44px
- [ ] 文本对比度满足 AA 标准（灰色字不浅于 `text-gray-500`）
