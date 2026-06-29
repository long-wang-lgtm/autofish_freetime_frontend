# 色彩语义体系

> 参考实现：`frontend/styles/globals.css`（CSS 变量定义）、`frontend/tailwind.config.js`（语义 Token 映射）

## 现状问题

当前项目中同一个颜色被赋予多种不同语义，灰度色阶使用无层级区分，CSS 变量体系已定义但大量代码绕过它直接使用原子类：

- **蓝色语义过载（72 个文件直接使用 `bg-blue-600`）**：同时用于 CTA 按钮（`FilterBar.tsx`、`RulesTab.tsx`）、选中行（`ItemRow.tsx`）、数据指标（`admin/page.tsx` 统计卡片）、信息状态徽章（`proxy-item.tsx`），以及导航激活态 `bg-blue-50 text-blue-700`（`admin/layout.tsx`）。
- **绿色语义过载**：`#22c55e` 同时表示 IM 在线状态（`ImStatusChart.tsx`）、正向增长（`GrowthPricePanel.tsx`）、已保存操作反馈（`toaster.tsx` success variant）。
- **灰度无层级**：`gray-50` 同时用于页面背景、输入框背景、表格 hover 行、禁用按钮。`gray-100` 在表头背景与卡片分隔线之间混用。
- **暗色主题死代码**：`styles/globals.css` 第 29-49 行定义了完整的 `.dark` CSS 变量覆盖（含 `--primary: 217.2 91.2% 59.8%` 等 20+ 变量），但项目中零个组件使用 `dark:` 前缀或 `.dark` class，属于死代码。
- **语义 Token 形同虚设**：`tailwind.config.js` 已将 `--primary`、`--destructive` 等 CSS 变量映射为 `bg-primary`、`text-primary` 等 Tailwind 类，但仅有 `components/ui/toaster.tsx` 一处使用了 `bg-primary`。其余所有文件直接用 `bg-blue-600`。

## 核心原则

### 1. 品牌色唯一

品牌色（`blue-600` / `--primary`）**仅**用于 CTA 操作按钮和品牌标识（Logo、侧边栏高亮），不用于数据指标、普通文本链接、信息徽章或背景装饰。

```tsx
// ✅ CTA 按钮——唯一可以使用实心品牌色的场景
<button className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded">
  确认发布
</button>

// ❌ 数据指标不应使用品牌色
<span className="text-blue-600 font-bold">12,345</span>
// ✅ 数据指标使用中性色
<span className="text-gray-900 font-bold">12,345</span>
```

### 2. 交互状态三色体系

导航/筛选的交互状态使用三套独立的颜色，绝不混用：

| 状态 | 配色 | 用途 | 示例 |
|------|------|------|------|
| **选中/激活** | `bg-blue-50 text-blue-700` | Tab 激活、筛选项选中、导航当前页 | `admin/layout.tsx` 侧边栏 |
| **悬停** | `bg-gray-50` | 表格行 hover、卡片 hover、下拉选项 hover | `ItemRow.tsx` hover 态 |
| **聚焦** | `ring-2 ring-blue-500` | 输入框 focus、按钮 focus-visible | 所有 form 控件 |

```tsx
// ✅ 导航激活态——浅底深字
<NavItem className="bg-blue-50 text-blue-700">商品管理</NavItem>

// ✅ 表格行悬停——中性灰底
<tr className="hover:bg-gray-50">...</tr>

// ✅ 输入框聚焦——蓝色 ring
<input className="... focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />

// ❌ 反模式：筛选 pill 使用了操作按钮的颜色
<span className="bg-blue-600 text-white rounded-full px-3 py-1">全部</span>
// ✅ 正确：筛选 pill 用浅底深字
<span className="bg-blue-50 text-blue-700 rounded-full px-3 py-1">全部</span>
```

### 3. 语义状态色

操作结果、数据状态、系统反馈使用独立于品牌色的语义色系：

| 语义 | 配色 | 典型场景 |
|------|------|----------|
| **成功 / 正常 / 启用** | `green-600`（文字）/ `emerald-500`（图标） | 在线状态、操作成功提示、启用标记 |
| **警告 / 待处理** | `amber-500`（浅底）/ `amber-600`（文字） | 待审核、即将过期、需要关注 |
| **错误 / 禁用 / 异常** | `red-500`（浅底）/ `red-600`（文字） | 删除按钮、错误提示、离线状态 |
| **信息 / 中性** | `gray-400`（图标）/ `gray-500`（文字） | 次要信息、帮助提示、无数据占位 |

```tsx
// ✅ 语义状态色——按含义选色
<span className="inline-flex items-center gap-1 text-green-600">
  <CheckCircle className="w-4 h-4" /> 在线
</span>
<span className="inline-flex items-center gap-1 text-amber-600">
  <Clock className="w-4 h-4" /> 待审核
</span>
<span className="inline-flex items-center gap-1 text-red-600">
  <AlertCircle className="w-4 h-4" /> 异常
</span>

// ❌ 使用品牌色表示状态语义
<span className="text-blue-600">在线</span>   // 蓝色不代表"正常"
<span className="text-blue-600">待审核</span> // 蓝色不代表"警告"
```

### 4. 灰度色阶分层

每个灰度色阶有且仅有一种核心用途，严格从上到下递减使用：

| 色阶 | 用途 | 说明 |
|------|------|------|
| `gray-50` | **页面背景**（唯一） | `bg-gray-50` 仅用于最外层页面底色 |
| `gray-100` | **表头背景 / 禁用态背景 / 分割线**（唯一） | `border-gray-100` 用于卡片内部分割线（遵循 Tab 规范） |
| `gray-200` | **卡片边框 / 输入框边框**（唯一） | 组件的物理边界 |
| `gray-300` | 占位符文字 | placeholder 颜色 |
| `gray-400` | 辅助图标、次要装饰 | 最低对比度级 |
| `gray-500` | **次要正文** | 描述文字、标签、注释 |
| `gray-600` | **辅助标题** | 列表副标题、卡片副标题 |
| `gray-700` | **正文** | 主要阅读文字 |
| `gray-800` | **加粗正文 / 重要标题** | 卡片标题、表单标签 |
| `gray-900` | **主标题**（唯一） | 页面标题、Section 标题 |

```tsx
// ✅ 正确的灰度分层
<div className="bg-gray-50 min-h-screen">          {/* 页面背景 */}
  <div className="bg-white border border-gray-200 rounded-lg">  {/* 卡片 */}
    <h2 className="text-gray-900 font-semibold">商品列表</h2>   {/* 主标题 */}
    <p className="text-gray-500 text-sm">共 128 件</p>          {/* 次要信息 */}
    <hr className="border-gray-100" />                          {/* 分割线 */}
    <table>
      <thead className="bg-gray-100">...</thead>               {/* 表头 */}
    </table>
  </div>
</div>

// ❌ 反模式：gray-50 用作输入框背景
<input className="bg-gray-50 border border-gray-200" />
// ✅ 输入框背景应为白色（与卡片背景区分）
<input className="bg-white border border-gray-200" />
```

### 5. 图表色（独立体系）

图表数据系列的颜色与 UI 交互色完全独立，不共用品牌蓝。防止用户将图表中的蓝色数据系列误认为可点击的 CTA 按钮。

参考 `frontend/components/selection/product/MiniTrendChart.tsx` 第 16 行的 `COLOR_MAP`，建立统一的图表指标色映射：

| 指标 | 颜色 | 色值 | 说明 |
|------|------|------|------|
| 想要 | 蓝 | `#2563eb` | 核心转化指标 |
| 浏览 | 琥珀 | `#d97706` | 流量指标 |
| 收藏 | 紫罗兰 | `#7c3aed` | 兴趣指标 |
| 询单率 | 翠绿 | `#059669` | 转化率指标 |

```tsx
// ✅ 图表色与 UI 交互色分离
// UI 按钮——Tailwind 品牌色
<button className="bg-blue-600 text-white">操作</button>

// 图表系列——独立色值（不是 blue-600 的 #2563eb）
const CHART_WANT = '#2563eb'    // blue-600 的 hex，但语义独立
const CHART_BROWSE = '#d97706'  // amber-600 的 hex
const CHART_COLLECT = '#7c3aed' // violet-600 的 hex
```

### 6. toaster 颜色

`components/ui/toaster.tsx` 第 33-37 行的 `useToast()` variant 样式使用硬编码 hex 色值，应统一使用 Tailwind token 对应的 hex 值：

```tsx
// ✅ toaster variant 颜色对照表（基于 Tailwind 默认色板）
// error:   bg → #fee2e7 (red-100),  border → #f43f5e (rose-500),  text → #be123c (rose-700)
// success: bg → #dcfce7 (green-100), border → #22c55e (green-500), text → #166534 (green-700)
// warning: bg → #fef3c7 (amber-100), border → #f59e0b (amber-500), text → #92400e (amber-800)
// info:    bg → #dbeafe (blue-100),  border → #3b82f6 (blue-500),  text → #1e40af (blue-800)
```

### 7. 暗色主题

当前 `.dark` CSS 变量（`styles/globals.css` 第 29-49 行）已定义但零组件支持，属于死代码。两种处理方式二选一：

- **方案 A（推荐——如果暂不实施）**：删除 `globals.css` 中的 `.dark` 块，同时将 `tailwind.config.js` 第 3 行的 `darkMode: ["class"]` 改为 `darkMode: ["media"]` 或移除。
- **方案 B（如果计划实施）**：在 `.dark` 块上方添加注释 `/* @todo 暗色主题——待实现 */`，并在所有组件中使用 `dark:` 前缀适配。

## 反模式

- 用 `bg-blue-600` 表示数据指标数值（应使用 `text-gray-900`）
- 筛选 pill 使用与 CTA 按钮相同的实心底色白字样式（应使用浅底深字 `bg-blue-50 text-blue-700`）
- 用 `text-blue-600` 表示"在线/成功/正常"等状态（应使用 `text-green-600`）
- 用 `text-blue-600` 表示"警告/待处理"（应使用 `text-amber-600`）
- `gray-50` 同时用于页面背景和输入框背景（页面背景和表单控件背景应严格区分）
- 分割线使用 `border-gray-200` 或更重（应使用 `border-gray-100`）
- 图表数据系列色与 UI 按钮色混用（图表应使用独立色值体系）
- 新组件绕过 `bg-primary` 直接用 `bg-blue-600`（应优先使用语义 Token）
- `.dark` CSS 变量留在代码中但永不启用（要么删除要么标注待实现）

## 另见

- [图表实现规范](frontend-charts.md) — 图表配色独立体系（与 UI 色分离）
- [字号规范](frontend-typography.md) — Badge/Tag 颜色与字号的配合
- [间距/圆角规范](frontend-spacing.md) — 分割线和边框色阶
