# 间距/圆角/阴影设计 Token

> 参考实现：`frontend/app/dashboard/layout.tsx`（内容区 padding）、`frontend/app/dashboard/settings/page.tsx`（卡片间距）

## 一、垂直间距

页面内容区域采用三级垂直间距体系：

| 等级 | Token | 值 | 适用场景 | 示例 |
|------|-------|----|----------|------|
| 页面级 | `gap-5` | 20px | Tab 页面顶级容器、Tab 与内容间 | selection/page.tsx |
| 页面级 | `space-y-5` | 20px | 非 Tab 页面顶级容器 | settings/page.tsx（accounts/page.tsx 当前使用 `space-y-4`，待修复为 `space-y-5`） |
| 区域级 | `space-y-4` | 16px | 卡片之间、Section 之间 | 页面内部区域间距 |
| 紧凑级 | `space-y-3` | 12px | 卡片内列表项、紧凑型条目 | accounts/page.tsx 移动端卡片列表 |

**页面内容区 padding**：`p-4 lg:p-6`（与 `frontend/app/dashboard/layout.tsx` 第 38 行保持一致）

**铁律**：Tab 页面（items / selection / publish）顶级容器统一用 `flex flex-col gap-5 h-full`，不允许使用 `space-y-5`。非 Tab 页面（settings / accounts）顶级容器用 `space-y-5`。`space-y-4` 仅用于页面内的区域级间距（卡片之间、Section 之间），不作为页面顶级容器。

## 二、卡片内边距

| 等级 | Token | 适用场景 | 示例位置 |
|------|-------|----------|----------|
| 大卡 | `p-6` | 页面级主卡片、表单卡片 | 设置页 AI 配置卡 |
| 中卡 | `p-4` | 区域级卡片、FilterBar、工具栏 | ProductMonitorTab 工具栏 (`px-5 py-4`) |
| 小卡 | `p-3` | 紧凑卡片、表头行、筛选行 | ItemsTab 表头 (`px-4 py-3`) |

**关于 `px-4 py-3` 和 `px-5 py-4`**：
- `px-4 py-3` 视为小卡 p-3 的变体（表头需要左右略大内边距）
- `px-5 py-4` 视为中卡 p-4 的变体（工具栏搜索框需要略宽内边距）

**禁止使用的非标准值**（项目中已发现的实际问题）：

| 反例值 | 出现位置 | 问题 |
|--------|----------|------|
| `p-2` | 多处 | 过小，不符合任何档位 |
| `p-3.5` | — | 非标准 Tailwind 值 |
| `p-5` | — | p-4 或 p-6 无中间档 |
| `px-4 py-2` | FilterBar 控件 | py-2 过窄 |
| `px-4 py-2.5` | Accounts 下拉菜单 | 非标准 |
| `px-5 py-4` | ProductMonitorTab 搜索栏 | 应归一为 p-4 |
| `px-6 pt-4 pb-3` | — | 非对称 padding 无必要 |

## 三、输入框高度统一

所有输入框、选择框统一高度为 `h-10`（40px），使用 `py-2` + `text-sm`。

**正确**：
```tsx
<input className="h-10 py-2 text-sm ..." />
<select className="h-10 py-2 text-sm ..." />
```

**反例**（项目中发现的实际问题）：
- `py-1.5`（26px 净高）-- 过矮，触摸不友好
- `py-2.5`（ProductMonitorTab 搜索框，`frontend/components/selection/product/ProductMonitorTab.tsx` 第 459 行）-- 过高
- `py-2.5` 的按钮（accounts/page.tsx）-- 与输入框高度不一致

**按钮高度例外**：主操作按钮可使用 `py-2.5`（36px 净高）以获得更突出的视觉重量。但一个页面内所有同级别的按钮/输入框应保持高度一致。

## 四、圆角

| 等级 | Token | 适用场景 |
|------|-------|----------|
| 面板级 | `rounded-xl` | 卡片、面板、模态框、弹出菜单 |
| 控件级 | `rounded-lg` | 按钮、输入框、选择框、下拉项 |
| 胶囊级 | `rounded-full` | Badge、Tag、Pill、开关 |

**铁律**：新组件禁止使用 `rounded-md`。当前项目中约 15 处 `rounded-md` 残留（主要在认证表单 LoginForm/RegisterForm 和侧边栏），需在重构中逐步迁移。认证表单的 `rounded-md` 可保留至认证页整体重设计时统一处理，其余位置迁移到 `rounded-lg` 或 `rounded-xl`。

**正确示例**（ProductMonitorTab）：
- 工具栏卡片：`rounded-xl`（第 450 行）
- 数据表格容器：`rounded-xl`（第 469 行）
- 搜索输入框：`rounded-xl`（第 459 行 -- 应为 `rounded-lg` 但使用场景特殊，搜索框嵌在卡片内可接受）

**Badge/Pill 专用**（ProductMonitorTab 第 264、270、298、312 行）：
```tsx
<span className="rounded-full ...">  {/* badge/pill */}
```

## 五、阴影

| Token | 适用场景 |
|-------|----------|
| `shadow-sm` | 卡片、面板（与 `border border-gray-200` 搭配） |
| `shadow-md` | 弹出层、下拉菜单、Dropdown |
| `shadow-lg` | 模态框、大型浮层 |

**铁律**：
- 卡片统一用 `shadow-sm` + `border`，不同时使用两者则卡片没有立体感
- 下拉菜单用 `shadow-lg`（`frontend/components/layout/Header.tsx` 第 124 行已正确使用）

## 六、组件间距速查

| 组件关系 | 间距 |
|----------|------|
| TabBar 与内容区 | `mb-5`（来自页面级 gap-5） |
| Header 与内容区 | 由 DashboardLayout 控制，不额外设置 |
| 筛选栏与表格 | 无间距（FilterBar 在卡片内部，border-b 分隔） |
| 表格与分页器 | `border-t border-gray-100` 分隔，`py-3` 内边距 |
| 左右分栏拖拽分隔线 | `w-1`，拖拽中 `bg-blue-400`，否则 `bg-gray-200` |
| 弹窗遮罩 | `bg-black/50`（Sidebar 遮罩已正确使用） |

## 反模式

- 使用 `space-y-5` 作为 Tab 页面顶级容器（应为 `gap-5`）
- 使用 `space-y-4` 作为 Tab 页面顶级容器（accounts/page.tsx 第 40 行）
- 使用 `p-2`、`p-3.5`、`p-5` 等非标准内边距
- 使用 `px-4 py-2` 输入框（太窄）
- 输入框 `py-2.5` 与按钮 `py-2` 高度不一致
- 使用 `rounded-md`（项目标准无此档位）
- 卡片同时使用 `rounded-lg` + `rounded-xl` 混搭
- 卡片只使用 `shadow-sm` 无 `border`（视觉扁平，无层级）
