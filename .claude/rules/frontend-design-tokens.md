# 设计 Token 规范

> 统一管理项目的间距、圆角、阴影、字号、字重、行高 Token。是 UI 开发时查找"用什么值"的权威参考卡。

## 一、字号

| 等级 | Token | 像素 | 适用场景 |
|------|-------|------|----------|
| caption | `text-xs` | 12px | Badge 文字、表格小字、时间戳 |
| body-sm | `text-sm` | 14px | 表格数据、描述文字、标签、按钮 |
| body | `text-base` | 16px | 正文、输入框文字、菜单项 |
| heading-sm | `text-base font-semibold` | 16px 加粗 | 卡片标题、一级 Tab 标签 |
| heading | `text-lg font-semibold` | 18px 加粗 | 页面主标题（非 Tab 页面用） |

**铁律**：禁止使用任意值 `text-[Npx]`。如需强调用 `font-semibold` 而非缩小字号。

## 二、字重

| 等级 | Token | 适用场景 |
|------|-------|----------|
| 正文 | `font-normal`（默认） | 正文段落、描述文字、表格数据 |
| 强调 | `font-medium` | 强调文字、筛选激活态、下拉菜单项 |
| 标题 | `font-semibold` | Tab 标签、卡片标题、页面主标题 |

**铁律**：不使用 `font-bold`、`font-light`、`font-thin`。

## 三、行高

| Token | 适用场景 |
|-------|----------|
| `leading-relaxed` | 正文段落、描述文字 |
| `leading-snug` | 卡片描述、中等密度文字 |
| `leading-tight` | 表格数据、价格数字、标签 |
| `leading-none` | 紧凑数据列、badge、图标+文字 |

**表格数据默认行高**：`leading-tight`。

## 四、颜色层级

| 等级 | Token | 用途 |
|------|-------|------|
| 标题色 | `text-gray-900` | 页面标题、卡片标题、表格表头 |
| 正文色 | `text-gray-700` | 正文、菜单项、表格主要列 |
| 辅助色 | `text-gray-500` | 描述文字、次要表格列、占位符 |
| 禁用/占位 | `text-gray-400` | 空状态提示、禁用文字、placeholder |
| 链接色 | `text-blue-600` | 链接、可点击文字、激活态 Tab |

## 五、Badge / Tag / Pill

**Badge（状态标签）**：`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium`，含彩色 dot。

颜色映射：
- 正常/启用：绿底绿字，dot 绿色
- 禁用/暂停：灰底灰字，dot 灰色
- 警告/异常：红底红字，dot 红色
- 信息：灰底灰字，dot 灰色

**Pill（非状态标签）**：`px-1.5 py-0.5 rounded-full text-xs font-medium`，如优先级标签。

**Tag（可交互标签）**：`px-2 py-0.5 rounded-full text-xs border`，可 hover 变色。

**铁律**：所有 Badge 统一 `text-xs` + `rounded-full`。

## 六、表格文字

- **表头**：`text-xs font-medium text-gray-500`
- **数值列**：`text-sm text-gray-700 tabular-nums`
- **标题/描述**：`text-sm text-gray-800 leading-snug line-clamp-2`
- **辅助列**：`text-xs text-gray-500 tabular-nums`

## 七、垂直间距

三级垂直间距：

| 等级 | Token | 值 | 适用场景 |
|------|-------|----|----------|
| 页面级 | `gap-5` / `space-y-5` | 20px | 页面顶级容器 |
| 区域级 | `space-y-4` | 16px | 卡片之间、Section 之间 |
| 紧凑级 | `space-y-3` | 12px | 卡片内列表项、紧凑型条目 |

**页面内容区 padding**：`p-4 lg:p-6`。

**铁律**：
- Tab 页面顶级容器用 `flex flex-col gap-5 h-full`
- 非 Tab 页面顶级容器用 `space-y-5`
- `space-y-4` 仅用于页面内的区域级间距

## 八、卡片内边距

| 等级 | Token | 适用场景 |
|------|-------|----------|
| 大卡 | `p-6` | 页面级主卡片、表单卡片 |
| 中卡 | `p-4` | 区域级卡片、FilterBar、工具栏 |
| 小卡 | `p-3` | 紧凑卡片、表头行、筛选行 |

**铁律**：禁止 `p-2`、`p-3.5`、`p-5` 等非标准值。

## 九、输入框高度

所有输入框、选择框统一 `h-10`（40px），使用 `py-2` + `text-sm`。

**按钮高度**：同级别按钮/输入框高度一致。统一使用 `h-10 py-2`，通过 `font-semibold` 或颜色深浅区分主次操作。

## 十、圆角

| 等级 | Token | 适用场景 |
|------|-------|----------|
| 面板级 | `rounded-xl` | 卡片、面板、模态框、弹出菜单 |
| 控件级 | `rounded-lg` | 按钮、输入框、选择框、下拉项 |
| 胶囊级 | `rounded-full` | Badge、Tag、Pill、开关 |

**铁律**：禁止使用 `rounded-md`。

## 十一、阴影

| Token | 适用场景 |
|-------|----------|
| `shadow-sm` | 卡片、面板（与 `border border-gray-200` 搭配） |
| `shadow-md` | 弹出层、下拉菜单 |
| `shadow-lg` | 模态框、大型浮层 |

**铁律**：卡片统一用 `shadow-sm` + `border`，不同时使用两者则无立体感。

## 十二、组件间距速查

| 组件关系 | 间距 |
|----------|------|
| TabBar 与内容区 | `mb-5`（来自页面级 gap-5） |
| 筛选栏与表格 | `border-b border-gray-100` 分隔 |
| 表格与分页器 | `border-t border-gray-100` 分隔，`py-3` 内边距 |
| 左右分栏拖拽线 | `w-1`，拖拽中 `bg-blue-400`，否则 `bg-gray-200` |
| 弹窗遮罩 | `bg-black/50` |

## 反模式

- 使用任意值字号 `text-[Npx]`
- 使用 `font-bold` 替代 `font-semibold`
- Badge/Tag 不使用 `rounded-full`
- 数值列不使用 `tabular-nums`
- 使用 `p-2`、`p-2.5`、`p-3.5`、`p-5` 等非标准内边距
- 输入框与同级别按钮高度不一致
- 使用 `rounded-md`
- 卡片只使用 `shadow-sm` 无 `border`
- Tab 页面顶级容器用 `space-y-5`（应用 `gap-5`）
- 非 Tab 页面顶级容器用 `space-y-4`（应用 `space-y-5`）
- 分割线使用 `gray-200` 或更重（应用 `gray-100`）

## 另见

- [色彩语义体系](frontend-colors.md) — Badge/Tag 的颜色规则
- [布局设计规范](frontend-layout.md) — 页面级间距和容器的应用方式
- [组件设计规范](frontend-components.md) — 文件命名和导出方式
